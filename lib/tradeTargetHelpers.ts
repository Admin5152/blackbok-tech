/**
 * Helpers for Screen 5 — grouping / filtering v_trade_targets rows.
 *
 * Role in flow: turn flat in-stock SKU rows into category → model → storage →
 * SIM → colour drilldown. Only variant_stock > 0 rows are used (D11: no
 * reservation — out-of-stock colours are hidden entirely).
 */
import { sortStorageTiers } from './tradeFlowState';
import type { TradeTargetRow } from '../types/supabase';

/** In-stock rows only — D11 first-come-first-served, hide zero-stock colours */
export function filterInStockTargets(rows: TradeTargetRow[]): TradeTargetRow[] {
  return rows.filter((r) => (r.variant_stock ?? 0) > 0);
}

/** Unique shop categories present in the in-stock set */
export function distinctTargetCategories(rows: TradeTargetRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.category) set.add(r.category);
  }
  // Prefer Apple device categories first, then alpha
  const preferred = ['iPhone', 'iPad', 'Laptop', 'Accessories', 'Gaming', 'Audio'];
  return Array.from(set).sort((a, b) => {
    const ia = preferred.indexOf(a);
    const ib = preferred.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    }
    return a.localeCompare(b);
  });
}

export interface TargetProductSummary {
  productId: string;
  name: string;
  category: string | null;
  tradeModel: string | null;
  /** Lowest in-stock effective price for this product */
  priceFrom: number;
  image: string | null;
  /** Whether this product has trade_model set (bridge to trade catalog) */
  hasTradeModel: boolean;
}

/** One card per product_id from in-stock rows */
export function groupTargetsByProduct(rows: TradeTargetRow[]): TargetProductSummary[] {
  const map = new Map<string, TargetProductSummary>();
  for (const r of rows) {
    const existing = map.get(r.product_id);
    const price = Number(r.effective_price) || 0;
    if (!existing) {
      map.set(r.product_id, {
        productId: r.product_id,
        name: r.name,
        category: r.category,
        tradeModel: r.trade_model,
        priceFrom: price,
        image: r.display_image ?? r.product_image,
        hasTradeModel: Boolean(r.trade_model),
      });
    } else {
      if (price > 0 && (existing.priceFrom <= 0 || price < existing.priceFrom)) {
        existing.priceFrom = price;
      }
      if (!existing.image && (r.display_image || r.product_image)) {
        existing.image = r.display_image ?? r.product_image;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct storage values for one product (in-stock only) */
export function distinctTargetStorage(
  rows: TradeTargetRow[],
  productId: string,
): string[] {
  const tiers = new Set<string>();
  for (const r of rows) {
    if (r.product_id === productId && r.storage) tiers.add(r.storage);
  }
  return sortStorageTiers(Array.from(tiers));
}

/** Distinct SIM types for product+storage (empty ⇒ skip picker) */
export function distinctTargetSims(
  rows: TradeTargetRow[],
  productId: string,
  storage: string | null,
): string[] {
  const sims = new Set<string>();
  for (const r of rows) {
    if (r.product_id !== productId) continue;
    if (storage && r.storage !== storage) continue;
    if (r.sim_type && r.sim_type !== 'single') sims.add(r.sim_type);
  }
  const order = ['ps', 'es', 'wifi', 'cell_ps', 'cell_es'];
  return Array.from(sims).sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** In-stock colour rows for the current product/storage/sim filter */
export function targetColorRows(
  rows: TradeTargetRow[],
  productId: string,
  storage: string | null,
  sim: string | null,
): TradeTargetRow[] {
  return rows.filter((r) => {
    if (r.product_id !== productId) return false;
    if (storage && r.storage !== storage) return false;
    if (sim) {
      if (r.sim_type !== sim) return false;
    } else {
      const sims = distinctTargetSims(rows, productId, storage);
      if (sims.length > 0) return false;
    }
    // Include rows even when color is null (single undyed SKU)
    return true;
  });
}

/**
 * Resolve the exact in-stock SKU row for the current selection.
 * Returns null if the combination is not sellable.
 */
export function findTargetSku(
  rows: TradeTargetRow[],
  productId: string,
  storage: string | null,
  sim: string | null,
  color: string | null,
): TradeTargetRow | null {
  const hits = rows.filter((r) => {
    if (r.product_id !== productId) return false;
    if (storage && r.storage !== storage) return false;
    if (color != null && r.color !== color) return false;
    if (color == null && r.color) return false;
    if (sim) {
      if (r.sim_type !== sim) return false;
    }
    return true;
  });
  return hits[0] ?? null;
}
