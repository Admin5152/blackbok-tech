import type { Product, ProductVariant } from '../types';

/** One purchasable SKU row (maps to `product_variants`). */
export type SkuMatrixRow = {
  id?: string;
  color: string;
  storage: string;
  ram: string;
  stock: number;
  price_modifier: number;
  sku: string;
};

const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();

export function skuMatrixKey(row: { color?: string; storage?: string; ram?: string }): string {
  return `${norm(row.color)}|${norm(row.storage)}|${norm(row.ram)}`;
}

/** True when variant is a DB SKU row, not legacy `{ name, options }`. */
export function isDbSkuVariant(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.name === 'string' && Array.isArray(o.options)) return false;
  return Boolean(o.id || o.color || o.storage || o.ram || o.stock != null);
}

export function parseSkuVariants(variants: ProductVariant[] | undefined): SkuMatrixRow[] {
  return (variants || []).filter(isDbSkuVariant).map((v) => {
    const row = v as ProductVariant & { id?: string };
    return {
      id: row.id,
      color: String(row.color ?? '').trim(),
      storage: String(row.storage ?? '').trim(),
      ram: String(row.ram ?? '').trim(),
      stock: Math.max(0, Math.floor(Number(row.stock ?? 0))),
      price_modifier: Number(row.price_modifier ?? 0) || 0,
      sku: String(row.sku ?? '').trim(),
    };
  });
}

export function totalSkuStock(rows: SkuMatrixRow[]): number {
  return rows.reduce((sum, r) => sum + Math.max(0, Math.floor(Number(r.stock) || 0)), 0);
}

/** Cartesian product across whichever chip dimensions exist. */
export function buildSkuCombinations(
  colors: string[],
  storage: string[],
  ram: string[],
): Array<Pick<SkuMatrixRow, 'color' | 'storage' | 'ram'>> {
  const dims: { key: 'color' | 'storage' | 'ram'; values: string[] }[] = [];
  if (colors.length) dims.push({ key: 'color', values: colors });
  if (storage.length) dims.push({ key: 'storage', values: storage });
  if (ram.length) dims.push({ key: 'ram', values: ram });
  if (dims.length === 0) return [];

  const walk = (idx: number, cur: Pick<SkuMatrixRow, 'color' | 'storage' | 'ram'>): typeof dims extends never ? never : Pick<SkuMatrixRow, 'color' | 'storage' | 'ram'>[] => {
    if (idx >= dims.length) return [cur];
    const out: Pick<SkuMatrixRow, 'color' | 'storage' | 'ram'>[] = [];
    for (const v of dims[idx].values) {
      out.push(...walk(idx + 1, { ...cur, [dims[idx].key]: v }));
    }
    return out;
  };

  return walk(0, { color: '', storage: '', ram: '' });
}

/** Regenerate rows from chips while keeping stock / ids where keys match. */
export function mergeSkuMatrix(
  combos: Array<Pick<SkuMatrixRow, 'color' | 'storage' | 'ram'>>,
  existing: SkuMatrixRow[],
): SkuMatrixRow[] {
  const byKey = new Map(existing.map((r) => [skuMatrixKey(r), r]));
  return combos.map((c) => {
    const prev = byKey.get(skuMatrixKey(c));
    return {
      id: prev?.id,
      color: c.color ?? '',
      storage: c.storage ?? '',
      ram: c.ram ?? '',
      stock: prev?.stock ?? 0,
      price_modifier: prev?.price_modifier ?? 0,
      sku: prev?.sku ?? '',
    };
  });
}

export function canUseSkuMatrix(colors: string[], storage: string[], ram: string[]): boolean {
  return colors.length + storage.length + ram.length > 0;
}

export function skuMatrixEnabledForProduct(product: Product | null | undefined): boolean {
  if (!product) return false;
  if (parseSkuVariants(product.variants).length > 0) return true;
  const p = product as Product & { colors?: string[]; storage?: string[]; ram?: string[] };
  return canUseSkuMatrix(p.colors || [], p.storage || [], p.ram || []);
}

/** Keep matrix rows aligned when Color / Storage / RAM chips change. */
export function syncSkuRowsFromChips(
  colors: string[],
  storage: string[],
  ram: string[],
  existing: SkuMatrixRow[],
): SkuMatrixRow[] {
  if (!canUseSkuMatrix(colors, storage, ram)) return [];
  return mergeSkuMatrix(buildSkuCombinations(colors, storage, ram), existing);
}
