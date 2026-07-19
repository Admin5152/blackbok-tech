import type { Product } from '../types';

/** UI option group for PDP, quick view, and store cards (PDP-04/05/07). */
export type ProductOptionGroup = { name: string; options: string[] };

/** Coerce arbitrary DB / JSON values to displayable option strings (avoids React key + toLowerCase crashes). */
export function coerceOptionStrings(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const s = toOptionString(x);
    if (!s) continue;
    const low = s.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(s);
  }
  return out;
}

/** Single value → label string (safe for keys and `.toLowerCase()`). */
export function toOptionString(x: unknown): string {
  if (x == null) return '';
  if (typeof x === 'string') return x.trim();
  if (typeof x === 'number' || typeof x === 'boolean') return String(x).trim();
  if (typeof x === 'object') {
    if (Array.isArray(x)) return '';
    try {
      const o = x as Record<string, unknown>;
      const vals = Object.values(o).filter((v) => v != null && String(v).trim() !== '');
      if (vals.length === 1) return toOptionString(vals[0]);
    } catch {
      return '';
    }
    return '';
  }
  return String(x).trim();
}

function normalizeChipArray(v: unknown): string[] {
  return coerceOptionStrings(v);
}

/** Split "256GB / 512GB" or "8GB, 16GB" style strings into distinct chip labels. */
function chipsFromScalar(val: unknown): string[] {
  if (val == null || val === '') return [];
  const s = String(val).trim();
  if (!s) return [];
  const parts = s.split(/[,/|]/).map((x) => x.trim()).filter(Boolean);
  return coerceOptionStrings(parts.length ? parts : [s]);
}

function uniqFromRows(rows: any[], key: 'color' | 'storage' | 'ram' | 'sim_type'): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const s = toOptionString(r?.[key]);
    if (!s) continue;
    const low = s.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(s);
  }
  return out;
}

/**
 * Builds Color / Storage / RAM / SIM selectors.
 *
 * Prefer live `product_variants` dimensions when SKU rows exist so the PDP
 * only shows combinations that are actually stocked / configured — not
 * orphan admin chips that never got a matrix row.
 * Fallbacks: product chip arrays → legacy named groups.
 */
export function getProductOptionGroups(product: Product | null | undefined): ProductOptionGroup[] {
  if (!product) return [];

  const asAny = product as unknown as Record<string, unknown>;

  const rows = (product.variants || []).filter(
    (v: any) =>
      v &&
      typeof v === 'object' &&
      !(typeof v.name === 'string' && Array.isArray((v as any).options))
  );

  const skuGroups: ProductOptionGroup[] = [];
  const c = uniqFromRows(rows, 'color');
  const s = uniqFromRows(rows, 'storage');
  const r = uniqFromRows(rows, 'ram');
  const sim = uniqFromRows(rows, 'sim_type');
  if (c.length) skuGroups.push({ name: 'Color', options: c });
  if (s.length) skuGroups.push({ name: 'Storage', options: s });
  if (r.length) skuGroups.push({ name: 'RAM', options: r });
  if (sim.length) skuGroups.push({ name: 'SIM', options: sim });
  if (skuGroups.length > 0) return skuGroups;

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const named = product.variants.filter(
      (v: any) =>
        v &&
        typeof v === 'object' &&
        typeof v.name === 'string' &&
        Array.isArray((v as any).options)
    );
    if (named.length > 0) {
      const legacyGroups = named
        .map((v: any) => ({
          name: String(v.name).trim() || 'Option',
          options: coerceOptionStrings(v.options),
        }))
        .filter((g) => g.options.length > 0);
      if (legacyGroups.length > 0) return legacyGroups;
    }
  }

  const fromColors = normalizeChipArray(asAny.colors);
  const fromStorage = normalizeChipArray(asAny.storage);
  const fromRam = normalizeChipArray(asAny.ram);
  const storageOpts = fromStorage.length ? fromStorage : chipsFromScalar(asAny.storage_capacity);
  const ramOpts = fromRam.length ? fromRam : chipsFromScalar(asAny.ram_capacity);

  const chipGroups: ProductOptionGroup[] = [];
  if (fromColors.length) chipGroups.push({ name: 'Color', options: fromColors });
  if (storageOpts.length) chipGroups.push({ name: 'Storage', options: storageOpts });
  if (ramOpts.length) chipGroups.push({ name: 'RAM', options: ramOpts });
  return chipGroups;
}

/** First chip per group (may be out of stock). */
export function initialSelectedFromGroups(groups: ProductOptionGroup[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const g of groups) {
    if (g.options.length > 0) initial[g.name] = g.options[0];
  }
  return initial;
}

function skuVariantRows(product: Product): Array<Record<string, unknown>> {
  return (product.variants || []).filter((v: unknown) => {
    if (!v || typeof v !== 'object') return false;
    const o = v as { name?: unknown; options?: unknown };
    return !(typeof o.name === 'string' && Array.isArray(o.options));
  }) as unknown as Array<Record<string, unknown>>;
}

function selectionFromVariantRow(
  row: Record<string, unknown>,
  groups: ProductOptionGroup[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of groups) {
    const field = mapOptionGroupToVariantField(g.name);
    let pick = '';
    if (field) {
      const cell = toOptionString(row[field]);
      if (cell) {
        const match = g.options.find((o) => normOpt(o) === normOpt(cell));
        pick = match ?? cell;
      }
    }
    if (!pick && g.options.length > 0) pick = g.options[0];
    if (pick) out[g.name] = pick;
  }
  return out;
}

function findFirstInStockCombination(
  product: Product,
  groups: ProductOptionGroup[],
): Record<string, string> | null {
  const cur: Record<string, string> = {};
  const walk = (idx: number): boolean => {
    if (idx >= groups.length) {
      return getAvailableStock(product, cur) > 0;
    }
    const g = groups[idx];
    for (const opt of g.options) {
      cur[g.name] = opt;
      if (walk(idx + 1)) return true;
    }
    delete cur[g.name];
    return false;
  };
  return walk(0) ? { ...cur } : null;
}

/**
 * Default Color / Storage / RAM when a product has option groups:
 * first variant row with stock, else first in-stock combination, else first chips.
 */
export function defaultSelectedOptionsForProduct(product: Product): Record<string, string> {
  const groups = getProductOptionGroups(product);
  if (groups.length === 0) return {};

  const rows = skuVariantRows(product);
  for (const row of rows) {
    const stock = Math.max(0, Math.floor(Number(row.stock ?? 0)));
    if (stock > 0) return selectionFromVariantRow(row, groups);
  }

  if (rows.length > 0) {
    return initialSelectedFromGroups(groups);
  }

  const combo = findFirstInStockCombination(product, groups);
  return combo ?? initialSelectedFromGroups(groups);
}

/**
 * Keep the customer's choice when possible; otherwise jump to the next in-stock SKU/combo.
 */
export function snapSelectionToInStock(
  product: Product,
  groups: ProductOptionGroup[],
  preferred: Record<string, string>,
): Record<string, string> {
  if (groups.length === 0) return {};

  const filled: Record<string, string> = { ...preferred };
  for (const g of groups) {
    if (!toOptionString(filled[g.name]) && g.options.length > 0) {
      filled[g.name] = g.options[0];
    }
  }
  if (getAvailableStock(product, filled) > 0) return filled;

  const rows = skuVariantRows(product);
  const locked = Object.entries(preferred).filter(([, v]) => toOptionString(v));

  for (const row of rows) {
    const stock = Math.max(0, Math.floor(Number(row.stock ?? 0)));
    if (stock <= 0) continue;
    const sel = selectionFromVariantRow(row, groups);
    const matches = locked.every(([k, v]) => normOpt(sel[k]) === normOpt(v));
    if (matches) return sel;
  }

  for (const row of rows) {
    const stock = Math.max(0, Math.floor(Number(row.stock ?? 0)));
    if (stock > 0) return selectionFromVariantRow(row, groups);
  }

  const combo = findFirstInStockCombination(product, groups);
  return combo ?? initialSelectedFromGroups(groups);
}

function mapOptionGroupToVariantField(groupName: string): 'color' | 'storage' | 'ram' | 'sim_type' | null {
  const n = groupName.trim().toLowerCase();
  if (n === 'color') return 'color';
  if (n === 'storage') return 'storage';
  if (n === 'ram') return 'ram';
  if (n === 'sim' || n === 'sim type' || n === 'sim_type') return 'sim_type';
  return null;
}

function normOpt(s: unknown): string {
  return toOptionString(s).toLowerCase();
}

/**
 * Units available for `product` with the given `selectedOptions`.
 * Uses per-SKU `product_variants` stock when a row matches all selected
 * Color / Storage / RAM fields; otherwise falls back to `product.stock`.
 */
/** Human label for cart / trade-in summaries, e.g. "Black · 256GB · 8GB". */
export function formatSelectedOptionsLabel(selectedOptions: Record<string, string> = {}): string {
  const parts = Object.entries(selectedOptions)
    .map(([k, v]) => {
      const s = toOptionString(v);
      return s ? `${k}: ${s}` : '';
    })
    .filter(Boolean);
  return parts.join(' · ');
}

/** Resolve the matching SKU row for selected options (incl. SIM). */
export function findVariantRowForOptions(
  product: Product,
  selectedOptions: Record<string, string> = {},
): Record<string, unknown> | null {
  const rows = skuVariantRows(product);
  if (rows.length === 0) return null;
  const selectedEntries = Object.entries(selectedOptions).filter(([, v]) => toOptionString(v));
  if (selectedEntries.length === 0) return rows[0] ?? null;

  for (const row of rows) {
    let ok = true;
    for (const [groupName, val] of selectedEntries) {
      const field = mapOptionGroupToVariantField(groupName);
      if (!field) continue;
      const cell = toOptionString(row[field]);
      // Empty cell on row means that dimension doesn't apply — skip
      if (!cell) continue;
      if (normOpt(cell) !== normOpt(val)) {
        ok = false;
        break;
      }
    }
    if (ok) return row;
  }
  return null;
}

/** Match `product_variants.id` for Color / Storage / RAM / SIM selection (checkout & trade-in). */
export function findVariantIdForOptions(
  product: Product,
  selectedOptions: Record<string, string> = {},
): string | null {
  const row = findVariantRowForOptions(product, selectedOptions);
  if (!row) return null;
  const id = toOptionString((row as { id?: unknown }).id);
  return id || null;
}

/** True when the product has at least one unit (any SKU row or base stock). */
export function productHasAnyStock(product: Product | null | undefined): boolean {
  if (!product) return false;
  return getProductMaxStock(product) > 0;
}

/** Best available qty for listing/sort (sum of SKU rows, else base stock). */
export function getProductMaxStock(product: Product): number {
  const base = Math.max(0, Math.floor(Number(product.stock ?? 0)));
  const rows = skuVariantRows(product);
  if (rows.length === 0) return base;
  const sum = rows.reduce(
    (s, row) => s + Math.max(0, Math.floor(Number(row.stock ?? 0))),
    0,
  );
  return sum > 0 ? sum : base;
}

/** In-stock products first; out-of-stock at the bottom (stable within each group). */
export function sortProductsStockFirst<T extends Product>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const aOk = productHasAnyStock(a) ? 1 : 0;
    const bOk = productHasAnyStock(b) ? 1 : 0;
    if (bOk !== aOk) return bOk - aOk;
    return getProductMaxStock(b) - getProductMaxStock(a);
  });
}

export function getAvailableStock(product: Product, selectedOptions: Record<string, string> = {}): number {
  const base = Math.max(0, Math.floor(Number(product.stock ?? 0)));

  const rows = (product.variants || []).filter(
    (v: any) =>
      v &&
      typeof v === 'object' &&
      !(typeof v.name === 'string' && Array.isArray((v as any).options)),
  );

  if (rows.length === 0) return base;

  const selectedEntries = Object.entries(selectedOptions).filter(([, v]) => toOptionString(v));
  if (selectedEntries.length === 0) return base;

  for (const row of rows) {
    let ok = true;
    for (const [groupName, val] of selectedEntries) {
      const field = mapOptionGroupToVariantField(groupName);
      if (!field) continue;
      const cell = toOptionString((row as unknown as Record<string, unknown>)[field]);
      if (!cell) {
        ok = false;
        break;
      }
      if (normOpt(cell) !== normOpt(val)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      const vs = Math.floor(Number((row as { stock?: unknown }).stock ?? 0));
      return Math.max(0, Number.isFinite(vs) ? vs : 0);
    }
  }

  return base;
}
