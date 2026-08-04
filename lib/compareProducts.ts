import type { Product } from '../types';
import { formatCurrency } from './utils';

export const COMPARE_MAX_ITEMS = 4;
export const COMPARE_PICKER_PAGE_SIZE = 12;

export function normalizeCompareSearchText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function productCompareSearchHaystack(product: Product): string {
  return normalizeCompareSearchText(
    [product.name, product.brand, product.category, product.description].filter(Boolean).join(' '),
  );
}

/** Products eligible for the compare picker (excludes already-selected IDs). */
export function filterComparePickerProducts(
  allProducts: Product[],
  compareIds: string[],
  searchTerm: string,
): Product[] {
  const tokens = normalizeCompareSearchText(searchTerm).split(' ').filter(Boolean);
  return allProducts.filter((p) => {
    if (compareIds.includes(p.id)) return false;
    if (tokens.length === 0) return true;
    const haystack = productCompareSearchHaystack(p);
    return tokens.every((token) => haystack.includes(token));
  });
}

/** Preserve compare column order from `compareIds`. */
export function resolveCompareProducts(allProducts: Product[], compareIds: string[]): Product[] {
  return compareIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
}

export interface CompareWinBadge {
  key: string;
  label: string;
  highlight?: boolean;
}

export type CompareRowGroup =
  | 'Price & value'
  | 'Availability'
  | 'Specs'
  | 'Highlights';

export type CompareWinnerMode = 'lower' | 'higher' | 'none';

export interface CompareRow {
  key: string;
  label: string;
  group: CompareRowGroup;
  values: Record<string, string>;
  /** Raw numeric values for scoring / deltas when available */
  numericValues?: Record<string, number | null>;
  winnerIds: string[];
  winnerMode: CompareWinnerMode;
}

export interface CompareProductScore {
  productId: string;
  wins: number;
}

export interface CompareRuling {
  winnerId: string | null;
  winnerName: string | null;
  isTie: boolean;
  scores: CompareProductScore[];
  winLabels: string[];
  summary: string;
}

export interface CompareForkItem {
  key: string;
  label: string;
  value: string;
  opponentValue: string;
  deltaLabel?: string;
}

function displayPrice(p: Product): number {
  const n = Number(p.price_from ?? p.price ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function stockOf(p: Product): number {
  const n = Number(p.total_stock ?? p.stock ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function conditionLabel(p: Product): string {
  const c = String(p.condition || '').toLowerCase();
  if (c === 'refurbished') return 'Refurbished';
  if (c === 'preowned' || c === 'used' || (c !== 'new' && p.is_new === false)) return 'Pre-owned';
  if (c === 'new' || p.is_new === true) return 'New';
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : '—';
}

function uniqJoin(values: Array<string | null | undefined>): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = String(raw ?? '').trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out.length ? out.join(', ') : '—';
}

function variantField(p: Product, field: 'storage' | 'ram' | 'color' | 'sim_type' | 'display_size'): string {
  const fromChips =
    field === 'storage'
      ? [...(p.storage ?? []), p.storage_capacity]
      : field === 'ram'
        ? [...(p.ram ?? []), p.ram_capacity]
        : field === 'color'
          ? [...(p.colors ?? [])]
          : field === 'sim_type'
            ? []
            : [];

  const fromVariants = (p.variants ?? []).map((v) => {
    if (field === 'color') return v.color;
    if (field === 'storage') return v.storage;
    if (field === 'ram') return v.ram;
    if (field === 'sim_type') return v.sim_type;
    return v.display_size;
  });

  return uniqJoin([...fromChips, ...fromVariants]);
}

function humanizeSpecKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseLooseNumber(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!cleaned) return null;
  const n = Number(cleaned[0]);
  return Number.isFinite(n) ? n : null;
}

function pickWinners(
  products: Product[],
  numericById: Record<string, number | null>,
  mode: CompareWinnerMode,
): string[] {
  if (mode === 'none' || products.length < 2) return [];
  const entries = products
    .map((p) => ({ id: p.id, n: numericById[p.id] }))
    .filter((e): e is { id: string; n: number } => e.n != null && Number.isFinite(e.n));
  if (entries.length < 2) return [];
  const target =
    mode === 'lower' ? Math.min(...entries.map((e) => e.n)) : Math.max(...entries.map((e) => e.n));
  const winners = entries.filter((e) => e.n === target).map((e) => e.id);
  // All equal → EVEN (no winners)
  if (winners.length === entries.length) return [];
  return winners;
}

function buildCoreRow(
  products: Product[],
  key: string,
  label: string,
  group: CompareRowGroup,
  getValue: (p: Product) => string,
  getNumeric: ((p: Product) => number | null) | null,
  mode: CompareWinnerMode,
): CompareRow {
  const values: Record<string, string> = {};
  const numericValues: Record<string, number | null> = {};
  for (const p of products) {
    values[p.id] = getValue(p);
    numericValues[p.id] = getNumeric ? getNumeric(p) : null;
  }
  const winnerIds = mode === 'none' ? [] : pickWinners(products, numericValues, mode);
  return { key, label, group, values, numericValues, winnerIds, winnerMode: mode };
}

/** Build aligned compare rows for the selected products. */
export function buildCompareRows(products: Product[]): CompareRow[] {
  if (products.length === 0) return [];

  const rows: CompareRow[] = [
    buildCoreRow(
      products,
      'price',
      'Price',
      'Price & value',
      (p) => formatCurrency(displayPrice(p)),
      (p) => displayPrice(p),
      'lower',
    ),
    buildCoreRow(
      products,
      'rating',
      'Rating',
      'Price & value',
      (p) => {
        const r = Number(p.rating ?? 0);
        const count = Number(p.reviewCount ?? p.review_count ?? 0);
        if (!r) return '—';
        return count > 0 ? `${r.toFixed(1)} (${count})` : r.toFixed(1);
      },
      (p) => {
        const r = Number(p.rating ?? 0);
        return r > 0 ? r : null;
      },
      'higher',
    ),
    buildCoreRow(
      products,
      'stock',
      'Availability',
      'Availability',
      (p) => {
        const s = stockOf(p);
        return s > 0 ? `In stock (${s})` : 'Out of stock';
      },
      (p) => stockOf(p),
      'higher',
    ),
    buildCoreRow(
      products,
      'condition',
      'Condition',
      'Availability',
      (p) => conditionLabel(p),
      null,
      'none',
    ),
    buildCoreRow(
      products,
      'brand',
      'Brand',
      'Specs',
      (p) => String(p.brand || '—').trim() || '—',
      null,
      'none',
    ),
    buildCoreRow(
      products,
      'category',
      'Category',
      'Specs',
      (p) => String(p.category || '—').trim() || '—',
      null,
      'none',
    ),
    buildCoreRow(
      products,
      'storage',
      'Storage',
      'Specs',
      (p) => variantField(p, 'storage'),
      null,
      'none',
    ),
    buildCoreRow(
      products,
      'ram',
      'RAM',
      'Specs',
      (p) => variantField(p, 'ram'),
      null,
      'none',
    ),
    buildCoreRow(
      products,
      'colors',
      'Colors',
      'Specs',
      (p) => variantField(p, 'color'),
      null,
      'none',
    ),
    buildCoreRow(
      products,
      'sim',
      'SIM / Connectivity',
      'Specs',
      (p) => variantField(p, 'sim_type'),
      null,
      'none',
    ),
    buildCoreRow(
      products,
      'display_size',
      'Display size',
      'Specs',
      (p) => variantField(p, 'display_size'),
      null,
      'none',
    ),
  ];

  // Union keys from specifications JSONB
  const specKeys = new Set<string>();
  for (const p of products) {
    const specs = p.specifications;
    if (!specs || typeof specs !== 'object' || Array.isArray(specs)) continue;
    for (const k of Object.keys(specs)) {
      const key = k.trim();
      if (!key) continue;
      // Skip keys already represented as core rows
      if (['series', 'catalog', 'model_family'].includes(key.toLowerCase())) {
        // still include series as useful
      }
      specKeys.add(key);
    }
  }

  const skipSpecKeys = new Set(['catalog']);
  for (const key of Array.from(specKeys).sort((a, b) => a.localeCompare(b))) {
    if (skipSpecKeys.has(key.toLowerCase())) continue;
    const values: Record<string, string> = {};
    const numericValues: Record<string, number | null> = {};
    for (const p of products) {
      const specs = p.specifications;
      let raw = '—';
      if (specs && typeof specs === 'object' && !Array.isArray(specs) && key in specs) {
        const v = (specs as Record<string, unknown>)[key];
        if (v != null && String(v).trim()) raw = String(v).trim();
      }
      values[p.id] = raw;
      numericValues[p.id] = raw === '—' ? null : parseLooseNumber(raw);
    }
    const hasAny = products.some((p) => values[p.id] !== '—');
    if (!hasAny) continue;
    const nums = products.map((p) => numericValues[p.id]).filter((n): n is number => n != null);
    const mode: CompareWinnerMode =
      nums.length >= 2 && new Set(nums).size > 1 ? 'higher' : 'none';
    rows.push({
      key: `spec:${key}`,
      label: humanizeSpecKey(key),
      group: 'Specs',
      values,
      numericValues,
      winnerIds: mode === 'none' ? [] : pickWinners(products, numericValues, mode),
      winnerMode: mode,
    });
  }

  // Freeform specs[] bullets — one row per unique bullet index unioned by text
  const maxBullets = Math.max(0, ...products.map((p) => (p.specs ?? []).length));
  for (let i = 0; i < Math.min(maxBullets, 8); i++) {
    const values: Record<string, string> = {};
    for (const p of products) {
      values[p.id] = String((p.specs ?? [])[i] ?? '').trim() || '—';
    }
    const hasAny = products.some((p) => values[p.id] !== '—');
    if (!hasAny) continue;
    rows.push({
      key: `highlight:${i}`,
      label: `Highlight ${i + 1}`,
      group: 'Highlights',
      values,
      winnerIds: [],
      winnerMode: 'none',
    });
  }

  // Drop rows where every product is "—"
  return rows.filter((row) => products.some((p) => row.values[p.id] && row.values[p.id] !== '—'));
}

export function groupCompareRows(rows: CompareRow[]): { group: CompareRowGroup; rows: CompareRow[] }[] {
  const order: CompareRowGroup[] = ['Price & value', 'Availability', 'Specs', 'Highlights'];
  return order
    .map((group) => ({ group, rows: rows.filter((r) => r.group === group) }))
    .filter((g) => g.rows.length > 0);
}

/** Score products by count of rows they uniquely or jointly win. */
export function scoreCompareProducts(products: Product[], rows?: CompareRow[]): CompareProductScore[] {
  const compareRows = rows ?? buildCompareRows(products);
  const scores = new Map<string, number>();
  for (const p of products) scores.set(p.id, 0);
  for (const row of compareRows) {
    for (const id of row.winnerIds) {
      scores.set(id, (scores.get(id) ?? 0) + 1);
    }
  }
  return products.map((p) => ({ productId: p.id, wins: scores.get(p.id) ?? 0 }));
}

export function buildRuling(products: Product[], rows?: CompareRow[]): CompareRuling | null {
  if (products.length !== 2) return null;
  const compareRows = rows ?? buildCompareRows(products);
  const scores = scoreCompareProducts(products, compareRows);
  const [a, b] = products;
  const scoreA = scores.find((s) => s.productId === a.id)?.wins ?? 0;
  const scoreB = scores.find((s) => s.productId === b.id)?.wins ?? 0;

  const winLabelsFor = (id: string) =>
    compareRows.filter((r) => r.winnerIds.includes(id) && r.winnerIds.length === 1).map((r) => r.label);

  if (scoreA === scoreB) {
    return {
      winnerId: null,
      winnerName: null,
      isTie: true,
      scores,
      winLabels: [],
      summary: `It's close — ${a.name} and ${b.name} split the comparison.`,
    };
  }

  const winner = scoreA > scoreB ? a : b;
  const winLabels = winLabelsFor(winner.id).slice(0, 5);
  const labelBit = winLabels.length ? ` — it wins on ${winLabels.join(', ')}` : '';
  return {
    winnerId: winner.id,
    winnerName: winner.name,
    isTie: false,
    scores,
    winLabels,
    summary: `Get the ${winner.name}${labelBit}.`,
  };
}

export function buildForkForProduct(
  product: Product,
  opponent: Product,
  rows: CompareRow[],
): CompareForkItem[] {
  const items: CompareForkItem[] = [];
  for (const row of rows) {
    if (!row.winnerIds.includes(product.id)) continue;
    if (row.winnerIds.includes(opponent.id)) continue;
    const value = row.values[product.id] ?? '—';
    const opponentValue = row.values[opponent.id] ?? '—';
    let deltaLabel: string | undefined;
    const nSelf = row.numericValues?.[product.id];
    const nOpp = row.numericValues?.[opponent.id];
    if (nSelf != null && nOpp != null && nSelf !== nOpp) {
      const diff = nSelf - nOpp;
      if (row.key === 'price') {
        deltaLabel = diff < 0 ? `${formatCurrency(Math.abs(diff))} less` : `${formatCurrency(diff)} more`;
      } else {
        const sign = diff > 0 ? '+' : '';
        deltaLabel = `${sign}${Number.isInteger(diff) ? diff : diff.toFixed(1)}`;
      }
    }
    items.push({
      key: row.key,
      label: row.label,
      value,
      opponentValue,
      deltaLabel,
    });
  }
  return items;
}

export function getCompareWinBadges(product: Product, compared: Product[]): CompareWinBadge[] {
  if (compared.length === 0) return [];

  const rows = buildCompareRows(compared);
  const wins: CompareWinBadge[] = [];

  const priceRow = rows.find((r) => r.key === 'price');
  if (priceRow?.winnerIds.includes(product.id)) {
    wins.push({ key: 'price', label: 'Best price', highlight: true });
  }
  const ratingRow = rows.find((r) => r.key === 'rating');
  if (ratingRow?.winnerIds.includes(product.id)) {
    wins.push({ key: 'rating', label: 'Top rated' });
  }
  if (stockOf(product) > 0) {
    wins.push({ key: 'stock', label: 'In stock' });
  }

  return wins;
}

export function buildCompareWinsByProductId(compared: Product[]): Map<string, CompareWinBadge[]> {
  const map = new Map<string, CompareWinBadge[]>();
  for (const product of compared) {
    map.set(product.id, getCompareWinBadges(product, compared));
  }
  return map;
}
