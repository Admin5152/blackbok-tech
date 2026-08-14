import type { Product, Category } from '../types';
import { normalizeProductCategory } from './api';

export type StoreNewFilter = 'new' | 'used';

export const STORE_PRICE_SLIDER_MAX = 30000;
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
  'Consoles',
  'Controllers',
  'Headphones',
  'Speakers',
  'Accessories',
  'Trades',
] as const;

/**
 * Filter-panel / search grouping for the shop.
 * Children render nested under the group label when present in the category list.
 */
export const STORE_CATEGORY_FILTER_GROUPS: ReadonlyArray<{
  id: string;
  label: string;
  categories: readonly string[];
}> = [
  { id: 'phones', label: 'Phones', categories: ['iPhone', 'Android phones'] },
  { id: 'tablets', label: 'Tablets', categories: ['iPad', 'Tablet'] },
  { id: 'computers', label: 'Computers', categories: ['MacBooks', 'Laptops'] },
  { id: 'wearables', label: 'Wearables', categories: ['Smart watches'] },
  { id: 'gaming', label: 'Gaming', categories: ['Consoles', 'Controllers', 'Gaming'] },
  { id: 'audio', label: 'Audio', categories: ['Headphones', 'Speakers'] },
  { id: 'accessories', label: 'Accessories', categories: ['Accessories'] },
  { id: 'trades', label: 'Trades', categories: ['Trades'] },
];

/** Expand a filter selection that may be an umbrella (Audio) into concrete categories. */
export function expandStoreCategorySelection(
  category: string | null | undefined,
): string[] {
  const raw = String(category ?? '').trim();
  if (!raw) return [];
  if (raw.toLowerCase() === 'audio') return ['Headphones', 'Speakers'];
  if (raw.toLowerCase() === 'computers') return ['MacBooks', 'Laptops'];
  if (raw.toLowerCase() === 'gaming') return ['Consoles', 'Controllers', 'Gaming'];
  return [normalizeProductCategory(raw)];
}

export function getProductDiscountValue(discount: unknown): number {
  if (typeof discount === 'number') return Number.isFinite(discount) ? discount : 0;
  if (typeof discount === 'string') {
    const parsed = Number(discount.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function productTextHaystack(p: Product): string {
  const specs =
    p.specifications && typeof p.specifications === 'object'
      ? (p.specifications as Record<string, unknown>)
      : null;
  return [
    p.name,
    p.description,
    p.brand,
    p.model,
    p.sku,
    p.category,
    p.subcategory,
    p.trade_model,
    specs?.series,
    specs?.audio_type,
    specs?.catalog,
    specs?.storage_label,
    specs?.memory,
    Array.isArray(p.specs) ? p.specs.join(' ') : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** True when a search token should match this product's category bucket. */
export function searchWordMatchesProductCategory(
  productCategory: string | null | undefined,
  word: string,
): boolean {
  const raw = word.trim().toLowerCase();
  if (!raw) return false;
  const productNorm = normalizeProductCategory(productCategory);

  // Umbrella / synonym tokens (before normalize collapses Audio → Headphones)
  if (raw === 'audio' || raw === 'sound') {
    return productNorm === 'Headphones' || productNorm === 'Speakers';
  }
  if (raw === 'computers' || raw === 'computer' || raw === 'pc' || raw === 'notebooks') {
    return productNorm === 'Laptops' || productNorm === 'MacBooks';
  }
  if (
    raw === 'console' ||
    raw === 'consoles' ||
    raw === 'ps5' ||
    raw === 'xbox' ||
    raw === 'nintendo' ||
    raw === 'switch' ||
    raw === 'controller' ||
    raw === 'controllers' ||
    raw === 'dualsense'
  ) {
    return productNorm === 'Consoles' || productNorm === 'Controllers' || productNorm === 'Gaming';
  }
  if (raw === 'chargers' || raw === 'charger' || raw === 'cables' || raw === 'cable') {
    return productNorm === 'Accessories';
  }
  if (raw === 'cases' || raw === 'case' || raw === 'protectors' || raw === 'protector') {
    return productNorm === 'Accessories';
  }

  return normalizeProductCategory(word) === productNorm;
}

export function productMatchesStoreSearch(p: Product, qRaw: string): boolean {
  const q = qRaw.trim().toLowerCase();
  if (!q) return true;
  const hay = productTextHaystack(p);
  const words = q.split(/\s+/).filter(Boolean);
  return words.every((word) => {
    if (hay.includes(word)) return true;
    return searchWordMatchesProductCategory(p.category, word);
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
    // Gaming umbrella matches Consoles + Controllers + leftover Gaming SKUs
    if (raw === 'gaming' || normalizeProductCategory(sel) === 'Gaming') {
      return (
        normalized === 'Gaming' ||
        normalized === 'Consoles' ||
        normalized === 'Controllers'
      );
    }
    return normalizeProductCategory(sel) === normalized;
  });
}

/** Storefront “new” flag — prefers explicit condition, then is_new / new. */
export function productIsNew(p: Product): boolean {
  const condition = String(p.condition || '').toLowerCase().trim();
  if (condition === 'preowned' || condition === 'refurbished' || condition === 'used' || condition === 'pre-owned') {
    return false;
  }
  if (condition === 'new') return true;
  if (p.is_new != null) return Boolean(p.is_new);
  if (p.new != null) return Boolean(p.new);
  return false;
}

/** Customer-facing condition label for cards / PDP / compare. */
export function formatProductConditionLabel(p: Pick<Product, 'condition' | 'is_new' | 'new'>): string {
  const condition = String(p.condition || '').toLowerCase().trim();
  if (condition === 'refurbished' || condition === 'refurb') return 'Refurbished';
  if (
    condition === 'preowned' ||
    condition === 'used' ||
    condition === 'pre-owned' ||
    condition === 'pre_owned'
  ) {
    return 'Pre-owned';
  }
  if (condition === 'new') return 'New';
  if (p.is_new === false || p.new === false) return 'Pre-owned';
  if (p.is_new === true || p.new === true) return 'New';
  return '—';
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
    if (condition === 'preowned' || condition === 'refurbished' || condition === 'used' || condition === 'pre-owned') {
      return false;
    }
    return isNew;
  }

  // used / pre-owned
  if (condition === 'preowned' || condition === 'refurbished' || condition === 'used' || condition === 'pre-owned') {
    return true;
  }
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
  'Consoles',
  'Controllers',
  'Smart watches',
  'Apple Watches',
  'Android phones',
  'Accessories',
]);

/**
 * Brand picker first, then series (Audio + Windows laptops + watches + Android + Accessories types).
 * Opposite of iPad/MacBooks (series → New/Used).
 */
export const CATEGORIES_BRAND_THEN_SERIES = new Set([
  'Laptops',
  'Headphones',
  'Speakers',
  'Consoles',
  'Controllers',
  'Smart watches',
  'Apple Watches',
  'Android phones',
  'Accessories',
]);

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
  { value: 'neo', label: 'MacBook Neo', description: 'MacBook Neo notebooks' },
  { value: 'other', label: 'Other Mac', description: 'iMac, Mac mini & more' },
];

export const WATCH_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'Ultra', label: 'Ultra', description: 'Apple Watch Ultra 2 and Ultra 3' },
  { value: 'Series', label: 'Series', description: 'Apple Watch Series line' },
];

export const ANDROID_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'Fold 7', label: 'Fold 7', description: 'Galaxy Z Fold 7' },
  { value: 'Flip 7', label: 'Flip 7', description: 'Galaxy Z Flip 7' },
  { value: 'Flip 7 FE', label: 'Flip 7 FE', description: 'Galaxy Z Flip 7 FE' },
  { value: 'S26 Ultra', label: 'S26 Ultra', description: 'Galaxy S26 Ultra' },
  { value: 'S25 Ultra', label: 'S25 Ultra', description: 'Galaxy S25 Ultra' },
  { value: 'S25 FE', label: 'S25 FE', description: 'Galaxy S25 FE' },
  { value: 'A06', label: 'A06', description: 'Galaxy A06' },
  { value: 'A07', label: 'A07', description: 'Galaxy A07' },
  { value: 'A17', label: 'A17', description: 'Galaxy A17' },
  { value: 'A26', label: 'A26', description: 'Galaxy A26' },
  { value: 'A36', label: 'A36', description: 'Galaxy A36' },
  { value: 'A55', label: 'A55', description: 'Galaxy A55' },
  { value: 'A56', label: 'A56', description: 'Galaxy A56' },
  { value: 'Pixel 10 Pro XL', label: 'Pixel 10 Pro XL', description: 'Google Pixel 10 Pro XL' },
  { value: 'Pixel 9 Pro XL', label: 'Pixel 9 Pro XL', description: 'Google Pixel 9 Pro XL' },
  { value: 'Pixel 8', label: 'Pixel 8', description: 'Google Pixel 8' },
  { value: 'Pixel 7', label: 'Pixel 7', description: 'Google Pixel 7' },
  { value: 'Moto G 2024', label: 'Moto G 2024', description: 'Motorola Moto G (2024)' },
  { value: 'Moto G 2025', label: 'Moto G 2025', description: 'Motorola Moto G (2025)' },
];

export const LAPTOP_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'Omen', label: 'Omen', description: 'HP Omen gaming notebooks' },
  { value: 'Envy', label: 'Envy', description: 'HP Envy notebooks' },
  { value: 'Victus', label: 'Victus', description: 'HP Victus gaming notebooks' },
  { value: 'Alienware', label: 'Alienware', description: 'Dell Alienware notebooks' },
];

export const HEADPHONE_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'AirPods', label: 'AirPods', description: 'Standard AirPods (incl. AirPods 4)' },
  { value: 'AirPods Pro', label: 'AirPods Pro', description: 'AirPods Pro with ANC' },
  { value: 'AirPods Max', label: 'AirPods Max', description: 'Over-ear AirPods Max' },
  { value: 'EarPods', label: 'EarPods', description: 'Wired EarPods / earphones' },
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

export const CONSOLE_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'PlayStation 5', label: 'PlayStation 5', description: 'PS5 Slim and Pro' },
  { value: 'PlayStation Portal', label: 'PlayStation Portal', description: 'Remote play handheld' },
  { value: 'Xbox Series', label: 'Xbox Series', description: 'Series S and Series X' },
  { value: 'Switch', label: 'Switch', description: 'Nintendo Switch 2 and OLED' },
  { value: 'Steam Deck', label: 'Steam Deck', description: 'Valve Steam Deck' },
];

export const CONTROLLER_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'DualSense', label: 'DualSense', description: 'PlayStation controllers' },
  { value: 'Xbox', label: 'Xbox', description: 'Xbox controllers' },
];

export const ACCESSORY_TYPE_OPTIONS: StoreSeriesOption[] = [
  { value: 'Chargers', label: 'Chargers', description: 'Apple, Samsung, laptop & more' },
  { value: 'ScreenProtectors', label: 'Screen Protectors', description: 'Glass, ceramic, clear & privacy' },
  { value: 'Covers', label: 'Covers', description: 'iPhone, iPad & MacBook cases' },
  { value: 'AirTags', label: 'AirTags', description: 'Single pack & packs of 4' },
  { value: 'AppleWatchAccessories', label: 'Apple Watch Accessories', description: 'Straps, protectors & covers' },
  { value: 'MagicKeyboard', label: 'Magic Keyboard', description: 'iPad Magic Keyboard' },
  { value: 'ApplePencil', label: 'Apple Pencil', description: 'Pro, Gen 2, Gen 1 & USB-C' },
  { value: 'PowerBanks', label: 'Power Banks', description: 'Portable power banks' },
  { value: 'Keyboards', label: 'Keyboards', description: 'External keyboards' },
  { value: 'Mouse', label: 'Mouse', description: 'Mice & trackpads' },
  { value: 'FlashDrives', label: 'Flash Drives', description: 'USB / flash storage' },
];

/** Device / line series under each Accessories type (August pricelist). */
export const ACCESSORY_SERIES_OPTIONS: StoreSeriesOption[] = [
  { value: 'Apple', label: 'Apple', description: 'MacBook, iPhone and Apple Watch chargers' },
  { value: 'iPhone', label: 'iPhone', description: 'iPhone chargers, protectors & covers' },
  { value: 'MacBook', label: 'MacBook', description: 'MacBook chargers & hard shells' },
  { value: 'AppleWatch', label: 'Apple Watch', description: 'Watch chargers & straps' },
  { value: 'Samsung', label: 'Samsung', description: 'Samsung device chargers' },
  { value: 'Laptops', label: 'Laptops', description: 'Windows / other laptop chargers' },
  { value: 'Others', label: 'Others', description: 'Other device chargers' },
  { value: 'iPad', label: 'iPad', description: 'iPad protectors, covers & keyboards' },
  { value: 'Straps', label: 'Straps', description: 'Rubber sports & leather straps' },
  { value: 'ScreenProtectors', label: 'Screen Protectors', description: 'Apple Watch screen protectors' },
  { value: 'Covers', label: 'Covers', description: 'Apple Watch covers' },
  { value: 'Single', label: 'Single pack', description: '1 AirTag' },
  { value: 'PackOf4', label: 'Pack of 4', description: '4 AirTags' },
  { value: 'Pro', label: 'Apple Pencil Pro', description: 'Apple Pencil Pro' },
  { value: 'Gen2', label: 'Gen 2', description: 'Apple Pencil (2nd generation)' },
  { value: 'Gen1', label: 'Gen 1', description: 'Apple Pencil (1st generation)' },
  { value: 'USBC', label: 'USB-C', description: 'Apple Pencil USB-C' },
  { value: 'General', label: 'General', description: 'Standard / uncategorised line' },
];

export function categoryUsesSeriesStep(category: string | null | undefined): boolean {
  if (!category) return false;
  return CATEGORIES_WITH_SERIES.has(normalizeProductCategory(category));
}

export function categoryUsesBrandThenSeries(category: string | null | undefined): boolean {
  if (!category) return false;
  return CATEGORIES_BRAND_THEN_SERIES.has(normalizeProductCategory(category));
}

/** Accessories use Type (Chargers, Covers, …) instead of Brand on the first step. */
export function categoryUsesTypeThenSeries(category: string | null | undefined): boolean {
  if (!category) return false;
  return normalizeProductCategory(category) === 'Accessories';
}

/** Suggested products.brand when staff pick a storefront brand/type tag. */
export function suggestBrandFromTaxonomy(
  category: string | null | undefined,
  taxonomyValue: string | null | undefined,
): string | null {
  const v = String(taxonomyValue ?? '').trim();
  if (!v) return null;
  const map: Record<string, string> = {
    Apple: 'Apple',
    AirPods: 'Apple',
    'AirPods Pro': 'Apple',
    'AirPods Max': 'Apple',
    EarPods: 'Apple',
    HomePod: 'Apple',
    JBL: 'JBL',
    Tune: 'JBL',
    Beats: 'Beats',
    Solo: 'Beats',
    Pill: 'Beats',
    Sony: 'Sony',
    HarmanKardon: 'Harman Kardon',
    Flip: 'JBL',
    Charge: 'JBL',
    Boombox: 'JBL',
    Go: 'JBL',
    Onyx: 'Harman Kardon',
    HP: 'HP',
    Dell: 'Dell',
    PlayStation: 'Sony',
    Xbox: 'Microsoft',
    Steam: 'Valve',
    Nintendo: 'Nintendo',
    Valve: 'Valve',
    iWatches: 'Apple',
    Ultra: 'Apple',
    Series: 'Apple',
    Samsung: 'Samsung',
    Google: 'Google',
    Motorola: 'Motorola',
  };
  if (map[v]) return map[v];
  const cat = normalizeProductCategory(category);
  // Condition pickers (New/Used) — default Apple for Apple device categories
  if (v === 'new' || v === 'used') {
    if (cat === 'MacBooks' || cat === 'iPhone' || cat === 'iPad') return 'Apple';
    return null;
  }
  if (cat === 'Accessories') return null;
  // Store tag only — leave products.brand for staff to fill (e.g. Samsung)
  if (v === 'Others' || v === 'PhoneCases' || v === 'Covers' || v === 'ScreenProtectors' || v === 'Chargers'
    || v === 'AirTags' || v === 'AppleWatchAccessories' || v === 'MagicKeyboard' || v === 'ApplePencil'
    || v === 'PowerBanks' || v === 'Keyboards' || v === 'Mouse' || v === 'FlashDrives') {
    return null;
  }
  return v;
}

/**
 * Resolve admin Brand/Type picker value from a saved product.
 * Brand→series categories store series on subcategory, so prefer products.brand.
 */
export function resolveAdminTaxonomyValue(
  p: Pick<Product, 'category' | 'condition' | 'subcategory' | 'is_new' | 'new' | 'brand' | 'name'>,
): string {
  const category = String(p.category || 'iPhone');
  const opts = getCategorySubcategoryOptions(category);
  if (opts.length === 0) return '';

  if (categoryUsesConditionSubcategory(category)) {
    const isNew =
      p.is_new != null
        ? Boolean(p.is_new)
        : p.new != null
          ? Boolean(p.new)
          : String(p.condition || 'new').toLowerCase() === 'new';
    const want = isNew ? 'new' : 'used';
    return opts.some((o) => o.value === want) ? want : (opts[0]?.value ?? 'new');
  }

  if (categoryUsesBrandThenSeries(category)) {
    // Accessories: type lives in specifications.accessory_type (series on subcategory)
    if (normalizeProductCategory(category) === 'Accessories') {
      const specs =
        'specifications' in p && p.specifications && typeof p.specifications === 'object'
          ? (p.specifications as Record<string, unknown>)
          : null;
      const accessoryType = String(specs?.accessory_type ?? '').trim();
      if (accessoryType) {
        const byType = opts.find(
          (o) =>
            o.value.toLowerCase() === accessoryType.toLowerCase() ||
            o.label.toLowerCase() === accessoryType.toLowerCase() ||
            (accessoryType.toLowerCase() === 'phonecases' && o.value === 'Covers'),
        );
        if (byType) return byType.value;
      }
      const subRaw = String(p.subcategory ?? '').trim();
      if (subRaw) {
        const bySubType = opts.find(
          (o) =>
            o.value.toLowerCase() === subRaw.toLowerCase() ||
            (subRaw.toLowerCase() === 'phonecases' && o.value === 'Covers'),
        );
        if (bySubType) return bySubType.value;
      }
      const productName = 'name' in p ? String((p as { name?: string }).name ?? '') : '';
      const hay = `${productName} ${p.brand ?? ''}`.toLowerCase();
      if (hay.includes('charger') || hay.includes('cable') || hay.includes('adapter')) {
        if (opts.some((o) => o.value === 'Chargers')) return 'Chargers';
      }
      if (hay.includes('protector') || hay.includes('tempered') || hay.includes('privacy glass')) {
        if (opts.some((o) => o.value === 'ScreenProtectors')) return 'ScreenProtectors';
      }
      if (hay.includes('case') || hay.includes('cover') || hay.includes('magsafe') || hay.includes('silicon')) {
        if (opts.some((o) => o.value === 'Covers')) return 'Covers';
      }
      if (hay.includes('airtag')) {
        if (opts.some((o) => o.value === 'AirTags')) return 'AirTags';
      }
      if (hay.includes('pencil')) {
        if (opts.some((o) => o.value === 'ApplePencil')) return 'ApplePencil';
      }
      if (hay.includes('magic keyboard')) {
        if (opts.some((o) => o.value === 'MagicKeyboard')) return 'MagicKeyboard';
      }
      if ((hay.includes('watch') && (hay.includes('strap') || hay.includes('band'))) || hay.includes('sports strap')) {
        if (opts.some((o) => o.value === 'AppleWatchAccessories')) return 'AppleWatchAccessories';
      }
    }

    const brand = String(p.brand ?? '').trim();
    if (brand) {
      const byBrand = opts.find(
        (o) =>
          o.value.toLowerCase() === brand.toLowerCase() ||
          o.label.toLowerCase() === brand.toLowerCase() ||
          o.value.replace(/\s+/g, '').toLowerCase() === brand.replace(/\s+/g, '').toLowerCase(),
      );
      if (byBrand) return byBrand.value;
      // Apple audio lines → Apple brand card (not a fake "AirPods" brand)
      const hay = `${brand} ${p.subcategory ?? ''} ${'name' in p ? String((p as { name?: string }).name ?? '') : ''}`.toLowerCase();
      if (
        (hay.includes('airpod') || hay.includes('earpod') || hay.includes('homepod') || brand.toLowerCase() === 'apple') &&
        opts.some((o) => o.value === 'Apple')
      ) {
        return 'Apple';
      }
      if (hay.includes('beats') && opts.some((o) => o.value === 'Beats')) return 'Beats';
      if ((hay.includes('harman') || hay.includes('kardon')) && opts.some((o) => o.value === 'HarmanKardon')) {
        return 'HarmanKardon';
      }
      if (hay.includes('jbl') && opts.some((o) => o.value === 'JBL')) return 'JBL';
      if (hay.includes('sony') && opts.some((o) => o.value === 'Sony')) return 'Sony';
      // Legacy brand tags still on old products / URLs
      if (hay.includes('airpod') && opts.some((o) => o.value === 'AirPods')) return 'AirPods';
      if (hay.includes('homepod') && opts.some((o) => o.value === 'HomePod')) return 'HomePod';
      if (hay.includes('earpod') && opts.some((o) => o.value === 'EarPods')) return 'EarPods';
    }
  }

  const sub = String(p.subcategory ?? '').trim();
  if (sub) {
    const hit = opts.find(
      (o) =>
        o.value.toLowerCase() === sub.toLowerCase() ||
        o.label.toLowerCase() === sub.toLowerCase() ||
        o.value.replace(/\s+/g, '').toLowerCase() === sub.replace(/\s+/g, '').toLowerCase(),
    );
    if (hit) return hit.value;
  }

  // Apple / Smart watches: use the Apple brand picker value.
  const catNorm = normalizeProductCategory(category);
  if (catNorm === 'Smart watches' || catNorm === 'Apple Watches') {
    const brand = String(p.brand ?? '').trim();
    if (brand) {
      const byBrand = opts.find(
        (o) =>
          o.value.toLowerCase() === brand.toLowerCase() ||
          o.label.toLowerCase() === brand.toLowerCase(),
      );
      if (byBrand) return byBrand.value;
    }
    const productName = 'name' in p ? String((p as { name?: string }).name ?? '') : '';
    const hay = `${p.brand ?? ''} ${p.subcategory ?? ''} ${productName}`.toLowerCase();
    if (hay.includes('samsung') || hay.includes('galaxy')) {
      if (opts.some((o) => o.value === 'Samsung')) return 'Samsung';
    }
    if (hay.includes('apple') || hay.includes('ultra') || hay.includes('series') || hay.includes('watch')) {
      if (opts.some((o) => o.value === 'Apple')) return 'Apple';
    }
    if (opts.some((o) => o.value === 'Others')) return 'Others';
  }

  if (catNorm === 'Android phones') {
    const brand = String(p.brand ?? '').trim();
    if (brand) {
      const byBrand = opts.find(
        (o) =>
          o.value.toLowerCase() === brand.toLowerCase() ||
          o.label.toLowerCase() === brand.toLowerCase(),
      );
      if (byBrand) return byBrand.value;
    }
    const productName = 'name' in p ? String((p as { name?: string }).name ?? '') : '';
    const hay = `${p.brand ?? ''} ${p.subcategory ?? ''} ${productName}`.toLowerCase();
    if (hay.includes('google') || hay.includes('pixel')) {
      if (opts.some((o) => o.value === 'Google')) return 'Google';
    }
    if (hay.includes('motorola') || hay.includes('moto')) {
      if (opts.some((o) => o.value === 'Motorola')) return 'Motorola';
    }
    if (opts.some((o) => o.value === 'Samsung')) return 'Samsung';
  }

  return opts[0]?.value ?? '';
}

/** Catalog key written into products.specifications for seeded/admin rows. */
export function catalogKeyForCategory(category: string | null | undefined): string | null {
  const n = normalizeProductCategory(category);
  if (n === 'iPad' || n === 'Tablet') return 'ipad';
  if (n === 'Headphones' || n === 'Speakers') return 'audio';
  if (n === 'Laptops' || n === 'Laptop') return 'laptop';
  if (n === 'MacBooks') return 'macbook';
  if (n === 'Android phones') return 'android';
  if (n === 'Accessories') return 'accessories';
  if (n === 'Gaming') return 'gaming';
  if (n === 'Consoles') return 'console';
  if (n === 'Controllers') return 'controller';
  if (n === 'Apple Watches' || n === 'Smart watches') return 'watches';
  return null;
}

const HEADPHONE_BRAND_SERIES: Readonly<Record<string, readonly string[]>> = {
  Apple: ['AirPods', 'AirPods Pro', 'AirPods Max', 'EarPods'],
  // Legacy brand keys (old URLs / admin drafts) → still show Apple lines
  AirPods: ['AirPods', 'AirPods Pro', 'AirPods Max'],
  EarPods: ['EarPods'],
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

const WATCH_BRAND_SERIES: Readonly<Record<string, readonly string[]>> = {
  Apple: ['Ultra', 'Series'],
};

const ANDROID_BRAND_SERIES: Readonly<Record<string, readonly string[]>> = {
  Samsung: [
    'Fold 7',
    'Flip 7',
    'Flip 7 FE',
    'S26 Ultra',
    'S25 Ultra',
    'S25 FE',
    'A06',
    'A07',
    'A17',
    'A26',
    'A36',
    'A55',
    'A56',
  ],
  Google: ['Pixel 10 Pro XL', 'Pixel 9 Pro XL', 'Pixel 8', 'Pixel 7'],
  Motorola: ['Moto G 2024', 'Moto G 2025'],
};

const CONSOLE_BRAND_SERIES: Readonly<Record<string, readonly string[]>> = {
  Sony: ['PlayStation 5', 'PlayStation Portal'],
  Microsoft: ['Xbox Series'],
  Nintendo: ['Switch'],
  Valve: ['Steam Deck'],
};

const CONTROLLER_BRAND_SERIES: Readonly<Record<string, readonly string[]>> = {
  Sony: ['DualSense'],
  Microsoft: ['Xbox'],
};

/** Accessories “brand” step is the PDF type (Chargers, Covers, …). */
const ACCESSORY_TYPE_SERIES: Readonly<Record<string, readonly string[]>> = {
  Chargers: ['Apple', 'Samsung', 'Laptops', 'Others'],
  ScreenProtectors: ['iPhone', 'iPad'],
  Covers: ['iPhone', 'iPad', 'MacBook'],
  // Legacy alias
  PhoneCases: ['iPhone', 'iPad', 'MacBook'],
  // These types go directly to purchasable leaf products.
  AirTags: [],
  AppleWatchAccessories: ['Straps', 'ScreenProtectors', 'Covers'],
  MagicKeyboard: [],
  ApplePencil: [],
  PowerBanks: [],
  Keyboards: [],
  Mouse: [],
  FlashDrives: [],
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

  if (n === 'Smart watches' || n === 'Apple Watches') {
    // Side filter: all lines when no brand; brand picker still scopes when set
    if (!brand) return WATCH_SERIES_OPTIONS;
    const allowed = WATCH_BRAND_SERIES[brand];
    if (!allowed) return [];
    return WATCH_SERIES_OPTIONS.filter((o) => allowed.includes(o.value));
  }

  if (n === 'Android phones') {
    if (!brand) return ANDROID_SERIES_OPTIONS;
    const allowed = ANDROID_BRAND_SERIES[brand];
    if (!allowed) return [];
    return ANDROID_SERIES_OPTIONS.filter((o) => allowed.includes(o.value));
  }

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
  if (n === 'Consoles') {
    if (!brand) return CONSOLE_SERIES_OPTIONS;
    const allowed = CONSOLE_BRAND_SERIES[brand];
    if (!allowed) return [];
    return CONSOLE_SERIES_OPTIONS.filter((o) => allowed.includes(o.value));
  }
  if (n === 'Controllers') {
    if (!brand) return CONTROLLER_SERIES_OPTIONS;
    const allowed = CONTROLLER_BRAND_SERIES[brand];
    if (!allowed) return [];
    return CONTROLLER_SERIES_OPTIONS.filter((o) => allowed.includes(o.value));
  }
  if (n === 'Accessories') {
    if (!brand) return ACCESSORY_SERIES_OPTIONS;
    const allowed = ACCESSORY_TYPE_SERIES[brand];
    if (!allowed) return [];
    if (allowed.length === 0) return [];
    return ACCESSORY_SERIES_OPTIONS.filter((o) => allowed.includes(o.value));
  }
  return [];
}

/** Resolve series slug from a product (specs → subcategory → name heuristics). */
export function getProductSeriesSlug(p: Product): string | null {
  const specs = p.specifications;
  if (specs && typeof specs === 'object') {
    const s = String((specs as Record<string, unknown>).series ?? '').trim().toLowerCase();
    if (s) return s.replace(/\s+/g, ' ');
  }
  const cat = normalizeProductCategory(p.category);
  const sub = String(p.subcategory ?? '').trim().toLowerCase();
  const brand = String(p.brand ?? '').trim().toLowerCase();
  const hay = `${p.name || ''} ${p.model || ''} ${p.brand || ''}`.toLowerCase();

  const accessoryTypeTags = new Set([
    'chargers',
    'screenprotectors',
    'covers',
    'phonecases',
    'airtags',
    'applewatchaccessories',
    'magickeyboard',
    'applepencil',
    'powerbanks',
    'keyboards',
    'mouse',
    'flashdrives',
  ]);

  /**
   * Brand (or legacy brand) values sometimes sit on products.subcategory.
   * Those are not series lines — resolve series via heuristics below.
   */
  const brandAsSubcategoryTags = new Set([
    'jbl',
    'beats',
    'sony',
    'apple',
    'airpods', // legacy brand card — prefer Max/Pro/AirPods heuristics
    'earpods',
    'homepod',
    'harmankardon',
    'harman kardon',
    'samsung',
    'google',
    'motorola',
    'hp',
    'dell',
    'microsoft',
    'nintendo',
    'valve',
  ]);

  // Keep spaces for series like "Fold 7" / "PlayStation 5" (do not hyphenate —
  // that broke Android Brand → Series matching).
  if (
    sub &&
    sub !== 'new' &&
    sub !== 'used' &&
    sub !== 'preowned' &&
    sub !== 'refurbished' &&
    !(cat === 'Accessories' && accessoryTypeTags.has(sub.replace(/\s+/g, ''))) &&
    !brandAsSubcategoryTags.has(sub)
  ) {
    return sub.replace(/\s+/g, ' ').trim();
  }

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
    if (hay.includes('macbook neo') || hay.includes('mac book neo') || /\bneo\b/.test(hay)) {
      return 'neo';
    }
    if (hay.includes('imac') || hay.includes('mac mini') || hay.includes('mac studio') || hay.includes('mac')) {
      return 'other';
    }
  }
  if (cat === 'Smart watches' || cat === 'Apple Watches') {
    if (hay.includes('ultra') || sub === 'ultra') return 'ultra';
    if (hay.includes('galaxy') || sub === 'galaxy') return 'galaxy';
    if (
      sub === 'series' ||
      sub === 'iwatches' ||
      hay.includes('series') ||
      hay.includes('apple watch')
    ) {
      return 'series';
    }
    if (
      sub === 'other' ||
      hay.includes('fitbit') ||
      hay.includes('garmin') ||
      hay.includes('amazfit')
    ) {
      return 'other';
    }
  }
  if (cat === 'Android phones') {
    for (const opt of ANDROID_SERIES_OPTIONS) {
      const needle = opt.value.toLowerCase();
      if (sub === needle || hay.includes(needle)) return needle;
    }
    if (hay.includes('fold')) return 'fold 7';
    if (hay.includes('flip 7 fe')) return 'flip 7 fe';
    if (hay.includes('flip')) return 'flip 7';
    if (hay.includes('pixel 10')) return 'pixel 10 pro xl';
    if (hay.includes('pixel 9')) return 'pixel 9 pro xl';
    if (hay.includes('pixel 8')) return 'pixel 8';
    if (hay.includes('pixel 7')) return 'pixel 7';
    if (hay.includes('moto g') && hay.includes('2025')) return 'moto g 2025';
    if (hay.includes('moto g')) return 'moto g 2024';
  }
  if (cat === 'Laptops' || cat === 'Laptop') {
    if (hay.includes('alienware')) return 'alienware';
    if (hay.includes('omen')) return 'omen';
    if (hay.includes('envy')) return 'envy';
    if (hay.includes('victus')) return 'victus';
  }
  if (cat === 'Headphones') {
    // Most specific first — Max / Pro before generic AirPods
    if (hay.includes('airpods max') || hay.includes('airpod max') || sub === 'airpods max') {
      return 'airpods max';
    }
    if (hay.includes('airpods pro') || hay.includes('airpod pro') || sub === 'airpods pro') {
      return 'airpods pro';
    }
    if (hay.includes('airpod') || sub === 'airpods') return 'airpods';
    if (hay.includes('earpod') || hay.includes('ear pod') || sub === 'earpods') return 'earpods';
    if (hay.includes('tune') || sub === 'tune') return 'tune';
    if (hay.includes('solo') || sub === 'solo') return 'solo';
    if (
      hay.includes('sony') ||
      hay.includes('wh-1000') ||
      hay.includes('wf-1000') ||
      sub === 'sony'
    ) {
      return 'sony';
    }
    // Legacy brand-as-subcategory (or brand-only rows) → default line
    if (sub === 'jbl' || brand.includes('jbl') || hay.includes('jbl')) return 'tune';
    if (sub === 'beats' || brand.includes('beats') || hay.includes('beats')) return 'solo';
    if (sub === 'apple' || brand.includes('apple')) return 'airpods';
  }
  if (cat === 'Consoles' || cat === 'Controllers') {
    const series = String(
      (p.specifications && typeof p.specifications === 'object'
        ? (p.specifications as Record<string, unknown>).series
        : '') ||
        p.subcategory ||
        '',
    ).trim();
    return series ? series.toLowerCase() : null;
  }
  if (cat === 'Speakers') {
    if (hay.includes('homepod') || hay.includes('home pod')) return 'homepod';
    if (hay.includes('flip')) return 'flip';
    if (hay.includes('charge')) return 'charge';
    if (hay.includes('boombox')) return 'boombox';
    if (/\bgo\s*\d|\bgo\b/.test(hay) && hay.includes('jbl')) return 'go';
    if (hay.includes('onyx')) return 'onyx';
    if (hay.includes('pill')) return 'pill';
  }
  if (cat === 'Accessories') {
    const specsObj = specs && typeof specs === 'object' ? (specs as Record<string, unknown>) : null;
    const specsSeries = specsObj ? String(specsObj.series ?? '').trim() : '';
    const accessoryType = specsObj ? String(specsObj.accessory_type ?? '').trim() : '';
    // Chargers: Apple is the series; iPhone / MacBook / Watch are the device step.
    if (accessoryType === 'Chargers') {
      const chargerSeries = specsSeries.toLowerCase();
      if (['iphone', 'macbook', 'applewatch', 'apple watch'].includes(chargerSeries)) {
        return 'apple';
      }
    }
    if (specsSeries) return specsSeries.toLowerCase();
    const subKey = sub.replace(/\s+/g, '');
    // Device / line tags on subcategory — ignore old type tags (Chargers, Covers, …)
    if (sub && !accessoryTypeTags.has(subKey)) return sub;
    if (hay.includes('airtag') && hay.includes('4')) return 'packof4';
    if (hay.includes('airtag')) return 'single';
    if (hay.includes('pencil pro')) return 'pro';
    if (hay.includes('pencil') && (hay.includes('2nd') || hay.includes('gen 2') || hay.includes('gen2'))) {
      return 'gen2';
    }
    if (hay.includes('pencil') && (hay.includes('1st') || hay.includes('gen 1') || hay.includes('gen1'))) {
      return 'gen1';
    }
    if (hay.includes('pencil') && (hay.includes('usb-c') || hay.includes('usb c') || hay.includes('type c'))) {
      return 'usbc';
    }
    if (hay.includes('macbook') || hay.includes('mac book')) return 'macbook';
    if (hay.includes('ipad')) return 'ipad';
    if (hay.includes('watch') || hay.includes('strap')) return 'applewatch';
    if (hay.includes('samsung')) return 'samsung';
    if (hay.includes('iphone')) return 'iphone';
  }
  return null;
}

/** Compare series keys ignoring spaces / underscores / hyphens. */
function normalizeSeriesKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function productMatchesStoreSeries(
  p: Product,
  series: string | null | undefined,
): boolean {
  if (!series) return true;
  const want = series.trim().toLowerCase();
  const got = getProductSeriesSlug(p);
  if (!got) return false;
  if (got === want) return true;
  if (got.replace(/\s+/g, '-') === want) return true;
  if (want.replace(/\s+/g, '-') === got) return true;
  return normalizeSeriesKey(got) === normalizeSeriesKey(want);
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
    { kind: 'brand', value: 'Samsung', label: 'Samsung', description: 'Galaxy Fold, Flip, S & A series' },
    { kind: 'brand', value: 'Google', label: 'Google', description: 'Pixel phones' },
    { kind: 'brand', value: 'Motorola', label: 'Motorola', description: 'Moto G series' },
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
  'Apple Watches': [
    { kind: 'brand', value: 'Apple', label: 'Apple', description: 'Apple Watch Ultra & Series' },
  ],
  // Canonical multi-brand wearables category (Brand → Series)
  'Smart watches': [
    { kind: 'brand', value: 'Apple', label: 'Apple', description: 'Apple Watch Ultra & Series' },
  ],
  Gaming: [
    { kind: 'brand', value: 'PlayStation', label: 'PlayStation', description: 'Sony PS4, PS5 & accessories' },
    { kind: 'brand', value: 'Xbox',        label: 'Xbox',        description: 'Microsoft Xbox consoles & accessories' },
    { kind: 'brand', value: 'Steam',       label: 'Steam',  description: 'Steam Deck & PC gaming gear' },
    { kind: 'brand', value: 'Nintendo',    label: 'Nintendo',    description: 'Nintendo Switch & more' },
  ],
  Consoles: [
    { kind: 'brand', value: 'Sony', label: 'Sony', description: 'PlayStation 5 and Portal' },
    { kind: 'brand', value: 'Microsoft', label: 'Microsoft', description: 'Xbox Series S and Series X' },
    { kind: 'brand', value: 'Nintendo', label: 'Nintendo', description: 'Switch 2 and Switch OLED' },
    { kind: 'brand', value: 'Valve', label: 'Valve', description: 'Steam Deck' },
  ],
  Controllers: [
    { kind: 'brand', value: 'Sony', label: 'Sony', description: 'DualSense controllers' },
    { kind: 'brand', value: 'Microsoft', label: 'Microsoft', description: 'Xbox controllers' },
  ],
  Headphones: [
    { kind: 'brand', value: 'Apple', label: 'Apple', description: 'AirPods, AirPods Pro, AirPods Max & EarPods' },
    { kind: 'brand', value: 'JBL',   label: 'JBL',   description: 'JBL Tune headphones & earbuds' },
    { kind: 'brand', value: 'Beats', label: 'Beats', description: 'Beats Solo headphones' },
  ],
  Speakers: [
    { kind: 'brand', value: 'JBL',          label: 'JBL',           description: 'JBL Flip, Charge, Boombox & Go' },
    { kind: 'brand', value: 'HarmanKardon', label: 'Harman Kardon', description: 'Harman Kardon speakers' },
    { kind: 'brand', value: 'Beats',        label: 'Beats',         description: 'Beats Pill speakers' },
  ],
  // Legacy alias — old ?category=Audio URLs (umbrella brands)
  Audio: [
    { kind: 'brand', value: 'Apple', label: 'Apple', description: 'AirPods' },
    { kind: 'brand', value: 'JBL',   label: 'JBL',   description: 'JBL headphones & speakers' },
    { kind: 'brand', value: 'Beats', label: 'Beats', description: 'Beats headphones & speakers' },
    { kind: 'brand', value: 'HarmanKardon', label: 'Harman Kardon', description: 'Harman Kardon speakers' },
  ],
  Accessories: [
    { kind: 'brand', value: 'Chargers', label: 'Chargers', description: 'Apple, Samsung, laptops & others' },
    { kind: 'brand', value: 'ScreenProtectors', label: 'Screen Protectors', description: 'Glass & ceramic · clear / privacy' },
    { kind: 'brand', value: 'Covers', label: 'Covers', description: 'iPhone, iPad & MacBook cases' },
    { kind: 'brand', value: 'AirTags', label: 'AirTags', description: 'Single pack & pack of 4' },
    { kind: 'brand', value: 'AppleWatchAccessories', label: 'Apple Watch Accessories', description: 'Straps, protectors & covers' },
    { kind: 'brand', value: 'MagicKeyboard', label: 'Magic Keyboard', description: 'iPad Magic Keyboard' },
    { kind: 'brand', value: 'ApplePencil', label: 'Apple Pencil', description: 'Pro, Gen 2, Gen 1 & USB-C' },
    { kind: 'brand', value: 'PowerBanks', label: 'Power Banks', description: 'Portable power banks' },
    { kind: 'brand', value: 'Keyboards', label: 'Keyboards', description: 'External keyboards' },
    { kind: 'brand', value: 'Mouse', label: 'Mouse', description: 'Mice & trackpads' },
    { kind: 'brand', value: 'FlashDrives', label: 'Flash Drives', description: 'USB / flash storage' },
  ],
};

/**
 * Nested type cards after picking an umbrella in Browse by category.
 * Consoles / Controllers stay real product categories; Gaming is the parent card.
 */
export const STORE_PICKER_NESTED_CATEGORIES: Readonly<Record<string, SubcategoryOption[]>> = {
  Gaming: [
    {
      kind: 'brand',
      value: 'Consoles',
      label: 'Consoles',
      description: 'PlayStation, Xbox, Switch, Steam Deck',
    },
    {
      kind: 'brand',
      value: 'Controllers',
      label: 'Controllers',
      description: 'DualSense and Xbox controllers',
    },
  ],
};

/** Categories that appear under a parent card, not on the first Browse by category grid. */
export const STORE_PICKER_NESTED_CHILD_CATEGORIES = new Set(['Consoles', 'Controllers']);

export function getStorePickerNestedCategories(
  category: string | null | undefined,
): SubcategoryOption[] {
  if (!category) return [];
  return STORE_PICKER_NESTED_CATEGORIES[normalizeProductCategory(category)] ?? [];
}

export function storePickerParentCategory(
  category: string | null | undefined,
): string | null {
  const n = normalizeProductCategory(category);
  if (STORE_PICKER_NESTED_CHILD_CATEGORIES.has(n)) return 'Gaming';
  return null;
}

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
  'Consoles',
  'Controllers',
  'Headphones',
  'Speakers',
  'Accessories',
] as const;

export type AdminMainCategory = (typeof ADMIN_MAIN_CATEGORIES)[number];

const CONDITION_MAIN_CATEGORIES = new Set([
  'iPhone',
  'iPad',
  'MacBooks',
]);

export function categoryUsesConditionSubcategory(category: string | null | undefined): boolean {
  if (!category) return false;
  const n = normalizeProductCategory(category);
  return CONDITION_MAIN_CATEGORIES.has(category) || CONDITION_MAIN_CATEGORIES.has(n);
}

/**
 * Map admin taxonomy selection onto DB fields.
 * UI "Used" → condition=preowned. Brand→Series categories (Android, watches,
 * audio, laptops) preserve staff Condition on the product form.
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
    // Brand → Series taxonomy (no New/Used step). Preserve Pre-owned /
    // Refurbished when staff set Condition on the product form so legacy
    // used stock still saves and renders correctly.
    const existing = String(input.existingCondition ?? 'new').toLowerCase();
    const condition: 'new' | 'preowned' | 'refurbished' =
      existing === 'preowned' || existing === 'used' || existing === 'pre-owned'
        ? 'preowned'
        : existing === 'refurbished' || existing === 'refurb'
          ? 'refurbished'
          : 'new';
    return {
      category,
      subcategory: keepSeries,
      condition,
      is_new: condition === 'new',
      taxonomyLabel: hit?.label ?? raw ?? 'Android',
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

  // Audio + Laptops: series lives on subcategory; brand is products.brand.
  // Preserve staff-selected Condition (New / Pre-owned / Refurbished).
  if (categoryUsesBrandThenSeries(category)) {
    return {
      category,
      subcategory: keepSeries,
      condition,
      is_new: condition === 'new',
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

  if (category === 'Android phones') {
    // Brand → Series; condition is always New for this catalogue
    return null;
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
    const catNorm = normalizeProductCategory(category);

    // Watches: legacy Ultra / Series were line tags, not brands.
    // Map them to Apple so Brand → Series still works from old URLs.
    if (
      (catNorm === 'Smart watches' || catNorm === 'Apple Watches') &&
      (rawLower === 'ultra' || rawLower === 'series' || rawLower === 'iwatch' || rawLower === 'iwatches')
    ) {
      if (opts.some((o) => o.value === 'Apple')) {
        return { kind: 'brand', value: 'Apple' };
      }
    }

    const alias =
      rawLower === 'iwatch' || rawLower === 'iwatches'
        ? 'apple'
        : rawLower === 'ultra' || rawLower === 'series'
          ? 'apple'
          : rawLower === 'other' || rawLower === 'others'
            ? 'others'
            : rawLower === 'google pixel'
              ? 'googlepixel'
              : rawLower;
    const hit = opts.find((o) => o.value.toLowerCase() === alias || o.value.toLowerCase() === rawLower);
    if (hit) return { kind: hit.kind, value: hit.value };

    // Ignore unknown subcategory values for brand→series categories so the
    // Brand picker still renders (e.g. stale Ultra/Series bookmarks).
    if (categoryUsesBrandThenSeries(category)) {
      return undefined;
    }
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
  const specs =
    p.specifications && typeof p.specifications === 'object'
      ? (p.specifications as Record<string, unknown>)
      : null;
  const watchGroup = String(specs?.watch_group ?? '').toLowerCase();
  const haystack = `${brand} ${name} ${model} ${watchGroup}`;

  // Brand-first watch taxonomy (Apple).
  if (v === 'apple') {
    if (brand.includes('apple')) return true;
    return (
      tagged === 'ultra' ||
      tagged === 'series' ||
      tagged === 'iwatches' ||
      tagged === 'iwatch' ||
      watchGroup === 'ultra' ||
      watchGroup === 'series' ||
      haystack.includes('apple watch') ||
      haystack.includes('iwatch')
    );
  }
  if (v === 'google') {
    return (
      brand.includes('google') ||
      haystack.includes('google') ||
      haystack.includes('pixel') ||
      tagged.includes('pixel')
    );
  }
  if (v === 'motorola') {
    return (
      brand.includes('motorola') ||
      brand.includes('moto') ||
      haystack.includes('motorola') ||
      haystack.includes('moto g') ||
      tagged.includes('moto')
    );
  }
  if (v === 'samsung') {
    if (brand.includes('samsung')) return true;
    if (brand.includes('apple') || brand.includes('google') || brand.includes('motorola')) {
      return false;
    }
    return (
      haystack.includes('samsung') ||
      haystack.includes('galaxy') ||
      tagged === 'galaxy' ||
      watchGroup === 'galaxy' ||
      tagged.includes('fold') ||
      tagged.includes('flip') ||
      /^a\d{2}$/i.test(tagged) ||
      /^s\d{2}/i.test(tagged)
    );
  }
  if (v === 'others' || v === 'other') {
    const isApple =
      brand.includes('apple') ||
      tagged === 'ultra' ||
      tagged === 'series' ||
      tagged === 'iwatches' ||
      haystack.includes('apple watch');
    const isSamsung =
      brand.includes('samsung') || haystack.includes('samsung') || haystack.includes('galaxy');
    return !isApple && !isSamsung;
  }

  // Legacy Ultra / Series URLs (pre brand→series) — still match line tags
  if (v === 'ultra') {
    if (tagged === 'ultra' || watchGroup === 'ultra') return true;
    return haystack.includes('ultra');
  }
  if (v === 'series') {
    if (tagged === 'series' || tagged === 'iwatches' || tagged === 'iwatch' || watchGroup === 'series') {
      return true;
    }
    if (haystack.includes('ultra')) return false;
    return (
      haystack.includes('series') ||
      haystack.includes('apple watch') ||
      haystack.includes('iwatch') ||
      ((brand.includes('apple') || name.includes('apple')) &&
        (name.includes('watch') || model.includes('watch')))
    );
  }

  if (v === 'iwatch' || v === 'iwatches') {
    return (
      ((brand.includes('apple') || name.includes('apple') || brand.includes('watch')) &&
        (name.includes('watch') || model.includes('watch') || haystack.includes('iwatch'))) ||
      haystack.includes('apple watch')
    );
  }
  if (v === 'googlepixel' || v === 'pixel') {
    return haystack.includes('pixel') || haystack.includes('google');
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
  if (v === 'jbl') {
    const series = String(specs?.series ?? '').trim().toLowerCase();
    return (
      haystack.includes('jbl') ||
      tagged === 'jbl' ||
      tagged === 'tune' ||
      tagged === 'flip' ||
      tagged === 'charge' ||
      tagged === 'boombox' ||
      tagged === 'go' ||
      series === 'tune' ||
      series === 'flip' ||
      series === 'charge' ||
      series === 'boombox' ||
      series === 'go' ||
      haystack.includes('tune')
    );
  }
  if (v === 'beats') {
    const series = String(specs?.series ?? '').trim().toLowerCase();
    return (
      haystack.includes('beats') ||
      haystack.includes('solo') ||
      haystack.includes('pill') ||
      tagged === 'beats' ||
      tagged === 'solo' ||
      tagged === 'pill' ||
      series === 'solo' ||
      series === 'pill'
    );
  }
  if (v === 'sony') {
    return (
      haystack.includes('sony') ||
      tagged === 'sony' ||
      haystack.includes('wh-1000') ||
      haystack.includes('wf-1000')
    );
  }
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

  // Accessories types (August pricelist) — prefer specifications.accessory_type
  const accessoryType = String(specs?.accessory_type ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  if (v === 'chargers') {
    return (
      accessoryType === 'chargers' ||
      tagged === 'chargers' ||
      haystack.includes('charg') ||
      haystack.includes('cable') ||
      haystack.includes('adapter')
    );
  }
  if (v === 'covers' || v === 'phonecases') {
    return (
      accessoryType === 'covers' ||
      accessoryType === 'phonecases' ||
      tagged === 'covers' ||
      tagged === 'phonecases' ||
      haystack.includes('case') ||
      haystack.includes('cover') ||
      haystack.includes('magsafe') ||
      haystack.includes('hard shell')
    );
  }
  if (v === 'screenprotectors') {
    return (
      accessoryType === 'screenprotectors' ||
      tagged === 'screenprotectors' ||
      ((haystack.includes('screen') || haystack.includes('protector')) &&
        (haystack.includes('protector') || haystack.includes('tempered') || haystack.includes('glass') || haystack.includes('ceramic') || haystack.includes('privacy')))
    );
  }
  if (v === 'airtags') {
    return accessoryType === 'airtags' || tagged === 'airtags' || haystack.includes('airtag');
  }
  if (v === 'applewatchaccessories') {
    return (
      accessoryType === 'applewatchaccessories' ||
      tagged === 'applewatchaccessories' ||
      haystack.includes('watch strap') ||
      haystack.includes('sports strap') ||
      haystack.includes('leather strap') ||
      (haystack.includes('watch') && (haystack.includes('strap') || haystack.includes('band') || haystack.includes('cover')))
    );
  }
  if (v === 'magickeyboard') {
    return (
      accessoryType === 'magickeyboard' ||
      tagged === 'magickeyboard' ||
      haystack.includes('magic keyboard')
    );
  }
  if (v === 'applepencil') {
    return (
      accessoryType === 'applepencil' ||
      tagged === 'applepencil' ||
      haystack.includes('apple pencil') ||
      haystack.includes('pencil pro')
    );
  }
  if (v === 'powerbanks') {
    return (
      accessoryType === 'powerbanks' ||
      tagged === 'powerbanks' ||
      haystack.includes('power bank') ||
      haystack.includes('powerbank')
    );
  }
  if (v === 'keyboards') {
    return (
      accessoryType === 'keyboards' ||
      tagged === 'keyboards' ||
      (haystack.includes('keyboard') && !haystack.includes('magic keyboard'))
    );
  }
  if (v === 'mouse') {
    return accessoryType === 'mouse' || tagged === 'mouse' || haystack.includes('mouse') || haystack.includes('trackpad');
  }
  if (v === 'flashdrives') {
    return (
      accessoryType === 'flashdrives' ||
      tagged === 'flashdrives' ||
      haystack.includes('flash drive') ||
      haystack.includes('flashdrive') ||
      haystack.includes('usb drive') ||
      haystack.includes('thumb drive')
    );
  }

  return haystack.includes(v);
}
