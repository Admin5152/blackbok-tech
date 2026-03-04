import React, { useMemo, useState } from 'react';
import { Search, Filter, Grid3x3, List, Smartphone, Laptop as LaptopIcon, Watch, Gamepad2, LayoutGrid, X, ChevronDown, ArrowLeft, Plus, Minus, Tag } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { formatCurrency } from '../lib/utils';
import type { Theme } from '../App';

interface StoreProps {
  products: Product[];
  searchQuery: string;
  selectedCategories: Category[];
  setSelectedCategories: (cats: Category[]) => void;
  navigateTo: (view: string, id?: string) => void;
  onQuickView: (product: Product) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  compareIds: string[];
  onToggleCompare: (productId: string) => void;
  onAddToCart: (p: Product) => void;
  theme?: Theme;
  categoriesFromUrl?: string[];
}

export const Store: React.FC<StoreProps> = ({
  products,
  searchQuery,
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
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 15000 });
  const [showPromotionsOnly, setShowPromotionsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const isLight = theme === 'light';

  React.useEffect(() => {
    if (categoriesFromUrl && categoriesFromUrl.length > 0) {
      setSelectedCategories(categoriesFromUrl as Category[]);
    }
  }, [categoriesFromUrl, setSelectedCategories]);

  // Sync with global search query
  React.useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

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
    const q = searchTerm.toLowerCase().trim();
    let results = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.category);
      const matchesPrice = p.price >= priceRange.min && p.price <= priceRange.max;
      const matchesPromotions = !showPromotionsOnly || (p.discount && p.discount > 0);

      return matchesSearch && matchesCategory && matchesPrice && matchesPromotions;
    });

    return results.sort((a, b) => b.stock - a.stock);
  }, [products, searchTerm, selectedCategories, priceRange]);


  const categoryOptions: { label: string; value: Category | 'All'; icon: React.ReactNode; count?: number }[] = [
    { label: 'ALL PRODUCTS', value: 'All', icon: <LayoutGrid size={14} />, count: products.length },
    { label: 'IPHONE', value: 'iPhone', icon: <Smartphone size={14} />, count: products.filter(p => p.category === 'iPhone').length },
    { label: 'LAPTOP', value: 'Laptop', icon: <LaptopIcon size={14} />, count: products.filter(p => p.category === 'Laptop').length },
    { label: 'ACCESSORIES', value: 'Accessories', icon: <Watch size={14} />, count: products.filter(p => p.category === 'Accessories').length },
    { label: 'GAMING', value: 'Gaming', icon: <Gamepad2 size={14} />, count: products.filter(p => p.category === 'Gaming').length },
    { label: 'PROMOTIONS', value: 'All', icon: <Tag size={14} className="text-[#CDA032]" />, count: products.filter(p => p.discount && p.discount > 0).length },
  ];

  const activeFiltersCount = [
    selectedCategories.length > 0,
    priceRange.min > 0,
    priceRange.max < 15000
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceRange({ min: 0, max: 15000 });
    setSearchTerm('');
  };

  const pageBg = isLight ? '#F0F0F0' : '#060605';
  const panelBg = isLight ? '#FFFFFF' : '#0d0d0b';
  const borderSubtle = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const borderFaint = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const textMuted = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.3)';

  return (
    <div className="min-h-screen" style={{ backgroundColor: pageBg, color: isLight ? '#000' : '#fff' }}>

      {/* Search Bar */}
      <div className="sticky top-0 z-40 border-b" style={{ backgroundColor: pageBg, borderColor: borderFaint }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <button
              onClick={() => navigateTo('home')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
              style={{ backgroundColor: panelBg, color: isLight ? '#000' : '#fff' }}
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: textMuted }} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                  style={{
                    backgroundColor: panelBg,
                    border: `1px solid ${borderSubtle}`,
                    color: isLight ? '#000' : '#fff'
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeFiltersCount > 0 ? 'bg-[#CDA032] text-black' : 'border'
                  }`}
                style={{
                  backgroundColor: activeFiltersCount > 0 ? '#CDA032' : panelBg,
                  borderColor: borderSubtle,
                  color: activeFiltersCount > 0 ? '#000' : isLight ? '#000' : '#fff'
                }}
              >
                <Filter size={16} />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-black/20 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-1 border rounded-lg p-1" style={{ borderColor: borderSubtle }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#CDA032] text-black' : 'text-current'}`}
                >
                  <Grid3x3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#CDA032] text-black' : 'text-current'}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* Filters Sidebar Drawer Overlay */}
          <div
            className={`fixed inset-0 bg-black/60 z-50 backdrop-blur-sm transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setShowFilters(false)}
          />

          {/* Filters Sidebar Drawer */}
          <div
            className={`fixed top-0 left-0 h-full w-[320px] sm:w-[400px] z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${showFilters ? 'translate-x-0' : '-translate-x-full'}`}
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
                      key={cat.value}
                      onClick={() => toggleCategory(cat.value)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group
                    ${(cat.value === 'All' && selectedCategories.length === 0) || (cat.value !== 'All' && selectedCategories.includes(cat.value))
                          ? 'bg-[#CDA032] border-[#CDA032] text-black shadow-lg shadow-[#CDA032]/20'
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {cat.icon}
                        <span>{cat.label}</span>
                      </div>
                      <span className={`text-xs ${(cat.value === 'All' && selectedCategories.length === 0) || (cat.value !== 'All' && selectedCategories.includes(cat.value)) ? 'opacity-80' : 'opacity-40'}`}>{cat.count}</span>
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
                        min="0"
                        max="15000"
                        step="100"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
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
                        min="0"
                        max="15000"
                        step="100"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) || 15000 }))}
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

          {/* Products Grid */}
          {/* Mobile Category Switcher (Horizontal Scroll) */}
          <div className="lg:hidden w-full overflow-x-auto no-scrollbar py-4 -mt-2 mb-4">
            <div className="flex gap-2 px-1">
              {categoryOptions.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => toggleCategory(cat.value)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border 
                  ${(cat.value === 'All' && selectedCategories.length === 0) || (cat.value !== 'All' && selectedCategories.includes(cat.value))
                      ? 'bg-[#CDA032] border-[#CDA032] text-black shadow-lg shadow-[#CDA032]/20'
                      : 'bg-white/5 border-white/5 text-white/40'
                    }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm" style={{ color: textMuted }}>
                {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'} Found
              </span>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="group cursor-pointer"
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
              <div className="space-y-4">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="flex flex-col sm:flex-row gap-6 p-5 rounded-xl border hover:border-[#CDA032]/50 transition-all shadow-sm"
                    style={{ backgroundColor: panelBg, borderColor: borderSubtle }}
                  >
                    <div
                      className="w-full sm:w-32 h-32 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center p-2"
                      onClick={() => navigateTo('product', product.id)}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <h3
                            className="font-bold text-lg cursor-pointer hover:text-[#CDA032] transition-colors"
                            onClick={() => navigateTo('product', product.id)}
                          >
                            {product.name}
                          </h3>
                          <span className="font-black text-lg text-[#CDA032] shrink-0">{formatCurrency(product.price)}</span>
                        </div>
                        <p className="text-sm opacity-60 mt-1.5 leading-relaxed line-clamp-2 max-w-2xl">{product.description}</p>
                      </div>

                      <div className="flex items-center gap-3 mt-6 justify-end flex-wrap">
                        <button
                          onClick={() => onQuickView(product)}
                          className="px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors border hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ borderColor: borderSubtle }}
                        >
                          Quick View
                        </button>
                        <button
                          onClick={() => navigateTo('product', product.id)}
                          className="px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors border hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ borderColor: borderSubtle }}
                        >
                          Details
                        </button>
                        <button
                          onClick={() => onAddToCart(product)}
                          className="px-5 py-2.5 bg-[#CDA032] text-black rounded-lg text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#CDA032]/10"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center py-32 rounded-[3rem] border border-dashed relative overflow-hidden group" style={{ borderColor: borderSubtle, backgroundColor: panelBg }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#CDA032]/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative z-10 space-y-8">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-[#CDA032]/10 blur-3xl rounded-full scale-110"></div>
                    <div className="relative w-20 h-20 mx-auto rounded-2xl flex items-center justify-center border border-white/5 bg-black/40 backdrop-blur-md">
                      <Search size={32} className="text-[#CDA032] opacity-30 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-3xl font-black uppercase tracking-tighter italic">Product <span className="text-[#CDA032]">Not Found</span></h3>
                    <p className="text-xs font-black uppercase tracking-[0.3em] max-w-sm mx-auto opacity-40 leading-relaxed px-4">
                      The specified unit is not present in our current repository. Adjust your filters or explore other hardware categories.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={clearAllFilters}
                      className="px-10 py-4 border border-[#CDA032]/30 rounded-xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-[#CDA032]/10 transition-all active:scale-95"
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
