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

  const chipGroups: ProductOptionGroup[] = [];
  if (fromColors.length) chipGroups.push({ name: 'Color', options: fromColors });
  if (fromStorage.length) chipGroups.push({ name: 'Storage', options: fromStorage });
  if (fromRam.length) chipGroups.push({ name: 'RAM', options: fromRam });
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
