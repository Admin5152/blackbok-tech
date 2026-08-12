/**
 * Product SKU matrix helpers — Color × Storage × RAM × SIM × Size → product_variants.
 *
 * WHY: Admin Shop edits inventory per combination; storefront/checkout resolve
 * stock and effective price from these rows (not products.stock alone).
 * Size (display_size) is required for iPads (11" vs 13").
 */
import type { Product, ProductVariant } from '../types';

/** One purchasable SKU row (maps to `product_variants`). */
export type SkuMatrixRow = {
  id?: string;
  color: string;
  storage: string;
  ram: string;
  /** Physical SIM / eSIM / wifi / etc. — product_variants.sim_type */
  sim_type: string;
  /** Screen size for tablets — product_variants.display_size */
  display_size: string;
  /** Console edition (Digital / Standard / Disc) — product_variants.edition */
  edition: string;
  stock: number;
  price_modifier: number;
  /**
   * Absolute SKU price. Blank/null → storefront uses base + price_modifier
   * (fn_variant_effective_price). Set when the SKU should ignore base price.
   */
  price?: number | null;
  /** When false, SKU is hidden from storefront / trade targets. */
  is_active?: boolean;
  image_url?: string;
  sku: string;
};

const SIM_CODES = ['ps', 'es', 'single', 'wifi', 'cell_ps', 'cell_es'] as const;
export type SkuSimCode = (typeof SIM_CODES)[number];
export const SKU_SIM_CODES: readonly SkuSimCode[] = SIM_CODES;

/** Common iPad connectivity codes for admin quick-picks */
export const IPAD_SIM_OPTIONS = ['wifi', 'cell_ps', 'cell_es'] as const;

const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();

/** Normalize size labels so 10.9" / 10.9″ / 10.9 match in uniqueness checks. */
const normSize = (s: string | undefined | null) =>
  norm(s)
    .replace(/["'`′″]/g, '')
    .replace(/\s+/g, '');

/** Normalize RAM so blank and N/A are treated as the same empty axis. */
const normRam = (s: string | undefined | null) => {
  const n = norm(s);
  return !n || n === 'n/a' || n === 'na' || n === '-' ? '' : n;
};

export function skuMatrixKey(row: {
  color?: string;
  storage?: string;
  ram?: string;
  sim_type?: string;
  display_size?: string;
  edition?: string;
}): string {
  return `${normSize(row.display_size)}|${norm(row.color)}|${norm(row.storage)}|${normRam(row.ram)}|${norm(row.sim_type)}|${norm(row.edition)}`;
}

/** True when variant is a DB SKU row, not legacy `{ name, options }`. */
export function isDbSkuVariant(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.name === 'string' && Array.isArray(o.options)) return false;
  return Boolean(
    o.id ||
      o.color ||
      o.storage ||
      o.ram ||
      o.sim_type ||
      o.display_size ||
      o.edition ||
      o.stock != null,
  );
}

export function parseSkuVariants(variants: ProductVariant[] | undefined): SkuMatrixRow[] {
  return (variants || []).filter(isDbSkuVariant).map((v) => {
    const row = v as ProductVariant & { id?: string };
    const abs =
      row.price != null && Number.isFinite(Number(row.price))
        ? Number(row.price)
        : null;
    return {
      id: row.id,
      color: String(row.color ?? '').trim(),
      storage: String(row.storage ?? '').trim(),
      ram: String(row.ram ?? '').trim(),
      sim_type: String(row.sim_type ?? '').trim(),
      display_size: String(row.display_size ?? '').trim(),
      edition: String(row.edition ?? '').trim(),
      stock: Math.max(0, Math.floor(Number(row.stock ?? 0))),
      price_modifier: Number(row.price_modifier ?? 0) || 0,
      price: abs,
      is_active: row.is_active !== false,
      image_url: String(row.image_url ?? '').trim(),
      sku: String(row.sku ?? '').trim(),
    };
  });
}

export function totalSkuStock(rows: SkuMatrixRow[]): number {
  return rows.reduce((sum, r) => sum + Math.max(0, Math.floor(Number(r.stock) || 0)), 0);
}

/** Slug from size-color-storage-sim for auto SKU when staff leave code blank. */
export function autoGenerateSku(
  row: Pick<SkuMatrixRow, 'color' | 'storage' | 'ram' | 'sim_type' | 'display_size' | 'edition'>,
): string {
  const parts = [row.display_size, row.color, row.storage, row.ram, row.sim_type, row.edition]
    .map((p) =>
      (p || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean);
  return parts.join('-') || 'default';
}

/** Client preflight for uq_variant_combo — returns duplicate matrix keys. */
export function findDuplicateSkuKeys(rows: SkuMatrixRow[]): string[] {
  const seen = new Map<string, number>();
  const dups: string[] = [];
  for (const r of rows) {
    const k = skuMatrixKey(r);
    const n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    if (n === 2) dups.push(k);
  }
  return dups;
}

/** Row indices that share a combo key or the same item code (case-insensitive). */
export function findDuplicateSkuRowIndices(rows: SkuMatrixRow[]): number[] {
  const keyToIndices = new Map<string, number[]>();
  const skuToIndices = new Map<string, number[]>();

  rows.forEach((r, i) => {
    const k = skuMatrixKey(r);
    const keyList = keyToIndices.get(k) ?? [];
    keyList.push(i);
    keyToIndices.set(k, keyList);

    const sku = (r.sku || '').trim().toLowerCase();
    if (!sku) return;
    const skuList = skuToIndices.get(sku) ?? [];
    skuList.push(i);
    skuToIndices.set(sku, skuList);
  });

  const out = new Set<number>();
  for (const indices of keyToIndices.values()) {
    if (indices.length > 1) indices.forEach((i) => out.add(i));
  }
  for (const indices of skuToIndices.values()) {
    if (indices.length > 1) indices.forEach((i) => out.add(i));
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * Ensure blank/duplicate auto item codes are unique before save
 * (DB trigger historically omitted display_size and can collide on iPads).
 */
export function assignUniqueSkuCodes(rows: SkuMatrixRow[]): SkuMatrixRow[] {
  const used = new Set<string>();
  return rows.map((r) => {
    let sku = (r.sku || '').trim();
    if (!sku) sku = autoGenerateSku(r);
    let candidate = sku;
    let n = 2;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${sku}-${n}`;
      n += 1;
    }
    used.add(candidate.toLowerCase());
    return candidate === r.sku ? r : { ...r, sku: candidate };
  });
}

/** Derive product chip arrays from matrix rows (matrix is source of truth when enabled). */
export function chipsFromSkuRows(rows: SkuMatrixRow[]): {
  colors: string[];
  storage: string[];
  ram: string[];
  sim_types: string[];
  display_sizes: string[];
} {
  const uniq = (vals: string[]) => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const v of vals) {
      const t = v.trim();
      if (!t) continue;
      const low = t.toLowerCase();
      if (seen.has(low)) continue;
      seen.add(low);
      out.push(t);
    }
    return out;
  };
  return {
    colors: uniq(rows.map((r) => r.color)),
    storage: uniq(rows.map((r) => r.storage)),
    ram: uniq(rows.map((r) => r.ram).filter((x) => x.toUpperCase() !== 'N/A')),
    sim_types: uniq(rows.map((r) => r.sim_type)),
    display_sizes: uniq(rows.map((r) => r.display_size)),
  };
}

type ComboDims = Pick<SkuMatrixRow, 'color' | 'storage' | 'ram' | 'sim_type' | 'display_size' | 'edition'>;

/** Cartesian product across whichever chip dimensions exist. */
export function buildSkuCombinations(
  colors: string[],
  storage: string[],
  ram: string[],
  simTypes: string[] = [],
  displaySizes: string[] = [],
): ComboDims[] {
  const dims: { key: keyof ComboDims; values: string[] }[] = [];
  if (displaySizes.length) dims.push({ key: 'display_size', values: displaySizes });
  if (colors.length) dims.push({ key: 'color', values: colors });
  if (storage.length) dims.push({ key: 'storage', values: storage });
  if (ram.length) dims.push({ key: 'ram', values: ram });
  if (simTypes.length) dims.push({ key: 'sim_type', values: simTypes });
  if (dims.length === 0) return [];

  const walk = (idx: number, cur: ComboDims): ComboDims[] => {
    if (idx >= dims.length) return [cur];
    const out: ComboDims[] = [];
    for (const v of dims[idx].values) {
      out.push(...walk(idx + 1, { ...cur, [dims[idx].key]: v }));
    }
    return out;
  };

  return walk(0, { color: '', storage: '', ram: '', sim_type: '', display_size: '', edition: '' });
}

/** Regenerate rows from chips while keeping stock / ids / prices where keys match. */
export function mergeSkuMatrix(combos: ComboDims[], existing: SkuMatrixRow[]): SkuMatrixRow[] {
  const byKey = new Map(existing.map((r) => [skuMatrixKey(r), r]));
  return combos.map((c) => {
    const prev = byKey.get(skuMatrixKey(c));
    return {
      id: prev?.id,
      color: c.color ?? '',
      storage: c.storage ?? '',
      ram: c.ram ?? '',
      sim_type: c.sim_type ?? '',
      display_size: c.display_size ?? '',
      edition: c.edition ?? prev?.edition ?? '',
      stock: prev?.stock ?? 0,
      price_modifier: prev?.price_modifier ?? 0,
      price: prev?.price ?? null,
      is_active: prev?.is_active !== false,
      image_url: prev?.image_url ?? '',
      sku: prev?.sku ?? '',
    };
  });
}

export function canUseSkuMatrix(
  colors: string[],
  storage: string[],
  ram: string[],
  simTypes: string[] = [],
  displaySizes: string[] = [],
): boolean {
  return colors.length + storage.length + ram.length + simTypes.length + displaySizes.length > 0;
}

export function skuMatrixEnabledForProduct(product: Product | null | undefined): boolean {
  if (!product) return false;
  if (parseSkuVariants(product.variants).length > 0) return true;
  const p = product as Product & {
    colors?: string[];
    storage?: string[];
    ram?: string[];
    sim_types?: string[];
    display_sizes?: string[];
  };
  return canUseSkuMatrix(
    p.colors || [],
    p.storage || [],
    p.ram || [],
    p.sim_types || [],
    p.display_sizes || [],
  );
}

/** Keep matrix rows aligned when chips change. */
export function syncSkuRowsFromChips(
  colors: string[],
  storage: string[],
  ram: string[],
  existing: SkuMatrixRow[],
  simTypes: string[] = [],
  displaySizes: string[] = [],
): SkuMatrixRow[] {
  if (!canUseSkuMatrix(colors, storage, ram, simTypes, displaySizes)) return [];
  const combos = buildSkuCombinations(colors, storage, ram, simTypes, displaySizes);
  const editions = Array.from(
    new Set(existing.map((r) => String(r.edition ?? '').trim()).filter(Boolean)),
  );
  const expanded =
    editions.length > 0
      ? combos.flatMap((c) => editions.map((edition) => ({ ...c, edition })))
      : combos;
  return mergeSkuMatrix(expanded, existing);
}

/** Health view 12f — Apple / iPhone / iPad active catalog missing trade bridge. */
export function isAppleMissingTradeModel(p: Product): boolean {
  const status = String(p.status || 'active').toLowerCase();
  if (status !== 'active') return false;
  if (p.trade_model != null && String(p.trade_model).trim() !== '') return false;
  const brand = String(p.brand || '').toLowerCase();
  const cat = String(p.category || '').toLowerCase();
  return brand === 'apple' || cat === 'iphone' || cat === 'ipad';
}

/** Health view 10g — iPhone 14–17 trade_model with only single/null SIM variants. */
export function isIphone14PlusMissingSim(p: Product): boolean {
  const tm = String(p.trade_model || '');
  if (!/iPhone\s*1[4-7]/i.test(tm)) return false;
  const rows = parseSkuVariants(p.variants);
  if (rows.length === 0) return true;
  return rows.some((r) => {
    const sim = (r.sim_type || 'single').trim().toLowerCase() || 'single';
    return sim === 'single';
  });
}
