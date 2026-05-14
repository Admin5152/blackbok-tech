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

function uniqFromRows(rows: any[], key: 'color' | 'storage' | 'ram'): string[] {
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
 * Builds Color / Storage / RAM selectors from, in order:
 * 1) **`products.colors` / `storage` / `ram` TEXT[]** (admin dashboard chips) — **first** so PDP matches what staff saved.
 * 2) Legacy `{ name, options }[]` variant groups (seed / `INITIAL_PRODUCTS`).
 * 3) Distinct values from `product_variants` rows when chips and legacy groups are empty.
 */
export function getProductOptionGroups(product: Product | null | undefined): ProductOptionGroup[] {
  if (!product) return [];

  const asAny = product as unknown as Record<string, unknown>;

  const fromColors = normalizeChipArray(asAny.colors);
  const fromStorage = normalizeChipArray(asAny.storage);
  const fromRam = normalizeChipArray(asAny.ram);
  const storageOpts = fromStorage.length ? fromStorage : chipsFromScalar(asAny.storage_capacity);
  const ramOpts = fromRam.length ? fromRam : chipsFromScalar(asAny.ram_capacity);

  const chipGroups: ProductOptionGroup[] = [];
  if (fromColors.length) chipGroups.push({ name: 'Color', options: fromColors });
  if (storageOpts.length) chipGroups.push({ name: 'Storage', options: storageOpts });
  if (ramOpts.length) chipGroups.push({ name: 'RAM', options: ramOpts });
  if (chipGroups.length > 0) return chipGroups;

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
  if (c.length) skuGroups.push({ name: 'Color', options: c });
  if (s.length) skuGroups.push({ name: 'Storage', options: s });
  if (r.length) skuGroups.push({ name: 'RAM', options: r });
  return skuGroups;
}

export function initialSelectedFromGroups(groups: ProductOptionGroup[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const g of groups) {
    if (g.options.length > 0) initial[g.name] = g.options[0];
  }
  return initial;
}

function mapOptionGroupToVariantField(groupName: string): 'color' | 'storage' | 'ram' | null {
  const n = groupName.trim().toLowerCase();
  if (n === 'color') return 'color';
  if (n === 'storage') return 'storage';
  if (n === 'ram') return 'ram';
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
