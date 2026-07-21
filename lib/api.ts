import { friendlyError } from './friendlyErrors';
import { supabase } from './supabase';
import {
  assertRepairPricingConstraint,
  parseDeviceType,
  PRICING_MODE,
  REPAIR_REQUEST_CONSTRAINT_MESSAGE,
  type PricingMode,
} from './repairDeviceTypes';
import { 
  Profile, 
  UserRole, 
  Product, 
  ProductVariant, 
  ProductImage,
  CartItem, 
  Wishlist, 
  Order, 
  OrderItem, 
  TrackingUpdate, 
  Review, 
  RepairRequest, 
  TradeInRequest,
  InventoryAdjustment,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  Message,
  MessageThread,
  EmailLog,
  EmailSendQueue
} from '../types';
import { formatCurrency } from './utils';
import { normalizeCanonicalRole, pickHighestRole, isAdminRole } from './roles';
import AuthService from './auth';
import { resolveUserDisplayName } from './userDisplayName';
import type { AdminNavBadgeKey } from './navBadgeWatermarks';
import {
  buildProductOptionsForRpc,
  getOrderItemConfigurationLine,
  mergeVariantSkuFallback,
  normalizeOrderItemOptions,
} from './orderItemOptions';

// Normalizes admin-entered category strings (e.g. "Mobile Phones",
// "Laptops & Notebooks", "Apple iPhones") to canonical values used by
// the UI (`iPhone`, `Laptop`, …) plus any extra DB labels (e.g.
// `Trades`) passed through trimmed when no rule matches. Keep in sync
// with store filters (`lib/storeFilters.ts`, `views/Store.tsx`).
export function normalizeProductCategory(category?: string | null): string {
  if (category == null || category === '') return 'Accessories';
  const raw = String(category).trim();
  if (!raw) return 'Accessories';
  const value = raw.toLowerCase();

  // Order matters: more specific matches first.
  if (value.includes('iphone')) return 'iPhone';
  // Prefer "iPad" label for storefront filters (Tablet kept as alias)
  if (value.includes('ipad')) return 'iPad';
  if (value.includes('tablet')) return 'iPad';
  if (value.includes('laptop') || value.includes('notebook') || value.includes('macbook') || value.includes('computer')) {
    return 'Laptop';
  }
  if (value.includes('phone') || value.includes('mobile') || value.includes('smartphone')) {
    return 'iPhone';
  }
  if (value.includes('gam') || value.includes('console')) return 'Gaming';
  if (value.includes('audio') || value.includes('headphone') || value.includes('earbud') || value.includes('speaker')) {
    return 'Audio';
  }
  if (value.includes('accessor') || value.includes('case') || value.includes('wearable') || value.includes('charger') || value.includes('cable')) {
    return 'Accessories';
  }
  if (value.includes('trades')) return 'Trades';

  return raw;
}

/** Maps `orders.status` from Postgres (usually lowercase) to UI labels (Pascal Case). */
export function normalizeOrderStatusForUi(status?: string | null): string {
  if (!status || !String(status).trim()) return 'Pending';
  const key = String(status).trim().toLowerCase();
  const map: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    ready: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
    refunded: 'Refunded',
  };
  return map[key] ?? `${status.charAt(0).toUpperCase()}${status.slice(1).toLowerCase()}`;
}

// ==========================================
// AUTHENTICATION & PROFILES
// ==========================================

export const signUp = async (email: string, password: string, displayName?: string) => {
  const trimmed = displayName?.trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    ...(trimmed
      ? {
          options: {
            data: { name: trimmed, full_name: trimmed, display_name: trimmed },
          },
        }
      : {}),
  });
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  
  // Fetch user profile and role
  if (data.user) {
    const profile = await getUserProfile(data.user.id);
    const roles = await getUserRoles(data.user.id);
    const role = pickHighestRole(roles, profile?.role ?? 'user');

    return {
      user: {
        ...data.user,
        name: resolveUserDisplayName(profile?.name, data.user),
        role,
      },
      session: data.session
    };
  }
  
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const handleSignOut = async (setUser: (user: null) => void, navigateTo: (view: string) => void) => {
  try {
    await signOut();
  } catch (error: any) {
    console.error('Sign out error:', error);
  } finally {
    setUser(null);
    navigateTo('home');
  }
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getUserProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const updateUserProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getUserRoles = async (userId: string): Promise<UserRole[]> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
};

// ==========================================
// PRODUCTS & VARIANTS
// ==========================================

// ==========================================
// PRODUCT MANAGEMENT (ADMIN)
// ==========================================

// Helper: filter out undefined values from an update payload so we
// don't accidentally null-out columns the caller didn't intend to
// touch (Supabase-js already does this, but being explicit keeps the
// intent obvious for the variant-column work below).
const stripUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as any)[k] = v;
  }
  return out;
};

// Coerce mixed-shape inputs (the legacy UI may pass `string[]` or a
// single string) to a clean `string[]`. Empty arrays are fine — they
// signal "no chips" rather than "leave alone".
const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (Array.isArray(value)) return value.map(v => String(v)).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

/** Normalize products.specifications JSONB for create/update. */
const toSpecifications = (
  value: unknown,
): Record<string, unknown> | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return {};
    try {
      const parsed: unknown = JSON.parse(t);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      throw new Error('specifications must be a JSON object');
    } catch (e) {
      if (e instanceof Error && e.message.includes('must be')) throw e;
      throw new Error('specifications must be valid JSON');
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

export const createProduct = async (product: Partial<Product>) => {
  const priceNum = product.price != null ? Number(product.price) : NaN;
  const specsJson = toSpecifications(
    (product as Product & { specifications?: unknown }).specifications,
  );
  const payload = stripUndefined({
    name: product.name,
    description: product.description,
    price: Number.isFinite(priceNum) ? priceNum : undefined,
    image_url: product.image || product.image_url,
    category: product.category,
    brand: product.brand,
    condition: product.condition,
    status: product.status || 'active',
    trade_model: product.trade_model === '' ? null : product.trade_model,
    currency: product.currency || 'GHS',
    rating: product.rating != null ? Number(product.rating) : undefined,
    review_count: product.review_count ?? product.reviewCount,
    discount: product.discount != null ? Number(product.discount) : undefined,
    is_new: Boolean(product.new ?? product.is_new),
    stock: product.stock != null ? Number(product.stock) : 0,
    featured: Boolean(product.featured),
    colors: toStringArray((product as Product).colors),
    storage: toStringArray((product as Product).storage),
    ram: toStringArray((product as Product).ram),
    specs: toStringArray((product as Product).specs),
    specifications: specsJson,
  });

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('*, product_variants(*), product_images(*)')
    .single();
  if (error) throw error;
  const mapped = mapProductFromDb(data);
  void appendAuditNote('products', mapped.id, `Created product "${mapped.name}"`);
  return mapped;
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  const priceNum = updates.price !== undefined && updates.price !== null ? Number(updates.price) : undefined;
  const specsJson = toSpecifications(
    (updates as Product & { specifications?: unknown }).specifications,
  );
  const payload = stripUndefined({
    name: updates.name,
    description: updates.description,
    price: priceNum !== undefined && Number.isFinite(priceNum) ? priceNum : undefined,
    image_url: updates.image || updates.image_url,
    category: updates.category,
    brand: updates.brand,
    condition: updates.condition,
    status: updates.status,
    trade_model: updates.trade_model === '' ? null : updates.trade_model,
    currency: updates.currency,
    rating: updates.rating != null ? Number(updates.rating) : undefined,
    review_count: updates.review_count ?? updates.reviewCount,
    discount: updates.discount !== undefined && updates.discount !== null ? Number(updates.discount) : undefined,
    is_new: updates.new !== undefined || updates.is_new !== undefined
      ? Boolean(updates.new ?? updates.is_new)
      : undefined,
    stock: updates.stock !== undefined && updates.stock !== null ? Number(updates.stock) : undefined,
    featured: updates.featured !== undefined ? Boolean(updates.featured) : undefined,
    colors: toStringArray((updates as Product).colors),
    storage: toStringArray((updates as Product).storage),
    ram: toStringArray((updates as Product).ram),
    specs: toStringArray((updates as Product).specs),
    specifications: specsJson,
  });

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select('*, product_variants(*), product_images(*)')
    .single();
  if (error) throw error;
  const mapped = mapProductFromDb(data);
  void appendAuditNote('products', id, `Updated product "${mapped.name || id}"`);
  return mapped;
};

/**
 * Permanently remove a product when safe; otherwise archive it.
 *
 * WHY: Past orders / inventory rows often block hard delete (FK). Staff still
 * need a working “Delete” — archive hides it from the shop in that case.
 * Also `.delete()` with RLS can succeed with 0 rows; we `.select()` to verify.
 * Every failure path returns plain-English reasons — never silent.
 */
export type DeleteProductResult =
  | { mode: 'deleted' }
  | { mode: 'archived'; reason: string };

/** Count linked rows that commonly block product delete. */
async function probeProductDeleteBlockers(pid: string): Promise<string[]> {
  const reasons: string[] = [];

  const countEq = async (table: string, column: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq(column, pid);
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  };

  const orderCount = await countEq('order_items', 'product_id');
  if (orderCount > 0) {
    reasons.push(
      `${orderCount} past order line${orderCount === 1 ? '' : 's'} still reference this product`,
    );
  }

  const invCount = await countEq('inventory_adjustments', 'product_id');
  if (invCount > 0) {
    reasons.push(
      `${invCount} inventory adjustment record${invCount === 1 ? '' : 's'} still reference this product`,
    );
  }

  const tradeCount = await countEq('trade_in_requests', 'target_product_id');
  if (tradeCount > 0) {
    reasons.push(
      `${tradeCount} trade-in request${tradeCount === 1 ? '' : 's'} still point at this product as the upgrade`,
    );
  }

  return reasons;
}

function englishProductError(raw: string | undefined, action: string): string {
  return friendlyError(raw ? new Error(raw) : new Error(''), `${action} this product`);
}

export function friendlyProductActionError(err: unknown, action: string): string {
  return friendlyError(err, `${action} this product`);
}

export const deleteProduct = async (id: string): Promise<DeleteProductResult> => {
  const pid = String(id || '').trim();
  if (!pid) throw new Error('Product id is required.');

  // Best-effort cleanup of catalog children (safe if CASCADE already exists)
  await supabase.from('product_images').delete().eq('product_id', pid);
  await supabase.from('product_variants').delete().eq('product_id', pid);
  await supabase.from('cart_items').delete().eq('product_id', pid);
  await supabase.from('wishlist_items').delete().eq('product_id', pid);

  // Detach from trades that pointed at this upgrade product
  try {
    await supabase
      .from('trade_in_requests')
      .update({ target_product_id: null, target_variant_id: null })
      .eq('target_product_id', pid);
  } catch {
    try {
      await supabase
        .from('trade_in_requests')
        .update({ target_product_id: null })
        .eq('target_product_id', pid);
    } catch {
      /* non-fatal */
    }
  }

  // Remove from upgrade-target allowlist if present
  try {
    const { data: cfg } = await supabase
      .from('trade_config')
      .select('value')
      .eq('key', 'upgrade_target_product_ids')
      .maybeSingle();
    const raw = cfg?.value;
    if (raw) {
      let ids: string[] = [];
      try {
        const parsed = JSON.parse(String(raw));
        if (Array.isArray(parsed)) ids = parsed.map(String);
      } catch {
        ids = String(raw)
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      const next = ids.filter((x) => x !== pid);
      if (next.length !== ids.length) {
        await supabase
          .from('trade_config')
          .update({ value: JSON.stringify(next) })
          .eq('key', 'upgrade_target_product_ids');
      }
    }
  } catch {
    /* non-fatal */
  }

  const blockers = await probeProductDeleteBlockers(pid);

  const { data: removed, error } = await supabase
    .from('products')
    .delete()
    .eq('id', pid)
    .select('id');

  if (!error && removed && removed.length > 0) {
    void appendAuditNote('products', pid, 'Deleted product');
    return { mode: 'deleted' };
  }

  const fkBlocked =
    Boolean(error && /foreign key|23503|still referenced|violates foreign key/i.test(error.message || '')) ||
    blockers.length > 0 ||
    (!error && (!removed || removed.length === 0));

  if (error && !fkBlocked) {
    throw new Error(englishProductError(error.message, 'delete'));
  }

  // Linked history (or RLS silent no-op) → archive instead
  const { data: archived, error: archErr } = await supabase
    .from('products')
    .update({ status: 'archived', featured: false, stock: 0 })
    .eq('id', pid)
    .select('id')
    .maybeSingle();

  if (archErr) {
    const why =
      blockers.length > 0
        ? `Cannot delete this product because ${blockers.join('; ')}. Also could not archive it: ${archErr.message}`
        : englishProductError(error?.message || archErr.message, 'delete or archive');
    throw new Error(why);
  }
  if (!archived) {
    if (blockers.length > 0) {
      throw new Error(
        `Cannot permanently delete this product because ${blockers.join('; ')}. ` +
          'Archive also failed — you may not have permission (staff/admin required), or the product was already removed.',
      );
    }
    throw new Error(
      'Could not delete this product. You may not have permission (staff/admin role required), or it was already removed.',
    );
  }

  void appendAuditNote(
    'products',
    pid,
    'Archived product (permanent delete blocked by linked records)',
  );

  const reason =
    blockers.length > 0
      ? `Cannot permanently delete this product because ${blockers.join('; ')}. ` +
        'It was archived instead (hidden from the shop, status set to archived).'
      : 'This product could not be permanently deleted (likely linked to past orders or other records), so it was archived instead (hidden from the shop).';

  return { mode: 'archived', reason };
};

export type SkuVariantInput = {
  id?: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  sim_type?: string | null;
  stock: number;
  price_modifier?: number;
  /** Absolute price; null/undefined → DB null (effective = base + modifier). */
  price?: number | null;
  is_active?: boolean;
  image_url?: string | null;
  sku?: string | null;
};

const normSkuDim = (v: string | null | undefined) => (v ?? '').trim().toLowerCase();

const skuDimsMatch = (
  a: { color?: string | null; storage?: string | null; ram?: string | null; sim_type?: string | null },
  b: { color?: string | null; storage?: string | null; ram?: string | null; sim_type?: string | null },
) =>
  normSkuDim(a.color) === normSkuDim(b.color) &&
  normSkuDim(a.storage) === normSkuDim(b.storage) &&
  normSkuDim(a.ram) === normSkuDim(b.ram) &&
  normSkuDim(a.sim_type) === normSkuDim(b.sim_type);

/** Map PostgREST unique-violation into a staff-readable message. */
const rethrowVariantConstraint = (err: { message?: string; code?: string }): never => {
  const msg = String(err?.message || err || '');
  const code = String(err?.code || '');
  if (code === '23505' || /uq_variant_combo|uq_variant_sku|duplicate key/i.test(msg)) {
    throw new Error(
      'Duplicate combination (color / storage / RAM / SIM) or item code. Each combination must be unique.',
    );
  }
  throw err instanceof Error ? err : new Error(msg || 'Could not save stock versions');
};

/** Upsert SKU rows and remove combinations no longer in the matrix. */
export const syncProductVariants = async (productId: string, rows: SkuVariantInput[]) => {
  const { data: existing, error: fetchErr } = await supabase
    .from('product_variants')
    .select('id, color, storage, ram, sim_type')
    .eq('product_id', productId);
  if (fetchErr) throw fetchErr;

  const keptIds = new Set<string>();
  const existingRows = existing || [];

  try {
    for (const row of rows) {
      const absPrice =
        row.price != null && Number.isFinite(Number(row.price)) ? Number(row.price) : null;
      const payload = {
        product_id: productId,
        color: row.color?.trim() || null,
        storage: row.storage?.trim() || null,
        ram: row.ram?.trim() || null,
        sim_type: row.sim_type?.trim() || null,
        stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
        price_modifier: Number(row.price_modifier ?? 0) || 0,
        price: absPrice,
        sku: row.sku?.trim() || null,
        is_active: row.is_active !== false,
        image_url: row.image_url?.trim() || null,
      };

      if (row.id) {
        const { error: uerr } = await supabase.from('product_variants').update(payload).eq('id', row.id);
        if (uerr) rethrowVariantConstraint(uerr);
        keptIds.add(row.id);
        continue;
      }

      const match = existingRows.find((e) => skuDimsMatch(e, row));
      if (match?.id) {
        const { error: uerr } = await supabase.from('product_variants').update(payload).eq('id', match.id);
        if (uerr) rethrowVariantConstraint(uerr);
        keptIds.add(match.id);
      } else {
        const { data: inserted, error: ierr } = await supabase
          .from('product_variants')
          .insert(payload)
          .select('id')
          .single();
        if (ierr) rethrowVariantConstraint(ierr);
        if (inserted?.id) keptIds.add(inserted.id);
      }
    }

    const toDelete = existingRows.filter((e) => e.id && !keptIds.has(e.id)).map((e) => e.id as string);
    if (toDelete.length > 0) {
      const { error: derr } = await supabase.from('product_variants').delete().in('id', toDelete);
      if (derr) throw derr;
    }
  } catch (e) {
    if (e instanceof Error && /Duplicate combination|Duplicate SKU/.test(e.message)) throw e;
    const err = e as { message?: string; code?: string };
    if (err?.code === '23505' || /uq_variant|duplicate key/i.test(String(err?.message || ''))) {
      rethrowVariantConstraint(err);
    }
    throw e;
  }

  void appendAuditNote('product_variants', productId, `Synced ${rows.length} stock version(s)`);
};

/** Remove all stock versions when staff switches back to single product-level stock. */
export const clearProductVariants = async (productId: string) => {
  const { error } = await supabase.from('product_variants').delete().eq('product_id', productId);
  if (error) throw error;
  void appendAuditNote('product_variants', productId, 'Cleared all stock versions');
};

export type ProductImageInput = {
  url: string;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  variant_id?: string | null;
};

/** Insert a gallery row; optionally mark primary (clears siblings). */
export const addProductImage = async (
  productId: string,
  input: ProductImageInput,
): Promise<ProductImage> => {
  const sortOrder = input.sort_order ?? 0;
  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      url: input.url,
      alt_text: input.alt_text ?? null,
      sort_order: sortOrder,
      is_primary: Boolean(input.is_primary),
      variant_id: input.variant_id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  if (input.is_primary && data?.id) {
    await setPrimaryProductImage(productId, data.id as string);
  }
  void appendAuditNote('product_images', productId, `Added image ${data?.id}`);
  return {
    id: String(data.id),
    product_id: productId,
    url: String(data.url),
    alt_text: data.alt_text ?? null,
    sort_order: Number(data.sort_order ?? 0),
    is_primary: Boolean(data.is_primary),
    variant_id: data.variant_id ?? null,
    created_at: data.created_at ?? undefined,
  };
};

/** Mark one image primary and demote others for the product. */
export const setPrimaryProductImage = async (productId: string, imageId: string): Promise<void> => {
  const { error: clearErr } = await supabase
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId);
  if (clearErr) throw clearErr;
  const { data, error } = await supabase
    .from('product_images')
    .update({ is_primary: true })
    .eq('id', imageId)
    .eq('product_id', productId)
    .select('url')
    .single();
  if (error) throw error;
  if (data?.url) {
    await supabase.from('products').update({ image_url: data.url }).eq('id', productId);
  }
  void appendAuditNote('product_images', productId, `Set primary image ${imageId}`);
};

export const deleteProductImage = async (imageId: string, productId?: string): Promise<void> => {
  const { error } = await supabase.from('product_images').delete().eq('id', imageId);
  if (error) throw error;
  if (productId) void appendAuditNote('product_images', productId, `Deleted image ${imageId}`);
};

/** Optional colour/SKU-specific gallery assignment. */
export const setProductImageVariant = async (
  imageId: string,
  variantId: string | null,
): Promise<void> => {
  const { error } = await supabase
    .from('product_images')
    .update({ variant_id: variantId })
    .eq('id', imageId);
  if (error) throw error;
};

/** Assign sequential sort_order from ordered id list. */
export const reorderProductImages = async (
  productId: string,
  orderedIds: string[],
): Promise<void> => {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('product_images')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('product_id', productId);
    if (error) throw error;
  }
  void appendAuditNote('product_images', productId, `Reordered ${orderedIds.length} images`);
};

/**
 * Best-effort staff note into audit_log.
 * WHY: RLS often blocks client inserts (trigger-only); failures must not break saves.
 */
export const appendAuditNote = async (
  entity: string,
  entityId: string,
  note: string,
): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from('audit_log').insert({
      actor_id: user?.id ?? null,
      action: 'note',
      entity,
      entity_id: String(entityId),
      new_data: { note, at: new Date().toISOString() },
    });
    if (error) console.warn('appendAuditNote failed:', error.message);
  } catch (e) {
    console.warn('appendAuditNote failed:', e);
  }
};

// Sort embedded product_images by `sort_order` ascending so consumers get a
// stable order. Primary images are surfaced first by the gallery component
// itself, not here, so list views with simple "first image" rendering still
// work via the existing `image_url` fallback.
export const normalizeProductImages = (raw: any): any[] => {
  if (!Array.isArray(raw)) return [];
  return [...raw].sort(
    (a: any, b: any) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0)
  );
};

/** Maps Postgres `text[]` / JSON arrays to clean string lists for PDP chips. */
const coerceTextArray = (val: unknown): string[] => {
  if (!Array.isArray(val)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of val) {
    if (x == null) continue;
    let s = '';
    if (typeof x === 'string') s = x.trim();
    else if (typeof x === 'number' || typeof x === 'boolean') s = String(x).trim();
    else if (typeof x === 'object' && !Array.isArray(x)) {
      try {
        const vals = Object.values(x as Record<string, unknown>).filter((v) => v != null && String(v).trim() !== '');
        if (vals.length === 1) s = String(vals[0]).trim();
      } catch {
        s = '';
      }
    } else s = String(x).trim();
    if (!s) continue;
    const low = s.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(s);
  }
  return out;
};

/** When `storage` / `ram` TEXT[] are empty, derive chips from legacy varchar columns. */
const coerceCapacityFallback = (val: unknown): string[] => {
  if (val == null || val === '') return [];
  const s = String(val).trim();
  if (!s) return [];
  const parts = s.split(/[,/|]/).map((x) => x.trim()).filter(Boolean);
  return coerceTextArray((parts.length ? parts : [s]) as unknown[]);
};

/** Maps a Supabase `products` row (+ joined relations) to the UI `Product` shape. */
export function mapProductFromDb(p: any): Product {
  if (!p) return p;
  const isNew = p.is_new != null ? Boolean(p.is_new) : Boolean(p.new);
    const storageChips = coerceTextArray(p.storage);
    const ramChips = coerceTextArray(p.ram);
    const priceFrom =
      p.price_from != null && Number.isFinite(Number(p.price_from))
        ? Number(p.price_from)
        : Number(p.price ?? p.base_price ?? 0);
    const priceTo =
      p.price_to != null && Number.isFinite(Number(p.price_to))
        ? Number(p.price_to)
        : priceFrom;
    const totalStock =
      p.total_stock != null
        ? Math.max(0, Math.floor(Number(p.total_stock)))
        : Math.max(0, Math.floor(Number(p.stock ?? 0)));
    return {
    ...p,
    category: normalizeProductCategory(p.category),
    image: p.image_url,
    new: isNew,
    is_new: isNew,
    featured: Boolean(p.featured),
    reviewCount: p.review_count,
    variants: p.product_variants ?? p.variants,
    images: normalizeProductImages(p.product_images ?? p.images),
    price: priceFrom,
    price_from: priceFrom,
    price_to: priceTo,
    stock: totalStock,
    total_stock: totalStock,
    trade_model: p.trade_model ?? undefined,
    currency: p.currency ?? 'GHS',
    condition: p.condition ?? undefined,
    status: p.status ?? undefined,
    brand: p.brand ?? undefined,
    discount: p.discount != null && p.discount !== '' ? Number(p.discount) : undefined,
    rating: p.rating != null && p.rating !== '' ? Number(p.rating) : undefined,
    colors: coerceTextArray(p.colors),
    storage: storageChips.length ? storageChips : coerceCapacityFallback(p.storage_capacity),
    ram: ramChips.length ? ramChips : coerceCapacityFallback(p.ram_capacity),
    specs: coerceTextArray(p.specs),
    specifications:
      p.specifications && typeof p.specifications === 'object' && !Array.isArray(p.specifications)
        ? (p.specifications as Record<string, unknown>)
        : p.specifications ?? undefined,
  } as Product;
}

/**
 * Storefront catalog — prefer v_product_page (single-row truth for cards).
 * Falls back to products+joins if the view is unavailable.
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    const { getCatalogFromView } = await import('./catalogApi');
    return await getCatalogFromView({ status: 'active' });
  } catch (viewErr) {
    console.warn('v_product_page unavailable — falling back to products join', viewErr);
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*), product_images(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    return rows.map((p: any) => mapProductFromDb(p));
  }
};

/**
 * Admin product list — full join so SKU matrix / chips are editable.
 * Storefront uses getProducts() → v_product_page instead.
 */
export const getProductsAdmin = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*), product_images(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((p: any) => mapProductFromDb(p));
};

export const getProduct = async (id: string): Promise<Product | null> => {
  try {
    const { getProductForPdp } = await import('./catalogApi');
    return await getProductForPdp(id);
  } catch (e) {
    console.warn('getProductForPdp failed — legacy join', e);
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*), product_images(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!data) return null;
    return mapProductFromDb(data);
  }
};

// ==========================================
// CART
// ==========================================

export const getCartItems = async (userId: string): Promise<CartItem[]> => {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*, products(*), product_variants(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map((item: any) => ({
    ...item,
    name: item.products?.name,
    price: item.product_variants ? (Number(item.products?.price) + Number(item.product_variants.price_modifier)) : Number(item.products?.price),
    image: item.products?.image_url,
    selectedOptions: item.product_variants?.sku
      ? { 'Item code': item.product_variants.sku }
      : {},
  }));
};

export const addToCart = async (userId: string, productId: string, variantId?: string, quantity: number = 1) => {
  const payload: any = { user_id: userId, product_id: productId, quantity };
  if (variantId) payload.variant_id = variantId;

  const { data, error } = await supabase
    .from('cart_items')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCartItemQuantity = async (itemId: string, quantity: number) => {
  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const removeFromCart = async (itemId: string) => {
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
  if (error) throw error;
};

export const clearCartItems = async (userId: string) => {
  const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
  if (error) throw error;
};

// ==========================================
// WISHLIST  (public.wishlist_items — RLS: own rows)
// ==========================================

/** Product ids saved by this user (newest first). */
export const getWishlistProductIds = async (userId: string): Promise<string[]> => {
  const uid = String(userId || '').trim();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('product_id')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => String((row as { product_id?: string }).product_id || '').trim())
    .filter(Boolean);
};

export const getWishlist = async (userId: string): Promise<Wishlist[]> => {
  const uid = String(userId || '').trim();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('id, user_id, product_id, created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Wishlist[];
};

export const addToWishlist = async (userId: string, productId: string) => {
  const uid = String(userId || '').trim();
  const pid = String(productId || '').trim();
  if (!uid || !pid) throw new Error('User and product are required.');
  const { data, error } = await supabase
    .from('wishlist_items')
    .upsert(
      { user_id: uid, product_id: pid },
      { onConflict: 'user_id,product_id', ignoreDuplicates: true },
    )
    .select('id, user_id, product_id, created_at')
    .maybeSingle();
  if (error) throw error;
  return data;
};

/** Prefer this over row-id delete — UI only knows product ids. */
export const removeFromWishlistByProduct = async (
  userId: string,
  productId: string,
): Promise<void> => {
  const uid = String(userId || '').trim();
  const pid = String(productId || '').trim();
  if (!uid || !pid) return;
  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('user_id', uid)
    .eq('product_id', pid);
  if (error) throw error;
};

export const removeFromWishlist = async (id: string) => {
  const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
  if (error) throw error;
};

export const clearWishlistItems = async (userId: string): Promise<void> => {
  const uid = String(userId || '').trim();
  if (!uid) return;
  const { error } = await supabase.from('wishlist_items').delete().eq('user_id', uid);
  if (error) throw error;
};

/**
 * Merge guest/local ids into the server wishlist, then return the full server list.
 * Used once on sign-in so items saved before login are not lost.
 */
export const syncWishlistWithServer = async (
  userId: string,
  localProductIds: string[],
): Promise<string[]> => {
  const uid = String(userId || '').trim();
  if (!uid) return [];

  const serverIds = await getWishlistProductIds(uid);
  const serverSet = new Set(serverIds);
  const toUpload = [
    ...new Set(
      localProductIds
        .map((id) => String(id || '').trim())
        .filter((id) => id && !serverSet.has(id)),
    ),
  ];

  if (toUpload.length > 0) {
    const { error } = await supabase.from('wishlist_items').upsert(
      toUpload.map((product_id) => ({ user_id: uid, product_id })),
      { onConflict: 'user_id,product_id', ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  return getWishlistProductIds(uid);
};

// ==========================================
// REVIEWS
// ==========================================

export const getReviews = async (productId: string): Promise<Review[]> => {
  const { data, error } = await supabase.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const addReview = async (review: Omit<Review, 'id' | 'created_at'>) => {
  const { data, error } = await supabase.from('reviews').insert(review).select().single();
  if (error) throw error;
  return data;
};

// ==========================================
// ORDERS & CHECKOUT
// ==========================================

export const placeOrder = async (
  userId: string, 
  customerId: string | null, 
  shippingAddress: string, 
  paymentMethod: string, 
  shippingMethod: string = 'Standard Delivery',
  cartItems: CartItem[] = []
) => {
  const isUuid = (v: any) =>
    typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const buildLineItems = (orderId: string) =>
    cartItems.map((item: any) => {
      const rawId = item.product_id || item.id;
      return {
        order_id: orderId,
        product_id: isUuid(rawId) ? rawId : null,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        unit_price: Number(item.price || 0),
        // Snapshot so order detail survives product edits/deletes and
        // works for cart items coming from seed/local products.
        product_name: item.name || item.title || null,
        product_image: item.image || item.image_url || null,
        product_options: buildProductOptionsForRpc(item.selectedOptions) ?? {},
      };
    });

  const ensureOrderItems = async (orderId: string) => {
    if (cartItems.length === 0) return;

    const { data: existingItems, error: existingError } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);

    if (existingError) throw existingError;
    if (existingItems && existingItems.length > 0) return;

    const rows = buildLineItems(orderId);
    const { error: itemsError } = await supabase.from('order_items').insert(rows);
    if (itemsError) {
      // Fallback: retry without product_id (in case of FK violation).
      console.warn('order_items insert failed, retrying without product_id:', itemsError);
      const fallback = rows.map((r) => ({ ...r, product_id: null }));
      const { error: retryError } = await supabase.from('order_items').insert(fallback);
      if (retryError) throw retryError;
    }
  };

  // Use direct insert so payment status starts as pending until admin confirmation.
  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)), 0);
  const shippingCost = shippingMethod.toLowerCase().includes('pick') ? 0 : 50;
  const total = subtotal + shippingCost;

  const { data: latestOrder } = await supabase
    .from('orders')
    .select('display_id')
    .not('display_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastDisplay = latestOrder?.display_id || 'ORD00000';
  const lastNumber = Number(String(lastDisplay).replace(/[^0-9]/g, '')) || 0;
  const nextDisplayId = `ORD${String(lastNumber + 1).padStart(5, '0')}`;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      display_id: nextDisplayId,
      user_id: userId,
      customer_id: customerId || null,
      status: 'pending',
      payment_status: 'pending',
      payment_method: paymentMethod,
      shipping_address: shippingAddress,
      shipping_method: shippingMethod,
      shipping_cost: shippingCost,
      total_price: total
    })
    .select()
    .single();

  if (orderError) throw orderError;

  await ensureOrderItems(order.id);

  // Atomically decrement stock for each line item that maps to a real product row.
  for (const item of cartItems as any[]) {
    const pid = item.product_id || item.id;
    const qty = Number(item.quantity || 1);
    if (typeof pid === 'string' && qty > 0) {
      try {
        await supabase.rpc('decrement_product_stock', {
          _product_id: pid,
          _quantity: qty,
        });
      } catch (e) {
        console.warn('decrement_product_stock failed for', pid, e);
      }
    }
  }

  return order;
};

export const getOrders = async (userId?: string): Promise<Order[]> => {
  let query = supabase.from('orders').select('*, order_items(*, products(*, product_variants(*)))').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  
  const { data, error } = await query;
  if (error) throw error;

  const userIds = Array.from(new Set((data || []).map((o: any) => o.user_id).filter(Boolean)));
  let profileMap = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,name,email,phone')
      .in('id', userIds);
    profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
  }

  return data.map((o: any) => ({
    ...o,
    status: normalizeOrderStatusForUi(o.status),
    userId: o.user_id,
    userName: profileMap.get(o.user_id)?.name || (profileMap.get(o.user_id)?.email ? String(profileMap.get(o.user_id).email).split('@')[0] : 'Unknown'),
    userEmail: profileMap.get(o.user_id)?.email || 'N/A',
    userPhone: profileMap.get(o.user_id)?.phone || '',
    paymentMethod: o.payment_method,
    items: (o.order_items || []).map((i: any) => ({
      ...i,
      name: i.products?.name || i.product_name || 'Item',
      image: i.products?.image_url || i.product_image || null,
      selectedOptions: mergeVariantSkuFallback(
        normalizeOrderItemOptions(i.product_options),
        i.product_variants,
      ),
      configurationLine: getOrderItemConfigurationLine(i.product_options),
      quantity: Number(i.quantity || 1),
      price: Number(i.price ?? i.unit_price ?? 0),
    })),
    total: Number(o.total_price),
    date: o.created_at
  }));
};

// Admin-focused order feed sourced from order_items
export const getAdminOrdersFromItems = async (): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('order_items')
    .select('*, orders(*), products(*, product_variants(*))');

  if (error) throw error;
  if (!data) return [];

  const grouped = new Map<string, any>();
  const userIds = new Set<string>();

  for (const row of data as any[]) {
    const ord = row.orders;
    if (!ord?.id) continue;
    if (ord.user_id) userIds.add(ord.user_id);

    if (!grouped.has(ord.id)) {
      grouped.set(ord.id, {
        ...ord,
        status: normalizeOrderStatusForUi(ord.status),
        display_id: ord.display_id,
        userId: ord.user_id,
        userName: 'Unknown',
        userEmail: 'N/A',
        userPhone: '',
        paymentMethod: ord.payment_method,
        payment_status: ord.payment_status,
        shipping_method: ord.shipping_method,
        shipping_cost: Number(ord.shipping_cost ?? 0),
        items: [],
        total: Number(ord.total_price || 0),
        date: ord.created_at
      });
    }

    grouped.get(ord.id).items.push({
      ...row,
      name: row.products?.name || row.product_name || 'Item',
      image: row.products?.image_url || row.product_image || null,
      quantity: Number(row.quantity ?? 1),
      price: Number(row.unit_price ?? row.price ?? 0),
      selectedOptions: mergeVariantSkuFallback(
        normalizeOrderItemOptions(row.product_options),
        row.product_variants,
      ),
      configurationLine: getOrderItemConfigurationLine(row.product_options),
    });
  }

  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,name,email,phone')
      .in('id', Array.from(userIds));

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    for (const order of grouped.values()) {
      const profile = profileMap.get(order.userId);
      if (profile) {
        order.userName = profile.name || (profile.email ? String(profile.email).split('@')[0] : 'Unknown');
        order.userEmail = profile.email || 'N/A';
        order.userPhone = profile.phone || '';
      }
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime();
    const bTime = new Date(b.date || 0).getTime();
    return bTime - aTime;
  });
};

export const getUserOrdersFromItems = async (userId: string): Promise<Order[]> => {
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (ordersError) throw ordersError;
  if (!ordersData || ordersData.length === 0) return [];

  const orderMap = new Map<string, any>();
  for (const ord of ordersData as any[]) {
    orderMap.set(ord.id, {
      ...ord,
      status: normalizeOrderStatusForUi(ord.status),
      display_id: ord.display_id,
      userId: ord.user_id,
      userName: 'Unknown',
      userEmail: 'N/A',
      userPhone: '',
      paymentMethod: ord.payment_method,
      shipping_method: ord.shipping_method,
      shipping_cost: Number(ord.shipping_cost ?? 0),
      items: [],
      total: Number(ord.total_price || 0),
      date: ord.created_at
    });
  }

  const orderIds = Array.from(orderMap.keys());
  const { data, error } = await supabase
    .from('order_items')
    .select('*, products(*, product_variants(*))')
    .in('order_id', orderIds);

  if (error) throw error;

  for (const row of (data || []) as any[]) {
    const target = orderMap.get(row.order_id);
    if (!target) continue;
    target.items.push({
      ...row,
      name: row.products?.name || row.product_name || 'Item',
      image: row.products?.image_url || row.product_image || null,
      quantity: Number(row.quantity ?? 1),
      price: Number(row.unit_price ?? row.price ?? 0),
      selectedOptions: mergeVariantSkuFallback(
        normalizeOrderItemOptions(row.product_options),
        row.product_variants,
      ),
      configurationLine: getOrderItemConfigurationLine(row.product_options),
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,name,email,phone')
    .eq('id', userId)
    .maybeSingle();

  for (const order of orderMap.values()) {
    order.userName = profile?.name || (profile?.email ? String(profile.email).split('@')[0] : 'Unknown');
    order.userEmail = profile?.email || 'N/A';
    order.userPhone = profile?.phone || '';
  }

  return Array.from(orderMap.values()).sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime();
    const bTime = new Date(b.date || 0).getTime();
    return bTime - aTime;
  });
};

export const getOrder = async (id: string): Promise<Order | null> => {
  const { data, error } = await supabase.from('orders').select('*, order_items(*, products(*))').eq('id', id).single();
  if (error) throw error;
  if (!data) return null;

  let profile: any = null;
  if (data.user_id) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id,name,email,phone')
      .eq('id', data.user_id)
      .maybeSingle();
    profile = profileData;
  }
  
  return {
    ...data,
    status: normalizeOrderStatusForUi(data.status),
    userId: data.user_id,
    userName: profile?.name || (profile?.email ? String(profile.email).split('@')[0] : 'Unknown'),
    userEmail: profile?.email || 'N/A',
    userPhone: profile?.phone || '',
    paymentMethod: data.payment_method,
    items: data.order_items.map((i: any) => ({
      ...i,
      name: i.products?.name || i.product_name || 'Item',
      image: i.products?.image_url || i.product_image || null,
      quantity: Number(i.quantity ?? 1),
      price: Number(i.price ?? i.unit_price ?? 0),
      selectedOptions: mergeVariantSkuFallback(
        normalizeOrderItemOptions(i.product_options),
        i.product_variants,
      ),
      configurationLine: getOrderItemConfigurationLine(i.product_options),
    })),
    total: Number(data.total_price),
    date: data.created_at
  };
};

export const updateOrderStatus = async (id: string, status: string) => {
  const normalized = String(status || '').toLowerCase();
  const payload: Record<string, any> = { status: normalized };
  if (normalized === 'delivered') {
    payload.payment_status = 'paid';
  }

  const { error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
  return { id, ...payload };
};

// ==========================================
// TRACKING UPDATES
// ==========================================

export const getTrackingUpdates = async (orderId: string): Promise<TrackingUpdate[]> => {
  let rows: Record<string, unknown>[] = [];
  const primary = await supabase
    .from('tracking_updates')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (!primary.error && primary.data) {
    rows = primary.data;
  } else {
    const fallback = await supabase
      .from('order_tracking_updates')
      .select('*')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: true });
    if (!fallback.error && fallback.data) rows = fallback.data;
  }

  return rows.map((r) => ({
    ...r,
    timestamp: (r.timestamp || r.created_at || r.updated_at) as string,
  })) as TrackingUpdate[];
};

export const addTrackingUpdate = async (update: Omit<TrackingUpdate, 'id' | 'created_at'>) => {
  const { data, error } = await supabase.from('tracking_updates').insert(update).select().single();
  if (error) throw error;
  return data;
};

// ==========================================
// REPAIR REQUESTS
// ==========================================

const REPAIR_STATUS_TO_DB: Record<string, string> = {
  Pending: 'pending',
  Received: 'pending',
  Diagnosing: 'diagnosing',
  'Estimate Sent': 'estimate_sent',
  'In Repair': 'in_repair',
  Ready: 'ready',
  Completed: 'completed',
  Rejected: 'rejected',
};

const REPAIR_STATUS_FROM_DB: Record<string, string> = {
  pending: 'Pending',
  diagnosing: 'Diagnosing',
  estimate_sent: 'Estimate Sent',
  in_repair: 'In Repair',
  ready: 'Ready',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

/** Display label for `repair_requests.status` (DB snake_case or UI Pascal Case). */
export function normalizeRepairStatusForUi(status?: string | null): string {
  if (!status || !String(status).trim()) return 'Pending';
  const key = String(status).trim().toLowerCase();
  if (REPAIR_STATUS_FROM_DB[key]) return REPAIR_STATUS_FROM_DB[key];
  return String(status).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}

/** Display label for `trade_in_requests.status`. */
export function normalizeTradeStatusForUi(status?: string | null): string {
  if (!status || !String(status).trim()) return 'Pending';
  const key = String(status).trim().toLowerCase();
  if (TRADE_STATUS_FROM_DB[key]) return TRADE_STATUS_FROM_DB[key];
  return String(status).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}

/** Maps a `repair_requests` row to the UI `RepairRequest` shape (camelCase + display strings). */
export function mapRepairFromDb(r: any): RepairRequest {
  if (!r) return r;
  const uiStatus = normalizeRepairStatusForUi(r.status);
  const costNum = r.estimated_cost != null && r.estimated_cost !== ''
    ? Number(r.estimated_cost)
    : 0;
  const costFinite = Number.isFinite(costNum) && costNum > 0;
  return {
    ...r,
    userId: r.user_id,
    userName: r.user_name || '',
    device_type: r.device_type ?? undefined,
    pricing_mode: r.pricing_mode ?? undefined,
    status: uiStatus,
    device: `${r.device_brand || ''} ${r.device_model || ''}`.trim() || '—',
    issue: r.issue_description || r.issue_type || '',
    date: r.created_at,
    imageUrl: Array.isArray(r.image_urls) ? r.image_urls[0] : '',
    image_urls: Array.isArray(r.image_urls)
      ? r.image_urls.filter((u: unknown): u is string => typeof u === 'string' && u.length > 0)
      : [],
    estimated_cost: costFinite ? costNum : undefined,
    estimatedCost: costFinite ? formatCurrency(costNum) : '',
    aiDiagnosis: r.ai_diagnosis,
    adminNote: r.admin_note,
    fulfillmentMethod: r.fulfillment_method,
  } as RepairRequest;
}

/**
 * The columns that actually exist on `public.repair_requests` after
 * the `2026_05_repair_requests.sql` migration. Anything not in this
 * allow-list is stripped before the insert/update is sent to
 * PostgREST — that protects us from stale bundles or future UI
 * additions that haven't been migrated yet (e.g. the legacy `device`
 * key that triggered REP-24).
 */
const REPAIR_DB_COLUMNS = new Set<string>([
  'id',
  'display_id',
  'user_id',
  'customer_id',
  'user_name',
  'device_brand',
  'device_model',
  'device_type',
  'pricing_mode',
  'issue_type',
  'issue_description',
  'ai_diagnosis',
  'image_urls',
  'accessories',
  'urgency',
  'fulfillment_method',
  'preferred_date',
  'preferred_time',
  'contact_name',
  'contact_phone',
  'contact_email',
  'repair_approval',
  'data_backup',
  'diagnostic_fee',
  'agrees_to_terms',
  'client_signature',
  'estimated_cost',
  'final_cost',
  'technician_notes',
  'admin_note',
  'assigned_technician',
  'status',
  'created_at',
  'updated_at',
]);

const normalizeRepairPayload = (repair: Partial<RepairRequest>) => {
  const normalized: Record<string, any> = { ...repair };

  // ---- Backward compatibility mappings ----
  // Legacy `device` (space-separated) -> device_brand / device_model
  if ((normalized as any).device && (!normalized.device_brand || !normalized.device_model)) {
    const parts = String((normalized as any).device).trim().split(' ');
    normalized.device_brand = normalized.device_brand || parts[0] || null;
    normalized.device_model = normalized.device_model || parts.slice(1).join(' ') || null;
  }
  // Legacy `issue` -> issue_description
  if ((normalized as any).issue && !normalized.issue_description) {
    normalized.issue_description = (normalized as any).issue;
  }
  // camelCase aliases -> snake_case
  if ((normalized as any).adminNote !== undefined && normalized.admin_note === undefined) {
    normalized.admin_note = (normalized as any).adminNote;
  }
  if ((normalized as any).userId !== undefined && normalized.user_id === undefined) {
    normalized.user_id = (normalized as any).userId;
  }
  if ((normalized as any).userName !== undefined && normalized.user_name === undefined) {
    normalized.user_name = (normalized as any).userName;
  }
  if ((normalized as any).fulfillmentMethod !== undefined && normalized.fulfillment_method === undefined) {
    normalized.fulfillment_method = (normalized as any).fulfillmentMethod;
  }
  if ((normalized as any).aiDiagnosis !== undefined && normalized.ai_diagnosis === undefined) {
    normalized.ai_diagnosis = (normalized as any).aiDiagnosis;
  }
  if ((normalized as any).imageUrl && (!normalized.image_urls || normalized.image_urls.length === 0)) {
    normalized.image_urls = [String((normalized as any).imageUrl)];
  }
  if ((normalized as any).estimatedCost !== undefined && normalized.estimated_cost === undefined) {
    normalized.estimated_cost = (normalized as any).estimatedCost;
  }

  // Status normalization
  if (normalized.status) {
    normalized.status = REPAIR_STATUS_TO_DB[String(normalized.status)] || String(normalized.status).toLowerCase();
  }

  // estimated_cost may arrive as "GHC 250" or "250.00" — coerce.
  if (typeof normalized.estimated_cost === 'string') {
    const parsed = Number(String(normalized.estimated_cost).replace(/[^0-9.]/g, ''));
    normalized.estimated_cost = Number.isFinite(parsed) ? parsed : null;
  }

  // DATE / TEXT fields: empty strings break inserts (invalid date).
  if (normalized.preferred_date === '' || normalized.preferred_date === null || normalized.preferred_date === undefined) {
    delete normalized.preferred_date;
  } else if (typeof normalized.preferred_date === 'string') {
    const d = new Date(normalized.preferred_date);
    if (Number.isNaN(d.getTime())) delete normalized.preferred_date;
    else normalized.preferred_date = d.toISOString().slice(0, 10);
  }
  if (normalized.preferred_time === '' || normalized.preferred_time === null) {
    delete normalized.preferred_time;
  }

  if (normalized.device_type !== undefined && normalized.device_type !== null) {
    const parsedType = parseDeviceType(String(normalized.device_type));
    if (parsedType) normalized.device_type = parsedType;
    else delete normalized.device_type;
  }

  if (normalized.pricing_mode !== undefined && normalized.pricing_mode !== null) {
    const mode = String(normalized.pricing_mode) as PricingMode;
    if (mode === PRICING_MODE.APPLE_MATRIX || mode === PRICING_MODE.DIAGNOSTIC_QUOTE) {
      normalized.pricing_mode = mode;
    } else {
      delete normalized.pricing_mode;
    }
  }

  // Drop anything that's not a real DB column. This is the safety
  // net that prevents PostgREST "could not find the 'foo' column"
  // errors when a stale bundle (or future UI) sends extra keys.
  for (const k of Object.keys(normalized)) {
    if (!REPAIR_DB_COLUMNS.has(k)) {
      delete normalized[k];
    }
  }

  return normalized;
};

function throwRepairRequestError(error: { code?: string; message?: string }): never {
  if (error?.code === '23514') {
    throw new Error(REPAIR_REQUEST_CONSTRAINT_MESSAGE);
  }
  throw error;
}

export { REPAIR_REQUEST_CONSTRAINT_MESSAGE };

export const createRepairRequest = async (repair: Partial<RepairRequest>) => {
  const payload = normalizeRepairPayload({ ...repair, status: repair.status || 'pending' });

  if (!payload.pricing_mode) {
    payload.pricing_mode = PRICING_MODE.DIAGNOSTIC_QUOTE;
  }

  assertRepairPricingConstraint(payload);

  const { data, error } = await supabase
    .from('repair_requests')
    .insert(payload)
    .select()
    .single();
  if (error) throwRepairRequestError(error);
  return mapRepairFromDb(data);
};

export const getRepairRequests = async (userId?: string): Promise<RepairRequest[]> => {
  let query = supabase.from('repair_requests').select('*').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r: any) => mapRepairFromDb(r));
};

export const updateRepairRequest = async (id: string, updates: Partial<RepairRequest>) => {
  const payload = normalizeRepairPayload(updates);
  const { data, error } = await supabase
    .from('repair_requests')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapRepairFromDb(data);
};

// ==========================================
// TRADE-IN REQUESTS
// ==========================================

const TRADE_STATUS_TO_DB: Record<string, string> = {
  Pending: 'submitted',
  Inspecting: 'inspecting',
  'Under Review': 'under_review',
  'Offer sent': 'offer_made',
  'Offer Made': 'offer_made',
  'Awaiting User': 'awaiting_user',
  Accepted: 'accepted',
  Scheduled: 'scheduled',
  Completed: 'completed',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
  Expired: 'expired',
};

const TRADE_STATUS_FROM_DB: Record<string, string> = {
  submitted: 'Pending',
  inspecting: 'Inspecting',
  under_review: 'Under Review',
  offer_made: 'Offer sent',
  awaiting_user: 'Awaiting User',
  accepted: 'Accepted',
  scheduled: 'Scheduled',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const TRADE_DB_COLUMNS = new Set([
  'id',
  'display_id',
  'user_id',
  'customer_id',
  'user_name',
  'user_email',
  'user_description',
  'device_brand',
  'device_name',
  'device_type',
  'pricing_mode',
  'storage_tier',
  'sim_variant',
  'needs_manual_review',
  'base_trade_value',
  'deduction_breakdown',
  'component_flags',
  'target_product_price',
  'top_up_amount',
  'condition',
  'accessories',
  'target_device',
  'target_product_id',
  'target_variant_id',
  'estimated_value',
  'offered_price',
  'final_value',
  'preferred_date',
  'preferred_time',
  'fulfillment_method',
  'contact_name',
  'contact_phone',
  'contact_email',
  'admin_notes',
  'status',
  'created_at',
  'updated_at',
  'imei_serial',
  'imei_1',
  'imei_2',
  'serial_number',
  'your_color',
  'target_color',
  'answers_snapshot',
  'answers_edited',
  'needs_verification',
  'below_threshold',
  'expires_at',
  'terms_accepted_at',
  'phone_verified_at',
  'pickup_address',
  'pickup_area',
  'preferred_window',
]);

export const mapTradeFromDb = (t: any): TradeInRequest => {
  if (!t) return t;
  const rawStatus = String(t.status || 'submitted').toLowerCase();
  const uiStatus = TRADE_STATUS_FROM_DB[rawStatus] ?? t.status;
  const deviceStr = `${t.device_brand || ''} ${t.device_name || ''}`.trim() || '—';
  const num = (v: any) =>
    v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined;
  return {
    ...t,
    userId: t.user_id,
    userName: t.user_name,
    userEmail: t.user_email,
    status: uiStatus,
    device: deviceStr,
    date: t.created_at,
    estimatedValue: Number(t.estimated_value) || 0,
    finalValue: num(t.final_value),
    offeredPrice: num(t.offered_price),
    base_trade_value: num(t.base_trade_value),
    top_up_amount: num(t.top_up_amount),
    target_product_price: num(t.target_product_price),
    deduction_breakdown: t.deduction_breakdown ?? undefined,
    component_flags: t.component_flags ?? undefined,
    pricing_mode: t.pricing_mode ?? undefined,
    storage_tier: t.storage_tier ?? undefined,
    sim_variant: t.sim_variant ?? undefined,
    needs_manual_review: t.needs_manual_review ?? undefined,
    device_type: t.device_type ?? undefined,
    imei_serial: t.imei_serial ?? undefined,
    imei_1: t.imei_1 ?? undefined,
    imei_2: t.imei_2 ?? undefined,
    serial_number: t.serial_number ?? undefined,
    your_color: t.your_color ?? undefined,
    target_color: t.target_color ?? undefined,
    answers_snapshot: t.answers_snapshot ?? undefined,
    answers_edited: t.answers_edited ?? undefined,
    needs_verification: t.needs_verification ?? undefined,
    below_threshold: t.below_threshold ?? undefined,
    expires_at: t.expires_at ?? undefined,
    terms_accepted_at: t.terms_accepted_at ?? undefined,
    phone_verified_at: t.phone_verified_at ?? undefined,
    pickup_address: t.pickup_address ?? undefined,
    pickup_area: t.pickup_area ?? undefined,
    preferred_window: t.preferred_window ?? undefined,
    adminNote: t.admin_notes,
    targetDevice: t.target_device,
    targetVariantId: t.target_variant_id,
    userDescription: t.user_description,
    preferredDate: t.preferred_date,
    preferredTime: t.preferred_time,
    contactName: t.contact_name,
    contactEmail: t.contact_email,
    contactPhone: t.contact_phone,
    fulfillmentMethod: t.fulfillment_method,
    condition: t.condition,
  } as TradeInRequest;
};

const normalizeTradePayload = (updates: Record<string, any>, mode: 'insert' | 'update') => {
  const normalized: Record<string, any> = { ...updates };

  const camelToSnake: [string, string][] = [
    ['userId', 'user_id'],
    ['userName', 'user_name'],
    ['userEmail', 'user_email'],
    ['userDescription', 'user_description'],
    ['deviceBrand', 'device_brand'],
    ['deviceName', 'device_name'],
    ['targetDevice', 'target_device'],
    ['targetProductId', 'target_product_id'],
    ['targetVariantId', 'target_variant_id'],
    ['estimatedValue', 'estimated_value'],
    ['offeredPrice', 'offered_price'],
    ['finalValue', 'final_value'],
    ['preferredDate', 'preferred_date'],
    ['preferredTime', 'preferred_time'],
    ['contactName', 'contact_name'],
    ['contactPhone', 'contact_phone'],
    ['contactEmail', 'contact_email'],
    ['fulfillmentMethod', 'fulfillment_method'],
    ['adminNote', 'admin_notes'],
    ['storageTier', 'storage_tier'],
    ['simVariant', 'sim_variant'],
    ['needsManualReview', 'needs_manual_review'],
  ];
  for (const [cam, snk] of camelToSnake) {
    if (normalized[cam] !== undefined && normalized[snk] === undefined) {
      normalized[snk] = normalized[cam];
    }
    delete normalized[cam];
  }

  if (normalized.admin_note !== undefined && normalized.admin_notes === undefined) {
    normalized.admin_notes = normalized.admin_note;
  }
  delete normalized.admin_note;

  if (normalized.status) {
    normalized.status =
      TRADE_STATUS_TO_DB[String(normalized.status)] || String(normalized.status).toLowerCase();
  }

  if (
    normalized.preferred_date === '' ||
    normalized.preferred_date === null ||
    normalized.preferred_date === undefined
  ) {
    delete normalized.preferred_date;
  } else if (typeof normalized.preferred_date === 'string') {
    const d = new Date(normalized.preferred_date);
    if (Number.isNaN(d.getTime())) delete normalized.preferred_date;
    else normalized.preferred_date = d.toISOString().slice(0, 10);
  }
  if (normalized.preferred_time === '' || normalized.preferred_time === null) {
    delete normalized.preferred_time;
  }

  for (const k of ['estimated_value', 'offered_price', 'final_value'] as const) {
    if (typeof normalized[k] === 'string') {
      const parsed = Number(String(normalized[k]).replace(/[^0-9.]/g, ''));
      normalized[k] = Number.isFinite(parsed) ? parsed : null;
    }
  }

  for (const k of Object.keys(normalized)) {
    if (normalized[k] === undefined) delete normalized[k];
  }

  for (const k of Object.keys(normalized)) {
    if (!TRADE_DB_COLUMNS.has(k)) delete normalized[k];
  }

  if (mode === 'update') {
    delete normalized.id;
    delete normalized.display_id;
    delete normalized.created_at;
  }

  return normalized;
};

const normalizeTradeUpdatePayload = (updates: Partial<TradeInRequest>) =>
  normalizeTradePayload(updates as Record<string, any>, 'update');

export const createTradeRequest = async (trade: Partial<TradeInRequest>) => {
  const payload = normalizeTradePayload(
    {
      ...trade,
      status: trade.status || 'submitted',
      estimated_value: trade.estimated_value ?? trade.estimatedValue ?? 0,
    } as Record<string, any>,
    'insert'
  );

  // Keep legacy imei_serial populated from split identity fields
  if (!payload.imei_serial) {
    const primary =
      (payload.imei_1 && String(payload.imei_1).trim()) ||
      (payload.serial_number && String(payload.serial_number).trim()) ||
      (payload.imei_2 && String(payload.imei_2).trim()) ||
      '';
    if (primary) payload.imei_serial = primary;
  }
  if (!payload.imei_serial) delete payload.imei_serial;

  const insertOnce = async (body: Record<string, unknown>) =>
    supabase.from('trade_in_requests').insert(body).select().single();

  let { data, error } = await insertOnce(payload);

  // DB without 2026_07_trade_imei_serial_fields.sql yet — retry on legacy imei_serial only
  if (error && isMissingTradeIdentityColumnError(error)) {
    const fallback = { ...payload };
    delete fallback.imei_1;
    delete fallback.imei_2;
    delete fallback.serial_number;
    ({ data, error } = await insertOnce(fallback));
  }

  // One more pass: strip whichever column PostgREST says is missing
  if (error) {
    const missing = extractMissingColumnName(error);
    if (missing && missing in payload) {
      const fallback = { ...payload };
      delete fallback[missing];
      if (/^imei_[12]$|^serial_number$/.test(missing)) {
        delete fallback.imei_1;
        delete fallback.imei_2;
        delete fallback.serial_number;
      }
      ({ data, error } = await insertOnce(fallback));
    }
  }

  if (error) throw error;
  return mapTradeFromDb(data);
};

function extractMissingColumnName(error: unknown): string | null {
  const raw =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: string }).message)
      : String(error || '');
  return (
    raw.match(/Could not find the ['"]([^'"]+)['"] column/i)?.[1] ||
    raw.match(/column ["']?([a-z0-9_]+)["']? of relation/i)?.[1] ||
    raw.match(/column ["']?([a-z0-9_]+)["']? does not exist/i)?.[1] ||
    null
  );
}

function isMissingTradeIdentityColumnError(error: unknown): boolean {
  const raw =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: string }).message)
      : String(error || '');
  return /imei_1|imei_2|serial_number/i.test(raw) &&
    /could not find|does not exist|schema cache/i.test(raw);
}

export const getTradeRequests = async (userId?: string): Promise<TradeInRequest[]> => {
  let query = supabase.from('trade_in_requests').select('*').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((t: any) => mapTradeFromDb(t));
};

/**
 * Resolve a trade by UUID or customer-facing display_id (TRD…).
 * WHY: History / Profile tracking links often open before context hydrates,
 * and staff sometimes paste display_id into the URL.
 */
export const getTradeRequestByRef = async (ref: string): Promise<TradeInRequest | null> => {
  const key = String(ref || '').trim();
  if (!key) return null;

  const byId = await supabase.from('trade_in_requests').select('*').eq('id', key).maybeSingle();
  if (!byId.error && byId.data) return mapTradeFromDb(byId.data);

  const byDisplay = await supabase
    .from('trade_in_requests')
    .select('*')
    .eq('display_id', key)
    .maybeSingle();
  if (byDisplay.error) throw byDisplay.error;
  return byDisplay.data ? mapTradeFromDb(byDisplay.data) : null;
};

export const updateTradeRequest = async (id: string, updates: Partial<TradeInRequest>) => {
  const payload = normalizeTradeUpdatePayload(updates);

  if (!payload.imei_serial) {
    const primary =
      (payload.imei_1 && String(payload.imei_1).trim()) ||
      (payload.serial_number && String(payload.serial_number).trim()) ||
      (payload.imei_2 && String(payload.imei_2).trim()) ||
      '';
    if (primary) payload.imei_serial = primary;
  }

  const updateOnce = async (body: Record<string, unknown>) =>
    supabase.from('trade_in_requests').update(body).eq('id', id).select().single();

  let { data, error } = await updateOnce(payload);

  if (error && isMissingTradeIdentityColumnError(error)) {
    const fallback = { ...payload };
    delete fallback.imei_1;
    delete fallback.imei_2;
    delete fallback.serial_number;
    ({ data, error } = await updateOnce(fallback));
  }

  if (error) {
    const missing = extractMissingColumnName(error);
    if (missing && missing in payload) {
      const fallback = { ...payload };
      delete fallback[missing];
      ({ data, error } = await updateOnce(fallback));
    }
  }

  if (error) throw error;
  return mapTradeFromDb(data);
};

// ==========================================
// ADMIN / INVENTORY / MESSAGING
// ==========================================

// ==========================================
// USER / ROLE MANAGEMENT (ADMIN)
// ==========================================

export const updateUserRole = async (userId: string, role: string) => {
  const caller = await AuthService.getCurrentUser();
  if (!caller || !isAdminRole(caller.role)) {
    throw new Error('Only admins can change user roles.');
  }
  if (caller.id === userId) {
    throw new Error('You cannot change your own role.');
  }
  const normalized = normalizeCanonicalRole(role);
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: normalized })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ==========================================
// CUSTOMER HELPER (CHECKOUT COMPAT)
// ==========================================

/**
 * For guest / new checkouts: upserts a profile row and returns the user id.
 * If the user is already authenticated the profile already exists.
 */
export const getOrCreateCustomer = async (
  name: string,
  email: string,
  phone: string,
  address: string,
  userId?: string
) => {
  // For authenticated checkout, RLS expects customer id to match auth user id.
  if (userId) {
    const { data: existingById } = await supabase
      .from('customers')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingById) return existingById;

    const { data, error } = await supabase
      .from('customers')
      .insert({ id: userId, name, email, phone, address })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Guest/legacy fallback
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('customers')
    .insert({ name, email, phone, address })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getInventoryAdjustments = async (productId: string) => {
  const { data, error } = await supabase.from('inventory_adjustments').select('*').eq('product_id', productId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const createInventoryAdjustment = async (adjustment: Partial<InventoryAdjustment>) => {
  const { data, error } = await supabase.from('inventory_adjustments').insert(adjustment).select().single();
  if (error) throw error;
  return data;
};

export const getUsers = async (): Promise<Profile[]> => {
  // Single-table select: RLS-friendly and avoids PostgREST embed quirks.
  // `profiles.role` is kept in sync with `user_roles` by trg_profiles_mirror_user_roles.
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((p: any) => ({
    ...p,
    role: normalizeCanonicalRole(p.role ?? 'user'),
  }));
};

export type AccountDeletionRow = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  deleted_at: string;
};

/** Admin/staff: self-service account removals (see `account_deletions` migration). */
export const getAccountDeletions = async (): Promise<AccountDeletionRow[]> => {
  const { data, error } = await supabase
    .from('account_deletions')
    .select('id, user_id, email, display_name, deleted_at')
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return (data || []) as AccountDeletionRow[];
};

/** Count rows created (or deleted_at for account_deletions) at/after `since` — for admin sidebar badges. */
export const getAdminNavBadgeCounts = async (
  since: Partial<Record<AdminNavBadgeKey, string>>,
): Promise<Record<AdminNavBadgeKey, number>> => {
  const fallback = '1970-01-01T00:00:00.000Z';
  const iso = (k: AdminNavBadgeKey) => (since[k] && String(since[k]).trim() ? String(since[k]) : fallback);

  const count = async (table: string, sinceIso: string, dateColumn = 'created_at'): Promise<number> => {
    const { count: c, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .gte(dateColumn, sinceIso);
    if (error) {
      console.warn(`getAdminNavBadgeCounts ${table}:`, error.message);
      return 0;
    }
    return c ?? 0;
  };

  const [orders, repairs, trades, customers, products, users] = await Promise.all([
    count('orders', iso('orders')),
    count('repair_requests', iso('repairs')),
    count('trade_in_requests', iso('trades')),
    count('profiles', iso('customers')),
    count('products', iso('products')),
    count('account_deletions', iso('users'), 'deleted_at'),
  ]);

  return { orders, repairs, trades, customers, products, users };
};

export const getMessages = async () => {
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const updateProfilePhone = async (userId: string, phone: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ phone })
    .eq('id', userId);
  if (error) throw error;
};
