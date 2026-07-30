/**
 * Helpers for Screen 5 — grouping / filtering v_trade_targets rows.
 *
 * Role in flow: turn flat SKU rows into
 * category → model → storage → SIM → RAM → colour drilldown.
 *
 * Browse cards use in-stock rows only (D11). Configure option lists can use
 * all active variants so customers can state the version they want
 * (e.g. 16 Pro · 256GB · eSIM) even when that exact combo is awaiting stock.
 */
import { sortStorageTiers } from './tradeFlowState';
import type { TradeTargetRow } from '../types/supabase';

/** In-stock rows only — D11 first-come-first-served, hide zero-stock colours */
export function filterInStockTargets(rows: TradeTargetRow[]): TradeTargetRow[] {
  return rows.filter((r) => (r.variant_stock ?? 0) > 0);
}

/** Unique shop categories present in the set */
export function distinctTargetCategories(rows: TradeTargetRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.category) set.add(r.category);
  }
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
  /** Shop condition when known (`new` | `preowned` | `refurbished`) */
  condition?: string | null;
}

/** One product within a model browse card (new vs pre-owned twins share a group) */
export interface TargetConditionMember {
  productId: string;
  name: string;
  category: string | null;
  tradeModel: string | null;
  condition: string;
  priceFrom: number;
  image: string | null;
  hasTradeModel: boolean;
}

/** Browse card: one model, optionally multiple condition products */
export interface TargetModelGroup {
  key: string;
  name: string;
  category: string | null;
  tradeModel: string | null;
  priceFrom: number;
  image: string | null;
  hasTradeModel: boolean;
  members: TargetConditionMember[];
}

const CONDITION_ORDER = ['new', 'preowned', 'refurbished'] as const;

/** Normalize products.condition for grouping / chips */
export function normalizeProductCondition(raw?: string | null): string {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'new';
  if (s === 'pre-owned' || s === 'pre_owned' || s === 'used' || s === 'preowned') {
    return 'preowned';
  }
  if (s === 'refurb' || s === 'refurbished') return 'refurbished';
  if (s === 'new') return 'new';
  return s;
}

/** Customer-facing New / Pre-owned / Refurbished */
export function formatTargetConditionLabel(condition: string): string {
  const c = normalizeProductCondition(condition);
  if (c === 'new') return 'New';
  if (c === 'preowned') return 'Pre-owned';
  if (c === 'refurbished') return 'Refurbished';
  return c.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function targetModelGroupKey(row: Pick<TradeTargetRow, 'trade_model' | 'name'>): string {
  const model = String(row.trade_model ?? '').trim();
  if (model) return `model:${model.toLowerCase()}`;
  return `name:${String(row.name ?? '').trim().toLowerCase()}`;
}

function sortConditions(a: string, b: string): number {
  const ia = CONDITION_ORDER.indexOf(a as (typeof CONDITION_ORDER)[number]);
  const ib = CONDITION_ORDER.indexOf(b as (typeof CONDITION_ORDER)[number]);
  if (ia !== -1 || ib !== -1) {
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  }
  return a.localeCompare(b);
}

/** Distinct conditions present in a model group (stable order) */
export function conditionsInGroup(group: TargetModelGroup): string[] {
  const set = new Set(group.members.map((m) => m.condition));
  return Array.from(set).sort(sortConditions);
}

/** Map a condition member to the product summary used by configure/review */
export function summaryFromConditionMember(
  member: TargetConditionMember,
): TargetProductSummary {
  return {
    productId: member.productId,
    name: member.name,
    category: member.category,
    tradeModel: member.tradeModel,
    priceFrom: member.priceFrom,
    image: member.image,
    hasTradeModel: member.hasTradeModel,
    condition: member.condition,
  };
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
        condition: normalizeProductCondition(r.condition),
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

/**
 * One browse card per trade_model (fallback: product name).
 * New + pre-owned twins that share a model appear as one card with multiple members.
 */
export function groupTargetsByModel(rows: TradeTargetRow[]): TargetModelGroup[] {
  const byProduct = groupTargetsByProduct(rows);
  const map = new Map<string, TargetModelGroup>();

  for (const p of byProduct) {
    const key = targetModelGroupKey({
      trade_model: p.tradeModel,
      name: p.name,
    });
    const member: TargetConditionMember = {
      productId: p.productId,
      name: p.name,
      category: p.category,
      tradeModel: p.tradeModel,
      condition: normalizeProductCondition(p.condition),
      priceFrom: p.priceFrom,
      image: p.image,
      hasTradeModel: p.hasTradeModel,
    };
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        name: p.tradeModel?.trim() || p.name,
        category: p.category,
        tradeModel: p.tradeModel,
        priceFrom: p.priceFrom,
        image: p.image,
        hasTradeModel: p.hasTradeModel,
        members: [member],
      });
    } else {
      existing.members.push(member);
      if (
        p.priceFrom > 0 &&
        (existing.priceFrom <= 0 || p.priceFrom < existing.priceFrom)
      ) {
        existing.priceFrom = p.priceFrom;
      }
      if (!existing.image && p.image) existing.image = p.image;
      if (!existing.category && p.category) existing.category = p.category;
      if (!existing.tradeModel && p.tradeModel) {
        existing.tradeModel = p.tradeModel;
        existing.hasTradeModel = true;
        existing.name = p.tradeModel.trim() || existing.name;
      }
    }
  }

  for (const g of map.values()) {
    g.members.sort((a, b) => sortConditions(a.condition, b.condition));
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Prefer staff allowlist order when present (by earliest member product id) */
export function orderTargetModelGroupsByAllowlist(
  groups: TargetModelGroup[],
  allowIds: string[] | null | undefined,
): TargetModelGroup[] {
  if (!allowIds?.length) return groups;
  const rank = new Map(allowIds.map((id, i) => [id, i]));
  return [...groups].sort((a, b) => {
    const ra = Math.min(
      ...a.members.map((m) => rank.get(m.productId) ?? Number.MAX_SAFE_INTEGER),
    );
    const rb = Math.min(
      ...b.members.map((m) => rank.get(m.productId) ?? Number.MAX_SAFE_INTEGER),
    );
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

function matchesProductStorage(
  r: TradeTargetRow,
  productId: string,
  storage: string | null,
): boolean {
  if (r.product_id !== productId) return false;
  if (storage && r.storage !== storage) return false;
  return true;
}

/** Distinct storage values for one product */
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

/**
 * Distinct SIM types for product+storage.
 * Includes `ps` / `es` / cellular / wifi. Omits `single` unless it is the
 * only value (so pre-14 / single-SIM SKUs still resolve without a picker).
 */
export function distinctTargetSims(
  rows: TradeTargetRow[],
  productId: string,
  storage: string | null,
): string[] {
  const sims = new Set<string>();
  for (const r of rows) {
    if (!matchesProductStorage(r, productId, storage)) continue;
    if (r.sim_type) sims.add(r.sim_type);
  }
  const all = Array.from(sims);
  if (all.length === 0) return [];
  if (all.length === 1 && all[0] === 'single') return []; // auto-skip
  const meaningful = all.filter((s) => s !== 'single');
  const list = meaningful.length > 0 ? meaningful : all;
  const order = ['ps', 'es', 'wifi', 'cell_ps', 'cell_es', 'single'];
  return list.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/**
 * Distinct RAM for product + storage + optional SIM.
 * Pass `sim` once the SIM step is resolved (chosen or N/A).
 * Returns [] when SIM is still required but not chosen.
 */
export function distinctTargetRam(
  rows: TradeTargetRow[],
  productId: string,
  storage: string | null,
  sim: string | null,
): string[] {
  const sims = distinctTargetSims(rows, productId, storage);
  if (sims.length > 0 && !sim) return [];

  const rams = new Set<string>();
  for (const r of rows) {
    if (!matchesProductStorage(r, productId, storage)) continue;
    if (sim && r.sim_type !== sim) continue;
    if (r.ram) rams.add(r.ram);
  }
  return Array.from(rams).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return a.localeCompare(b);
  });
}

/** Colour rows for the current product/storage/sim/ram filter */
export function targetColorRows(
  rows: TradeTargetRow[],
  productId: string,
  storage: string | null,
  sim: string | null,
  ram: string | null = null,
): TradeTargetRow[] {
  const needSim = distinctTargetSims(rows, productId, storage).length > 0;
  const ramOptions = distinctTargetRam(
    rows,
    productId,
    storage,
    needSim ? sim : null,
  );
  const needRam = ramOptions.length > 1;

  return rows.filter((r) => {
    if (!matchesProductStorage(r, productId, storage)) return false;
    if (needSim) {
      if (!sim || r.sim_type !== sim) return false;
    }
    if (needRam) {
      if (!ram || r.ram !== ram) return false;
    } else if (ramOptions.length === 1 && r.ram && r.ram !== ramOptions[0]) {
      return false;
    }
    return true;
  });
}

/**
 * Prefer an in-stock SKU; fall back to any matching active row so the
 * customer can still lock their preferred version for staff.
 */
export function findTargetSku(
  rows: TradeTargetRow[],
  productId: string,
  storage: string | null,
  sim: string | null,
  color: string | null,
  ram: string | null = null,
): TradeTargetRow | null {
  const hits = rows.filter((r) => {
    if (!matchesProductStorage(r, productId, storage)) return false;
    if (color != null && r.color !== color) return false;
    if (color == null && r.color) return false;
    if (sim && r.sim_type !== sim) return false;
    if (ram && r.ram && r.ram !== ram) return false;
    return true;
  });
  if (hits.length === 0) return null;
  const inStock = hits.find((r) => (r.variant_stock ?? 0) > 0);
  return inStock ?? hits[0] ?? null;
}

/** Human-readable selection summary for the configure header */
export function formatTargetSelectionSummary(opts: {
  storage?: string | null;
  sim?: string | null;
  ram?: string | null;
  color?: string | null;
}): string {
  const parts: string[] = [];
  if (opts.storage) parts.push(opts.storage);
  if (opts.ram) parts.push(opts.ram);
  if (opts.sim && opts.sim !== 'single') {
    const simLabels: Record<string, string> = {
      ps: 'Physical SIM',
      es: 'eSIM',
      wifi: 'Wi-Fi',
      cell_ps: 'Cellular + Physical SIM',
      cell_es: 'Cellular + eSIM',
    };
    parts.push(simLabels[opts.sim] ?? opts.sim);
  }
  if (opts.color) parts.push(opts.color);
  return parts.join(' · ');
}

/** True when the chosen path has at least one in-stock unit */
export function selectionHasStock(row: TradeTargetRow | null): boolean {
  return Boolean(row && (row.variant_stock ?? 0) > 0);
}
