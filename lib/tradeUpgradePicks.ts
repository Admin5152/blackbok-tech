/**
 * Staff allowlist of shop products shown as “trade into” (upgrade) targets.
 *
 * RULE: A shop product must have `products.trade_model` set (catalog link key,
 * e.g. "iPhone 17 Pro Max") before it can appear on Upgrade targets or the
 * customer Trade into screen. It does NOT need to be a tradable trade-IN device.
 *
 * Persistence: trade_config.upgrade_target_product_ids (shared) + localStorage.
 */
import type { Product } from '../types';
import type { TradeTargetRow } from '../types/supabase';
import { normalizeProductCategory } from './api';
import { supabase } from './supabase';

export const TRADE_UPGRADE_PRODUCT_IDS_KEY = 'bb_v4_trade_upgrade_product_ids';
export const TRADE_UPGRADE_PICKS_UPDATED_EVENT = 'bb_trade_upgrade_targets_updated';
export const UPGRADE_TARGET_CONFIG_KEY = 'upgrade_target_product_ids';

/** Explicit Matching trade-in model on the product (products.trade_model). */
export function productTradeModel(product: Pick<Product, 'trade_model'>): string | null {
  const m = String(product.trade_model ?? '').trim();
  return m || null;
}

/** True when staff linked this shop SKU to a catalog model (`products.trade_model`). */
export function isTradeLinkedProduct(product: Pick<Product, 'trade_model'>): boolean {
  return Boolean(productTradeModel(product));
}

/** Target catalog row must carry trade_model. */
export function isTradeLinkedTargetRow(row: Pick<TradeTargetRow, 'trade_model'>): boolean {
  return Boolean(String(row.trade_model ?? '').trim());
}

/** Suggest a catalog model name from a shop product title. */
export function suggestTradeModelFromProduct(
  product: Pick<Product, 'name' | 'category'>,
): string {
  const name = String(product.name ?? '').trim();
  if (!name) return '';
  const iphone = name.match(/iPhone\s+[\w\s]+(?:Pro\s+Max|Pro|Plus|Max|mini|SE)?/i);
  if (iphone) return iphone[0].replace(/\s+/g, ' ').trim();
  const ipad = name.match(/iPad\s+[\w\s]+(?:Pro|Air|mini)?/i);
  if (ipad) return ipad[0].replace(/\s+/g, ' ').trim();
  const cat = String(product.category ?? '').toLowerCase();
  if (cat.includes('iphone') || cat.includes('ipad')) return name;
  return '';
}

/**
 * Eligible upgrade target: iPhone/iPad shop product with trade_model set.
 * Does not require the model to exist under Tradable devices (trade-IN list).
 */
export function isEligibleTradeUpgradeProduct(
  product: Product,
  _knownTradeModels?: Set<string> | string[] | null,
): boolean {
  const name = (product.name || '').toLowerCase();
  const rawCat = String(product.category || '').toLowerCase();
  const normCat = normalizeProductCategory(product.category ?? '').toLowerCase();

  const mentionsIphoneOrIpad =
    name.includes('iphone') ||
    name.includes('ipad') ||
    rawCat.includes('iphone') ||
    rawCat.includes('ipad');

  if (!mentionsIphoneOrIpad) return false;
  if (rawCat.includes('accessor') || normCat === 'accessories') return false;

  const blocked =
    /macbook|mac book|imac|mac mini|mac studio|airpod|air pod|apple watch|watch series|magic keyboard|pencil tip|case for|cover for|screen protector|tempered glass|charger|cable\b|lightning to|usb-c to|adapter\b|folio\b|band for|strap for|gaming|playstation|xbox|nintendo|galaxy tab|samsung tab|pixel tab/;

  if (blocked.test(name)) return false;

  const linked = productTradeModel(product);
  if (!linked) return false;

  return true;
}

/** Why a product cannot be added as an upgrade target (null = ok). */
export function tradeUpgradeBlockReason(
  product: Product,
  _knownTradeModels?: Set<string> | string[] | null,
): string | null {
  if (isEligibleTradeUpgradeProduct(product)) return null;

  const name = (product.name || '').toLowerCase();
  const rawCat = String(product.category || '').toLowerCase();
  if (
    !name.includes('iphone') &&
    !name.includes('ipad') &&
    !rawCat.includes('iphone') &&
    !rawCat.includes('ipad')
  ) {
    return 'Only iPhone / iPad shop products can be upgrade targets.';
  }
  if (!isTradeLinkedProduct(product)) {
    return 'Set Matching catalog model on this product first (e.g. iPhone 17 Pro Max).';
  }
  return 'This product cannot be used as a trade-into target.';
}

export function isDefaultUpgradeCategory(category: string | null | undefined): boolean {
  const c = String(category || '').toLowerCase();
  return c.includes('iphone') || c.includes('ipad');
}

/** Must be trade-linked + iPhone/iPad (category, name, or linked model). */
export function isDefaultUpgradeTargetRow(
  row: TradeTargetRow,
  _knownTradeModels?: Set<string> | string[] | null,
): boolean {
  if (!isTradeLinkedTargetRow(row)) return false;
  if (isDefaultUpgradeCategory(row.category)) return true;
  const name = String(row.name || '').toLowerCase();
  if (name.includes('iphone') || name.includes('ipad')) return true;
  const model = String(row.trade_model || '').toLowerCase();
  return model.includes('iphone') || model.includes('ipad');
}

export function readStoredUpgradeProductIds(): string[] | null {
  try {
    const raw = localStorage.getItem(TRADE_UPGRADE_PRODUCT_IDS_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const ids = arr.filter((x): x is string => typeof x === 'string' && x.length > 0);
    return ids.length ? ids : null;
  } catch {
    return null;
  }
}

function parseIdList(raw: unknown): string[] | null {
  if (raw == null) return null;
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t || t === '[]') return null;
    try {
      arr = JSON.parse(t);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const ids = arr.filter((x): x is string => typeof x === 'string' && x.length > 0);
  return ids.length ? ids : null;
}

export async function loadUpgradeProductIds(): Promise<{
  ids: string[] | null;
  source: 'server' | 'local' | 'empty';
}> {
  try {
    const { data, error } = await supabase
      .from('trade_config')
      .select('value')
      .eq('key', UPGRADE_TARGET_CONFIG_KEY)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const ids = parseIdList(data.value);
      if (ids) {
        persistUpgradeProductIdsLocal(ids);
        return { ids, source: 'server' };
      }
      if (data.value === '[]' || data.value === '') {
        persistUpgradeProductIdsLocal([]);
        return { ids: null, source: 'empty' };
      }
    }
    // Prefer empty over a stale local mirror — durable list is trade_config in Supabase.
    return { ids: null, source: 'empty' };
  } catch {
    // Offline / RLS failure only: last-known local cache.
    const local = readStoredUpgradeProductIds();
    return { ids: local, source: local ? 'local' : 'empty' };
  }
}

function persistUpgradeProductIdsLocal(ids: string[]): void {
  if (ids.length === 0) {
    localStorage.removeItem(TRADE_UPGRADE_PRODUCT_IDS_KEY);
  } else {
    localStorage.setItem(TRADE_UPGRADE_PRODUCT_IDS_KEY, JSON.stringify(ids));
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRADE_UPGRADE_PICKS_UPDATED_EVENT));
  }
}

/**
 * Save allowlist to trade_config first, then mirror locally.
 * Throws on DB failure so the UI can keep dirty state and warn staff.
 */
export async function saveUpgradeProductIds(ids: string[]): Promise<void> {
  const clean = ids.filter((x) => typeof x === 'string' && x.length > 0);
  const value = JSON.stringify(clean);
  const description =
    'JSON array of product UUIDs allowed as trade-in upgrade targets. Empty = all eligible iPhone/iPad.';

  const { data: existing, error: readErr } = await supabase
    .from('trade_config')
    .select('key')
    .eq('key', UPGRADE_TARGET_CONFIG_KEY)
    .maybeSingle();
  if (readErr) throw readErr;

  if (existing?.key) {
    const { error: upErr } = await supabase
      .from('trade_config')
      .update({ value, description })
      .eq('key', UPGRADE_TARGET_CONFIG_KEY);
    if (upErr) throw upErr;
  } else {
    const { error: insErr } = await supabase.from('trade_config').insert({
      key: UPGRADE_TARGET_CONFIG_KEY,
      value,
      description,
    });
    if (insErr) throw insErr;
  }

  // Only mirror locally after shared config succeeds
  persistUpgradeProductIdsLocal(clean);
}

/** @deprecated Prefer saveUpgradeProductIds */
export function persistUpgradeProductIds(ids: string[]): void {
  void saveUpgradeProductIds(ids);
}

export function resolveUpgradeTargetProducts(products: Product[]): Product[] {
  const eligible = products.filter((p) => isEligibleTradeUpgradeProduct(p));
  const ids = readStoredUpgradeProductIds();
  if (ids?.length) {
    const map = new Map(eligible.map((p) => [p.id, p]));
    const out: Product[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      const p = map.get(id);
      if (p) {
        out.push(p);
        seen.add(id);
      }
    }
    // Also include every linked eligible product (linking alone must surface upgrades)
    for (const p of eligible) {
      if (!seen.has(p.id)) out.push(p);
    }
    if (out.length > 0) return out;
  }
  return eligible;
}

/**
 * Upgrade targets:
 * - Empty allowlist → all linked iPhone/iPad rows
 * - Non-empty allowlist → allowlisted IDs ∪ linked eligible rows
 *   (so Matching trade-in model alone still shows on /trade/target)
 */
export function filterTradeTargetRowsByUpgradePicks(
  rows: TradeTargetRow[],
  allowIds?: string[] | null,
  _knownTradeModels?: Set<string> | string[] | null,
): TradeTargetRow[] {
  const ids = allowIds === undefined ? readStoredUpgradeProductIds() : allowIds;
  const linkedEligible = rows
    .filter((r) => isTradeLinkedTargetRow(r))
    .filter((r) => isDefaultUpgradeTargetRow(r));

  if (ids?.length) {
    const set = new Set(ids);
    const allowlisted = rows.filter((r) => set.has(r.product_id));
    const byKey = new Set(
      allowlisted.map((r) => `${r.product_id}:${r.variant_id ?? ''}:${r.storage ?? ''}:${r.color ?? ''}`),
    );
    const merged = [...allowlisted];
    for (const r of linkedEligible) {
      const key = `${r.product_id}:${r.variant_id ?? ''}:${r.storage ?? ''}:${r.color ?? ''}`;
      if (!byKey.has(key)) {
        merged.push(r);
        byKey.add(key);
      }
    }
    return merged;
  }

  return linkedEligible;
}

/**
 * When staff link a shop product (set trade_model), append it to the shared
 * upgrade allowlist if one already exists — so /trade/target shows it immediately.
 */
export async function ensureProductInUpgradeAllowlist(productId: string): Promise<void> {
  const id = String(productId || '').trim();
  if (!id) return;
  const { ids } = await loadUpgradeProductIds();
  if (!ids?.length) return; // empty = "all linked" — nothing to append
  if (ids.includes(id)) return;
  await saveUpgradeProductIds([...ids, id]);
}

export function orderTargetProductsByAllowlist<T extends { productId: string }>(
  products: T[],
  allowIds: string[] | null | undefined,
): T[] {
  if (!allowIds?.length) return products;
  const map = new Map(products.map((p) => [p.productId, p]));
  const ordered: T[] = [];
  const seen = new Set<string>();
  for (const id of allowIds) {
    const p = map.get(id);
    if (p) {
      ordered.push(p);
      seen.add(id);
    }
  }
  for (const p of products) {
    if (!seen.has(p.productId)) ordered.push(p);
  }
  return ordered;
}
