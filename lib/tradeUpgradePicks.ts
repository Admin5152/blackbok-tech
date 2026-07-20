/**
 * Staff allowlist of shop products shown as “trade into” (upgrade) targets.
 *
 * RULE: A shop product must be trade-linked (`products.trade_model` set to a
 * tradable device model, e.g. "iPhone 17 Pro Max") before it can appear on
 * Upgrade targets or the customer Trade into screen.
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

/** True when staff linked this shop SKU to a trade-in device model. */
export function isTradeLinkedProduct(product: Pick<Product, 'trade_model'>): boolean {
  return Boolean(productTradeModel(product));
}

/** Target catalog row must carry trade_model. */
export function isTradeLinkedTargetRow(row: Pick<TradeTargetRow, 'trade_model'>): boolean {
  return Boolean(String(row.trade_model ?? '').trim());
}

function toModelSet(
  knownTradeModels?: Set<string> | string[] | null,
): Set<string> | null {
  if (knownTradeModels == null) return null;
  if (knownTradeModels instanceof Set) return knownTradeModels;
  return new Set(
    [...knownTradeModels].map((m) => String(m || '').trim()).filter(Boolean),
  );
}

/**
 * Eligible upgrade target: iPhone/iPad shop product with trade_model set.
 * When knownTradeModels is provided, trade_model must match an active device.
 */
export function isEligibleTradeUpgradeProduct(
  product: Product,
  knownTradeModels?: Set<string> | string[] | null,
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

  const set = toModelSet(knownTradeModels);
  if (set && set.size > 0 && !set.has(linked)) return false;

  return true;
}

/** Why a product cannot be added as an upgrade target (null = ok). */
export function tradeUpgradeBlockReason(
  product: Product,
  knownTradeModels?: Set<string> | string[] | null,
): string | null {
  if (isEligibleTradeUpgradeProduct(product, knownTradeModels)) return null;

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
    return 'Set Matching trade-in model on this product first (e.g. iPhone 17 Pro Max).';
  }
  const linked = productTradeModel(product);
  const set = toModelSet(knownTradeModels);
  if (linked && set && set.size > 0 && !set.has(linked)) {
    return `“${linked}” is not an active tradable device. Add it under Tradable devices, or pick a matching model.`;
  }
  return 'This product cannot be used as a trade-into target.';
}

export function isDefaultUpgradeCategory(category: string | null | undefined): boolean {
  const c = String(category || '').toLowerCase();
  return c.includes('iphone') || c.includes('ipad');
}

/** Must be trade-linked + iPhone/iPad. Optional: trade_model must be an active tradable device. */
export function isDefaultUpgradeTargetRow(
  row: TradeTargetRow,
  knownTradeModels?: Set<string> | string[] | null,
): boolean {
  if (!isTradeLinkedTargetRow(row)) return false;
  const linked = String(row.trade_model ?? '').trim();
  const set = toModelSet(knownTradeModels);
  if (set && set.size > 0 && !set.has(linked)) return false;
  if (isDefaultUpgradeCategory(row.category)) return true;
  const name = String(row.name || '').toLowerCase();
  return name.includes('iphone') || name.includes('ipad');
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
    const local = readStoredUpgradeProductIds();
    return { ids: local, source: local ? 'local' : 'empty' };
  } catch {
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
    for (const id of ids) {
      const p = map.get(id);
      if (p) out.push(p);
    }
    if (out.length > 0) return out;
  }
  return eligible;
}

/**
 * Always drops rows without trade_model — unlinked shop SKUs never appear.
 * When knownTradeModels is provided, Matching trade-in model must match an
 * active Tradable device (same gate as Admin → Upgrade phones).
 */
export function filterTradeTargetRowsByUpgradePicks(
  rows: TradeTargetRow[],
  allowIds?: string[] | null,
  knownTradeModels?: Set<string> | string[] | null,
): TradeTargetRow[] {
  const modelSet = toModelSet(knownTradeModels);
  const linked = rows.filter((r) => {
    if (!isTradeLinkedTargetRow(r)) return false;
    const m = String(r.trade_model ?? '').trim();
    if (modelSet && modelSet.size > 0 && !modelSet.has(m)) return false;
    return true;
  });
  const ids = allowIds === undefined ? readStoredUpgradeProductIds() : allowIds;

  if (ids?.length) {
    const set = new Set(ids);
    return linked.filter((r) => set.has(r.product_id));
  }

  return linked.filter((r) => isDefaultUpgradeTargetRow(r, knownTradeModels));
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
