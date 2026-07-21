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
    is_new: isNew,
    new: isNew,
    rating: row.rating != null ? Number(row.rating) : undefined,
    review_count: row.review_count != null ? Number(row.review_count) : undefined,
    reviewCount: row.review_count != null ? Number(row.review_count) : undefined,
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

/**
 * Full-text search via GIN (idx_products_search on name+brand+description).
 * Returns matching product ids, then hydrates from v_product_page.
 */
export async function searchCatalogText(query: string): Promise<Product[]> {
  const q = query.trim();
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
    // Fallback: ilike when fts rejects the query string
    const { data: soft, error: softErr } = await supabase
      .from('v_product_page')
      .select('*')
      .eq('status', 'active')
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%,description.ilike.%${q}%`);
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

/** PDP shell from the view (one row). */
export async function getProductPageRow(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('v_product_page')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProductPageRow(data as ProductPageRow);
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
    sim_type: v.sim_type != null ? String(v.sim_type) : undefined,
    price_modifier: Number(v.price_modifier ?? 0) || 0,
    price: v.price != null ? Number(v.price) : undefined,
    stock: Math.max(0, Math.floor(Number(v.stock ?? 0))),
    is_active: v.is_active !== false,
    image_url: v.image_url != null ? String(v.image_url) : undefined,
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
 */
export async function getProductForPdp(id: string): Promise<Product | null> {
  const page = await getProductPageRow(id);
  if (!page) return null;
  const [variants, images] = await Promise.all([
    getProductVariants(id),
    getProductImages(id),
  ]);
  return {
    ...page,
    variants,
    images,
    // Prefer primary gallery image when present
    image: images.find((i) => i.is_primary)?.url || page.image || page.image_url,
    image_url: images.find((i) => i.is_primary)?.url || page.image_url,
  };
}

import { resolveSkuEffectivePrice } from './skuPrice';

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
