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
} from 'lucide-react';
import { PageBackButton } from '../components/PageBackButton';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { StoreFilterPanel, type StoreCategoryRow, STORE_PRICE_SLIDER_MAX } from '../components/StoreFilterPanel';
import { StoreProductListRow } from '../components/StoreProductListRow';
import { normalizeProductCategory } from '../lib/api';
import { scanScrollReveal } from '../hooks/useScrollReveal';
import { sortProductsStockFirst } from '../lib/productOptions';
import { lockPageScroll } from '../lib/pageScrollLock';
import { PAGE_SIZES, usePagination } from '../lib/pagination';
import { Pagination } from '../components/Pagination';
import {
  buildOrderedStoreCategoryKeys,
  countActiveStoreFilters,
  getProductDiscountValue,
  productMatchesStoreCategories,
  productPassesStoreBaseFilters,
  fetchStoreSearchProducts,
} from '../lib/storeFilters';
import type { Theme } from '../App';

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
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  iPhone: <Smartphone size={14} />,
  Laptop: <LaptopIcon size={14} />,
  Tablet: <TabletIcon size={14} />,
  Accessories: <Watch size={14} />,
  Gaming: <Gamepad2 size={14} />,
  Audio: <Headphones size={14} />,
  Trades: <Repeat2 size={14} />,
};

function categoryIcon(cat: string): React.ReactNode {
  return CATEGORY_ICONS[cat] ?? <LayoutGrid size={14} />;
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
  const [desktopMinInput, setDesktopMinInput] = useState('0');
  const [desktopMaxInput, setDesktopMaxInput] = useState(String(STORE_PRICE_SLIDER_MAX));
  /** GIN textSearch hits — null means use full catalog (no active search query) */
  const [searchHitIds, setSearchHitIds] = useState<Set<string> | null>(null);
  const navigate = useNavigate();
  const isLight = theme === 'light';

  useEffect(() => {
    try {
      localStorage.setItem('bb-store-show-filters', String(showDesktopFilters));
    } catch {
      /* ignore */
    }
  }, [showDesktopFilters]);

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
    if (rawCategories.length === 0) return;

    const normalized = rawCategories
      .flatMap((cat) => String(cat).split(',').map((s) => s.trim()))
      .map((cat) => (cat ? normalizeProductCategory(cat) : null))
      .filter((cat): cat is Category => Boolean(cat));
    setSelectedCategories(Array.from(new Set(normalized)));
  }, [categoriesFromUrl, setSelectedCategories]);

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
    }
    return out;
  }, [searchTerm, selectedCategories]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.setTimeout(() => {
      setSearchQuery(searchTerm.trim());
      navigate({ to: '/store', search: buildStoreSearchParams() as never, replace: true });
    }, 380);
    return () => window.clearTimeout(id);
  }, [buildStoreSearchParams, navigate, searchTerm, setSearchQuery]);

  // Hit products GIN index via .textSearch when the user types a query
  useEffect(() => {
    const q = searchTerm.trim();
    if (!q) {
      setSearchHitIds(null);
      return;
    }
    let cancelled = false;
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

  const categoryOptions: StoreCategoryRow[] = useMemo(() => {
    const ordered = buildOrderedStoreCategoryKeys(products);
    const countInBucket = (bucket: string) =>
      baseFilteredProducts.filter((p) => normalizeProductCategory(p.category) === bucket).length;

    return [
      {
        key: 'all',
        label: 'Shop all',
        value: 'All' as const,
        icon: <LayoutGrid size={14} />,
        count: baseFilteredProducts.length,
      },
      ...ordered.map((cat) => ({
        key: `cat-${cat}`,
        label: cat,
        value: cat as Category,
        icon: categoryIcon(cat),
        count: countInBucket(cat),
      })),
    ];
  }, [products, baseFilteredProducts]);

  const filteredProducts = useMemo(() => {
    const results = baseFilteredProducts.filter((p) =>
      productMatchesStoreCategories(p, selectedCategories),
    );
    return sortProductsStockFirst(results);
  }, [baseFilteredProducts, selectedCategories]);

  const storePageResetKey = [
    searchTerm,
    selectedCategories.join(','),
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
  });

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceRange({ min: 0, max: STORE_PRICE_SLIDER_MAX });
    setSearchTerm('');
    setSearchQuery('');
    setShowPromotionsOnly(false);
  };

  const toggleCategory = (cat: Category | 'All') => {
    if (cat === 'All') {
      setSelectedCategories([]);
      return;
    }
    setSelectedCategories(
      selectedCategories.includes(cat)
        ? selectedCategories.filter((c) => c !== cat)
        : [...selectedCategories, cat],
    );
  };

  const isCategoryRowActive = (cat: StoreCategoryRow): boolean => {
    if (cat.value === 'All') return selectedCategories.length === 0;
    return selectedCategories.includes(cat.value);
  };

  const handlePriceRangeChange = (range: { min: number; max: number }) => {
    setPriceRange(range);
    setDesktopMinInput(String(range.min));
    setDesktopMaxInput(String(range.max));
  };

  const filterPanelProps = {
    isLight,
    categoryOptions,
    isCategoryRowActive,
    onCategoryClick: (cat: StoreCategoryRow) => toggleCategory(cat.value),
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
  };

  const gridCols = showDesktopFilters
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

  return (
    <div className="bb-store-page">
      <div className="bb-store-toolbar">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="bb-store-toolbar-row flex min-w-0 items-center gap-1.5 sm:gap-2">
              <PageBackButton isLight={isLight} fallbackTo="/" iconOnly />

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

            {activeFiltersCount > 0 && (
              <div className={`flex items-center gap-2 ${showDesktopFilters ? 'lg:hidden' : ''}`}>
                <div className="flex items-center gap-2 rounded-full border border-[#CDA032]/30 bg-[#CDA032]/15 px-3 py-1">
                  <span className="text-xs font-bold text-[#CDA032]">
                    {activeFiltersCount} active filter{activeFiltersCount === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-[#CDA032] hover:text-black transition-colors"
                    aria-label="Clear all filters"
                  >
                    <X size={12} />
                  </button>
                </div>
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
            <p className="mb-4 text-sm text-[color:var(--bb-muted)]">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
              {showPromotionsOnly ? ' on sale' : ''}
            </p>

            {filteredProducts.length > 0 && viewMode === 'grid' && (
              <div className={`bb-store-product-grid grid gap-2 sm:gap-3 ${gridCols}`}>
                {pageProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className={`reveal-on-scroll ${['reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3'][index % 3]}`}
                  >
                    <ProductCard
                      product={product}
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

            {filteredProducts.length > 0 && viewMode === 'list' && (
              <div className="space-y-3 sm:space-y-4">
                {pageProducts.map((product) => (
                  <StoreProductListRow
                    key={product.id}
                    product={product}
                    isLight={isLight}
                    onQuickView={onQuickView}
                    onViewDetails={(id) => navigateTo('product', id)}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            )}

            {filteredProducts.length > 0 && (
              <Pagination
                page={storePage}
                pageCount={storePageCount}
                onPageChange={setStorePage}
                total={storeTotal}
                pageSize={PAGE_SIZES.store}
                isLight={isLight}
              />
            )}

            {filteredProducts.length === 0 && (
              <div className="bb-store-empty">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)]">
                  <Search size={22} className="text-[#CDA032] opacity-70" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2">No products found</h3>
                <p className="text-sm text-[color:var(--bb-muted)] max-w-sm mx-auto mb-6">
                  Try a different search term, clear your filters, or browse another category.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-[#CDA032]/40 text-[#CDA032] hover:bg-[#CDA032]/10 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
