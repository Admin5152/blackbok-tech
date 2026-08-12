/**
 * Storefront catalog API — reads `v_product_page` (no client joins for cards).
 *
 * Role in flow: listing + PDP shell come from the view; PDP then fetches
 * `product_variants` + `product_images` for SKU resolution and gallery swap.
 * Search uses PostgREST `.textSearch` so the GIN index on products is hit.
 */
import { supabase } from './supabase';
import type { Product, ProductImage, ProductVariant } from '../types';
import type { ProductPageRow } from '../types/supabase';
import { normalizeProductCategory, normalizeProductImages, normalizeProductCondition } from './api';
import { resolveSkuEffectivePrice } from './skuPrice';
import { isProductUuid } from './productUrl';
import { buildIlikeOrFilter, sanitizeSearchQuery } from './security';

/** Map one v_product_page row → UI Product (card-ready; no variants). */
export function mapProductPageRow(row: ProductPageRow): Product {
  const priceFrom =
    row.price_from != null && Number.isFinite(Number(row.price_from))
      ? Number(row.price_from)
      : Number(row.base_price ?? 0);
  const priceTo =
    row.price_to != null && Number.isFinite(Number(row.price_to))
      ? Number(row.price_to)
      : priceFrom;
  const totalStock = Math.max(0, Math.floor(Number(row.total_stock ?? 0)));
  const isNew = row.is_new != null ? Boolean(row.is_new) : false;

  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? undefined,
    slug: row.slug ?? undefined,
    category: normalizeProductCategory(row.category),
    subcategory: (row as ProductPageRow & { subcategory?: string | null }).subcategory ?? undefined,
    description: row.description ?? '',
    price: priceFrom,
    price_from: priceFrom,
    price_to: priceTo,
    discount:
      row.discount != null && row.discount !== ('' as unknown)
        ? Number(row.discount)
        : undefined,
    stock: totalStock,
    total_stock: totalStock,
    image_url: row.image_url ?? undefined,
    image: row.image_url ?? undefined,
    colors: Array.isArray(row.colors) ? row.colors.filter(Boolean) : [],
    storage: Array.isArray(row.storage) ? row.storage.filter(Boolean) : [],
    ram: Array.isArray(row.ram) ? row.ram.filter(Boolean) : [],
    specs: Array.isArray(row.specs) ? row.specs.filter(Boolean) : [],
    condition: normalizeProductCondition(row.condition) ?? undefined,
    status: row.status ?? undefined,
    trade_model: row.trade_model ?? undefined,
    featured: Boolean(row.featured),
    is_deal_of_the_day: Boolean(
      (row as ProductPageRow & { is_deal_of_the_day?: boolean | null }).is_deal_of_the_day,
    ),
    isDealOfTheDay: Boolean(
      (row as ProductPageRow & { is_deal_of_the_day?: boolean | null }).is_deal_of_the_day,
    ),
    promo_text:
      (row as ProductPageRow & { promo_text?: string | null }).promo_text ?? null,
    promoText:
      (row as ProductPageRow & { promo_text?: string | null }).promo_text ?? null,
    is_new: isNew,
    new: isNew,
    rating: row.rating != null ? Number(row.rating) : undefined,
    review_count: row.review_count != null ? Number(row.review_count) : undefined,
    reviewCount: row.review_count != null ? Number(row.review_count) : undefined,
    specifications:
      row.specifications && typeof row.specifications === 'object' && !Array.isArray(row.specifications)
        ? (row.specifications as Record<string, unknown>)
        : null,
  };
}

/**
 * Catalog listing — single query against v_product_page.
 * Active products only; optional category filter.
 */
export async function getCatalogFromView(opts?: {
  category?: string;
  status?: string;
}): Promise<Product[]> {
  let query = supabase.from('v_product_page').select('*');
  const status = opts?.status ?? 'active';
  if (status) query = query.eq('status', status);
  if (opts?.category) query = query.eq('category', opts.category);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r) => mapProductPageRow(r as ProductPageRow));
}

/** Active products flagged as Deal of the Day (shop category). */
export async function getDealOfTheDayFromView(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('v_product_page')
    .select('*')
    .eq('status', 'active')
    .eq('is_deal_of_the_day', true);

  if (error) throw error;
  return (data || []).map((r) => mapProductPageRow(r as ProductPageRow));
}

/**
 * Full-text search via GIN (idx_products_search on name+brand+description).
 * Returns matching product ids, then hydrates from v_product_page.
 */
export async function searchCatalogText(query: string): Promise<Product[]> {
  const q = sanitizeSearchQuery(query);
  if (!q) return getCatalogFromView();

  // Hit the GIN index via textSearch on name (english config matches migration).
  // Brand/description are in the same tsvector expression — websearch on name
  // still uses the planner path; we OR brand/description for recall.
  const { data: hits, error } = await supabase
    .from('products')
    .select('id')
    .eq('status', 'active')
    .textSearch('name', q, { type: 'websearch', config: 'english' });

  if (error) {
    // Fallback: ilike when fts rejects the query — never interpolate raw user input.
    const orFilter = buildIlikeOrFilter(['name', 'brand', 'description'], q);
    if (!orFilter) return [];
    const { data: soft, error: softErr } = await supabase
      .from('v_product_page')
      .select('*')
      .eq('status', 'active')
      .or(orFilter);
    if (softErr) throw softErr;
    return (soft || []).map((r) => mapProductPageRow(r as ProductPageRow));
  }

  const ids = (hits || []).map((h: { id: string }) => h.id);
  if (ids.length === 0) return [];

  const { data: rows, error: viewErr } = await supabase
    .from('v_product_page')
    .select('*')
    .in('id', ids)
    .eq('status', 'active');
  if (viewErr) throw viewErr;
  return (rows || []).map((r) => mapProductPageRow(r as ProductPageRow));
}

/** PDP shell from the view (one row). Accepts product UUID or slug. */
export async function getProductPageRow(idOrSlug: string): Promise<Product | null> {
  const key = decodeURIComponent(String(idOrSlug || '').trim());
  if (!key) return null;

  if (isProductUuid(key)) {
    const { data, error } = await supabase
      .from('v_product_page')
      .select('*')
      .eq('id', key)
      .maybeSingle();
    if (error) throw error;
    return data ? mapProductPageRow(data as ProductPageRow) : null;
  }

  const bySlug = await supabase
    .from('v_product_page')
    .select('*')
    .eq('slug', key)
    .maybeSingle();
  if (bySlug.error) throw bySlug.error;
  if (bySlug.data) return mapProductPageRow(bySlug.data as ProductPageRow);

  // Generated URLs: `{name-slug}--{uuid-prefix}`
  const sep = key.lastIndexOf('--');
  if (sep > 0) {
    const idPrefix = key.slice(sep + 2).trim();
    if (/^[0-9a-f]{8}$/i.test(idPrefix)) {
      const { data, error } = await supabase
        .from('v_product_page')
        .select('*')
        .ilike('id', `${idPrefix}%`)
        .limit(2);
      if (error) throw error;
      const rows = (data || []) as ProductPageRow[];
      if (rows.length === 1) return mapProductPageRow(rows[0]);
      if (rows.length > 1) {
        const nameSlug = key.slice(0, sep);
        const hit =
          rows.find((r) => String(r.slug || '') === key) ||
          rows.find((r) => {
            const n = String(r.name || '')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '');
            return n === nameSlug || n.startsWith(nameSlug) || nameSlug.startsWith(n);
          }) ||
          rows[0];
        return mapProductPageRow(hit);
      }
    }
  }

  return null;
}

/** Active SKU rows for PDP picker — separate from the card view query. */
export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('color', { ascending: true });
  if (error) throw error;
  return (data || []).map((v: Record<string, unknown>) => ({
    id: String(v.id),
    product_id: String(v.product_id),
    sku: v.sku != null ? String(v.sku) : undefined,
    color: v.color != null ? String(v.color) : undefined,
    ram: v.ram != null ? String(v.ram) : undefined,
    storage: v.storage != null ? String(v.storage) : undefined,
    display_size: v.display_size != null ? String(v.display_size) : undefined,
    edition: v.edition != null ? String(v.edition) : undefined,
    sim_type: v.sim_type != null ? String(v.sim_type) : undefined,
    price_modifier: Number(v.price_modifier ?? 0) || 0,
    price: v.price != null ? Number(v.price) : undefined,
    stock: Math.max(0, Math.floor(Number(v.stock ?? 0))),
    is_active: v.is_active !== false,
    image_url: v.image_url != null ? String(v.image_url) : undefined,
    attributes:
      v.attributes && typeof v.attributes === 'object'
        ? (v.attributes as Record<string, unknown>)
        : undefined,
  }));
}

/** Gallery rows — variant_id used for color-swap on PDP. */
export async function getProductImages(productId: string): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return normalizeProductImages(data);
}

/**
 * PDP payload: view row + variants + images.
 * WHY not one join for cards: acceptance requires cards from view only.
 * `idOrSlug` may be a UUID, DB slug, or generated `{name}--{idPrefix}` URL.
 */
export async function getProductForPdp(idOrSlug: string): Promise<Product | null> {
  const page = await getProductPageRow(idOrSlug);
  if (!page) return null;
  const id = page.id;
  const [variants, images, baseRes] = await Promise.all([
    getProductVariants(id),
    getProductImages(id),
    supabase.from('products').select('price').eq('id', id).maybeSingle(),
  ]);
  const basePrice = Number(
    (baseRes.data as { price?: number | null } | null)?.price ?? page.price ?? 0,
  );
  const effectivePrices = variants
    .filter((v) => v.is_active !== false)
    .map((v) =>
      resolveSkuEffectivePrice({
        productPrice: Number.isFinite(basePrice) && basePrice > 0 ? basePrice : page.price,
        variantPrice: v.price,
        priceModifier: v.price_modifier,
      }),
    )
    .filter((n) => Number.isFinite(n) && n > 0);
  const priceFrom = effectivePrices.length
    ? Math.min(...effectivePrices)
    : Number.isFinite(basePrice) && basePrice > 0
      ? basePrice
      : Number(page.price_from ?? page.price ?? 0);
  const priceTo = effectivePrices.length ? Math.max(...effectivePrices) : priceFrom;
  const primaryUrl = images.find((i) => i.is_primary)?.url || page.image || page.image_url;

  return {
    ...page,
    price: Number.isFinite(basePrice) && basePrice > 0 ? basePrice : priceFrom,
    price_from: priceFrom,
    price_to: priceTo,
    variants,
    images,
    image: primaryUrl,
    image_url: primaryUrl || page.image_url,
  };
}

/** Effective price for a SKU — mirrors fn_variant_effective_price / resolveSkuEffectivePrice. */
export function variantEffectivePrice(
  product: Product,
  variant: ProductVariant | null | undefined,
): number {
  if (!variant) return Number(product.price_from ?? product.price ?? 0);
  return resolveSkuEffectivePrice({
    productPrice: product.price ?? product.price_from,
    variantPrice: variant.price,
    priceModifier: variant.price_modifier,
  });
}

const tradeMaxCache = new Map<string, { value: number; at: number }>();
const TRADE_MAX_TTL_MS = 5 * 60 * 1000;

/**
 * MAX active base_value for a trade_model — one query, 5-min memory cache.
 * Used by PDP trade-in banner ("get up to GHS X").
 */
export async function getMaxTradeBaseForModel(tradeModel: string): Promise<number> {
  const key = tradeModel.trim();
  if (!key) return 0;
  const hit = tradeMaxCache.get(key);
  if (hit && Date.now() - hit.at < TRADE_MAX_TTL_MS) return hit.value;

  const { data, error } = await supabase
    .from('trade_base_values')
    .select('base_value')
    .eq('model', key)
    .eq('is_active', true)
    .order('base_value', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const value = data?.base_value != null ? Number(data.base_value) : 0;
  tradeMaxCache.set(key, { value, at: Date.now() });
  return value;
}

/** Persist PDP → trade deep-link seed (variant preselected as target). */
export const TRADE_PDP_SEED_KEY = 'trade_v2_pdp_target_seed';

export function saveTradeTargetSeed(payload: unknown): void {
  try {
    sessionStorage.setItem(TRADE_PDP_SEED_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function consumeTradeTargetSeed<T = unknown>(): T | null {
  try {
    const raw = sessionStorage.getItem(TRADE_PDP_SEED_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(TRADE_PDP_SEED_KEY);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
