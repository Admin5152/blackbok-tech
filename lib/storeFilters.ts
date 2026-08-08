import type { Product, Category } from '../types';
import { normalizeProductCategory } from './api';

export type StoreNewFilter = 'new' | 'used';

export const STORE_PRICE_SLIDER_MAX = 15000;
export const STORE_PRICE_SLIDER_STEP = 100;

export const STORE_PREFERRED_CATEGORIES = [
  'iPhone',
  'Android phones',
  'iPad',
  'MacBooks',
  'Laptops',
  'Tablet',
  'Smart watches',
  'Gaming',
  'Headphones',
  'Speakers',
  'Accessories',
  'Trades',
] as const;

export function getProductDiscountValue(discount: unknown): number {
  if (typeof discount === 'number') return Number.isFinite(discount) ? discount : 0;
  if (typeof discount === 'string') {
    const parsed = Number(discount.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function productTextHaystack(p: Product): string {
  return [
    p.name,
    p.description,
    p.brand,
    p.model,
    p.sku,
    p.category,
    p.trade_model,
    Array.isArray(p.specs) ? p.specs.join(' ') : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function productMatchesStoreSearch(p: Product, qRaw: string): boolean {
  const q = qRaw.trim().toLowerCase();
  if (!q) return true;
  const hay = productTextHaystack(p);
  const productNorm = normalizeProductCategory(p.category);
  const words = q.split(/\s+/).filter(Boolean);
  return words.every((word) => {
    if (hay.includes(word)) return true;
    return normalizeProductCategory(word) === productNorm;
  });
}

/**
 * Server-side search using GIN via PostgREST textSearch.
 * Returns null when query empty (caller keeps full catalog).
 */
export async function fetchStoreSearchProducts(qRaw: string): Promise<Product[] | null> {
  const q = qRaw.trim();
  if (!q) return null;
  const { searchCatalogText } = await import('./catalogApi');
  return searchCatalogText(q);
}

export interface StoreBaseFilterOptions {
  searchTerm: string;
  priceMin: number;
  priceMax: number;
  promotionsOnly: boolean;
}

export function productPassesStoreBaseFilters(p: Product, opts: StoreBaseFilterOptions): boolean {
  if (!productMatchesStoreSearch(p, opts.searchTerm)) return false;
  const price = Number(p.price ?? 0);
  if (!Number.isFinite(price) || price < opts.priceMin || price > opts.priceMax) return false;
  if (opts.promotionsOnly && getProductDiscountValue(p.discount) <= 0) return false;
  return true;
}

export function buildOrderedStoreCategoryKeys(products: Product[]): string[] {
  const catalogKeys: Record<string, true> = {};
  products.forEach((p) => {
    catalogKeys[normalizeProductCategory(p.category)] = true;
  });
  // Always expose key categories (empty until stocked)
  catalogKeys['iPad'] = true;
  catalogKeys['MacBooks'] = true;
  catalogKeys['Laptops'] = true;
  catalogKeys['Android phones'] = true;
  catalogKeys['Smart watches'] = true;
  catalogKeys['Headphones'] = true;
  catalogKeys['Speakers'] = true;
  catalogKeys['Accessories'] = true;
  catalogKeys['Gaming'] = true;

  const remaining = new Set(Object.keys(catalogKeys));
  const ordered: string[] = [];
  STORE_PREFERRED_CATEGORIES.forEach((cat) => {
    if (remaining.has(cat)) {
      ordered.push(cat);
      remaining.delete(cat);
    }
  });
  [...remaining]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .forEach((k) => ordered.push(k));
  return ordered;
}

export function countActiveStoreFilters(opts: {
  selectedCategories: Category[];
  priceMin: number;
  priceMax: number;
  promotionsOnly: boolean;
  /**
   * When browsing a single category via the shop flow, that category is
   * navigation scope — not an “extra” filter (avoids “Clear 1 active filter”
   * while only viewing iPhone / New / etc.).
   */
  categoryIsBrowseScope?: boolean;
}): number {
  return [
    opts.categoryIsBrowseScope ? false : opts.selectedCategories.length > 0,
    opts.priceMin > 0,
    opts.priceMax < STORE_PRICE_SLIDER_MAX,
    opts.promotionsOnly,
  ].filter(Boolean).length;
}

export function productMatchesStoreCategories(
  p: Product,
  selectedCategories: Category[],
): boolean {
  if (selectedCategories.length === 0) return true;
  const normalized = normalizeProductCategory(p.category);
  return selectedCategories.some((sel) => {
    const raw = String(sel ?? '').trim().toLowerCase();
    // Audio umbrella (nav / legacy) matches Headphones + Speakers
    if (raw === 'audio') {
      return normalized === 'Headphones' || normalized === 'Speakers';
    }
    return normalizeProductCategory(sel) === normalized;
  });
}

/** Storefront “new” flag — prefers `is_new`, falls back to legacy `new`. */
export function productIsNew(p: Product): boolean {
  if (p.is_new != null) return Boolean(p.is_new);
  if (p.new != null) return Boolean(p.new);
  return false;
}

export function productMatchesStoreNewFilter(
  p: Product,
  filter: StoreNewFilter | undefined | null,
): boolean {
  if (!filter) return true;

  const condition = String(p.condition || '').toLowerCase();
  const isNew = productIsNew(p);

  if (filter === 'new') {
    if (condition === 'new') return true;
    if (condition === 'preowned' || condition === 'refurbished' || condition === 'used') return false;
    return isNew;
  }

  // used
  if (condition === 'preowned' || condition === 'refurbished' || condition === 'used') return true;
  if (condition === 'new') return false;
  return !isNew;
}

// ─── Series (category → series → condition) ─────────────────────────────────

export type StoreSeriesOption = {
  value: string;
  label: string;
  description: string;
};

/** Categories that show a Series step (before New/Used, or after Brand). */
export const CATEGORIES_WITH_SERIES = new Set([
  'iPad',
  'MacBooks',
  'Laptops',
  'Headphones',
  'Speakers',
]);

/**
 * Brand picker first, then series (Audio + Windows laptops).
 * Opposite of iPad/MacBooks (series → New/Used).
 */
export const CATEGORIES_BRAND_THEN_SERIES = new Set(['Laptops', 'Headphones', 'Speakers']);

export const IPAD_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'pro', label: 'iPad Pro', description: 'Pro models with M-series chips' },
  { value: 'air', label: 'iPad Air', description: 'Air models' },
  { value: 'mini', label: 'iPad mini', description: 'Compact mini models' },
  { value: 'standard', label: 'iPad', description: 'Standard iPad models' },
];

export const IPHONE_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'iphone-17', label: 'iPhone 17', description: 'iPhone 17 family' },
  { value: 'iphone-16', label: 'iPhone 16', description: 'iPhone 16 family' },
  { value: 'iphone-15', label: 'iPhone 15', description: 'iPhone 15 family' },
  { value: 'iphone-14', label: 'iPhone 14', description: 'iPhone 14 family' },
  { value: 'iphone-13', label: 'iPhone 13', description: 'iPhone 13 family' },
  { value: 'iphone-12', label: 'iPhone 12', description: 'iPhone 12 family' },
  { value: 'iphone-11', label: 'iPhone 11', description: 'iPhone 11 family' },
  { value: 'iphone-x', label: 'iPhone X series', description: 'X, XR, XS' },
  { value: 'iphone-se', label: 'iPhone SE', description: 'SE models' },
  { value: 'iphone-older', label: 'Older iPhones', description: 'iPhone 8 and earlier' },
];

export const MACBOOK_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'pro', label: 'MacBook Pro', description: 'Pro notebooks' },
  { value: 'air', label: 'MacBook Air', description: 'Air notebooks' },
  { value: 'other', label: 'Other Mac', description: 'iMac, Mac mini & more' },
];

export const LAPTOP_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'Omen', label: 'Omen', description: 'HP Omen gaming notebooks' },
  { value: 'Envy', label: 'Envy', description: 'HP Envy notebooks' },
  { value: 'Victus', label: 'Victus', description: 'HP Victus gaming notebooks' },
  { value: 'Alienware', label: 'Alienware', description: 'Dell Alienware notebooks' },
];

export const HEADPHONE_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'AirPods', label: 'AirPods', description: 'Apple AirPods family' },
  { value: 'Tune', label: 'Tune', description: 'JBL Tune headphones' },
  { value: 'Solo', label: 'Solo', description: 'Beats Solo headphones' },
];

export const SPEAKER_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'Flip', label: 'Flip', description: 'JBL Flip portable speakers' },
  { value: 'Charge', label: 'Charge', description: 'JBL Charge speakers' },
  { value: 'Boombox', label: 'Boombox', description: 'JBL Boombox speakers' },
  { value: 'Go', label: 'Go', description: 'JBL Go speakers' },
  { value: 'Onyx', label: 'Onyx', description: 'Harman Kardon Onyx' },
  { value: 'Pill', label: 'Pill', description: 'Beats Pill speakers' },
];

export function categoryUsesSeriesStep(category: string | null | undefined): boolean {
  if (!category) return false;
  return CATEGORIES_WITH_SERIES.has(normalizeProductCategory(category));
}

export function categoryUsesBrandThenSeries(category: string | null | undefined): boolean {
  if (!category) return false;
  return CATEGORIES_BRAND_THEN_SERIES.has(normalizeProductCategory(category));
}

const HEADPHONE_BRAND_SERIES: Readonly<Record<string, readonly string[]>> = {
  AirPods: ['AirPods'],
  JBL: ['Tune'],
  Beats: ['Solo'],
};

const SPEAKER_BRAND_SERIES: Readonly<Record<string, readonly string[]>> = {
  JBL: ['Flip', 'Charge', 'Boombox', 'Go'],
  HarmanKardon: ['Onyx'],
  Beats: ['Pill'],
};

const LAPTOP_BRAND_SERIES: Readonly<Record<string, readonly string[]>> = {
  HP: ['Omen', 'Envy', 'Victus'],
  Dell: ['Alienware'],
};

export function getCategorySeriesOptions(
  category: string,
  brandValue?: string | null,
): StoreSeriesOption[] {
  const n = normalizeProductCategory(category);
  const brand = String(brandValue ?? '').trim();

  if (n === 'iPad' || n === 'Tablet') return IPAD_SERIES_OPTIONS;
  if (n === 'iPhone') return IPHONE_SERIES_OPTIONS;
  if (n === 'MacBooks') return MACBOOK_SERIES_OPTIONS;

  if (n === 'Headphones') {
    if (!brand) return HEADPHONE_SERIES_OPTIONS;
    const allowed = HEADPHONE_BRAND_SERIES[brand];
    if (!allowed) return [];
    return HEADPHONE_SERIES_OPTIONS.filter((o) => allowed.includes(o.value));
  }
  if (n === 'Speakers') {
    if (!brand) return SPEAKER_SERIES_OPTIONS;
    const allowed = SPEAKER_BRAND_SERIES[brand];
    if (!allowed) return [];
    return SPEAKER_SERIES_OPTIONS.filter((o) => allowed.includes(o.value));
  }
  if (n === 'Laptops' || n === 'Laptop') {
    if (!brand) return LAPTOP_SERIES_OPTIONS;
    const allowed = LAPTOP_BRAND_SERIES[brand];
    if (!allowed) return [];
    return LAPTOP_SERIES_OPTIONS.filter((o) => allowed.includes(o.value));
  }
  return [];
}

/** Resolve series slug from a product (specs → subcategory → name heuristics). */
export function getProductSeriesSlug(p: Product): string | null {
  const specs = p.specifications;
  if (specs && typeof specs === 'object') {
    const s = String((specs as Record<string, unknown>).series ?? '').trim().toLowerCase();
    if (s) return s;
  }
  const sub = String(p.subcategory ?? '').trim().toLowerCase();
  if (sub && sub !== 'new' && sub !== 'used') return sub.replace(/\s+/g, '-');

  const cat = normalizeProductCategory(p.category);
  const hay = `${p.name || ''} ${p.model || ''} ${p.brand || ''}`.toLowerCase();

  if (cat === 'iPad' || cat === 'Tablet') {
    if (hay.includes('ipad pro')) return 'pro';
    if (hay.includes('ipad air')) return 'air';
    if (hay.includes('ipad mini')) return 'mini';
    if (hay.includes('ipad')) return 'standard';
  }
  if (cat === 'iPhone') {
    if (/iphone\s*17/.test(hay)) return 'iphone-17';
    if (/iphone\s*16/.test(hay)) return 'iphone-16';
    if (/iphone\s*15/.test(hay)) return 'iphone-15';
    if (/iphone\s*14/.test(hay)) return 'iphone-14';
    if (/iphone\s*13/.test(hay)) return 'iphone-13';
    if (/iphone\s*12/.test(hay)) return 'iphone-12';
    if (/iphone\s*11/.test(hay)) return 'iphone-11';
    if (/iphone\s*(x|xr|xs)/.test(hay)) return 'iphone-x';
    if (/iphone\s*se/.test(hay)) return 'iphone-se';
    return 'iphone-older';
  }
  if (cat === 'MacBooks') {
    if (hay.includes('macbook pro') || hay.includes('mac book pro')) return 'pro';
    if (hay.includes('macbook air') || hay.includes('mac book air')) return 'air';
    if (hay.includes('mac')) return 'other';
  }
  if (cat === 'Laptops' || cat === 'Laptop') {
    if (hay.includes('alienware')) return 'alienware';
    if (hay.includes('omen')) return 'omen';
    if (hay.includes('envy')) return 'envy';
    if (hay.includes('victus')) return 'victus';
  }
  if (cat === 'Headphones') {
    if (hay.includes('airpod')) return 'airpods';
    if (hay.includes('tune')) return 'tune';
    if (hay.includes('solo')) return 'solo';
  }
  if (cat === 'Speakers') {
    if (hay.includes('flip')) return 'flip';
    if (hay.includes('charge')) return 'charge';
    if (hay.includes('boombox')) return 'boombox';
    if (/\bgo\s*\d|\bgo\b/.test(hay) && hay.includes('jbl')) return 'go';
    if (hay.includes('onyx')) return 'onyx';
    if (hay.includes('pill')) return 'pill';
  }
  return null;
}

export function productMatchesStoreSeries(
  p: Product,
  series: string | null | undefined,
): boolean {
  if (!series) return true;
  const want = series.trim().toLowerCase();
  const got = getProductSeriesSlug(p);
  if (!got) return false;
  return got === want || got.replace(/\s+/g, '-') === want;
}

export function getSeriesCount(
  products: Product[],
  category: string,
  seriesValue: string,
): number {
  return products.filter(
    (p) =>
      productMatchesStoreCategories(p, [category as Category]) &&
      productMatchesStoreSeries(p, seriesValue),
  ).length;
}

export function seriesFilterLabel(series: string | null | undefined, category?: string | null): string {
  if (!series) return '';
  if (category) {
    const opt = getCategorySeriesOptions(category).find((o) => o.value === series);
    if (opt) return opt.label;
  }
  return series;
}

// ─── Subcategory system ──────────────────────────────────────────────────────

export type SubcategoryKind = 'condition' | 'brand';

export interface SubcategoryOption {
  kind: SubcategoryKind;
  /** URL-safe filter value (e.g. 'new', 'PlayStation', 'JBL') */
  value: string;
  /** Human-readable card title */
  label: string;
  /** Short card subtitle */
  description: string;
}

/**
 * Per-category subcategory options shown in the picker step.
 * Condition-based: delegate to productMatchesStoreNewFilter.
 * Brand-based: text-match against product brand/name/model fields.
 */
export const CATEGORY_SUBCATEGORY_CONFIG: Readonly<Record<string, SubcategoryOption[]>> = {
  iPhone: [
    { kind: 'condition', value: 'new',  label: 'New',  description: 'Brand-new iPhones (15–17 series)' },
    { kind: 'condition', value: 'used', label: 'Used', description: 'Pre-owned & refurbished iPhones' },
  ],
  'Android phones': [
    { kind: 'condition', value: 'new', label: 'New', description: 'Brand-new Android phones only' },
  ],
  iPad: [
    { kind: 'condition', value: 'new',  label: 'New',  description: 'Brand-new iPad models' },
    { kind: 'condition', value: 'used', label: 'Used', description: 'Pre-owned & refurbished iPads' },
  ],
  MacBooks: [
    { kind: 'condition', value: 'new',  label: 'New',  description: 'Brand-new MacBooks' },
    { kind: 'condition', value: 'used', label: 'Used', description: 'Pre-owned & refurbished MacBooks' },
  ],
  Laptops: [
    { kind: 'brand', value: 'HP', label: 'HP', description: 'Omen, Envy & Victus notebooks' },
    { kind: 'brand', value: 'Dell', label: 'Dell', description: 'Alienware gaming notebooks' },
  ],
  // Legacy alias — old ?category=Laptop URLs
  Laptop: [
    { kind: 'brand', value: 'HP', label: 'HP', description: 'Omen, Envy & Victus notebooks' },
    { kind: 'brand', value: 'Dell', label: 'Dell', description: 'Alienware gaming notebooks' },
  ],
  'Smart watches': [
    { kind: 'brand', value: 'iWatches', label: 'iWatches', description: 'Apple Watch series' },
    { kind: 'brand', value: 'Others',   label: 'Others',   description: 'Samsung, Fitbit & more' },
  ],
  Gaming: [
    { kind: 'brand', value: 'PlayStation', label: 'PlayStation', description: 'Sony PS4, PS5 & accessories' },
    { kind: 'brand', value: 'Xbox',        label: 'Xbox',        description: 'Microsoft Xbox consoles & accessories' },
    { kind: 'brand', value: 'Steam',       label: 'Steam',  description: 'Steam Deck & PC gaming gear' },
    { kind: 'brand', value: 'Nintendo',    label: 'Nintendo',    description: 'Nintendo Switch & more' },
  ],
  Headphones: [
    { kind: 'brand', value: 'AirPods', label: 'AirPods', description: 'Apple AirPods & wireless earbuds' },
    { kind: 'brand', value: 'JBL',     label: 'JBL',     description: 'JBL headphones & earbuds' },
    { kind: 'brand', value: 'Beats',   label: 'Beats',   description: 'Beats headphones' },
    { kind: 'brand', value: 'Sony',    label: 'Sony',    description: 'Sony headphones & earbuds' },
    { kind: 'brand', value: 'EarPods', label: 'EarPods', description: 'Wired EarPods / earphones' },
  ],
  Speakers: [
    { kind: 'brand', value: 'JBL',          label: 'JBL',           description: 'JBL speakers' },
    { kind: 'brand', value: 'HarmanKardon', label: 'Harman Kardon', description: 'Harman Kardon speakers' },
    { kind: 'brand', value: 'Beats',        label: 'Beats',         description: 'Beats Pill speakers' },
    { kind: 'brand', value: 'HomePod',      label: 'HomePod',       description: 'Apple HomePod speakers' },
  ],
  // Legacy alias — old ?category=Audio URLs (umbrella brands)
  Audio: [
    { kind: 'brand', value: 'AirPods', label: 'AirPods', description: 'Apple AirPods & wireless earbuds' },
    { kind: 'brand', value: 'JBL',     label: 'JBL',     description: 'JBL headphones & speakers' },
    { kind: 'brand', value: 'Beats',   label: 'Beats',   description: 'Beats headphones & speakers' },
    { kind: 'brand', value: 'HarmanKardon', label: 'Harman Kardon', description: 'Harman Kardon speakers' },
    { kind: 'brand', value: 'Sony',    label: 'Sony',    description: 'Sony headphones & earbuds' },
    { kind: 'brand', value: 'EarPods', label: 'EarPods', description: 'Wired EarPods / earphones' },
    { kind: 'brand', value: 'HomePod', label: 'HomePod', description: 'Apple HomePod speakers' },
  ],
  Accessories: [
    { kind: 'brand', value: 'PhoneCases',       label: 'Phone Cases',       description: 'Protective & stylish cases' },
    { kind: 'brand', value: 'ScreenProtectors', label: 'Screen Protectors', description: 'Tempered glass & films' },
    { kind: 'brand', value: 'Chargers',         label: 'Chargers',          description: 'Cables, adapters & power banks' },
  ],
};

/** Returns subcategory options for a canonical category, or [] if none configured. */
export function getCategorySubcategoryOptions(category: string): SubcategoryOption[] {
  const normalized = normalizeProductCategory(category);
  return (
    CATEGORY_SUBCATEGORY_CONFIG[category] ??
    CATEGORY_SUBCATEGORY_CONFIG[normalized] ??
    []
  );
}

/** Main categories for admin product create/edit (approved storefront taxonomy). */
export const ADMIN_MAIN_CATEGORIES = [
  'iPhone',
  'Android phones',
  'iPad',
  'MacBooks',
  'Laptops',
  'Smart watches',
  'Gaming',
  'Headphones',
  'Speakers',
  'Accessories',
] as const;

export type AdminMainCategory = (typeof ADMIN_MAIN_CATEGORIES)[number];

const CONDITION_MAIN_CATEGORIES = new Set([
  'iPhone',
  'iPad',
  'MacBooks',
  'Android phones',
]);

export function categoryUsesConditionSubcategory(category: string | null | undefined): boolean {
  if (!category) return false;
  const n = normalizeProductCategory(category);
  return CONDITION_MAIN_CATEGORIES.has(category) || CONDITION_MAIN_CATEGORIES.has(n);
}

/**
 * Map admin taxonomy selection onto DB fields.
 * UI "Used" → condition=preowned. Android phones are New-only.
 */
export function applyAdminTaxonomyFields(input: {
  category: string;
  /** Selected subcategory option value (e.g. new, used, PlayStation, AirPods) */
  taxonomyValue: string | null | undefined;
  existingCondition?: string | null;
  /** Series slug for iPhone/iPad/MacBook (stored on products.subcategory) */
  series?: string | null;
  existingSubcategory?: string | null;
}): {
  category: string;
  subcategory: string | null;
  condition: 'new' | 'preowned' | 'refurbished';
  is_new: boolean;
  taxonomyLabel: string;
} {
  const category = normalizeProductCategory(input.category);
  const opts = getCategorySubcategoryOptions(category);
  const raw = String(input.taxonomyValue ?? '').trim();
  const hit = opts.find(
    (o) => o.value.toLowerCase() === raw.toLowerCase() || o.label.toLowerCase() === raw.toLowerCase(),
  );

  const seriesSlug = String(input.series ?? '').trim() || null;
  const existingSub = String(input.existingSubcategory ?? '').trim();
  const keepSeries =
    seriesSlug ||
    (existingSub && existingSub.toLowerCase() !== 'new' && existingSub.toLowerCase() !== 'used'
      ? existingSub
      : null);

  if (category === 'Android phones') {
    return {
      category,
      subcategory: keepSeries,
      condition: 'new',
      is_new: true,
      taxonomyLabel: hit?.label ?? 'New',
    };
  }

  if (categoryUsesConditionSubcategory(category)) {
    const isUsed = (hit?.value ?? raw).toLowerCase() === 'used';
    return {
      category,
      // Preserve series on subcategory for iPhone / iPad / MacBooks
      subcategory: keepSeries,
      condition: isUsed ? 'preowned' : 'new',
      is_new: !isUsed,
      taxonomyLabel: isUsed ? 'Used' : 'New',
    };
  }

  // Brand / type subcategory
  const value = hit?.value ?? (raw || null);
  const label = hit?.label ?? value ?? '—';
  const existing = String(input.existingCondition ?? 'new').toLowerCase();
  const condition =
    existing === 'preowned' || existing === 'refurbished' || existing === 'used'
      ? (existing === 'used' ? 'preowned' : (existing as 'preowned' | 'refurbished'))
      : 'new';

  // Audio + Laptops: series lives on subcategory; brand is products.brand
  if (categoryUsesBrandThenSeries(category)) {
    return {
      category,
      subcategory: keepSeries,
      condition: 'new',
      is_new: true,
      taxonomyLabel: label,
    };
  }

  return {
    category,
    subcategory: value,
    condition,
    is_new: condition === 'new',
    taxonomyLabel: label,
  };
}

export function validateAdminProductTaxonomy(input: {
  category: string | null | undefined;
  taxonomyValue: string | null | undefined;
}): string | null {
  const rawCat = String(input.category ?? '').trim();
  if (!rawCat) return 'Select a main category.';
  const category = normalizeProductCategory(rawCat);
  if (!(ADMIN_MAIN_CATEGORIES as readonly string[]).includes(category)) {
    return `Category “${rawCat}” is not in the approved catalog. Pick a listed main category.`;
  }
  const opts = getCategorySubcategoryOptions(category);
  if (opts.length === 0) return null;

  const raw = String(input.taxonomyValue ?? '').trim();
  if (!raw) {
    return categoryUsesConditionSubcategory(category)
      ? 'Select New or Used for this category.'
      : 'Select an approved sub-category for this category.';
  }

  const hit = opts.find(
    (o) => o.value.toLowerCase() === raw.toLowerCase() || o.label.toLowerCase() === raw.toLowerCase(),
  );
  if (!hit) {
    return `“${raw}” is not an approved sub-category for ${category}.`;
  }

  if (category === 'Android phones' && hit.value !== 'new') {
    return 'Android phones only accept New under current catalog rules.';
  }

  return null;
}

export function formatProductClassification(input: {
  name: string;
  category: string;
  taxonomyLabel: string;
}): string {
  return [
    `Product Name: ${input.name}`,
    `Main Category: ${input.category}`,
    `Sub-category / Tag: ${input.taxonomyLabel}`,
    'Status: Successfully classified and ready for storefront display.',
  ].join('\n');
}

/** Discriminated filter used in URL/state (condition vs brand/type). */
export type StoreSubcategoryFilter = Pick<SubcategoryOption, 'kind' | 'value'>;

/**
 * Resolve URL `subcategory` (or legacy `condition`) into a filter for the active category.
 */
export function resolveStoreSubcategoryFilter(
  category: string | undefined | null,
  subcategoryParam: string | undefined | null,
  conditionParam?: StoreNewFilter | null,
): StoreSubcategoryFilter | undefined {
  const raw = (subcategoryParam?.trim() || conditionParam || '').trim();
  if (!raw) return undefined;

  if (category) {
    const opts = getCategorySubcategoryOptions(category);
    const rawLower = raw.toLowerCase();
    const alias =
      rawLower === 'iwatch'
        ? 'iwatches'
        : rawLower === 'other'
          ? 'others'
          : rawLower === 'google pixel'
            ? 'googlepixel'
            : rawLower;
    const hit = opts.find((o) => o.value.toLowerCase() === alias || o.value.toLowerCase() === rawLower);
    if (hit) return { kind: hit.kind, value: hit.value };
  }

  if (raw === 'new' || raw === 'used') {
    return { kind: 'condition', value: raw };
  }

  return { kind: 'brand', value: raw };
}

/** Encode filter into store search params (`subcategory` + legacy `condition` when applicable). */
export function encodeStoreSubcategorySearch(
  filter: StoreSubcategoryFilter | undefined | null,
): Record<string, string> {
  if (!filter) return {};
  const out: Record<string, string> = { subcategory: filter.value };
  if (filter.kind === 'condition') out.condition = filter.value;
  return out;
}

export function getSubcategoryCount(
  products: Product[],
  category: string,
  option: SubcategoryOption,
): number {
  return products.filter(
    (p) =>
      productMatchesStoreCategories(p, [category as Category]) &&
      productMatchesStoreSubcategoryFilter(p, option),
  ).length;
}

export function subcategoryFilterLabel(
  filter: StoreSubcategoryFilter | undefined | null,
  category?: string | null,
): string {
  if (!filter) return '';
  if (category) {
    const opt = getCategorySubcategoryOptions(category).find((o) => o.value === filter.value);
    if (opt) return opt.label;
  }
  if (filter.value === 'new') return 'New';
  if (filter.value === 'used') return 'Used';
  return filter.value;
}

/**
 * Returns true when a product matches the given subcategory filter.
 * - Condition-based filters delegate to productMatchesStoreNewFilter.
 * - Brand/type filters prefer `products.subcategory`, then brand/name/model text.
 */
export function productMatchesStoreSubcategoryFilter(
  p: Product,
  filter: StoreSubcategoryFilter | undefined | null,
): boolean {
  if (!filter) return true;

  if (filter.kind === 'condition') {
    return productMatchesStoreNewFilter(p, filter.value as StoreNewFilter);
  }

  const v = filter.value.toLowerCase();
  const tagged = (p.subcategory ?? '').trim().toLowerCase();
  if (tagged) {
    if (tagged === v) return true;
    // Allow admin tags like "Harman Kardon" vs config value "HarmanKardon"
    if (tagged.replace(/\s+/g, '') === v.replace(/\s+/g, '')) return true;
  }

  const brand = (p.brand ?? '').toLowerCase();
  const name = (p.name ?? '').toLowerCase();
  const model = (p.model ?? '').toLowerCase();
  const haystack = `${brand} ${name} ${model}`;

  if (v === 'iwatch' || v === 'iwatches') {
    return (
      ((brand.includes('apple') || name.includes('apple') || brand.includes('watch')) &&
        (name.includes('watch') || model.includes('watch') || haystack.includes('iwatch'))) ||
      haystack.includes('apple watch')
    );
  }
  if (v === 'other' || v === 'others') {
    const isAppleWatch =
      (brand.includes('apple') || name.includes('apple')) &&
      (name.includes('watch') || model.includes('watch') || haystack.includes('apple watch'));
    return !isAppleWatch;
  }
  if (v === 'googlepixel' || v === 'pixel') {
    return haystack.includes('pixel') || haystack.includes('google');
  }
  if (v === 'samsung') {
    return haystack.includes('samsung') || haystack.includes('galaxy');
  }
  if (v === 'playstation') {
    return (
      haystack.includes('playstation') ||
      haystack.includes('ps5') ||
      haystack.includes('ps4') ||
      /\bps\s*[45]\b/.test(haystack)
    );
  }
  if (v === 'xbox') return haystack.includes('xbox');
  if (v === 'steam') return haystack.includes('steam') || haystack.includes('steam deck');
  if (v === 'nintendo') return haystack.includes('nintendo') || haystack.includes('switch');
  if (v === 'airpods') return haystack.includes('airpod');
  if (v === 'jbl') return haystack.includes('jbl');
  if (v === 'beats') return haystack.includes('beats') || haystack.includes('solo') || haystack.includes('pill');
  if (v === 'sony') return haystack.includes('sony');
  if (v === 'homepod') return haystack.includes('homepod');
  if (v === 'harmankardon') {
    return haystack.includes('harman') || haystack.includes('kardon');
  }
  if (v === 'hp') return haystack.includes('hp') || haystack.includes('omen') || haystack.includes('envy') || haystack.includes('victus');
  if (v === 'dell') return haystack.includes('dell') || haystack.includes('alienware');
  if (v === 'earpods') {
    return (
      haystack.includes('earpod') ||
      haystack.includes('ear pod') ||
      (haystack.includes('wired') &&
        (haystack.includes('earphone') || haystack.includes('headphone')))
    );
  }
  if (v === 'phonecases') {
    return haystack.includes('case') || haystack.includes('cover');
  }
  if (v === 'screenprotectors') {
    return (
      (haystack.includes('screen') || haystack.includes('protector')) &&
      (haystack.includes('protector') || haystack.includes('tempered') || haystack.includes('glass'))
    );
  }
  if (v === 'chargers') {
    return (
      haystack.includes('charg') ||
      haystack.includes('cable') ||
      haystack.includes('adapter') ||
      haystack.includes('power bank')
    );
  }

  return haystack.includes(v);
}
