import type { Product } from '../types';
import { normalizeProductCategory } from './api';

export const TRADE_UPGRADE_PRODUCT_IDS_KEY = 'bb_v4_trade_upgrade_product_ids';
export const TRADE_UPGRADE_PICKS_UPDATED_EVENT = 'bb_trade_upgrade_targets_updated';

/** Trade-in upgrades may only target store iPhone / iPad products. */
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

export function persistUpgradeProductIds(ids: string[]): void {
  if (ids.length === 0) {
    localStorage.removeItem(TRADE_UPGRADE_PRODUCT_IDS_KEY);
  } else {
    localStorage.setItem(TRADE_UPGRADE_PRODUCT_IDS_KEY, JSON.stringify(ids));
  }
  window.dispatchEvent(new CustomEvent(TRADE_UPGRADE_PICKS_UPDATED_EVENT));
}
