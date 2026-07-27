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
}): number {
  return [
    opts.selectedCategories.length > 0,
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
  return selectedCategories.some((sel) => normalizeProductCategory(sel) === normalized);
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

  const nameOrModel = `${p.name || ''} ${p.model || ''}`.toLowerCase();
  const isIphone = nameOrModel.includes('iphone') || (p.category && p.category.toLowerCase() === 'iphone');
  const isNew = productIsNew(p);

  if (isIphone) {
    if (filter === 'new') {
      return /(iphone\s+(15|16|17))/i.test(nameOrModel) && isNew;
    } else {
      return /(iphone\s+(xr|xs|11|12|13|14|15|16|17))/i.test(nameOrModel) && !isNew;
    }
  }

  return filter === 'new' ? isNew : !isNew;
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
    { kind: 'brand', value: 'GooglePixel', label: 'Google Pixel', description: 'Google Pixel phones' },
    { kind: 'brand', value: 'Samsung',     label: 'Samsung',      description: 'Samsung Galaxy phones' },
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
    { kind: 'condition', value: 'new',  label: 'New',  description: 'Brand-new Windows & other laptops' },
    { kind: 'condition', value: 'used', label: 'Used', description: 'Pre-owned & refurbished laptops' },
  ],
  // Legacy alias — old ?category=Laptop URLs
  Laptop: [
    { kind: 'condition', value: 'new',  label: 'New',  description: 'Brand-new laptops & MacBooks' },
    { kind: 'condition', value: 'used', label: 'Used', description: 'Pre-owned & refurbished laptops' },
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
    { kind: 'brand', value: 'HomePod',      label: 'HomePod',       description: 'Apple HomePod speakers' },
    { kind: 'brand', value: 'JBL',          label: 'JBL',           description: 'JBL headphones & speakers' },
    { kind: 'brand', value: 'HarmanKardon', label: 'Harman Kardon', description: 'Harman Kardon speakers' },
  ],
  Speakers: [
    { kind: 'brand', value: 'HomePod',      label: 'HomePod',       description: 'Apple HomePod speakers' },
    { kind: 'brand', value: 'JBL',          label: 'JBL',           description: 'JBL speakers' },
    { kind: 'brand', value: 'HarmanKardon', label: 'Harman Kardon', description: 'Harman Kardon speakers' },
  ],
  // Legacy alias — old ?category=Audio URLs
  Audio: [
    { kind: 'brand', value: 'HomePod',      label: 'HomePod',       description: 'Apple HomePod speakers' },
    { kind: 'brand', value: 'JBL',          label: 'JBL',           description: 'JBL headphones & speakers' },
    { kind: 'brand', value: 'HarmanKardon', label: 'Harman Kardon', description: 'Harman Kardon speakers' },
  ],
  Accessories: [
    { kind: 'brand', value: 'PhoneCases',       label: 'Phone Cases',       description: 'Protective & stylish cases' },
    { kind: 'brand', value: 'ScreenProtectors', label: 'Screen Protectors', description: 'Tempered glass & films' },
    { kind: 'brand', value: 'Chargers',         label: 'Chargers',          description: 'Cables, adapters & power banks' },
  ],
};

/** Returns subcategory options for a canonical category, or [] if none configured. */
export function getCategorySubcategoryOptions(category: string): SubcategoryOption[] {
  return CATEGORY_SUBCATEGORY_CONFIG[category] ?? [];
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
  if (v === 'sony') return haystack.includes('sony');
  if (v === 'homepod') return haystack.includes('homepod');
  if (v === 'harmankardon') {
    return haystack.includes('harman') || haystack.includes('kardon');
  }
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
