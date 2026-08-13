/**
 * Compare engine — shop-floor matchups using live catalogue strengths:
 * price/deals, Pre-owned vs New, series, stock, and trade-link readiness.
 */
import type { Product } from '../types';
import { formatCurrency } from './utils';
import {
  formatProductConditionLabel,
  getProductSeriesSlug,
  productIsNew,
} from './storeFilters';
import { normalizeProductCategory } from './api';
import {
  getDealDiscountPercentage,
  getDealDiscountedPrice,
  getDealOriginalPrice,
  getDealPromoText,
  isDealOfTheDayProduct,
} from './dealOfTheDay';

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
  const series = getProductSeriesSlug(product) ?? '';
  return normalizeCompareSearchText(
    [
      product.name,
      product.brand,
      product.category,
      product.subcategory,
      series,
      formatProductConditionLabel(product),
      product.description,
      product.trade_model,
    ]
      .filter(Boolean)
      .join(' '),
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

/** Stock-first, then deals, then name — better picker UX. */
export function sortComparePickerProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const stockA = stockOf(a) > 0 ? 1 : 0;
    const stockB = stockOf(b) > 0 ? 1 : 0;
    if (stockB !== stockA) return stockB - stockA;
    const dealA = isDealOfTheDayProduct(a) || getDealDiscountPercentage(a) > 0 ? 1 : 0;
    const dealB = isDealOfTheDayProduct(b) || getDealDiscountPercentage(b) > 0 ? 1 : 0;
    if (dealB !== dealA) return dealB - dealA;
    return String(a.name).localeCompare(String(b.name));
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
  | 'Shop floor'
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

export interface CompareMatchupInsight {
  tone: 'aligned' | 'mixed' | 'thin';
  title: string;
  detail: string;
}

function displayPrice(p: Product): number {
  const deal = getDealDiscountedPrice(p);
  if (deal > 0) return deal;
  const n = Number(p.price_from ?? p.price ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function stockOf(p: Product): number {
  const n = Number(p.total_stock ?? p.stock ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function conditionLabel(p: Product): string {
  return formatProductConditionLabel(p);
}

/** Newer condition scores higher for “fresher unit” wins. */
function conditionRank(p: Product): number {
  const label = conditionLabel(p).toLowerCase();
  if (label === 'new' || productIsNew(p)) return 3;
  if (label === 'refurbished') return 2;
  if (label === 'pre-owned') return 1;
  return 0;
}

function seriesLabel(p: Product): string {
  const slug = getProductSeriesSlug(p);
  if (!slug) return '—';
  const specs = p.specifications;
  if (specs && typeof specs === 'object' && !Array.isArray(specs)) {
    const named = String((specs as Record<string, unknown>).series_name ?? '').trim();
    if (named) return named;
  }
  return slug
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
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
      'Price (today)',
      'Price & value',
      (p) => formatCurrency(displayPrice(p)),
      (p) => displayPrice(p),
      'lower',
    ),
    buildCoreRow(
      products,
      'list_price',
      'List price',
      'Price & value',
      (p) => {
        const list = getDealOriginalPrice(p);
        const today = displayPrice(p);
        if (!list) return '—';
        if (Math.abs(list - today) < 0.01) return formatCurrency(list);
        return formatCurrency(list);
      },
      (p) => {
        const list = getDealOriginalPrice(p);
        return list > 0 ? list : null;
      },
      'lower',
    ),
    buildCoreRow(
      products,
      'discount',
      'Discount',
      'Price & value',
      (p) => {
        const pct = getDealDiscountPercentage(p);
        return pct > 0 ? `${pct}% off` : '—';
      },
      (p) => {
        const pct = getDealDiscountPercentage(p);
        return pct > 0 ? pct : null;
      },
      'higher',
    ),
    buildCoreRow(
      products,
      'deal',
      'Deal of the Day',
      'Price & value',
      (p) => {
        if (!isDealOfTheDayProduct(p)) return '—';
        const promo = getDealPromoText(p);
        return promo || 'Yes';
      },
      (p) => (isDealOfTheDayProduct(p) ? 1 : 0),
      'higher',
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
      'Shop floor',
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
      'Shop floor',
      (p) => conditionLabel(p),
      (p) => {
        const r = conditionRank(p);
        return r > 0 ? r : null;
      },
      'higher',
    ),
    buildCoreRow(
      products,
      'trade_ready',
      'Trade upgrade link',
      'Shop floor',
      (p) => {
        const m = String(p.trade_model ?? '').trim();
        return m ? `Linked · ${m}` : 'Not linked';
      },
      (p) => (String(p.trade_model ?? '').trim() ? 1 : 0),
      'higher',
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
      (p) => normalizeProductCategory(p.category) || '—',
      null,
      'none',
    ),
    buildCoreRow(
      products,
      'series',
      'Series / line',
      'Specs',
      (p) => seriesLabel(p),
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

  const specKeys = new Set<string>();
  for (const p of products) {
    const specs = p.specifications;
    if (!specs || typeof specs !== 'object' || Array.isArray(specs)) continue;
    for (const k of Object.keys(specs)) {
      const key = k.trim();
      if (!key) continue;
      specKeys.add(key);
    }
  }

  const skipSpecKeys = new Set([
    'catalog',
    'series',
    'series_name',
    'model_slug',
    'source_sku',
    'brand_line',
    'model_family',
  ]);
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

  return rows.filter((row) => products.some((p) => row.values[p.id] && row.values[p.id] !== '—'));
}

/** Keep only rows where values actually differ across products. */
export function filterDifferingCompareRows(rows: CompareRow[], products: Product[]): CompareRow[] {
  if (products.length < 2) return rows;
  return rows.filter((row) => {
    const vals = products.map((p) => normalizeCompareSearchText(row.values[p.id] ?? ''));
    return new Set(vals).size > 1;
  });
}

export function groupCompareRows(rows: CompareRow[]): { group: CompareRowGroup; rows: CompareRow[] }[] {
  const order: CompareRowGroup[] = [
    'Price & value',
    'Shop floor',
    'Availability',
    'Specs',
    'Highlights',
  ];
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

export function buildMatchupInsight(products: Product[]): CompareMatchupInsight | null {
  if (products.length < 2) return null;
  const cats = new Set(products.map((p) => normalizeProductCategory(p.category)));
  const series = new Set(
    products.map((p) => (getProductSeriesSlug(p) || '').toLowerCase()).filter(Boolean),
  );
  const conditions = new Set(products.map((p) => conditionLabel(p)));

  if (cats.size > 1) {
    return {
      tone: 'mixed',
      title: 'Cross-category matchup',
      detail: `You’re comparing ${Array.from(cats).join(' · ')}. Useful for budget, less fair on raw specs — lean on price, stock, and condition.`,
    };
  }

  if (series.size === 1 && products.length >= 2) {
    const s = seriesLabel(products[0]);
    return {
      tone: 'aligned',
      title: s !== '—' ? `Same line · ${s}` : 'Same category',
      detail:
        conditions.size > 1
          ? `Condition differs (${Array.from(conditions).join(' vs ')}) — Pre-owned can win on price; New wins on freshness.`
          : 'Close siblings — watch storage, RAM, and today’s deal price.',
    };
  }

  if (products.every((p) => stockOf(p) <= 0)) {
    return {
      tone: 'thin',
      title: 'All out of stock',
      detail: 'You can still compare specs. Ask the counter or check back — stock moves fast on the shop floor.',
    };
  }

  return {
    tone: 'aligned',
    title: normalizeProductCategory(products[0].category),
    detail: 'Side-by-side on BlackBox live prices, condition, and what’s actually on the floor.',
  };
}

export function buildRuling(products: Product[], rows?: CompareRow[]): CompareRuling | null {
  if (products.length !== 2) return null;
  const compareRows = rows ?? buildCompareRows(products);
  const scores = scoreCompareProducts(products, compareRows);
  const [a, b] = products;
  const scoreA = scores.find((s) => s.productId === a.id)?.wins ?? 0;
  const scoreB = scores.find((s) => s.productId === b.id)?.wins ?? 0;

  const winLabelsFor = (id: string) =>
    compareRows
      .filter((r) => r.winnerIds.includes(id) && r.winnerIds.length === 1)
      .map((r) => r.label);

  if (scoreA === scoreB) {
    const cheaper = displayPrice(a) <= displayPrice(b) ? a : b;
    return {
      winnerId: null,
      winnerName: null,
      isTie: true,
      scores,
      winLabels: [],
      summary: `Dead heat on the sheet — if budget leads, start with ${cheaper.name} at ${formatCurrency(displayPrice(cheaper))}.`,
    };
  }

  const winner = scoreA > scoreB ? a : b;
  const winLabels = winLabelsFor(winner.id).slice(0, 5);
  const dealBit = isDealOfTheDayProduct(winner) ? ' (Deal of the Day)' : '';
  const stockBit = stockOf(winner) > 0 ? '' : ' — note: currently out of stock';
  const labelBit = winLabels.length ? ` It edges ahead on ${winLabels.join(', ')}.` : '';
  return {
    winnerId: winner.id,
    winnerName: winner.name,
    isTie: false,
    scores,
    winLabels,
    summary: `Shop-floor lean: ${winner.name}${dealBit}.${labelBit}${stockBit}`,
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
      if (row.key === 'price' || row.key === 'list_price') {
        deltaLabel = diff < 0 ? `${formatCurrency(Math.abs(diff))} less` : `${formatCurrency(diff)} more`;
      } else if (row.key === 'discount') {
        deltaLabel = `${diff > 0 ? '+' : ''}${diff}%`;
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
  const discountRow = rows.find((r) => r.key === 'discount');
  if (discountRow?.winnerIds.includes(product.id)) {
    wins.push({ key: 'discount', label: 'Biggest cut', highlight: true });
  }
  if (isDealOfTheDayProduct(product)) {
    wins.push({ key: 'deal', label: 'Deal of the Day', highlight: true });
  }
  const ratingRow = rows.find((r) => r.key === 'rating');
  if (ratingRow?.winnerIds.includes(product.id)) {
    wins.push({ key: 'rating', label: 'Top rated' });
  }
  const conditionRow = rows.find((r) => r.key === 'condition');
  if (conditionRow?.winnerIds.includes(product.id)) {
    wins.push({ key: 'condition', label: conditionLabel(product) });
  } else {
    const label = conditionLabel(product);
    if (label === 'Pre-owned' || label === 'Refurbished') {
      wins.push({ key: 'condition-tag', label });
    }
  }
  if (stockOf(product) > 0) {
    wins.push({ key: 'stock', label: 'In stock' });
  }
  if (String(product.trade_model ?? '').trim()) {
    wins.push({ key: 'trade', label: 'Trade-ready' });
  }

  return wins.slice(0, 5);
}

export function buildCompareWinsByProductId(compared: Product[]): Map<string, CompareWinBadge[]> {
  const map = new Map<string, CompareWinBadge[]>();
  for (const product of compared) {
    map.set(product.id, getCompareWinBadges(product, compared));
  }
  return map;
}

/** Starter picks when compare tray is empty — deals + in-stock across categories. */
export function suggestCompareStarters(allProducts: Product[], limit = 8): Product[] {
  const active = allProducts.filter((p) => {
    const status = String(p.status || 'active').toLowerCase();
    return status === 'active' || status === '';
  });
  const deals = active.filter((p) => isDealOfTheDayProduct(p) || getDealDiscountPercentage(p) > 0);
  const stocked = active.filter((p) => stockOf(p) > 0);
  const pool = sortComparePickerProducts(deals.length ? deals : stocked.length ? stocked : active);
  const seenCats = new Set<string>();
  const diverse: Product[] = [];
  for (const p of pool) {
    const cat = normalizeProductCategory(p.category);
    if (seenCats.has(cat) && diverse.length >= Math.min(4, limit)) continue;
    seenCats.add(cat);
    diverse.push(p);
    if (diverse.length >= limit) break;
  }
  return diverse;
}

export function compareProductMetaLine(p: Product): string {
  const bits = [
    normalizeProductCategory(p.category),
    seriesLabel(p) !== '—' ? seriesLabel(p) : null,
    conditionLabel(p),
  ].filter(Boolean);
  return bits.join(' · ');
}
