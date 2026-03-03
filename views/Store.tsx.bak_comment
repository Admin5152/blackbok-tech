import React, { useMemo, useState } from 'react';
import { Search, Filter, Grid3x3, List, Smartphone, Laptop as LaptopIcon, Watch, Gamepad2, LayoutGrid, X, ChevronDown, ArrowLeft } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { formatCurrency } from '../lib/utils';
import type { Theme } from '../App';

interface StoreProps {
  products: Product[];
  searchQuery: string;
  selectedCategory: Category | 'All';
  setSelectedCategory: (cat: Category | 'All') => void;
  navigateTo: (view: string, id?: string) => void;
  onQuickView: (product: Product) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  compareIds: string[];
  onToggleCompare: (productId: string) => void;
  onAddToCart: (p: Product) => void;
  theme?: Theme;
}

export const Store: React.FC<StoreProps> = ({
  products,
  searchQuery,
  selectedCategory,
  setSelectedCategory,
  navigateTo,
  onQuickView,
  wishlist,
  toggleWishlist,
  compareIds,
  onToggleCompare,
  onAddToCart,
  theme,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 15000 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const isLight = theme === 'light';

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    let results = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesPrice = p.price >= priceRange.min && p.price <= priceRange.max;

      return matchesSearch && matchesCategory && matchesPrice;
    });

    return results.sort((a, b) => b.stock - a.stock);
  }, [products, searchTerm, selectedCategory, priceRange]);


  const categoryOptions: { label: string; value: Category | 'All'; icon: React.ReactNode; count?: number }[] = [
    { label: 'ALL PRODUCTS', value: 'All', icon: <LayoutGrid size={14} />, count: products.length },
    { label: 'IPHONE', value: 'iPhone', icon: <Smartphone size={14} />, count: products.filter(p => p.category === 'iPhone').length },
    { label: 'LAPTOP', value: 'Laptop', icon: <LaptopIcon size={14} />, count: products.filter(p => p.category === 'Laptop').length },
    { label: 'ACCESSORIES', value: 'Accessories', icon: <Watch size={14} />, count: products.filter(p => p.category === 'Accessories').length },
    { label: 'GAMING', value: 'Gaming', icon: <Gamepad2 size={14} />, count: products.filter(p => p.category === 'Gaming').length },
  ];

  const activeFiltersCount = [
    selectedCategory !== 'All',
    priceRange.min > 0,
    priceRange.max < 15000
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedCategory('All');
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

          {/* Filters Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block w-64 flex-shrink-0`}>
            <div className="rounded-2xl p-6 space-y-6" style={{ backgroundColor: panelBg, border: `1px solid ${borderSubtle}` }}>

              {/* Categories */}
              <div>
                <h3 className="text-sm font-bold mb-3 uppercase tracking-wider">Categories</h3>
                <div className="space-y-2">
                  {categoryOptions.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all ${selectedCategory === cat.value ? 'bg-[#CDA032] text-black' : 'hover:bg-white/5'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {cat.icon}
                        <span>{cat.label}</span>
                      </div>
                      <span className="text-xs opacity-60">{cat.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-sm font-bold mb-3 uppercase tracking-wider">Price Range</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs opacity-60">Min Price</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="15000"
                        step="100"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#CDA032] transition-colors"
                        style={{
                          backgroundColor: panelBg,
                          borderColor: borderSubtle,
                          color: isLight ? '#000' : '#fff'
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="15000"
                        step="100"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                        className="w-24 accent-[#CDA032]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs opacity-60">Max Price</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="15000"
                        step="100"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) || 15000 }))}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#CDA032] transition-colors"
                        style={{
                          backgroundColor: panelBg,
                          borderColor: borderSubtle,
                          color: isLight ? '#000' : '#fff'
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="15000"
                        step="100"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                        className="w-24 accent-[#CDA032]"
                      />
                    </div>
                  </div>
                </div>
              </div>


              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="w-full py-2 border rounded-lg text-sm font-medium transition-all hover:bg-white/5"
                  style={{ borderColor: borderSubtle }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>

          {/* Products Grid */}
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
                    className="flex gap-4 p-4 rounded-xl border hover:border-[#CDA032]/50 transition-all"
                    style={{ backgroundColor: panelBg, borderColor: borderSubtle }}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm opacity-60">{product.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-[#CDA032]">{formatCurrency(product.price)}</span>
                        <button
                          onClick={() => onAddToCart(product)}
                          className="px-4 py-2 bg-[#CDA032] text-black rounded-lg text-sm font-medium"
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
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <Search size={24} style={{ color: textMuted }} />
                </div>
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-sm" style={{ color: textMuted }}>
                  Try adjusting your filters or search terms
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
