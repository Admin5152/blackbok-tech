/**
 * Staff allowlist of shop products shown as “trade into” (upgrade) targets.
 *
 * WHY: Catalogue can list many SKUs; trade-in should only offer products staff
 * choose (e.g. drop iPhone 17 from the upgrade list). Empty categories then
 * disappear from the customer picker.
 *
 * Persistence: trade_config.upgrade_target_product_ids (shared) + localStorage
 * mirror for instant UI / offline fallback.
 */
import type { Product } from '../types';
import type { TradeTargetRow } from '../types/supabase';
import { normalizeProductCategory } from './api';
import { supabase } from './supabase';

export const TRADE_UPGRADE_PRODUCT_IDS_KEY = 'bb_v4_trade_upgrade_product_ids';
export const TRADE_UPGRADE_PICKS_UPDATED_EVENT = 'bb_trade_upgrade_targets_updated';
/** Shared staff config key — JSON string array of product UUIDs */
export const UPGRADE_TARGET_CONFIG_KEY = 'upgrade_target_product_ids';

/** Trade-in upgrades may only target store iPhone / iPad products by default. */
export function isEligibleTradeUpgradeProduct(product: Product): boolean {
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
  return true;
}

/** Default browse categories when no staff allowlist is set. */
export function isDefaultUpgradeCategory(category: string | null | undefined): boolean {
  const c = String(category || '').toLowerCase();
  return c.includes('iphone') || c.includes('ipad');
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

/**
 * Load allowlist from trade_config (shared), falling back to localStorage.
 */
export async function loadUpgradeProductIds(): Promise<string[] | null> {
  try {
    const { data, error } = await supabase
      .from('trade_config')
      .select('value')
      .eq('key', UPGRADE_TARGET_CONFIG_KEY)
      .maybeSingle();
    if (!error && data) {
      const ids = parseIdList(data.value);
      if (ids) {
        persistUpgradeProductIdsLocal(ids);
        return ids;
      }
      // Explicit empty in config → no allowlist (show defaults)
      if (data.value === '[]' || data.value === '') {
        persistUpgradeProductIdsLocal([]);
        return null;
      }
    }
  } catch {
    /* use local */
  }
  return readStoredUpgradeProductIds();
}

function persistUpgradeProductIdsLocal(ids: string[]): void {
  if (ids.length === 0) {
    localStorage.removeItem(TRADE_UPGRADE_PRODUCT_IDS_KEY);
  } else {
    localStorage.setItem(TRADE_UPGRADE_PRODUCT_IDS_KEY, JSON.stringify(ids));
  }
  window.dispatchEvent(new CustomEvent(TRADE_UPGRADE_PICKS_UPDATED_EVENT));
}

/**
 * Save allowlist to localStorage + trade_config so all staff/customers see it.
 * Empty array clears the allowlist (customers see all eligible iPhone/iPad).
 */
export async function saveUpgradeProductIds(ids: string[]): Promise<void> {
  const clean = ids.filter((x) => typeof x === 'string' && x.length > 0);
  persistUpgradeProductIdsLocal(clean);

  const value = JSON.stringify(clean);
  const description =
    'JSON array of product UUIDs allowed as trade-in upgrade targets. Empty = all eligible iPhone/iPad.';

  const { error: upErr } = await supabase
    .from('trade_config')
    .update({ value, description })
    .eq('key', UPGRADE_TARGET_CONFIG_KEY);

  if (upErr) {
    const { error: insErr } = await supabase.from('trade_config').insert({
      key: UPGRADE_TARGET_CONFIG_KEY,
      value,
      description,
    });
    if (insErr && !/duplicate|unique/i.test(insErr.message)) {
      console.warn('saveUpgradeProductIds config write failed:', insErr.message);
    }
  }
}

/** @deprecated Prefer saveUpgradeProductIds — kept for AdminTrades modal */
export function persistUpgradeProductIds(ids: string[]): void {
  void saveUpgradeProductIds(ids);
}

export function resolveUpgradeTargetProducts(products: Product[]): Product[] {
  const eligible = products.filter(isEligibleTradeUpgradeProduct);
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
 * Apply staff allowlist (or default iPhone/iPad categories) to v_trade_targets rows.
 * Categories with zero remaining products are omitted by the UI automatically.
 */
export function filterTradeTargetRowsByUpgradePicks(
  rows: TradeTargetRow[],
  allowIds?: string[] | null,
): TradeTargetRow[] {
  const ids = allowIds === undefined ? readStoredUpgradeProductIds() : allowIds;

  if (ids?.length) {
    const set = new Set(ids);
    return rows.filter((r) => set.has(r.product_id));
  }

  // No allowlist — only iPhone / iPad shop categories (never Accessories, etc.)
  return rows.filter((r) => isDefaultUpgradeCategory(r.category));
}
