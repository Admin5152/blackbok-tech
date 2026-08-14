import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Search,
  Filter,
  Grid3x3,
  List,
  Smartphone,
  Laptop as LaptopIcon,
  Tablet as TabletIcon,
  Headphones,
  Watch,
  Gamepad2,
  LayoutGrid,
  X,
  Repeat2,
  PanelLeftClose,
  Sparkles,
  Package,
  Flame,
  ChevronRight,
} from 'lucide-react';
import { PageBackButton } from '../components/PageBackButton';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { StoreFilterPanel, type StoreCategoryRow, STORE_PRICE_SLIDER_MAX } from '../components/StoreFilterPanel';
import { StoreProductListRow } from '../components/StoreProductListRow';
import { normalizeProductCategory } from '../lib/api';
import { isDealOfTheDayProduct } from '../lib/dealOfTheDay';
import { scanScrollReveal } from '../hooks/useScrollReveal';
import { sortProductsStockFirst } from '../lib/productOptions';
import { lockPageScroll } from '../lib/pageScrollLock';
import { PAGE_SIZES, usePagination } from '../lib/pagination';
import { Pagination } from '../components/Pagination';
import { ProductGridSkeleton, ListSkeleton } from '../components/Skeleton';
import { FlowBreadcrumb, type FlowBreadcrumbItem } from '../components/FlowBreadcrumb';
import {
  buildOrderedStoreCategoryKeys,
  countActiveStoreFilters,
  productMatchesStoreCategories,
  productMatchesStoreSubcategoryFilter,
  productMatchesStoreSeries,
  productPassesStoreBaseFilters,
  fetchStoreSearchProducts,
  getCategorySubcategoryOptions,
  getCategorySeriesOptions,
  getStorePickerNestedCategories,
  storePickerParentCategory,
  STORE_PICKER_NESTED_CHILD_CATEGORIES,
  categoryUsesSeriesStep,
  categoryUsesBrandThenSeries,
  categoryUsesTypeThenSeries,
  resolveStoreSubcategoryFilter,
  encodeStoreSubcategorySearch,
  subcategoryFilterLabel,
  seriesFilterLabel,
  getSubcategoryCount,
  productMatchesStoreNewFilter,
  type StoreNewFilter,
  type StoreSubcategoryFilter,
  type SubcategoryOption,
  type StoreSeriesOption,
} from '../lib/storeFilters';
import {
  accessoryDeviceLabel,
  accessoryLeafProductName,
  accessoryTypeLabel,
  getAccessoryDeviceOptions,
  productMatchesAccessoryDevice,
} from '../lib/accessoryCatalog';
import type { Theme } from '../App';
import { taxonomyChildren, useShopTaxonomy } from '../lib/shopTaxonomy';

interface StoreProps {
  products: Product[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategories: Category[];
  setSelectedCategories: (cats: Category[]) => void;
  navigateTo: (view: string, id?: string) => void;
  onQuickView: (product: Product) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  compareIds: string[];
  onToggleCompare: (productId: string) => void;
  onAddToCart: (p: Product, options?: Record<string, string>, qty?: number) => void;
  theme?: Theme;
  categoriesFromUrl?: string[];
  searchFromUrl?: string;
  browseFromUrl?: 'all' | 'deals';
  /** @deprecated Prefer subcategoryFromUrl — kept for ?condition=new|used bookmarks */
  conditionFromUrl?: StoreNewFilter;
  subcategoryFromUrl?: string;
  seriesFromUrl?: string;
  deviceFromUrl?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  iPhone: <Smartphone size={14} />,
  'Android phones': <Smartphone size={14} />,
  iPad: <TabletIcon size={14} />,
  MacBooks: <LaptopIcon size={14} />,
  Laptops: <LaptopIcon size={14} />,
  Laptop: <LaptopIcon size={14} />,
  Tablet: <TabletIcon size={14} />,
  'Apple Watches': <Watch size={14} />,
  'Smart watches': <Watch size={14} />,
  Accessories: <Watch size={14} />,
  Gaming: <Gamepad2 size={14} />,
  Consoles: <Gamepad2 size={14} />,
  Controllers: <Gamepad2 size={14} />,
  Headphones: <Headphones size={14} />,
  Speakers: <Headphones size={14} />,
  Audio: <Headphones size={14} />,
  Trades: <Repeat2 size={14} />,
};

const CATEGORY_ICONS_LG: Record<string, React.ReactNode> = {
  iPhone: <Smartphone size={28} strokeWidth={1.5} />,
  'Android phones': <Smartphone size={28} strokeWidth={1.5} />,
  iPad: <TabletIcon size={28} strokeWidth={1.5} />,
  MacBooks: <LaptopIcon size={28} strokeWidth={1.5} />,
  Laptops: <LaptopIcon size={28} strokeWidth={1.5} />,
  Laptop: <LaptopIcon size={28} strokeWidth={1.5} />,
  Tablet: <TabletIcon size={28} strokeWidth={1.5} />,
  'Apple Watches': <Watch size={28} strokeWidth={1.5} />,
  'Smart watches': <Watch size={28} strokeWidth={1.5} />,
  Accessories: <Watch size={28} strokeWidth={1.5} />,
  Gaming: <Gamepad2 size={28} strokeWidth={1.5} />,
  Consoles: <Gamepad2 size={28} strokeWidth={1.5} />,
  Controllers: <Gamepad2 size={28} strokeWidth={1.5} />,
  Headphones: <Headphones size={28} strokeWidth={1.5} />,
  Speakers: <Headphones size={28} strokeWidth={1.5} />,
  Audio: <Headphones size={28} strokeWidth={1.5} />,
  Trades: <Repeat2 size={28} strokeWidth={1.5} />,
};

function subcategoryCardIcon(option: SubcategoryOption): React.ReactNode {
  if (option.kind === 'condition') {
    return option.value === 'new' ? (
      <Sparkles size={28} strokeWidth={1.5} />
    ) : (
      <Package size={28} strokeWidth={1.5} />
    );
  }
  const v = option.value.toLowerCase();
  if (v.includes('console') || v.includes('controller') || v.includes('play') || v.includes('xbox') || v.includes('nintendo') || v.includes('steam')) {
    return <Gamepad2 size={28} strokeWidth={1.5} />;
  }
  if (v.includes('airpod') || v.includes('ear') || v.includes('jbl') || v.includes('sony') || v.includes('home') || v.includes('harman') || v.includes('beats') || v === 'apple') {
    return <Headphones size={28} strokeWidth={1.5} />;
  }
  if (
    v.includes('charger') ||
    v.includes('cover') ||
    v.includes('case') ||
    v.includes('protector') ||
    v.includes('airtag') ||
    v.includes('pencil') ||
    v.includes('keyboard') ||
    v.includes('mouse') ||
    v.includes('flash') ||
    v.includes('powerbank') ||
    v.includes('power')
  ) {
    return <Package size={28} strokeWidth={1.5} />;
  }
  if (v.includes('ultra') || v.includes('series') || v.includes('galaxy') || v.includes('apple') || v.includes('samsung') || v.includes('watch') || v.includes('iwatch')) {
    return <Watch size={28} strokeWidth={1.5} />;
  }
  if (v.includes('pixel') || v.includes('samsung') || v.includes('google') || v.includes('motorola') || v.includes('moto') || v.includes('fold') || v.includes('flip')) {
    return <Smartphone size={28} strokeWidth={1.5} />;
  }
  return <LayoutGrid size={28} strokeWidth={1.5} />;
}

function categoryIcon(cat: string): React.ReactNode {
  return CATEGORY_ICONS[cat] ?? <LayoutGrid size={14} />;
}

function categoryIconLg(cat: string): React.ReactNode {
  return CATEGORY_ICONS_LG[cat] ?? <LayoutGrid size={28} strokeWidth={1.5} />;
}

/** Existing site marketing photos for shop category picker cards. */
const CATEGORY_COVER_BY_KEY: Record<string, string> = {
  deals: '/trade.jpeg',
  iPhone: '/phones.jpeg',
  'Android phones': '/phones.jpeg',
  iPad: '/iPhone.jpeg',
  Tablet: '/iPhone.jpeg',
  MacBooks: '/macbook.jpeg',
  Laptops: '/laptop.jpeg',
  Laptop: '/laptop.jpeg',
  'Apple Watches': '/IMG_9008.JPG',
  'Smart watches': '/IMG_9008.JPG',
  Gaming: '/ps5and xbox.jpeg',
  Consoles: '/ps5and xbox.jpeg',
  Controllers: '/ps5.jpeg',
  Headphones: '/Headphones111.jpeg',
  Audio: '/Headphones111.jpeg',
  Speakers: '/Headphones111.jpeg',
  Accessories: '/cases.jpeg',
  Trades: '/trade.jpeg',
};

const DEFAULT_SHOP_COVER = '/shop.jpeg';

/** Brand / type picker cards. Prefer live product photos; these are fallbacks. */
const SUBCATEGORY_COVER_BY_VALUE: Record<string, string> = {
  PlayStation: '/IMG_9009.JPG',
  Xbox: '/ps5and xbox.jpeg',
  Steam: '/ps5.jpeg',
  Nintendo: '/ps5.jpeg',
  Consoles: '/ps5and xbox.jpeg',
  Controllers: '/ps5.jpeg',
  AirPods: '/IMG_9011.JPG',
  JBL: '/Headphones111.jpeg',
  Sony: '/Headphones111.jpeg',
  EarPods: '/Headphones111.jpeg',
  HomePod: '/Headphones111.jpeg',
  HarmanKardon: '/Headphones111.jpeg',
  'Harman Kardon': '/Headphones111.jpeg',
  iWatches: '/IMG_9008.JPG',
  Ultra: '/IMG_9008.JPG',
  Series: '/IMG_9008.JPG',
  Apple: '/IMG_9008.JPG',
  Samsung: '/phones.jpeg',
  Google: '/phones.jpeg',
  Motorola: '/phones.jpeg',
  Galaxy: '/iphone_modern.png',
  'Fold 7': '/phones.jpeg',
  'Flip 7': '/phones.jpeg',
  'S26 Ultra': '/phones.jpeg',
  'S25 Ultra': '/phones.jpeg',
  Pixel: '/phones.jpeg',
  'Apple Watch': '/IMG_9008.JPG',
  Others: '/iphone_modern.png',
  PhoneCases: '/cases.jpeg',
  Covers: '/cases.jpeg',
  ScreenProtectors: '/cases.jpeg',
  Chargers: '/cases.jpeg',
  AirTags: '/cases.jpeg',
  AppleWatchAccessories: '/IMG_9008.JPG',
  MagicKeyboard: '/cases.jpeg',
  ApplePencil: '/cases.jpeg',
  PowerBanks: '/cases.jpeg',
  Keyboards: '/cases.jpeg',
  Mouse: '/cases.jpeg',
  FlashDrives: '/cases.jpeg',
  'Phone Cases': '/cases.jpeg',
  'Screen Protectors': '/cases.jpeg',
  'Flash Drives': '/cases.jpeg',
  'Power Banks': '/cases.jpeg',
  'Magic Keyboard': '/cases.jpeg',
  'Apple Pencil': '/cases.jpeg',
};

function productImageUrl(p: Product | undefined): string | null {
  if (!p) return null;
  return p.image_url || p.image || null;
}

function countProductsInCategoryBucket(products: Product[], bucket: string): number {
  const buckets =
    bucket === 'Gaming' ? ['Gaming', 'Consoles', 'Controllers'] : [bucket];
  return products.filter((p) => buckets.includes(normalizeProductCategory(p.category))).length;
}

function categoryCoverImage(products: Product[], cat: string): string {
  const buckets =
    cat === 'Gaming' ? ['Gaming', 'Consoles', 'Controllers'] : [cat];
  const match = products.find((p) => {
    if (!buckets.includes(normalizeProductCategory(p.category))) return false;
    return Boolean(p.image_url || p.image);
  });
  return productImageUrl(match) || CATEGORY_COVER_BY_KEY[cat] || DEFAULT_SHOP_COVER;
}

function subcategoryCoverImage(
  products: Product[],
  category: string | undefined,
  option: SubcategoryOption,
  seriesValue?: string,
): string {
  const catNorm = category ? normalizeProductCategory(category) : undefined;
  const nestedCat = STORE_PICKER_NESTED_CHILD_CATEGORIES.has(option.value)
    ? option.value
    : null;

  const hit = products.find((p) => {
    if (nestedCat) {
      if (normalizeProductCategory(p.category) !== nestedCat) return false;
    } else if (catNorm && normalizeProductCategory(p.category) !== catNorm) {
      return false;
    }
    if (seriesValue && !productMatchesStoreSeries(p, seriesValue)) return false;
    if (!nestedCat && !productMatchesStoreSubcategoryFilter(p, option)) return false;
    return Boolean(p.image_url || p.image);
  });
  const live = productImageUrl(hit);
  if (live) return live;

  const staticCover =
    SUBCATEGORY_COVER_BY_VALUE[option.value] || SUBCATEGORY_COVER_BY_VALUE[option.label];
  if (staticCover) return staticCover;

  if (nestedCat) return categoryCoverImage(products, nestedCat);
  if (catNorm) return categoryCoverImage(products, catNorm);
  return DEFAULT_SHOP_COVER;
}

function seriesCoverImage(
  products: Product[],
  category: string | undefined,
  seriesValue: string,
): string {
  if (!category || !seriesValue) {
    return category ? categoryCoverImage(products, normalizeProductCategory(category)) : DEFAULT_SHOP_COVER;
  }
  const hit = products.find((p) => {
    if (normalizeProductCategory(p.category) !== normalizeProductCategory(category)) return false;
    if (!productMatchesStoreSeries(p, seriesValue)) return false;
    return Boolean(p.image_url || p.image);
  });
  return productImageUrl(hit) || categoryCoverImage(products, normalizeProductCategory(category));
}

export const Store: React.FC<StoreProps> = ({
  products,
  setSearchQuery,
  selectedCategories,
  setSelectedCategories,
  navigateTo,
  onQuickView,
  wishlist,
  toggleWishlist,
  compareIds,
  onToggleCompare,
  onAddToCart,
  theme,
  categoriesFromUrl,
  searchFromUrl,
  browseFromUrl,
  conditionFromUrl,
  subcategoryFromUrl,
  seriesFromUrl,
  deviceFromUrl,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(() => {
    try {
      return localStorage.getItem('bb-store-show-filters') !== 'false';
    } catch {
      return true;
    }
  });
  const [priceRange, setPriceRange] = useState({ min: 0, max: STORE_PRICE_SLIDER_MAX });
  const [showPromotionsOnly, setShowPromotionsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryViewMode, setCategoryViewMode] = useState<'cards' | 'list'>(() => {
    try {
      return localStorage.getItem('bb-store-category-view') === 'list' ? 'list' : 'cards';
    } catch {
      return 'cards';
    }
  });
  const [desktopMinInput, setDesktopMinInput] = useState('0');
  const [desktopMaxInput, setDesktopMaxInput] = useState(String(STORE_PRICE_SLIDER_MAX));
  /** GIN textSearch hits — null means use full catalog (no active search query) */
  const [searchHitIds, setSearchHitIds] = useState<Set<string> | null>(null);
  const [searchPending, setSearchPending] = useState(false);
  const navigate = useNavigate();
  const { nodes: shopTaxonomy } = useShopTaxonomy();
  const isLight = theme === 'light';
  const browseAll = browseFromUrl === 'all';
  const browseDeals = browseFromUrl === 'deals';
  /** Flat product grid (skip category/subcategory pickers). */
  const browseFlat = browseAll || browseDeals;

  const activeCategory =
    selectedCategories.length === 1 ? String(selectedCategories[0]) : undefined;
  const customCategory = useMemo(
    () =>
      shopTaxonomy.find(
        (node) =>
          node.kind === 'category' &&
          node.value.toLowerCase() === String(activeCategory ?? '').toLowerCase(),
      ),
    [activeCategory, shopTaxonomy],
  );
  const customSubcategories = useMemo(
    () =>
      customCategory
        ? taxonomyChildren(shopTaxonomy, customCategory.id, 'subcategory')
        : [],
    [customCategory, shopTaxonomy],
  );
  const customCategoryRoots = useMemo(
    () => taxonomyChildren(shopTaxonomy, null, 'category'),
    [shopTaxonomy],
  );
  const categoryDisplayLabel = useCallback(
    (value: string) =>
      customCategoryRoots.find(
        (node) => node.value.toLowerCase() === value.toLowerCase(),
      )?.label ?? value,
    [customCategoryRoots],
  );

  const brandThenSeries = Boolean(
    (activeCategory && categoryUsesBrandThenSeries(activeCategory)) ||
      customSubcategories.length > 0,
  );
  const typeThenSeries = Boolean(
    activeCategory && categoryUsesTypeThenSeries(activeCategory),
  );
  const isAccessories = normalizeProductCategory(activeCategory) === 'Accessories';
  const isSmartWatchCategory =
    normalizeProductCategory(activeCategory) === 'Smart watches' ||
    normalizeProductCategory(activeCategory) === 'Apple Watches';
  const brandStepLabel = typeThenSeries ? 'Type' : 'Brand';
  const brandAllLabel = typeThenSeries ? 'All types' : 'All brands';

  const subcategoryFilter = useMemo(
    () =>
      resolveStoreSubcategoryFilter(
        activeCategory,
        subcategoryFromUrl,
        // Brand→Series uses ?condition= independently of ?subcategory=brand
        brandThenSeries ? undefined : conditionFromUrl,
      ),
    [activeCategory, subcategoryFromUrl, conditionFromUrl, brandThenSeries],
  );

  /** New / Pre-owned refine — Brand→Series keeps this on ?condition= */
  const activeConditionFilter: StoreNewFilter | undefined =
    conditionFromUrl === 'new' || conditionFromUrl === 'used'
      ? conditionFromUrl
      : !brandThenSeries && subcategoryFilter?.kind === 'condition'
        ? (subcategoryFilter.value as StoreNewFilter)
        : undefined;

  const subcategoryOptions = useMemo(() => {
    if (!activeCategory) return [];
    if (customCategory) {
      return customSubcategories.map((node) => ({
        kind: 'brand' as const,
        value: node.value,
        label: node.label,
        description: node.description,
      }));
    }
    const nested = getStorePickerNestedCategories(activeCategory);
    if (nested.length) return nested;
    return getCategorySubcategoryOptions(activeCategory);
  }, [activeCategory, customCategory, customSubcategories]);

  const brandOptions = useMemo(
    () => subcategoryOptions.filter((o) => o.kind === 'brand'),
    [subcategoryOptions],
  );

  const pickerParentCategory = storePickerParentCategory(activeCategory);
  const isNestedTypePicker = Boolean(
    activeCategory && getStorePickerNestedCategories(activeCategory).length > 0,
  );

  const seriesOptions = useMemo(() => {
    const brandValue =
      brandThenSeries && subcategoryFilter?.kind === 'brand'
        ? subcategoryFilter.value
        : undefined;
    if (customCategory) {
      const subcategory = customSubcategories.find((node) => node.value === brandValue);
      return subcategory
        ? taxonomyChildren(shopTaxonomy, subcategory.id, 'series').map((node) => ({
            value: node.value,
            label: node.label,
            description: node.description,
          }))
        : [];
    }
    if (!activeCategory || !categoryUsesSeriesStep(activeCategory)) return [];
    return getCategorySeriesOptions(activeCategory, brandValue);
  }, [
    activeCategory,
    brandThenSeries,
    subcategoryFilter,
    customCategory,
    customSubcategories,
    shopTaxonomy,
  ]);

  const seriesIsAll = seriesFromUrl === 'all';
  const activeSeries =
    seriesFromUrl &&
    !seriesIsAll &&
    seriesOptions.some((o) => o.value === seriesFromUrl)
      ? seriesFromUrl
      : undefined;
  const activeSubcategoryLabel = subcategoryFilter
    ? subcategoryOptions.find((option) => option.value === subcategoryFilter.value)?.label ??
      subcategoryFilterLabel(subcategoryFilter, activeCategory)
    : '';
  const activeSeriesLabel = activeSeries
    ? seriesOptions.find((option) => option.value === activeSeries)?.label ??
      seriesFilterLabel(activeSeries, activeCategory)
    : '';

  const activeAccessoryType =
    isAccessories && subcategoryFilter?.kind === 'brand' ? subcategoryFilter.value : undefined;
  const accessoryDeviceOptions = useMemo(
    () => getAccessoryDeviceOptions(activeAccessoryType, activeSeries),
    [activeAccessoryType, activeSeries],
  );
  const activeAccessoryDevice =
    deviceFromUrl &&
    accessoryDeviceOptions.some((option) => option.value === deviceFromUrl)
      ? deviceFromUrl
      : undefined;

  /**
   * Side-filter category pick sets series=all so shoppers land on the product
   * grid and refine Brand / Series / Condition in the panel (no card drilldown).
   */
  const filterBrowseMode = seriesIsAll;

  /** Step 1: category cards. */
  const showCategoryPicker =
    selectedCategories.length === 0 && !searchTerm.trim() && !browseFlat;

  /**
   * Series picker:
   * - iPad / MacBooks: before New/Used
   * - Headphones / Speakers / Laptops: after Brand
   */
  const showSeriesPicker =
    !showCategoryPicker &&
    !searchTerm.trim() &&
    !browseFlat &&
    !filterBrowseMode &&
    selectedCategories.length === 1 &&
    seriesOptions.length > 0 &&
    !activeSeries &&
    (brandThenSeries ? Boolean(subcategoryFilter) : !subcategoryFilter);

  /**
   * Brand / condition picker.
   * Brand-then-series categories show this before series.
   */
  const showSubcategoryPicker =
    !showCategoryPicker &&
    !showSeriesPicker &&
    !searchTerm.trim() &&
    !browseFlat &&
    !filterBrowseMode &&
    selectedCategories.length === 1 &&
    subcategoryOptions.length > 0 &&
    !subcategoryFilter &&
    (brandThenSeries || seriesOptions.length === 0 || Boolean(activeSeries));

  const showAccessoryDevicePicker =
    isAccessories &&
    !searchTerm.trim() &&
    !browseFlat &&
    Boolean(activeAccessoryType) &&
    Boolean(activeSeries) &&
    accessoryDeviceOptions.length > 0 &&
    !activeAccessoryDevice;

  useEffect(() => {
    try {
      localStorage.setItem('bb-store-show-filters', String(showDesktopFilters));
    } catch {
      /* ignore */
    }
  }, [showDesktopFilters]);

  useEffect(() => {
    try {
      localStorage.setItem('bb-store-category-view', categoryViewMode);
    } catch {
      /* ignore */
    }
  }, [categoryViewMode]);

  const commitDesktopPrice = () => {
    const minRaw = desktopMinInput.trim() === '' ? 0 : Number(desktopMinInput);
    const maxRaw = desktopMaxInput.trim() === '' ? STORE_PRICE_SLIDER_MAX : Number(desktopMaxInput);
    const min = Number.isFinite(minRaw) ? Math.max(0, minRaw) : 0;
    const max = Number.isFinite(maxRaw)
      ? Math.min(STORE_PRICE_SLIDER_MAX, Math.max(min, maxRaw))
      : STORE_PRICE_SLIDER_MAX;
    setPriceRange({ min, max });
    setDesktopMinInput(String(min));
    setDesktopMaxInput(String(max));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawCategories = [
      ...(categoriesFromUrl || []),
      ...params.getAll('categories'),
      ...(params.get('category') ? [params.get('category')!] : []),
    ];
    const hasBrowseFlat =
      browseFromUrl === 'all' ||
      browseFromUrl === 'deals' ||
      params.get('browse') === 'all' ||
      params.get('browse') === 'deals';
    const hasQ = Boolean(searchFromUrl?.trim() || params.get('q')?.trim());

    if (rawCategories.length === 0 && !hasBrowseFlat && !hasQ) {
      // Bare /store — category picker; clear leftover filters from prior visits.
      setSelectedCategories([]);
      setSearchTerm('');
      setSearchQuery('');
      return;
    }

    if (rawCategories.length === 0) {
      setSelectedCategories([]);
      return;
    }

    const normalized = rawCategories
      .flatMap((cat) => String(cat).split(',').map((s) => s.trim()))
      .flatMap((cat) => {
        if (!cat) return [];
        // Audio umbrella → both Headphones and Speakers
        if (cat.toLowerCase() === 'audio') return ['Headphones', 'Speakers'] as Category[];
        const n = normalizeProductCategory(cat);
        return n ? [n as Category] : [];
      })
      .filter((cat): cat is Category => Boolean(cat));
    setSelectedCategories(Array.from(new Set(normalized)));
  }, [categoriesFromUrl, browseFromUrl, searchFromUrl, setSelectedCategories, setSearchQuery]);

  useEffect(() => {
    const raw = searchFromUrl?.trim();
    if (!raw) return;
    setSearchTerm(raw);
    setSearchQuery(raw);
  }, [searchFromUrl, setSearchQuery]);

  useEffect(() => {
    setDesktopMinInput(String(priceRange.min));
    setDesktopMaxInput(String(priceRange.max));
  }, [priceRange.min, priceRange.max]);

  useEffect(() => {
    if (!showFilters) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFilters(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showFilters]);

  useEffect(() => {
    if (!showFilters || window.matchMedia('(min-width: 1024px)').matches) return;
    return lockPageScroll();
  }, [showFilters]);

  const buildStoreSearchParams = useCallback(() => {
    const out: Record<string, string> = {};
    const t = searchTerm.trim();
    if (t) out.q = t.slice(0, 200);
    if (selectedCategories.length === 1) {
      out.category = String(selectedCategories[0]);
    } else if (selectedCategories.length > 1) {
      out.categories = selectedCategories.join(',');
    } else if (browseDeals && !t) {
      out.browse = 'deals';
    } else if (browseAll && !t) {
      out.browse = 'all';
    }
    if (activeSeries && !t) out.series = activeSeries;
    else if (seriesIsAll && !t) out.series = 'all';
    if (activeAccessoryDevice && !t) out.device = activeAccessoryDevice;
    if (subcategoryFilter && !t) {
      Object.assign(out, encodeStoreSubcategorySearch(subcategoryFilter));
    }
    return out;
  }, [
    searchTerm,
    selectedCategories,
    browseAll,
    browseDeals,
    subcategoryFilter,
    activeSeries,
    seriesIsAll,
    activeAccessoryDevice,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Don't rewrite URL on pickers (keeps /store + category/subcategory steps clean).
    if (
      showCategoryPicker ||
      showSeriesPicker ||
      showSubcategoryPicker ||
      showAccessoryDevicePicker
    ) {
      return;
    }
    const id = window.setTimeout(() => {
      setSearchQuery(searchTerm.trim());
      navigate({ to: '/store', search: buildStoreSearchParams() as never, replace: true });
    }, 380);
    return () => window.clearTimeout(id);
  }, [
    buildStoreSearchParams,
    navigate,
    searchTerm,
    setSearchQuery,
    showCategoryPicker,
    showSeriesPicker,
    showSubcategoryPicker,
    showAccessoryDevicePicker,
  ]);

  const categoryScopeSearch = useCallback((): Record<string, string> => {
    if (selectedCategories.length === 1) return { category: String(selectedCategories[0]) };
    if (selectedCategories.length > 1) return { categories: selectedCategories.join(',') };
    if (browseDeals) return { browse: 'deals' };
    if (browseAll) return { browse: 'all' };
    return {};
  }, [selectedCategories, browseAll, browseDeals]);

  const resetLocalStoreFilters = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
    setSearchHitIds(null);
    setPriceRange({ min: 0, max: STORE_PRICE_SLIDER_MAX });
    setDesktopMinInput('0');
    setDesktopMaxInput(String(STORE_PRICE_SLIDER_MAX));
    setShowPromotionsOnly(false);
  }, [setSearchQuery]);

  const goToCategoryPicker = useCallback(() => {
    resetLocalStoreFilters();
    setSelectedCategories([]);
    navigate({ to: '/store', search: {} as never, replace: true });
  }, [navigate, resetLocalStoreFilters, setSelectedCategories]);

  const goToParentCategoryPicker = useCallback(() => {
    const parent = storePickerParentCategory(activeCategory);
    if (!parent) {
      goToCategoryPicker();
      return;
    }
    resetLocalStoreFilters();
    setSelectedCategories([parent as Category]);
    navigate({ to: '/store', search: { category: parent } as never, replace: true });
  }, [activeCategory, goToCategoryPicker, navigate, resetLocalStoreFilters, setSelectedCategories]);

  const goToSeriesPicker = useCallback(() => {
    resetLocalStoreFilters();
    const scope: Record<string, string> = { ...categoryScopeSearch() };
    // Brand → series: keep brand when returning to series step
    if (brandThenSeries && subcategoryFilter) {
      Object.assign(scope, encodeStoreSubcategorySearch(subcategoryFilter));
    }
    navigate({ to: '/store', search: scope as never, replace: true });
  }, [
    navigate,
    resetLocalStoreFilters,
    categoryScopeSearch,
    brandThenSeries,
    subcategoryFilter,
  ]);

  const openAccessoryDevice = useCallback(
    (device: string) => {
      resetLocalStoreFilters();
      navigate({
        to: '/store',
        search: {
          ...categoryScopeSearch(),
          ...(subcategoryFilter ? encodeStoreSubcategorySearch(subcategoryFilter) : {}),
          ...(activeSeries ? { series: activeSeries } : {}),
          device,
        } as never,
        replace: true,
      });
    },
    [
      activeSeries,
      categoryScopeSearch,
      navigate,
      resetLocalStoreFilters,
      subcategoryFilter,
    ],
  );

  const goToSubcategoryPicker = useCallback(() => {
    resetLocalStoreFilters();
    const scope: Record<string, string> = { ...categoryScopeSearch() };
    if (!brandThenSeries) {
      if (activeSeries) scope.series = activeSeries;
      else if (seriesOptions.length > 0) scope.series = 'all';
    }
    navigate({ to: '/store', search: scope as never, replace: true });
  }, [
    navigate,
    resetLocalStoreFilters,
    categoryScopeSearch,
    activeSeries,
    seriesOptions.length,
    brandThenSeries,
  ]);

  /** Shop trail: Shop › Category › Brand › Series (or Series › Condition) */
  const storeBreadcrumbItems = useMemo((): FlowBreadcrumbItem[] => {
    const items: FlowBreadcrumbItem[] = [];

    if (showCategoryPicker) {
      return [{ label: 'Shop' }];
    }

    items.push({ label: 'Shop', onClick: goToCategoryPicker });

    if (browseDeals) {
      items.push({ label: 'Deal of the Day' });
      return items;
    }

    if (!activeCategory) {
      items.push({ label: 'All products' });
      return items;
    }

    if (pickerParentCategory) {
      items.push({
        label: pickerParentCategory,
        onClick: goToParentCategoryPicker,
      });
    }

    if (isNestedTypePicker) {
      items.push({ label: categoryDisplayLabel(String(activeCategory)) });
      return items;
    }

    if (brandThenSeries) {
      // Shop › [Gaming] › Category › Brand › Series
      if (showSubcategoryPicker) {
        items.push({ label: categoryDisplayLabel(String(activeCategory)) });
        return items;
      }
      items.push({
        label: categoryDisplayLabel(String(activeCategory)),
        onClick: goToSubcategoryPicker,
      });
      const brandLabel = subcategoryFilter ? activeSubcategoryLabel : brandStepLabel;
      if (showSeriesPicker) {
        items.push({ label: brandLabel });
        return items;
      }
      if (subcategoryFilter) {
        items.push({
          label: brandLabel,
          onClick: goToSeriesPicker,
        });
      }
      if (activeSeries || (seriesIsAll && seriesOptions.length > 0)) {
        items.push({
          label: activeSeries ? activeSeriesLabel : 'All series',
          ...(isAccessories && activeSeries
            ? {
                onClick: () =>
                  navigate({
                    to: '/store',
                    search: {
                      ...categoryScopeSearch(),
                      ...(subcategoryFilter
                        ? encodeStoreSubcategorySearch(subcategoryFilter)
                        : {}),
                      series: activeSeries,
                    } as never,
                    replace: true,
                  }),
              }
            : {}),
        });
      }
      if (isAccessories && activeAccessoryDevice) {
        items.push({
          label: accessoryDeviceLabel(
            activeAccessoryType,
            activeSeries,
            activeAccessoryDevice,
          ),
        });
      }
      return items;
    }

    // On series step: Shop / Category (current)
    if (showSeriesPicker) {
      items.push({ label: categoryDisplayLabel(String(activeCategory)) });
      return items;
    }

    // Past series picker (or no series step)
    if (seriesOptions.length > 0) {
      items.push({
        label: categoryDisplayLabel(String(activeCategory)),
        onClick: goToSeriesPicker,
      });
      const seriesCrumbLabel = activeSeries
        ? activeSeriesLabel
        : seriesIsAll
          ? 'All series'
          : 'Series';
      if (showSubcategoryPicker) {
        items.push({ label: seriesCrumbLabel });
        return items;
      }
      items.push({
        label: seriesCrumbLabel,
        onClick: goToSubcategoryPicker,
      });
    } else {
      if (showSubcategoryPicker) {
        items.push({ label: categoryDisplayLabel(String(activeCategory)) });
        return items;
      }
      items.push({
        label: categoryDisplayLabel(String(activeCategory)),
        onClick: goToSubcategoryPicker,
      });
    }

    if (subcategoryFilter) {
      const sub = activeSubcategoryLabel;
      if (sub) items.push({ label: sub });
    } else if (showSubcategoryPicker) {
      items.push({
        label: subcategoryOptions.every((o) => o.kind === 'condition')
          ? 'Condition'
          : 'Type',
      });
    }

    return items;
  }, [
    showCategoryPicker,
    showSeriesPicker,
    showSubcategoryPicker,
    browseDeals,
    activeCategory,
    seriesOptions.length,
    activeSeries,
    seriesIsAll,
    subcategoryFilter,
    subcategoryOptions,
    brandThenSeries,
    brandStepLabel,
    pickerParentCategory,
    isNestedTypePicker,
    isAccessories,
    activeAccessoryType,
    activeAccessoryDevice,
    goToCategoryPicker,
    goToParentCategoryPicker,
    goToSeriesPicker,
    goToSubcategoryPicker,
    categoryScopeSearch,
    navigate,
    categoryDisplayLabel,
    activeSubcategoryLabel,
    activeSeriesLabel,
  ]);

  const openCategory = useCallback(
    (cat: Category) => {
      resetLocalStoreFilters();
      setSelectedCategories([cat]);
      navigate({ to: '/store', search: { category: String(cat) } as never, replace: true });
    },
    [navigate, resetLocalStoreFilters, setSelectedCategories],
  );

  const openDealOfTheDay = useCallback(() => {
    resetLocalStoreFilters();
    setSelectedCategories([]);
    navigate({ to: '/store', search: { browse: 'deals' } as never, replace: true });
  }, [navigate, resetLocalStoreFilters, setSelectedCategories]);

  const openSeries = useCallback(
    (series: string) => {
      resetLocalStoreFilters();
      navigate({
        to: '/store',
        search: {
          ...categoryScopeSearch(),
          ...(brandThenSeries && subcategoryFilter
            ? encodeStoreSubcategorySearch(subcategoryFilter)
            : {}),
          series: series || 'all',
        } as never,
        replace: true,
      });
    },
    [
      navigate,
      categoryScopeSearch,
      resetLocalStoreFilters,
      brandThenSeries,
      subcategoryFilter,
    ],
  );

  const openSubcategory = useCallback(
    (filter: StoreSubcategoryFilter) => {
      if (STORE_PICKER_NESTED_CHILD_CATEGORIES.has(filter.value)) {
        resetLocalStoreFilters();
        setSelectedCategories([filter.value as Category]);
        navigate({
          to: '/store',
          search: { category: filter.value } as never,
          replace: true,
        });
        return;
      }
      resetLocalStoreFilters();
      navigate({
        to: '/store',
        search: {
          ...categoryScopeSearch(),
          ...(isAccessories || isSmartWatchCategory || customCategory
            ? {}
            : brandThenSeries
              ? { series: 'all' }
              : activeSeries
                ? { series: activeSeries }
                : seriesIsAll
                  ? { series: 'all' }
                  : {}),
          ...encodeStoreSubcategorySearch(filter),
        } as never,
        replace: true,
      });
    },
    [
      navigate,
      categoryScopeSearch,
      resetLocalStoreFilters,
      setSelectedCategories,
      activeSeries,
      seriesIsAll,
      brandThenSeries,
      isAccessories,
      isSmartWatchCategory,
      customCategory,
    ],
  );

  // Hit products GIN index via .textSearch when the user types a query
  useEffect(() => {
    const q = searchTerm.trim();
    if (!q) {
      setSearchHitIds(null);
      setSearchPending(false);
      return;
    }
    let cancelled = false;
    setSearchPending(true);
    const t = window.setTimeout(() => {
      void fetchStoreSearchProducts(q)
        .then((rows) => {
          if (cancelled) return;
          if (!rows) {
            setSearchHitIds(null);
            return;
          }
          setSearchHitIds(new Set(rows.map((r) => r.id)));
        })
        .catch(() => {
          if (!cancelled) setSearchHitIds(null);
        })
        .finally(() => {
          if (!cancelled) setSearchPending(false);
        });
    }, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [searchTerm]);

  const catalogForFilters = useMemo(() => {
    if (!searchHitIds) return products;
    return products.filter((p) => searchHitIds.has(p.id));
  }, [products, searchHitIds]);

  const baseFilterOpts = useMemo(
    () => ({
      // Client haystack kept as secondary filter; primary gate is searchHitIds
      searchTerm: searchHitIds ? '' : searchTerm,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      promotionsOnly: showPromotionsOnly,
    }),
    [searchTerm, searchHitIds, priceRange.min, priceRange.max, showPromotionsOnly],
  );

  const baseFilteredProducts = useMemo(
    () => catalogForFilters.filter((p) => productPassesStoreBaseFilters(p, baseFilterOpts)),
    [catalogForFilters, baseFilterOpts],
  );

  const filteredProducts = useMemo(() => {
    const results = baseFilteredProducts.filter(
      (p) =>
        productMatchesStoreCategories(p, selectedCategories) &&
        productMatchesStoreSeries(p, activeSeries) &&
        productMatchesStoreSubcategoryFilter(p, subcategoryFilter) &&
        productMatchesAccessoryDevice(p, activeAccessoryDevice) &&
        // Brand→Series: condition is a separate ?condition= refine
        (brandThenSeries
          ? productMatchesStoreNewFilter(p, activeConditionFilter)
          : true) &&
        (!browseDeals || isDealOfTheDayProduct(p)),
    );
    return sortProductsStockFirst(results);
  }, [
    baseFilteredProducts,
    selectedCategories,
    activeSeries,
    subcategoryFilter,
    activeAccessoryDevice,
    brandThenSeries,
    activeConditionFilter,
    browseDeals,
  ]);

  const categoryOptions: StoreCategoryRow[] = useMemo(() => {
    const ordered = [
      ...buildOrderedStoreCategoryKeys(products),
      ...customCategoryRoots
        .map((node) => node.value)
        .filter(
          (value) =>
            !buildOrderedStoreCategoryKeys(products).some(
              (existing) => existing.toLowerCase() === value.toLowerCase(),
            ),
        ),
    ];
    /** Counts respect series + condition so chip totals match “N results”. */
    const countInBucket = (bucket: string) =>
      baseFilteredProducts.filter((p) => {
        if (normalizeProductCategory(p.category) !== bucket) return false;
        if (activeSeries && categoryUsesSeriesStep(bucket)) {
          const seriesOk = getCategorySeriesOptions(bucket).some((o) => o.value === activeSeries);
          if (seriesOk && !productMatchesStoreSeries(p, activeSeries)) return false;
        }
        if (subcategoryFilter) {
          const supported = getCategorySubcategoryOptions(bucket).some(
            (o) => o.kind === subcategoryFilter.kind && o.value === subcategoryFilter.value,
          );
          if (supported && !productMatchesStoreSubcategoryFilter(p, subcategoryFilter)) {
            return false;
          }
        }
        return true;
      }).length;
    const dealCount = baseFilteredProducts.filter((p) => {
      if (!isDealOfTheDayProduct(p)) return false;
      const bucket = normalizeProductCategory(p.category);
      if (activeSeries && categoryUsesSeriesStep(bucket)) {
        const seriesOk = getCategorySeriesOptions(bucket).some((o) => o.value === activeSeries);
        if (seriesOk && !productMatchesStoreSeries(p, activeSeries)) return false;
      }
      if (subcategoryFilter) {
        const supported = getCategorySubcategoryOptions(bucket).some(
          (o) => o.kind === subcategoryFilter.kind && o.value === subcategoryFilter.value,
        );
        if (supported && !productMatchesStoreSubcategoryFilter(p, subcategoryFilter)) {
          return false;
        }
      }
      return true;
    }).length;

    return [
      {
        key: 'deals',
        label: '🔥 Deal of the Day',
        value: 'All' as const,
        icon: <Flame size={14} />,
        count: dealCount,
      },
      ...ordered.map((cat) => ({
        key: `cat-${cat}`,
        label: categoryDisplayLabel(cat),
        value: cat as Category,
        icon: categoryIcon(cat),
        // Active category: always show the live result total (same as header).
        count:
          selectedCategories.length === 1 && String(selectedCategories[0]) === cat
            ? filteredProducts.length
            : countInBucket(cat),
      })),
    ];
  }, [
    products,
    baseFilteredProducts,
    filteredProducts.length,
    selectedCategories,
    activeSeries,
    subcategoryFilter,
    customCategoryRoots,
    categoryDisplayLabel,
  ]);

  const categoryPickerCards = useMemo(() => {
    const baseOrdered = buildOrderedStoreCategoryKeys(products);
    const ordered = [
      ...baseOrdered,
      ...customCategoryRoots
        .map((node) => node.value)
        .filter(
          (value) =>
            !baseOrdered.some((existing) => existing.toLowerCase() === value.toLowerCase()),
        ),
    ].filter(
      (cat) => !STORE_PICKER_NESTED_CHILD_CATEGORIES.has(cat),
    );
    const dealProducts = products.filter((p) => isDealOfTheDayProduct(p));
    const dealCount = baseFilteredProducts.filter((p) => isDealOfTheDayProduct(p)).length;

    return [
      {
        key: 'deals',
        label: '🔥 Deal of the Day',
        cover:
          dealProducts[0]?.image ||
          dealProducts[0]?.image_url ||
          CATEGORY_COVER_BY_KEY.deals,
        onSelect: openDealOfTheDay,
        icon: <Flame size={28} strokeWidth={1.5} />,
        iconSm: <Flame size={18} strokeWidth={1.5} />,
        count: dealCount,
      },
      ...ordered.map((cat) => ({
        key: `pick-${cat}`,
        label: categoryDisplayLabel(cat),
        cover: categoryCoverImage(products, cat),
        onSelect: () => openCategory(cat as Category),
        icon: categoryIconLg(cat),
        iconSm: categoryIcon(cat),
        count: countProductsInCategoryBucket(baseFilteredProducts, cat),
      })),
    ];
  }, [
    products,
    baseFilteredProducts,
    openDealOfTheDay,
    openCategory,
    customCategoryRoots,
    categoryDisplayLabel,
  ]);

  const subcategoryCards = useMemo(() => {
    if (!activeCategory) return [];
    return subcategoryOptions.map((opt) => {
      const count = getSubcategoryCount(baseFilteredProducts, activeCategory, opt);
      return {
        key: `${opt.kind}-${opt.value}`,
        option: opt,
        icon: subcategoryCardIcon(opt),
        cover: subcategoryCoverImage(products, activeCategory, opt, activeSeries),
        count,
        onSelect: () => openSubcategory({ kind: opt.kind, value: opt.value }),
      };
    });
  }, [
    activeCategory,
    activeSeries,
    subcategoryOptions,
    products,
    baseFilteredProducts,
    openSubcategory,
  ]);

  const storePageResetKey = [
    searchTerm,
    selectedCategories.join(','),
    activeSeries || '',
    subcategoryFilter ? `${subcategoryFilter.kind}:${subcategoryFilter.value}` : '',
    priceRange.min,
    priceRange.max,
    showPromotionsOnly ? '1' : '0',
  ].join('|');

  const {
    page: storePage,
    setPage: setStorePage,
    pageCount: storePageCount,
    pageItems: pageProducts,
    total: storeTotal,
  } = usePagination(filteredProducts, PAGE_SIZES.store, storePageResetKey);

  useEffect(() => {
    scanScrollReveal();
    const t = window.setTimeout(() => {
      document.querySelectorAll('[data-store-products] .reveal-on-scroll').forEach((el) => {
        el.classList.add('reveal-visible');
      });
    }, 120);
    return () => window.clearTimeout(t);
  }, [pageProducts.length, storePage, viewMode, searchTerm, selectedCategories]);

  const activeFiltersCount = countActiveStoreFilters({
    selectedCategories,
    priceMin: priceRange.min,
    priceMax: priceRange.max,
    promotionsOnly: showPromotionsOnly,
    // Single category from shop browse = scope, not an extra refine chip.
    categoryIsBrowseScope: !browseFlat && selectedCategories.length === 1,
  });

  const clearAllFilters = () => {
    setPriceRange({ min: 0, max: STORE_PRICE_SLIDER_MAX });
    setSearchTerm('');
    setSearchQuery('');
    setShowPromotionsOnly(false);
    navigate({
      to: '/store',
      search: {
        ...categoryScopeSearch(),
        ...(activeSeries ? { series: activeSeries } : {}),
        ...encodeStoreSubcategorySearch(subcategoryFilter),
      } as never,
      replace: true,
    });
  };

  /** Filter-panel category chips: single-select refine, not multi-toggle / picker nav. */
  const selectCategoryFilter = (cat: Category | 'All') => {
    if (cat === 'All') {
      setSelectedCategories([]);
      navigate({
        to: '/store',
        search: { browse: 'deals' } as never,
        replace: true,
      });
      return;
    }
    // Already browsing this category — keep series/condition; don't bounce the URL.
    if (selectedCategories.length === 1 && String(selectedCategories[0]) === String(cat)) {
      return;
    }
    setSelectedCategories([cat]);
    const search: Record<string, string> = { category: String(cat) };
    // Stay on the product grid when possible: All series + keep New/Used if supported.
    if (categoryUsesSeriesStep(cat)) {
      search.series = 'all';
    }
    if (subcategoryFilter?.kind === 'condition') {
      const opts = getCategorySubcategoryOptions(cat);
      if (opts.some((o) => o.kind === 'condition' && o.value === subcategoryFilter.value)) {
        Object.assign(search, encodeStoreSubcategorySearch(subcategoryFilter));
      }
    }
    navigate({
      to: '/store',
      search: search as never,
      replace: true,
    });
  };

  /** Refine series in-place. Empty / all = every series in scope. */
  const applySeriesFilter = useCallback(
    (value: string) => {
      const search: Record<string, string> = {
        ...categoryScopeSearch(),
        ...encodeStoreSubcategorySearch(subcategoryFilter),
      };
      if (brandThenSeries && activeConditionFilter) {
        search.condition = activeConditionFilter;
      }
      if (value && value !== 'all') search.series = value;
      else if (seriesOptions.length > 0) search.series = 'all';
      navigate({ to: '/store', search: search as never, replace: true });
    },
    [
      navigate,
      categoryScopeSearch,
      subcategoryFilter,
      seriesOptions.length,
      brandThenSeries,
      activeConditionFilter,
    ],
  );

  /** Brand refine (Brand→Series categories). */
  const applyBrandFilter = useCallback(
    (value: string) => {
      const search: Record<string, string> = {
        ...categoryScopeSearch(),
      };
      if (value && value !== 'all') {
        Object.assign(search, encodeStoreSubcategorySearch({ kind: 'brand', value }));
      }
      search.series = activeSeries || 'all';
      if (activeConditionFilter) search.condition = activeConditionFilter;
      navigate({ to: '/store', search: search as never, replace: true });
    },
    [navigate, categoryScopeSearch, activeSeries, activeConditionFilter],
  );

  /**
   * Condition refine (New / Pre-owned).
   * Brand→Series: writes ?condition= and keeps brand/series.
   * Series→Condition categories: writes subcategory as before.
   */
  const applyConditionFilter = useCallback(
    (value: string) => {
      if (STORE_PICKER_NESTED_CHILD_CATEGORIES.has(value)) {
        setSelectedCategories([value as Category]);
        navigate({
          to: '/store',
          search: { category: value } as never,
          replace: true,
        });
        return;
      }

      if (brandThenSeries) {
        const search: Record<string, string> = {
          ...categoryScopeSearch(),
          ...encodeStoreSubcategorySearch(subcategoryFilter),
          series: activeSeries || 'all',
        };
        if (value && value !== 'all') search.condition = value;
        navigate({ to: '/store', search: search as never, replace: true });
        return;
      }

      if (value === 'all' || value === '') {
        const search: Record<string, string> = {
          ...categoryScopeSearch(),
        };
        if (activeSeries) search.series = activeSeries;
        else if (seriesIsAll || seriesOptions.length > 0) search.series = 'all';
        navigate({ to: '/store', search: search as never, replace: true });
        return;
      }

      const kind =
        subcategoryOptions.find((o) => o.value === value)?.kind ??
        (value === 'new' || value === 'used' ? 'condition' : 'brand');
      const search: Record<string, string> = {
        ...categoryScopeSearch(),
        ...encodeStoreSubcategorySearch({ kind, value }),
      };
      if (activeSeries) search.series = activeSeries;
      else if (seriesIsAll || seriesOptions.length > 0) search.series = 'all';
      navigate({ to: '/store', search: search as never, replace: true });
    },
    [
      navigate,
      categoryScopeSearch,
      activeSeries,
      seriesIsAll,
      seriesOptions.length,
      subcategoryOptions,
      brandThenSeries,
      subcategoryFilter,
      setSelectedCategories,
    ],
  );

  const isCategoryRowActive = (cat: StoreCategoryRow): boolean => {
    if (cat.value === 'All') return browseDeals;
    if (selectedCategories.length === 0) return false;
    // Audio umbrella (Headphones + Speakers both selected)
    if (
      selectedCategories.length === 2 &&
      selectedCategories.includes('Headphones' as Category) &&
      selectedCategories.includes('Speakers' as Category)
    ) {
      return cat.value === 'Headphones' || cat.value === 'Speakers';
    }
    return selectedCategories.length === 1 && selectedCategories[0] === cat.value;
  };

  const handlePriceRangeChange = (range: { min: number; max: number }) => {
    setPriceRange(range);
    setDesktopMinInput(String(range.min));
    setDesktopMaxInput(String(range.max));
  };

  /** New / Used in the side panel for any single-category browse (incl. Android + Brand→Series). */
  const showConditionInFilter = Boolean(activeCategory);

  const filterPanelProps = {
    isLight,
    categoryOptions,
    isCategoryRowActive,
    onCategoryClick: (cat: StoreCategoryRow) => selectCategoryFilter(cat.value),
    showPromotionsOnly,
    onTogglePromotions: () => setShowPromotionsOnly((v) => !v),
    priceRange,
    minInput: desktopMinInput,
    maxInput: desktopMaxInput,
    onMinInputChange: setDesktopMinInput,
    onMaxInputChange: setDesktopMaxInput,
    onCommitPrice: commitDesktopPrice,
    onAdjustMin: (delta: number) =>
      setPriceRange((prev) => ({ ...prev, min: Math.max(0, Math.min(prev.max, prev.min + delta)) })),
    onAdjustMax: (delta: number) =>
      setPriceRange((prev) => ({
        ...prev,
        max: Math.min(STORE_PRICE_SLIDER_MAX, Math.max(prev.min, prev.max + delta)),
      })),
    onPriceRangeChange: handlePriceRangeChange,
    activeFiltersCount,
    onClearAll: clearAllFilters,
    resultCount: filteredProducts.length,
    brandOptions: brandThenSeries
      ? brandOptions.map((o) => ({ value: o.value, label: o.label }))
      : undefined,
    activeBrand: brandThenSeries ? subcategoryFilter?.value : undefined,
    onBrandClick: brandThenSeries ? applyBrandFilter : undefined,
    brandSectionTitle: brandStepLabel,
    brandAllLabel,
    seriesOptions: seriesOptions.map((o) => ({ value: o.value, label: o.label })),
    activeSeries: activeSeries ?? '',
    onSeriesClick: applySeriesFilter,
    conditionOptions: showConditionInFilter
      ? [
          { value: 'new', label: 'New' },
          { value: 'used', label: 'Pre-owned' },
        ]
      : undefined,
    activeCondition: showConditionInFilter ? activeConditionFilter ?? 'all' : undefined,
    onConditionClick: showConditionInFilter ? applyConditionFilter : undefined,
  };

  const gridCols = showDesktopFilters
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

  if (showCategoryPicker) {
    return (
      <div className="bb-store-page">
        <header className="bb-store-picker-header">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-5 sm:pt-7 pb-1">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <PageBackButton
                isLight={isLight}
                fallbackTo="/"
                label="Home"
                className="bb-store-picker-back"
              />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight min-w-0 truncate">
                Browse by category
              </h1>
              <div className="ml-auto flex shrink-0 items-center gap-0.5 rounded-lg border border-[var(--bb-border)] p-0.5">
                <button
                  type="button"
                  onClick={() => setCategoryViewMode('cards')}
                  className={`rounded-md p-1.5 transition-colors ${
                    categoryViewMode === 'cards'
                      ? 'bg-[#CDA032] text-black'
                      : 'text-current hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  aria-label="Card view"
                  aria-pressed={categoryViewMode === 'cards'}
                  title="Cards"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryViewMode('list')}
                  className={`rounded-md p-1.5 transition-colors ${
                    categoryViewMode === 'list'
                      ? 'bg-[#CDA032] text-black'
                      : 'text-current hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  aria-label="List view"
                  aria-pressed={categoryViewMode === 'list'}
                  title="List"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
            <FlowBreadcrumb items={storeBreadcrumbItems} className="mt-2.5" />
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[color:var(--bb-muted)]">
              Pick a category to see products. You can still search or filter once you are in a section.
            </p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8 pb-10">
          {categoryViewMode === 'list' ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-2">
              {categoryPickerCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={card.onSelect}
                  className={`group flex items-center gap-3 rounded-xl border bg-[var(--bb-surface)] p-2.5 text-left transition-all hover:border-[#CDA032]/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]/50 sm:gap-4 sm:p-3 ${
                    card.key === 'deals'
                      ? 'border-orange-400/50'
                      : 'border-[var(--bb-border)]'
                  }`}
                >
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--bb-surface-2)] sm:h-16 sm:w-16">
                    {card.cover ? (
                      <img
                        src={card.cover}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[#CDA032]">
                        {card.iconSm}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold tracking-tight sm:text-base">
                      {card.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-black uppercase tracking-widest text-[#CDA032]/80">
                      {card.count} item{card.count === 1 ? '' : 's'}
                    </span>
                  </span>
                  <ChevronRight
                    size={18}
                    className="shrink-0 text-[color:var(--bb-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[#CDA032]"
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {categoryPickerCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={card.onSelect}
                  className={`group relative flex min-h-[9.5rem] sm:min-h-[11rem] flex-col overflow-hidden rounded-2xl border bg-[var(--bb-surface)] text-left transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]/50 ${
                    card.key === 'deals'
                      ? 'border-orange-400/50 hover:border-orange-500'
                      : 'border-[var(--bb-border)] hover:border-[#CDA032]/50'
                  }`}
                >
                  {card.cover ? (
                    <div className="absolute inset-0">
                      <img
                        src={card.cover}
                        alt=""
                        className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          isLight
                            ? 'opacity-100'
                            : 'opacity-80 sm:opacity-85 group-hover:opacity-95'
                        }`}
                      />
                      <div
                        className={`pointer-events-none absolute inset-x-0 bottom-0 ${
                          isLight
                            ? 'h-[55%] bg-gradient-to-t from-white via-white/50 to-transparent'
                            : 'inset-0 h-auto bg-gradient-to-t from-[#060605] via-[#060605]/55 to-transparent'
                        }`}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#CDA032]/12 via-transparent to-transparent" />
                  )}

                  <div className="relative z-[1] flex flex-1 flex-col justify-between p-4 sm:p-5">
                    <span
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border text-[#CDA032] transition-colors group-hover:border-[#CDA032]/40 ${
                        isLight
                          ? 'border-black/10 bg-white shadow-sm'
                          : 'border-white/15 bg-black/50 backdrop-blur-sm'
                      }`}
                    >
                      {card.icon}
                    </span>
                    <div>
                      <span
                        className={`block text-sm sm:text-base font-bold tracking-tight ${
                          isLight
                            ? 'text-black'
                            : 'text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]'
                        }`}
                      >
                        {card.label}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showSeriesPicker && activeCategory) {
    return (
      <div className="bb-store-page">
        <header className="bb-store-picker-header">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-5 sm:pt-7 pb-1">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <PageBackButton
                isLight={isLight}
                onClick={brandThenSeries ? goToSubcategoryPicker : goToCategoryPicker}
                label={brandThenSeries ? brandStepLabel : 'Categories'}
                className="bb-store-picker-back"
              />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight min-w-0 truncate">
                Choose a series
              </h1>
            </div>
            <FlowBreadcrumb items={storeBreadcrumbItems} className="mt-2.5" />
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[color:var(--bb-muted)]">
              {brandThenSeries
                ? isAccessories
                  ? 'Pick a group, then a device if needed. Products only appear at the last step.'
                  : `Pick a series to see matching products.`
                : 'Pick a series, then choose Brand new or Used.'}
            </p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {seriesOptions.map((opt: StoreSeriesOption) => {
              const count = baseFilteredProducts.filter(
                (p) =>
                  productMatchesStoreCategories(p, [activeCategory as Category]) &&
                  productMatchesStoreSeries(p, opt.value) &&
                  productMatchesStoreSubcategoryFilter(p, subcategoryFilter),
              ).length;
              const cover = seriesCoverImage(products, activeCategory, opt.value);
              // iPhone: crop toward camera / Dynamic Island so generations read differently
              const isPhoneSeries = normalizeProductCategory(activeCategory) === 'iPhone';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => openSeries(opt.value)}
                  className="group relative flex min-h-[8.5rem] flex-col overflow-hidden rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface)] text-left transition-all hover:border-[#CDA032]/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]/50"
                >
                  {cover ? (
                    <div className="absolute inset-0">
                      <img
                        src={cover}
                        alt=""
                        className={
                          isPhoneSeries
                            ? `absolute inset-y-0 right-0 h-full w-[68%] sm:w-[62%] object-cover object-[center_8%] transition-transform duration-500 group-hover:scale-110 ${
                                isLight ? 'opacity-100' : 'opacity-90 sm:opacity-95'
                              }`
                            : `h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                                isLight
                                  ? 'opacity-100'
                                  : 'opacity-80 sm:opacity-85 group-hover:opacity-95'
                              }`
                        }
                      />
                      <div
                        className={`pointer-events-none absolute ${
                          isPhoneSeries
                            ? isLight
                              ? 'inset-y-0 left-0 w-[72%] bg-gradient-to-r from-white via-white/55 to-transparent'
                              : 'inset-0 bg-gradient-to-r from-[#060605] via-[#060605]/75 to-transparent'
                            : isLight
                              ? 'inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-white via-white/50 to-transparent'
                              : 'inset-0 bg-gradient-to-t from-[#060605] via-[#060605]/55 to-transparent'
                        }`}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#CDA032]/12 via-transparent to-transparent" />
                  )}
                  <div className="relative z-[1] flex flex-1 flex-col justify-between p-4 sm:p-5">
                    <span
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border text-[#CDA032] ${
                        isLight
                          ? 'border-black/10 bg-white shadow-sm'
                          : 'border-white/15 bg-black/50 backdrop-blur-sm'
                      }`}
                    >
                      {categoryIconLg(activeCategory)}
                    </span>
                    <div>
                      <span
                        className={`block text-sm sm:text-base font-bold tracking-tight ${
                          isLight
                            ? 'text-black'
                            : 'text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className={`mt-1 block text-xs ${isLight ? 'text-black/60' : 'text-white/65'}`}>
                        {opt.description}
                      </span>
                      <span className="mt-2 block text-[10px] font-black uppercase tracking-widest text-[#CDA032]/80">
                        {count} model{count === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (showSubcategoryPicker) {
    const scopeLabel = activeCategory ? categoryDisplayLabel(activeCategory) : 'Products';
    const seriesLabel = activeSeriesLabel;
    const isConditionStep = !isNestedTypePicker && subcategoryOptions.every((o) => o.kind === 'condition');
    const onBack = isNestedTypePicker
      ? goToCategoryPicker
      : brandThenSeries
        ? pickerParentCategory
          ? goToParentCategoryPicker
          : goToCategoryPicker
        : seriesOptions.length > 0
          ? goToSeriesPicker
          : goToCategoryPicker;
    const backLabel = isNestedTypePicker
      ? 'Categories'
      : brandThenSeries
        ? pickerParentCategory || 'Categories'
        : seriesOptions.length > 0
          ? 'Series'
          : 'Categories';
    const title = isNestedTypePicker
      ? 'Consoles or controllers?'
      : isConditionStep
        ? 'New or used?'
        : brandThenSeries
          ? typeThenSeries
            ? 'Choose a type'
            : 'Choose a brand'
          : `Choose ${scopeLabel}`;
    const blurb = isNestedTypePicker
      ? 'Pick a type to browse PlayStation, Xbox, Nintendo, and Steam Deck gear.'
      : isConditionStep
        ? `Choose condition to see matching ${seriesLabel || scopeLabel} inventory.`
        : brandThenSeries
          ? typeThenSeries
            ? 'Pick a type — Chargers, Covers, Protectors, AirTags, Pencil, and more — then a device series.'
            : 'Pick a brand — each brand has its own series.'
          : `Pick a type to browse ${scopeLabel} products.`;

    return (
      <div className="bb-store-page">
        <header className="bb-store-picker-header">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-5 sm:pt-7 pb-1">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <PageBackButton
                isLight={isLight}
                fallbackTo="/store"
                onClick={onBack}
                label={backLabel}
                className="bb-store-picker-back"
              />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight min-w-0 truncate">
                {title}
              </h1>
            </div>
            <FlowBreadcrumb items={storeBreadcrumbItems} className="mt-2.5" />
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[color:var(--bb-muted)]">{blurb}</p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8 pb-10">
          <div
            className={`grid gap-3 sm:gap-4 ${
              subcategoryCards.length <= 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl'
            }`}
          >
            {subcategoryCards.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={card.onSelect}
                className="group relative flex min-h-[10rem] sm:min-h-[12rem] flex-col overflow-hidden rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface)] text-left transition-all duration-300 hover:border-[#CDA032]/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]/50"
              >
                {card.cover ? (
                  <div className="absolute inset-0">
                    <img
                      src={card.cover}
                      alt=""
                      className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                        isLight
                          ? 'opacity-100'
                          : 'opacity-80 sm:opacity-85 group-hover:opacity-95'
                      }`}
                    />
                    <div
                      className={`pointer-events-none absolute inset-x-0 bottom-0 ${
                        isLight
                          ? 'h-[55%] bg-gradient-to-t from-white via-white/50 to-transparent'
                          : 'inset-0 h-auto bg-gradient-to-t from-[#060605] via-[#060605]/55 to-transparent'
                      }`}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#CDA032]/12 via-transparent to-transparent" />
                )}
                <div className="relative z-[1] flex flex-1 flex-col justify-between p-5 sm:p-6">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border text-[#CDA032] transition-colors group-hover:border-[#CDA032]/40 ${
                      isLight
                        ? 'border-black/10 bg-white shadow-sm'
                        : 'border-white/15 bg-black/50 backdrop-blur-sm'
                    }`}
                  >
                    {card.icon}
                  </span>
                  <div>
                    <span
                      className={`block text-lg sm:text-xl font-bold tracking-tight ${
                        isLight
                          ? 'text-black'
                          : 'text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]'
                      }`}
                    >
                      {card.option.label}
                    </span>
                    <span
                      className={`mt-1 block text-sm ${
                        isLight ? 'text-black/65' : 'text-white/70'
                      }`}
                    >
                      {card.option.description}
                    </span>
                    <span
                      className={`mt-2 inline-block text-[10px] font-black uppercase tracking-wider ${
                        card.count > 0 ? 'text-[#CDA032]' : isLight ? 'text-black/40' : 'text-white/40'
                      }`}
                    >
                      {card.count > 0
                        ? `${card.count} product${card.count === 1 ? '' : 's'}`
                        : 'Coming soon'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showAccessoryDevicePicker && activeCategory) {
    const typeLabel = accessoryTypeLabel(activeAccessoryType);
    const seriesLabel = activeSeriesLabel;
    return (
      <div className="bb-store-page">
        <header className="bb-store-picker-header">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-5 sm:pt-7 pb-1">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <PageBackButton
                isLight={isLight}
                onClick={goToSeriesPicker}
                label={seriesLabel || 'Series'}
                className="bb-store-picker-back"
              />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight min-w-0 truncate">
                Choose a device
              </h1>
            </div>
            <FlowBreadcrumb items={storeBreadcrumbItems} className="mt-2.5" />
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[color:var(--bb-muted)]">
              Pick a device under {typeLabel}
              {seriesLabel ? ` · ${seriesLabel}` : ''}. Products appear after this step.
            </p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {accessoryDeviceOptions.map((opt) => {
              const count = baseFilteredProducts.filter(
                (p) =>
                  productMatchesStoreCategories(p, [activeCategory as Category]) &&
                  productMatchesStoreSeries(p, activeSeries) &&
                  productMatchesStoreSubcategoryFilter(p, subcategoryFilter) &&
                  productMatchesAccessoryDevice(p, opt.value),
              ).length;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => openAccessoryDevice(opt.value)}
                  className="group relative flex min-h-[8.5rem] flex-col overflow-hidden rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface)] text-left transition-all hover:border-[#CDA032]/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]/50"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#CDA032]/12 via-transparent to-transparent" />
                  <div className="relative z-[1] flex flex-1 flex-col justify-between p-4 sm:p-5">
                    <span
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border text-[#CDA032] ${
                        isLight
                          ? 'border-black/10 bg-white shadow-sm'
                          : 'border-white/15 bg-black/50 backdrop-blur-sm'
                      }`}
                    >
                      {categoryIconLg(activeCategory)}
                    </span>
                    <div>
                      <span
                        className={`block text-sm sm:text-base font-bold tracking-tight ${
                          isLight
                            ? 'text-black'
                            : 'text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className={`mt-1 block text-xs ${isLight ? 'text-black/60' : 'text-white/65'}`}>
                        {opt.description}
                      </span>
                      <span className="mt-2 block text-[10px] font-black uppercase tracking-widest text-[#CDA032]/80">
                        {count > 0
                          ? `${count} product${count === 1 ? '' : 's'}`
                          : 'Coming soon'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const canChangeSubcategory =
    Boolean(activeCategory) && subcategoryOptions.length > 0;
  const onProductGridBack =
    isAccessories && activeAccessoryDevice
      ? () =>
          navigate({
            to: '/store',
            search: {
              ...categoryScopeSearch(),
              ...(subcategoryFilter ? encodeStoreSubcategorySearch(subcategoryFilter) : {}),
              ...(activeSeries ? { series: activeSeries } : {}),
            } as never,
            replace: true,
          })
      : isAccessories && seriesOptions.length === 0
        ? goToSubcategoryPicker
        : isAccessories && activeSeries
          ? goToSeriesPicker
          : brandThenSeries && (activeSeries || seriesIsAll)
            ? goToSeriesPicker
            : canChangeSubcategory
              ? goToSubcategoryPicker
              : seriesOptions.length > 0
                ? goToSeriesPicker
                : goToCategoryPicker;

  return (
    <div className="bb-store-page">
      <div className="bb-store-toolbar">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="bb-store-toolbar-row flex min-w-0 items-center gap-1.5 sm:gap-2">
              <PageBackButton
                isLight={isLight}
                fallbackTo="/store"
                iconOnly
                onClick={onProductGridBack}
              />

              <div className="bb-store-search-wrap relative min-w-0">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color:var(--bb-muted)]"
                  aria-hidden
                />
                <input
                  type="search"
                  enterKeyHint="search"
                  placeholder="Search…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bb-store-search-input"
                />
              </div>

              <div className="bb-store-toolbar-actions ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
                <div className="flex items-center gap-0.5 rounded-lg border border-[var(--bb-border)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-md p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[#CDA032] text-black' : 'text-current hover:bg-black/5 dark:hover:bg-white/5'}`}
                    aria-label="Grid view"
                    aria-pressed={viewMode === 'grid'}
                  >
                    <Grid3x3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[#CDA032] text-black' : 'text-current hover:bg-black/5 dark:hover:bg-white/5'}`}
                    aria-label="List view"
                    aria-pressed={viewMode === 'list'}
                  >
                    <List size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  className={`lg:hidden flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all sm:gap-2 sm:px-3 border ${
                    activeFiltersCount > 0
                      ? 'border-transparent bg-[#CDA032] text-black'
                      : 'border-[var(--bb-border)] bg-[var(--bb-surface)]'
                  }`}
                  aria-label="Open filters"
                >
                  <Filter size={14} />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDesktopFilters((v) => !v)}
                  className={`hidden lg:flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all border ${
                    showDesktopFilters
                      ? 'border-[#CDA032]/40 bg-[#CDA032]/15 text-[#CDA032]'
                      : activeFiltersCount > 0
                        ? 'border-transparent bg-[#CDA032] text-black'
                        : 'border-[var(--bb-border)] bg-[var(--bb-surface)]'
                  }`}
                  aria-expanded={showDesktopFilters}
                  aria-label={showDesktopFilters ? 'Hide filters panel' : 'Show filters panel'}
                >
                  {showDesktopFilters ? <PanelLeftClose size={14} /> : <Filter size={14} />}
                  <span>{showDesktopFilters ? 'Hide filters' : 'Filters'}</span>
                  {!showDesktopFilters && activeFiltersCount > 0 && (
                    <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Quick refine chips (full controls live in the side filter) */}
            {(seriesOptions.length > 0 ||
              (brandThenSeries && brandOptions.length > 0) ||
              showConditionInFilter ||
              activeFiltersCount > 0) && (
              <div
                className={`bb-store-chip-rail bb-scrollbar ${showDesktopFilters ? 'lg:hidden' : ''}`}
                role="toolbar"
                aria-label="Category filters"
              >
                {brandThenSeries && brandOptions.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyBrandFilter('all')}
                      className={`bb-store-chip ${!subcategoryFilter ? 'bb-store-chip--active' : ''}`}
                    >
                      {brandAllLabel}
                    </button>
                    {brandOptions.map((opt) => (
                      <button
                        key={`brand-${opt.value}`}
                        type="button"
                        onClick={() => applyBrandFilter(opt.value)}
                        className={`bb-store-chip ${
                          subcategoryFilter?.value === opt.value ? 'bb-store-chip--active' : ''
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </>
                )}

                {brandThenSeries && brandOptions.length > 0 && seriesOptions.length > 0 && (
                  <span className="bb-store-chip-rail__sep" aria-hidden />
                )}

                {seriesOptions.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => applySeriesFilter('all')}
                      className={`bb-store-chip ${!activeSeries ? 'bb-store-chip--active' : ''}`}
                    >
                      All series
                    </button>
                    {seriesOptions.map((opt) => (
                      <button
                        key={`series-${opt.value}`}
                        type="button"
                        onClick={() => applySeriesFilter(opt.value)}
                        className={`bb-store-chip ${activeSeries === opt.value ? 'bb-store-chip--active' : ''}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </>
                )}

                {showConditionInFilter &&
                  (seriesOptions.length > 0 || (brandThenSeries && brandOptions.length > 0)) && (
                    <span className="bb-store-chip-rail__sep" aria-hidden />
                  )}

                {showConditionInFilter && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyConditionFilter('all')}
                      className={`bb-store-chip ${!activeConditionFilter ? 'bb-store-chip--active' : ''}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => applyConditionFilter('new')}
                      className={`bb-store-chip ${activeConditionFilter === 'new' ? 'bb-store-chip--active' : ''}`}
                    >
                      New
                    </button>
                    <button
                      type="button"
                      onClick={() => applyConditionFilter('used')}
                      className={`bb-store-chip ${activeConditionFilter === 'used' ? 'bb-store-chip--active' : ''}`}
                    >
                      Pre-owned
                    </button>
                  </>
                )}

                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="bb-store-chip bb-store-chip--clear"
                    aria-label="Clear all filters"
                  >
                    Clear
                    <X size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div
            className={`lg:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setShowFilters(false)}
            aria-hidden={!showFilters}
          />
          <div
            className={`lg:hidden fixed top-0 left-0 z-[70] flex h-[100dvh] max-h-[100dvh] w-[min(100vw,24rem)] max-w-[400px] min-h-0 flex-col transform transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${showFilters ? 'translate-x-0' : '-translate-x-full'}`}
            role="dialog"
            aria-modal={showFilters}
            aria-label="Shop filters"
            data-lenis-prevent
          >
            <StoreFilterPanel
              {...filterPanelProps}
              variant="drawer"
              onClose={() => setShowFilters(false)}
            />
          </div>

          {showDesktopFilters && (
            <aside className="hidden lg:block w-72 xl:w-80 shrink-0">
              <div className="sticky top-28">
                <StoreFilterPanel {...filterPanelProps} variant="sidebar" />
              </div>
            </aside>
          )}

          <div data-store-products className="flex-1 min-w-0 w-full">
            <FlowBreadcrumb items={storeBreadcrumbItems} className="mb-3" />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[color:var(--bb-muted)]">
                {searchPending
                  ? 'Searching…'
                  : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'item' : 'items'}`}
                {!searchPending && (showPromotionsOnly ? ' on sale' : '')}
              </p>
            </div>

            {searchPending && (
              viewMode === 'list' ? (
                <ListSkeleton isLight={isLight} count={6} />
              ) : (
                <ProductGridSkeleton isLight={isLight} count={8} compact className={gridCols} />
              )
            )}

            {!searchPending && filteredProducts.length > 0 && viewMode === 'grid' && (
              <div className={`bb-store-product-grid grid gap-2 sm:gap-2.5 lg:gap-2.5 ${gridCols}`}>
                {pageProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className={`reveal-on-scroll ${['reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3'][index % 3]}`}
                  >
                    <ProductCard
                      product={{
                        ...product,
                        name: accessoryLeafProductName(product),
                      }}
                      onQuickView={onQuickView}
                      isWishlisted={wishlist.includes(product.id)}
                      onToggleWishlist={toggleWishlist}
                      onAddToCart={onAddToCart}
                      isCompared={compareIds.includes(product.id)}
                      onToggleCompare={onToggleCompare}
                      compact
                    />
                  </div>
                ))}
              </div>
            )}

            {!searchPending && filteredProducts.length > 0 && viewMode === 'list' && (
              <div className="space-y-3 sm:space-y-4">
                {pageProducts.map((product) => (
                  <StoreProductListRow
                    key={product.id}
                    product={{
                      ...product,
                      name: accessoryLeafProductName(product),
                    }}
                    isLight={isLight}
                    onQuickView={onQuickView}
                    onViewDetails={(id) => navigateTo('product', id)}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            )}

            {!searchPending && filteredProducts.length > 0 && (
              <Pagination
                page={storePage}
                pageCount={storePageCount}
                onPageChange={setStorePage}
                total={storeTotal}
                pageSize={PAGE_SIZES.store}
                isLight={isLight}
              />
            )}

            {!searchPending && filteredProducts.length === 0 && (
              <div className="bb-store-empty">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)]">
                  <Search size={22} className="text-[#CDA032] opacity-70" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2">
                  {activeCategory === 'Consoles'
                    ? 'No consoles match these filters.'
                    : activeCategory === 'Controllers'
                      ? 'No controllers match these filters.'
                      : normalizeProductCategory(activeCategory) === 'Smart watches'
                        ? 'No watches match these filters'
                        : 'No products found'}
                </h3>
                <p className="text-sm text-[color:var(--bb-muted)] max-w-sm mx-auto mb-6">
                  {normalizeProductCategory(activeCategory) === 'Smart watches'
                    ? 'Try Apple Watch Ultra or Series, or go back and pick another category.'
                    : 'Try a different search term, clear your filters, or browse another category.'}
                </p>
                <button
                  type="button"
                  onClick={
                    activeCategory === 'Consoles' || activeCategory === 'Controllers'
                      ? clearAllFilters
                      : canChangeSubcategory
                        ? goToSubcategoryPicker
                        : goToCategoryPicker
                  }
                  className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-[#CDA032]/40 text-[#CDA032] hover:bg-[#CDA032]/10 transition-colors"
                >
                  {activeCategory === 'Consoles' || activeCategory === 'Controllers'
                    ? 'Clear filters'
                    : canChangeSubcategory
                      ? brandThenSeries
                        ? 'Change brand'
                        : 'Change filter'
                      : 'Browse categories'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
