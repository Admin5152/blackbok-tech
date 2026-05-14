import type { Product } from '../types';
import { normalizeProductCategory } from './api';

export const TRADE_UPGRADE_PRODUCT_IDS_KEY = 'bb_v4_trade_upgrade_product_ids';
export const TRADE_UPGRADE_PICKS_UPDATED_EVENT = 'bb_trade_upgrade_targets_updated';

const FALLBACK_CATEGORIES: string[] = ['iPhone', 'Laptop', 'Tablet', 'Gaming'];

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
  const ids = readStoredUpgradeProductIds();
  if (ids?.length) {
    const map = new Map(products.map((p) => [p.id, p]));
    const out: Product[] = [];
    for (const id of ids) {
      const p = map.get(id);
      if (p) out.push(p);
    }
    if (out.length > 0) return out;
  }
  return products.filter((p) => FALLBACK_CATEGORIES.includes(normalizeProductCategory(p.category ?? '')));
}

export function persistUpgradeProductIds(ids: string[]): void {
  if (ids.length === 0) {
    localStorage.removeItem(TRADE_UPGRADE_PRODUCT_IDS_KEY);
  } else {
    localStorage.setItem(TRADE_UPGRADE_PRODUCT_IDS_KEY, JSON.stringify(ids));
  }
  window.dispatchEvent(new CustomEvent(TRADE_UPGRADE_PICKS_UPDATED_EVENT));
}
