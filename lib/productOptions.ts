import type { Product } from '../types';

/** UI option group for PDP, quick view, and store cards (PDP-04/05/07). */
export type ProductOptionGroup = { name: string; options: string[] };

function normalizeChipArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

function uniqFromRows(rows: any[], key: 'color' | 'storage' | 'ram'): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const s = String(r?.[key] ?? '').trim();
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
 * 1) Legacy `{ name, options }[]` variant groups (seed / constants)
 * 2) `products.colors` / `storage` / `ram` TEXT[] chips
 * 3) Distinct values from `product_variants` rows when chips are empty
 */
export function getProductOptionGroups(product: Product | null | undefined): ProductOptionGroup[] {
  if (!product) return [];
  const asAny = product as Record<string, unknown>;

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const named = product.variants.filter(
      (v: any) =>
        v &&
        typeof v === 'object' &&
        typeof v.name === 'string' &&
        Array.isArray((v as any).options)
    );
    if (named.length > 0) {
      return named.map((v: any) => ({
        name: String(v.name),
        options: (v.options as string[]).filter(Boolean),
      }));
    }
  }

  const rows = (product.variants || []).filter(
    (v: any) =>
      v &&
      typeof v === 'object' &&
      !(typeof v.name === 'string' && Array.isArray((v as any).options))
  );

  const groups: ProductOptionGroup[] = [];

  const pushDim = (label: 'Color' | 'Storage' | 'RAM', chipKey: string, rowKey: 'color' | 'storage' | 'ram') => {
    const fromChip = normalizeChipArray(asAny[chipKey]);
    if (fromChip.length) {
      groups.push({ name: label, options: fromChip });
      return;
    }
    const fromSku = uniqFromRows(rows, rowKey);
    if (fromSku.length) groups.push({ name: label, options: fromSku });
  };

  pushDim('Color', 'colors', 'color');
  pushDim('Storage', 'storage', 'storage');
  pushDim('RAM', 'ram', 'ram');

  return groups;
}

export function initialSelectedFromGroups(groups: ProductOptionGroup[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const g of groups) {
    if (g.options.length > 0) initial[g.name] = g.options[0];
  }
  return initial;
}
