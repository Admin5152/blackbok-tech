import React, { useState, useMemo, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ShoppingCart, Heart, Eye, Star, Scale, FileText } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, TW_DARK_BTN_DEPTH, TW_DARK_GOLD_BTN_DEPTH } from '../lib/utils';
import { useAppContext } from '../App';
import { ProductAvailabilityBadge } from './ProductAvailabilityBadge';
import { getProductOptionGroups, initialSelectedFromGroups, toOptionString, getAvailableStock } from '../lib/productOptions';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product, options?: Record<string, string>, quantity?: number) => void;
  isCompared: boolean;
  onToggleCompare: (productId: string) => void;
  theme?: 'light' | 'dark';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  isCompared,
  onToggleCompare
}) => {
  const { theme } = useAppContext();
  const isLight = theme === 'light';
  const optionGroups = useMemo(() => getProductOptionGroups(product), [product]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const availableStock = useMemo(
    () => getAvailableStock(product, selectedOptions),
    [product, selectedOptions],
  );

  useEffect(() => {
    setSelectedOptions(initialSelectedFromGroups(optionGroups));
  }, [product.id, optionGroups]);

  const handleAddToCartWithOptions = () => {
    const missing = optionGroups.filter((g) => !selectedOptions[g.name]?.trim());
    if (missing.length > 0) {
      window.alert(`Select ${missing.map((m) => m.name).join(', ')} before adding to cart.`);
      return;
    }
    if (availableStock <= 0) {
      window.alert('This item is out of stock.');
      return;
    }
    onAddToCart(product, selectedOptions, 1);
  };

  return (
    <div
      className={`group overflow-hidden rounded-2xl transition-all duration-300 flex flex-col h-full cursor-pointer relative border ${
        isCompared
          ? 'border-[#CDA032] shadow-[0_0_0_1px_rgba(205,160,50,0.35)]'
          : isLight
            ? 'border-black/12 bg-white hover:border-[#CDA032]/35 shadow-lg'
            : 'border-white/15 bg-black hover:border-white/25 shadow-2xl'
      }`}
    >
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
        {product.new && (
          <span className="bg-white text-black text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg">NEW</span>
        )}
        {product.discount && (
          <span className="bg-[#CDA032] text-black text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg italic">-{product.discount}%</span>
        )}
      </div>

      <div className="absolute top-2 right-2 z-30 flex flex-col gap-1.5">
        <button
          type="button"
          className={`transition-all p-2 rounded-full border hover:bg-[#CDA032] hover:text-black hover:border-[#CDA032] ${
            isLight
              ? 'border-black/10 bg-white/85 text-black/50'
              : 'border-white/15 bg-black/55 text-white/70 backdrop-blur-md'
          } ${isWishlisted ? 'text-[#CDA032] border-[#CDA032]/45' : ''} ${TW_DARK_BTN_DEPTH}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={13} strokeWidth={2.25} className={isWishlisted ? 'fill-[#CDA032]' : ''} />
        </button>
        <button
          type="button"
          className={`transition-all p-2 rounded-full border hover:bg-[#CDA032] hover:text-black hover:border-[#CDA032] ${
            isLight
              ? 'border-black/10 bg-white/85 text-black/50'
              : 'border-white/15 bg-black/55 text-white/70 backdrop-blur-md'
          } ${isCompared ? 'text-[#CDA032] border-[#CDA032]/45' : ''} ${TW_DARK_BTN_DEPTH}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleCompare(product.id);
          }}
          aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
        >
          <Scale size={13} strokeWidth={2.25} />
        </button>
      </div>

      <Link to="/product/$productId" params={{ productId: product.id } as any} className="flex-1 flex flex-col relative z-10 min-h-0">
        <div className="bb-product-card-media bb-product-card-media--store relative">
          <img
            src={product.image || product.image_url || ''}
            alt={product.name}
            className="bb-product-card-img"
          />

          <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center px-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              className="w-full max-w-[11rem] py-2.5 px-3 bg-white text-black text-[8px] font-black uppercase tracking-[0.28em] rounded-full shadow-xl flex items-center justify-center gap-2 hover:bg-white/95"
            >
              <Eye size={12} strokeWidth={2.5} /> QUICK VIEW
            </button>
          </div>
        </div>

        <div
          className={`p-4 flex-1 flex flex-col justify-between space-y-3 ${isLight ? 'bg-white' : 'bg-black'}`}
        >
          <div className="space-y-2">
            <p
              className={`text-[8px] font-black uppercase tracking-[0.22em] italic ${
                isLight ? 'text-[#B38B21]' : 'text-[#CDA032]'
              }`}
            >
              {product.category}
            </p>
            <h3
              className={`text-[10px] font-black leading-snug uppercase italic tracking-wide line-clamp-2 group-hover:text-[#CDA032] transition-colors ${
                isLight ? 'text-black' : 'text-white'
              }`}
            >
              {product.name}
            </h3>
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={8}
                    className={
                      i < Math.floor(product.rating || 4)
                        ? 'fill-[#CDA032] text-[#CDA032]'
                        : isLight
                          ? 'text-black/20'
                          : 'text-white/22'
                    }
                  />
                ))}
              </div>
              <span className={`text-[8px] font-semibold ${isLight ? 'text-black/45' : 'text-white/50'}`}>
                ({product.reviewCount || 0})
              </span>
            </div>
          </div>

          {/* Variant selection — compact row: Color | Storage | RAM side by side */}
          <div
            className={`grid gap-2 sm:gap-2.5 ${
              optionGroups.length > 3
                ? 'grid-cols-[repeat(auto-fit,minmax(3.75rem,1fr))]'
                : optionGroups.length === 3
                  ? 'grid-cols-3'
                  : optionGroups.length === 2
                    ? 'grid-cols-2'
                    : optionGroups.length === 1
                      ? 'grid-cols-1'
                      : 'hidden'
            }`}
          >
            {optionGroups.map((variant) => {
              const selectedValue = toOptionString(selectedOptions[variant.name] || '');
              const isColor = variant.name.toLowerCase() === 'color';

              return (
                <div key={variant.name} className="min-w-0 flex flex-col gap-1">
                  <span className={`text-[7px] font-black uppercase tracking-wider truncate ${isLight ? 'text-black/55' : 'text-white/45'}`}>
                    {variant.name}
                  </span>

                  <div className="flex flex-wrap gap-1 content-start">
                    {variant.options.map((opt, optIdx) => {
                      const o = toOptionString(opt);
                      const ol = o.toLowerCase();
                      return (
                        <button
                          key={`${variant.name}-${optIdx}-${o}`}
                          type="button"
                          title={o}
                          aria-label={`${variant.name} ${o}${selectedValue === o ? ', selected' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedOptions((prev) => ({ ...prev, [variant.name]: o }));
                          }}
                          className={
                            isColor
                              ? `shrink-0 w-5 h-5 rounded-full border-2 transition-all ${ol === 'white' ? (isLight ? 'ring-1 ring-black/20 ' : 'ring-1 ring-white/35 ') : ''}${
                                  selectedValue === o
                                    ? 'border-[#CDA032] ring-1 ring-[#CDA032]/50 scale-105'
                                    : isLight
                                      ? 'border-black/25 hover:border-black/45'
                                      : 'border-white/25 hover:border-white/45'
                                }`
                              : `shrink-0 min-w-0 max-w-full px-1.5 py-0.5 rounded-md text-[7px] font-black tracking-wide transition-all border truncate ${
                                  selectedValue === o
                                    ? 'border-[#CDA032] bg-[#CDA032]/15 text-[#CDA032]'
                                    : isLight
                                      ? 'border-black/20 bg-zinc-100 text-black/85 hover:border-black/40 hover:bg-zinc-200 hover:text-black'
                                      : 'border-white/15 text-white/55 hover:border-white/35 hover:text-white'
                                }`
                          }
                          style={
                            isColor
                              ? {
                                  backgroundColor:
                                    ol === 'black'
                                      ? '#000'
                                      : ol === 'white'
                                        ? '#fff'
                                        : ol === 'red'
                                          ? '#ef4444'
                                          : ol === 'blue'
                                            ? '#3b82f6'
                                            : ol === 'green'
                                              ? '#10b981'
                                              : ol === 'purple'
                                                ? '#a855f7'
                                                : ol === 'pink'
                                                  ? '#ec4899'
                                                  : ol === 'gold'
                                                    ? '#f59e0b'
                                                    : ol === 'silver'
                                                      ? '#9ca3af'
                                                      : ol.includes('space gray')
                                                        ? '#4B4B4D'
                                                        : ol.includes('midnight')
                                                          ? '#1C2938'
                                                          : '#6b7280',
                                }
                              : {}
                          }
                        >
                          {!isColor && o}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`text-lg font-black tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>
                {formatCurrency(product.price)}
              </span>
              {product.discount && (
                <span className={`text-[8px] line-through font-bold ${isLight ? 'text-black/40' : 'text-white/35'}`}>
                  {formatCurrency(product.price * (1 + product.discount / 100))}
                </span>
              )}
            </div>

            <div className="pt-0.5">
              <ProductAvailabilityBadge available={availableStock} isLight={isLight} compact />
            </div>

            <div className="flex flex-col gap-2 pt-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddToCartWithOptions();
                }}
                disabled={availableStock <= 0}
                className={`w-full py-3.5 bg-[#CDA032] hover:bg-[#c29a28] text-black rounded-full text-[9px] font-black uppercase tracking-[0.28em] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none ${TW_DARK_GOLD_BTN_DEPTH}`}
              >
                <ShoppingCart size={14} strokeWidth={2.5} /> {availableStock <= 0 ? 'Out of stock' : 'ADD TO CART'}
              </button>

              <Link
                to="/product/$productId"
                params={{ productId: product.id } as any}
                onClick={(e) => e.stopPropagation()}
                className={`w-full py-3 rounded-full text-[8px] font-black uppercase tracking-[0.28em] transition-all flex items-center justify-center gap-2 border active:scale-[0.98] ${
                  isLight
                    ? 'bg-zinc-50 hover:bg-zinc-100 text-black border-black/12'
                    : 'bg-black text-white border-white/20 hover:border-white/35 hover:bg-white/[0.06]'
                }`}
              >
                <FileText size={12} strokeWidth={2.25} className={isLight ? 'text-black/60' : 'text-white/80'} />{' '}
                VIEW DETAILS
              </Link>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};
