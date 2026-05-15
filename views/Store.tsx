import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, Filter, Grid3x3, List, Smartphone, Laptop as LaptopIcon, Tablet as TabletIcon, Headphones, Watch, Gamepad2, LayoutGrid, X, ChevronDown, ArrowLeft, Plus, Minus, Tag, Menu, Repeat2 } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { formatCurrency } from '../lib/utils';
import { normalizeProductCategory } from '../lib/api';
import { scanScrollReveal } from '../hooks/useScrollReveal';
import { ProductAvailabilityBadge } from '../components/ProductAvailabilityBadge';
import { getProductOptionGroups, initialSelectedFromGroups, getAvailableStock } from '../lib/productOptions';
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
  /** `?q=` from /store — hydrates search when opening a shared link or refresh. */
  searchFromUrl?: string;
}

export const Store: React.FC<StoreProps> = ({
  products,
  searchQuery: _searchQueryFromParent,
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
  const productTextHaystack = (p: Product) =>
    [
      p.name,
      p.description,
      p.brand,
      p.model,
      p.sku,
      p.category,
      Array.isArray((p as { specs?: string[] }).specs) ? (p as { specs: string[] }).specs.join(' ') : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

  const productMatchesSearchWords = (p: Product, qRaw: string): boolean => {
    const q = qRaw.trim().toLowerCase();
    if (!q) return true;
    const hay = productTextHaystack(p);
    const productNorm = normalizeProductCategory(p.category);
    const words = q.split(/\s+/).filter(Boolean);
    return words.every((word) => {
      if (hay.includes(word)) return true;
      const wordNorm = normalizeProductCategory(word);
      return wordNorm === productNorm;
    });
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 15000 });
  const [showPromotionsOnly, setShowPromotionsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const navigate = useNavigate();

  // Buffer state for the price inputs (desktop + mobile). Lets the user
  // clear the field without it snapping back to a default value (STR-07).
  // The real `priceRange` only updates on blur / Enter / Apply, so the
  // grid doesn't churn while the user is mid-edit either.
  const [desktopMinInput, setDesktopMinInput] = useState('0');
  const [desktopMaxInput, setDesktopMaxInput] = useState('15000');
  const [mobileMinInput, setMobileMinInput] = useState('0');
  const [mobileMaxInput, setMobileMaxInput] = useState('15000');
  const isLight = theme === 'light';

  const commitDesktopPrice = () => {
    const minRaw = desktopMinInput.trim() === '' ? 0 : Number(desktopMinInput);
    const maxRaw = desktopMaxInput.trim() === '' ? 15000 : Number(desktopMaxInput);
    const min = Number.isFinite(minRaw) ? Math.max(0, minRaw) : 0;
    const max = Number.isFinite(maxRaw) ? Math.min(15000, Math.max(min, maxRaw)) : 15000;
    setPriceRange({ min, max });
    // Reflect normalized values back into the inputs.
    setDesktopMinInput(String(min));
    setDesktopMaxInput(String(max));
  };

  React.useEffect(() => {
    const urlCategories = new URLSearchParams(window.location.search).getAll('categories');
    const singleCategory = new URLSearchParams(window.location.search).get('category');
    const rawCategories = [
      ...(categoriesFromUrl || []),
      ...urlCategories,
      ...(singleCategory ? [singleCategory] : []),
    ];

    if (rawCategories.length > 0) {
      const normalizedCategories = rawCategories
        .flatMap((cat) => String(cat).split(',').map((s) => s.trim()))
        .map((cat) => (cat ? normalizeProductCategory(cat) : null))
        .filter((cat): cat is Category => Boolean(cat));
      setSelectedCategories(Array.from(new Set(normalizedCategories)));
    }
  }, [categoriesFromUrl, setSelectedCategories]);

  React.useEffect(() => {
    const raw = searchFromUrl?.trim();
    if (!raw) return;
    setSearchTerm(raw);
    setSearchQuery(raw);
  }, [searchFromUrl, setSearchQuery]);

  // Do not mirror `searchQuery` into `searchTerm` on every keystroke — that would
  // fight local typing while `searchQuery` is still empty until the debounced URL sync runs.

  React.useEffect(() => {
    setMobileMinInput(String(priceRange.min));
    setMobileMaxInput(String(priceRange.max));
    setDesktopMinInput(String(priceRange.min));
    setDesktopMaxInput(String(priceRange.max));
  }, [priceRange.min, priceRange.max]);

  // Keep URL in sync with search + category so header search preserves filters and links are shareable.
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
      const search = buildStoreSearchParams();
      setSearchQuery(searchTerm.trim());
      navigate({ to: '/store', search, replace: true });
    }, 380);
    return () => window.clearTimeout(id);
  }, [buildStoreSearchParams, navigate, searchTerm, setSearchQuery]);

  const getDiscountValue = (discount: unknown): number => {
    if (typeof discount === 'number') return Number.isFinite(discount) ? discount : 0;
    if (typeof discount === 'string') {
      const parsed = Number(discount.replace(/[^0-9.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  /** Search + price + promotions-only — must match `filteredProducts` logic so chip counts equal visible rows when that chip applies. */
  const productPassesStoreBaseFilters = (p: Product): boolean => {
    const q = String(searchTerm ?? '').trim();
    if (!productMatchesSearchWords(p, q)) return false;
    const price = Number(p.price ?? 0);
    if (!Number.isFinite(price) || price < priceRange.min || price > priceRange.max) return false;
    if (showPromotionsOnly && getDiscountValue(p.discount) <= 0) return false;
    return true;
  };

  const baseFilteredProducts = useMemo(
    () => products.filter(productPassesStoreBaseFilters),
    [products, searchTerm, priceRange.min, priceRange.max, showPromotionsOnly]
  );

  type StoreCategoryRow =
    | { key: string; label: string; value: 'All'; icon: React.ReactNode; count: number }
    | { key: string; label: string; value: Category; icon: React.ReactNode; count: number }
    | { key: string; label: string; value: '__promotions__'; icon: React.ReactNode; count: number };

  const categoryOptions: StoreCategoryRow[] = useMemo(() => {
    const catalogKeys: Record<string, true> = {};
    products.forEach((p) => {
      catalogKeys[normalizeProductCategory(p.category)] = true;
    });
    const preferred = ['iPhone', 'Laptop', 'Tablet', 'Gaming', 'Audio', 'Accessories', 'Trades'] as const;
    const remaining = new Set(Object.keys(catalogKeys));
    const ordered: string[] = [];
    preferred.forEach((p) => {
      if (remaining.has(p)) {
        ordered.push(p);
        remaining.delete(p);
      }
    });
    [...remaining].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).forEach((k) => ordered.push(k));

    const countInBucket = (bucket: string) =>
      baseFilteredProducts.filter((p) => normalizeProductCategory(p.category) === bucket).length;

    const iconFor = (cat: string): React.ReactNode => {
      switch (cat) {
        case 'iPhone':
          return <Smartphone size={14} />;
        case 'Laptop':
          return <LaptopIcon size={14} />;
        case 'Tablet':
          return <TabletIcon size={14} />;
        case 'Accessories':
          return <Watch size={14} />;
        case 'Gaming':
          return <Gamepad2 size={14} />;
        case 'Audio':
          return <Headphones size={14} />;
        case 'Trades':
          return <Repeat2 size={14} />;
        default:
          return <LayoutGrid size={14} />;
      }
    };

    const promoCount = baseFilteredProducts.filter((p) => getDiscountValue(p.discount) > 0).length;

    return [
      { key: 'all', label: 'SHOP ALL', value: 'All' as const, icon: <LayoutGrid size={14} />, count: baseFilteredProducts.length },
      ...ordered.map((cat) => ({
        key: `cat-${cat}`,
        label: String(cat).toUpperCase(),
        value: cat as Category,
        icon: iconFor(cat),
        count: countInBucket(cat),
      })),
      {
        key: 'promotions',
        label: 'PROMOTIONS',
        value: '__promotions__' as const,
        icon: <Tag size={14} className="text-[#CDA032]" />,
        count: promoCount,
      },
    ];
  }, [products, baseFilteredProducts]);

  const isCategoryRowActive = (cat: StoreCategoryRow): boolean => {
    if (cat.value === '__promotions__') return showPromotionsOnly;
    if (cat.value === 'All') return selectedCategories.length === 0;
    return selectedCategories.includes(cat.value);
  };

  const toggleCategory = (cat: Category | 'All') => {
    if (cat === 'All') {
      setSelectedCategories([]);
      return;
    }
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const filteredProducts = useMemo(() => {
    const results = baseFilteredProducts.filter((p) => {
      const normalizedProductCategory = normalizeProductCategory(p.category);
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.some((sel) => normalizeProductCategory(sel) === normalizedProductCategory);
      return matchesCategory;
    });

    return results.sort((a, b) => b.stock - a.stock);
  }, [baseFilteredProducts, selectedCategories]);

  useEffect(() => {
    scanScrollReveal();
  }, [filteredProducts.length, viewMode, searchTerm, selectedCategories]);

  const activeFiltersCount = [
    selectedCategories.length > 0,
    priceRange.min > 0,
    priceRange.max < 15000,
    showPromotionsOnly,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceRange({ min: 0, max: 15000 });
    setSearchTerm('');
    setSearchQuery('');
    setShowPromotionsOnly(false);
  };

  const pageBg = isLight ? '#F0F0F0' : '#060605';
  const panelBg = isLight ? '#FFFFFF' : '#0d0d0b';
  const borderSubtle = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const borderFaint = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const textMuted = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.3)';

  return (
    <div className="min-h-screen" style={{ backgroundColor: pageBg, color: isLight ? '#000' : '#fff' }}>

      {/* Search Bar */}
      <div className="sticky top-16 sm:top-20 lg:top-24 z-40 border-b backdrop-blur-md" style={{ backgroundColor: `${pageBg}e6`, borderColor: borderFaint }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex min-w-0 flex-col gap-2">
            {/* Toolbar: on small screens stack so search keeps a full row of width */}
            <div className="flex min-w-0 flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center sm:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <button
                  onClick={() => navigateTo('home')}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2 py-2 transition-colors hover:border-white/20 sm:gap-2 sm:px-3"
                  style={{ backgroundColor: panelBg, color: isLight ? '#000' : '#fff' }}
                >
                  <ArrowLeft size={16} />
                  <span className="hidden text-sm font-medium sm:inline">Back</span>
                </button>

                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 sm:left-3" style={{ color: textMuted }} aria-hidden />
                  <input
                    type="search"
                    enterKeyHint="search"
                    placeholder="Search shop…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full min-w-0 rounded-lg py-2.5 pl-8 pr-3 text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]/40 sm:rounded-xl sm:py-2.5 sm:pl-10"
                    style={{
                      backgroundColor: panelBg,
                      border: `1px solid ${borderSubtle}`,
                      color: isLight ? '#000' : '#fff',
                    }}
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-1 sm:justify-start sm:gap-1.5">
                {/* View mode — all breakpoints (compact on mobile) */}
                <div className="flex items-center gap-0.5 rounded-lg border p-0.5" style={{ borderColor: borderSubtle }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-md p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[#CDA032] text-black' : 'text-current hover:bg-black/5 dark:hover:bg-white/5'}`}
                    aria-label="Grid view"
                  >
                    <Grid3x3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[#CDA032] text-black' : 'text-current hover:bg-black/5 dark:hover:bg-white/5'}`}
                    aria-label="List view"
                  >
                    <List size={14} />
                  </button>
                </div>

                {/* Categories — mobile / tablet drawer */}
                <button
                  type="button"
                  onClick={() => setShowMobileNav(!showMobileNav)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-2 transition-colors hover:border-white/20 lg:hidden"
                  style={{ backgroundColor: panelBg, color: isLight ? '#000' : '#fff' }}
                  aria-label="Browse categories"
                >
                  <Menu size={16} />
                  <span className="hidden text-sm font-medium sm:inline">Categories</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all sm:gap-2 sm:px-3 ${activeFiltersCount > 0 ? 'border-transparent bg-[#CDA032] text-black' : 'border border-white/10 hover:border-white/20'}`}
                  style={{
                    backgroundColor: activeFiltersCount > 0 ? '#CDA032' : panelBg,
                    borderColor: activeFiltersCount > 0 ? 'transparent' : borderSubtle,
                    color: activeFiltersCount > 0 ? '#000' : isLight ? '#000' : '#fff',
                  }}
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
              </div>
            </div>

            {/* Active filters summary — mobile only, only when needed */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 lg:hidden">
                <div className="flex items-center gap-2 rounded-full border border-[#CDA032]/30 bg-[#CDA032]/20 px-3 py-1">
                  <span className="text-xs font-black text-[#CDA032]">{activeFiltersCount} Filters</span>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-[#CDA032] transition-colors hover:text-black"
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

          {/* Filters Sidebar Drawer — backdrop (mobile + desktop) */}
          <div
            className={`fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setShowFilters(false)}
          />

          {/* Filters Sidebar Drawer — panel (mobile + desktop) */}
          <div
            className={`fixed top-0 left-0 h-full w-[88vw] max-w-[400px] sm:w-[400px] z-[70] transform transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${showFilters ? 'translate-x-0' : '-translate-x-full'}`}
            style={{ backgroundColor: panelBg, borderRight: `1px solid ${borderSubtle}` }}
          >
            <div className="h-full overflow-y-auto p-6 sm:p-8 space-y-8 no-scrollbar">
              <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: borderSubtle }}>
                <h2 className="text-2xl font-bold tracking-tight">Filters</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-xs font-black mb-4 uppercase tracking-[0.2em] opacity-60">Categories</h3>
                <div className="space-y-2">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => {
                        if (cat.value === '__promotions__') {
                          setShowPromotionsOnly((v) => !v);
                          return;
                        }
                        toggleCategory(cat.value);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group
                    ${isCategoryRowActive(cat)
                          ? 'bg-[#CDA032] border-[#CDA032] text-black shadow-lg shadow-[#CDA032]/20'
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {cat.icon}
                        <span>{cat.label}</span>
                      </div>
                      <span className={`text-xs ${isCategoryRowActive(cat) ? 'opacity-80' : 'opacity-40'}`}>{cat.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Promotions Toggle */}
              <div>
                <button
                  onClick={() => setShowPromotionsOnly(!showPromotionsOnly)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group
                    ${showPromotionsOnly
                      ? 'bg-[#CDA032] border-[#CDA032] text-black shadow-lg shadow-[#CDA032]/20'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Tag size={16} />
                    <span className="font-bold uppercase tracking-wider text-xs">Active Promotions</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${showPromotionsOnly ? 'bg-black/20' : 'bg-black/10'}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-current transition-all ${showPromotionsOnly ? 'left-6' : 'left-1'}`} />
                  </div>
                </button>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-xs font-black mb-4 uppercase tracking-[0.2em] opacity-60">Price Range</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs opacity-60 font-medium mb-2 block">Min Price</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPriceRange(prev => ({ ...prev, min: Math.max(0, prev.min - 100) }))}
                        className="p-2 sm:p-3 rounded-xl border border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center shrink-0 w-11 h-11"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="15000"
                        step="100"
                        value={desktopMinInput}
                        onChange={(e) => setDesktopMinInput(e.target.value)}
                        onBlur={commitDesktopPrice}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitDesktopPrice(); } }}
                        className="flex-1 w-full px-4 py-3 border rounded-xl text-center text-sm font-medium focus:outline-none focus:border-[#CDA032] focus:ring-1 focus:ring-[#CDA032] transition-colors"
                        style={{
                          backgroundColor: isLight ? '#fff' : '#000',
                          borderColor: borderSubtle,
                          color: isLight ? '#000' : '#fff'
                        }}
                      />
                      <button
                        onClick={() => setPriceRange(prev => ({ ...prev, min: Math.min(prev.max, prev.min + 100) }))}
                        className="p-2 sm:p-3 rounded-xl border border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center shrink-0 w-11 h-11"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs opacity-60 font-medium mb-2 block">Max Price</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPriceRange(prev => ({ ...prev, max: Math.max(prev.min, prev.max - 100) }))}
                        className="p-2 sm:p-3 rounded-xl border border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center shrink-0 w-11 h-11"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="15000"
                        step="100"
                        value={desktopMaxInput}
                        onChange={(e) => setDesktopMaxInput(e.target.value)}
                        onBlur={commitDesktopPrice}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitDesktopPrice(); } }}
                        className="flex-1 w-full px-4 py-3 border rounded-xl text-center text-sm font-medium focus:outline-none focus:border-[#CDA032] focus:ring-1 focus:ring-[#CDA032] transition-colors"
                        style={{
                          backgroundColor: isLight ? '#fff' : '#000',
                          borderColor: borderSubtle,
                          color: isLight ? '#000' : '#fff'
                        }}
                      />
                      <button
                        onClick={() => setPriceRange(prev => ({ ...prev, max: Math.min(15000, prev.max + 100) }))}
                        className="p-2 sm:p-3 rounded-xl border border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center shrink-0 w-11 h-11"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>


              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <div className="pt-6 border-t" style={{ borderColor: borderSubtle }}>
                  <button
                    onClick={clearAllFilters}
                    className="w-full py-4 border-2 border-transparent bg-black/5 dark:bg-white/5 rounded-xl text-sm font-bold tracking-wide transition-all hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Shop grid */}
          {/* Mobile Category Navigation - Collapsible */}
          <div className={`lg:hidden w-full transition-all duration-300 overflow-hidden ${showMobileNav ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="py-3 sm:py-4 mb-4">
              <div className="flex flex-col gap-2">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      if (cat.value === '__promotions__') {
                        setShowPromotionsOnly((v) => !v);
                        setShowMobileNav(false);
                        return;
                      }
                      toggleCategory(cat.value);
                      setShowMobileNav(false); // Close nav after selection
                    }}
                    className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border ${isCategoryRowActive(cat)
                      ? 'bg-[#CDA032] border-[#CDA032] text-black shadow-lg shadow-[#CDA032]/20'
                      : 'bg-white/5 border-white/5 text-white/40'
                      }`}
                  >
                    {cat.icon}
                    <span className="flex-1 text-left text-xs sm:text-sm">{cat.label}</span>
                    <span className={`text-[9px] sm:text-xs ${isCategoryRowActive(cat)
                      ? 'opacity-80'
                      : 'opacity-40'
                      }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}

                {/* Mobile Filter Options */}
                <div className="pt-2 mt-2 border-t border-white/10">
                  <div className="px-2 sm:px-3 py-2">
                    <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-3">Quick Filters</h4>

                    {/* Promotions Toggle */}
                    <button
                      onClick={() => setShowPromotionsOnly(!showPromotionsOnly)}
                      className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all duration-300 mb-2 ${showPromotionsOnly
                        ? 'bg-[#CDA032] border-[#CDA032] text-black'
                        : 'bg-white/5 border-white/5 text-white/40'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Tag size={12} className="sm:size-14" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Promotions</span>
                      </div>
                      <div className={`w-6 sm:w-8 h-3 sm:h-4 rounded-full relative transition-colors ${showPromotionsOnly ? 'bg-black/20' : 'bg-black/10'}`}>
                        <div className={`absolute top-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-current transition-all ${showPromotionsOnly ? 'left-3.5 sm:left-4.5' : 'left-0.5'}`} />
                      </div>
                    </button>

                    <div className="space-y-2">
                      {[
                        { label: 'Under $5,000', range: { min: 0, max: 5000 } },
                        { label: '$5,000 - $10,000', range: { min: 5000, max: 10000 } },
                        { label: '$10,000+', range: { min: 10000, max: 15000 } }
                      ].map(({ label, range }) => (
                        <button
                          key={label}
                          onClick={() => {
                            setPriceRange(range);
                            setShowMobileNav(false);
                          }}
                          className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:border-white/10 transition-all"
                        >
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{label}</span>
                        </button>
                      ))}
                    </div>

                    <div
                      className="mt-3 p-3 rounded-xl border"
                      style={{
                        backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                        borderColor: borderSubtle,
                      }}
                    >
                      <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-3" style={{ color: isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }}>
                        Custom Price Range
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-wider opacity-50 mb-1 block">Min</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={mobileMinInput}
                            onChange={(e) => setMobileMinInput(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border text-sm font-medium focus:outline-none focus:border-[#CDA032] focus:ring-1 focus:ring-[#CDA032]"
                            style={{
                              backgroundColor: isLight ? '#fff' : '#000',
                              borderColor: borderSubtle,
                              color: isLight ? '#000' : '#fff',
                            }}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-wider opacity-50 mb-1 block">Max</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={mobileMaxInput}
                            onChange={(e) => setMobileMaxInput(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border text-sm font-medium focus:outline-none focus:border-[#CDA032] focus:ring-1 focus:ring-[#CDA032]"
                            style={{
                              backgroundColor: isLight ? '#fff' : '#000',
                              borderColor: borderSubtle,
                              color: isLight ? '#000' : '#fff',
                            }}
                            placeholder="15000"
                          />
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            // Allow empty inputs to mean "no bound" — they
                            // collapse to the default extremes here without
                            // forcing the user to type during edit.
                            const minRaw = mobileMinInput.trim() === '' ? 0 : Number(mobileMinInput);
                            const maxRaw = mobileMaxInput.trim() === '' ? 15000 : Number(mobileMaxInput);
                            const min = Number.isFinite(minRaw) ? Math.max(0, minRaw) : 0;
                            const max = Number.isFinite(maxRaw) ? Math.min(15000, Math.max(min, maxRaw)) : 15000;
                            setPriceRange({ min, max });
                            setShowMobileNav(false);
                          }}
                          className="px-3 py-2.5 rounded-lg bg-[#CDA032] text-black text-[10px] sm:text-[11px] font-black uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => {
                            setPriceRange({ min: 0, max: 15000 });
                            setMobileMinInput('0');
                            setMobileMaxInput('15000');
                          }}
                          className="px-3 py-2.5 rounded-lg border text-[10px] sm:text-[11px] font-black uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                          style={{
                            borderColor: borderSubtle,
                            color: isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => {
                          clearAllFilters();
                          setShowMobileNav(false);
                        }}
                        className="w-full p-2.5 sm:p-3 mt-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 reveal-on-scroll">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm" style={{ color: textMuted }}>
                {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} found
              </span>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className={`group cursor-pointer reveal-on-scroll reveal-delay-${(index % 3) + 1}`}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(205,160,50,0.4)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(205,160,50,0.12)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    <ProductCard
                      product={product}
                      onQuickView={onQuickView}
                      isWishlisted={wishlist.includes(product.id)}
                      onToggleWishlist={toggleWishlist}
                      onAddToCart={onAddToCart}
                      isCompared={compareIds.includes(product.id)}
                      onToggleCompare={onToggleCompare}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredProducts.map((product) => {
                  const listAvailable = getAvailableStock(
                    product,
                    initialSelectedFromGroups(getProductOptionGroups(product)),
                  );
                  return (
                  <div
                    key={product.id}
                    className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 rounded-xl border hover:border-[#CDA032]/50 transition-all shadow-sm"
                    style={{ backgroundColor: panelBg, borderColor: borderSubtle }}
                  >
                    <div
                      className="bb-product-card-media bb-product-card-media--store-list shrink-0 cursor-pointer rounded-lg bg-black/5 dark:bg-white/5"
                      onClick={() => navigateTo('product', product.id)}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="bb-product-card-img hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <h3
                            className="font-bold text-base sm:text-lg cursor-pointer hover:text-[#CDA032] transition-colors"
                            onClick={() => navigateTo('product', product.id)}
                          >
                            {product.name}
                          </h3>
                          <span className="font-black text-base sm:text-lg text-[#CDA032] shrink-0">{formatCurrency(product.price)}</span>
                        </div>
                        <p className="text-xs sm:text-sm opacity-60 mt-1.5 leading-relaxed line-clamp-2 max-w-2xl">{product.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <ProductAvailabilityBadge available={listAvailable} isLight={isLight} compact />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 mt-4 sm:mt-6 justify-end flex-wrap">
                        <button
                          onClick={() => onQuickView(product)}
                          className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors border hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ borderColor: borderSubtle }}
                        >
                          Quick View
                        </button>
                        <button
                          onClick={() => navigateTo('product', product.id)}
                          className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors border hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ borderColor: borderSubtle }}
                        >
                          Details
                        </button>
                        <button
                          onClick={() => onAddToCart(product)}
                          className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#CDA032] text-black rounded-lg text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#CDA032]/10"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center py-16 sm:py-24 lg:py-32 rounded-[2rem] sm:rounded-[3rem] border border-dashed relative overflow-hidden group" style={{ borderColor: borderSubtle, backgroundColor: panelBg }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#CDA032]/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative z-10 space-y-6 sm:space-y-8">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-[#CDA032]/10 blur-3xl rounded-full scale-110"></div>
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl flex items-center justify-center border border-white/5 bg-black/40 backdrop-blur-md">
                      <Search size={24} className="sm:size-32 text-[#CDA032] opacity-30 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" />
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic">No <span className="text-[#CDA032]">matches</span></h3>
                    <p className="text-xs font-black uppercase tracking-[0.3em] max-w-xs sm:max-w-sm mx-auto opacity-40 leading-relaxed px-4">
                      The specified unit is not present in our current repository. Adjust your filters or explore other hardware categories.
                    </p>
                  </div>

                  <div className="pt-3 sm:pt-4">
                    <button
                      onClick={clearAllFilters}
                      className="px-6 sm:px-10 py-3 sm:py-4 border border-[#CDA032]/30 rounded-xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-[#CDA032]/10 transition-all active:scale-95"
                    >
                      Reset Protocol
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
