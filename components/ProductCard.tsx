import React, { useState, useMemo, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ShoppingCart, Heart, Eye, Star, Scale } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, TW_DARK_BTN_DEPTH, TW_DARK_GOLD_BTN_DEPTH } from '../lib/utils';
import { useAppContext } from '../App';
import { ProductAvailabilityBadge } from './ProductAvailabilityBadge';
import {
  getProductOptionGroups,
  defaultSelectedOptionsForProduct,
  snapSelectionToInStock,
  toOptionString,
  getAvailableStock,
} from '../lib/productOptions';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product, options?: Record<string, string>, quantity?: number) => void;
  isCompared: boolean;
  onToggleCompare: (productId: string) => void;
  theme?: 'light' | 'dark';
  /** Tighter layout for store grid */
  compact?: boolean;
  /** @deprecated Use compact — tighter layout for 2-column mobile store grid */
  compactOnMobile?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  isCompared,
  onToggleCompare,
  compact = false,
  compactOnMobile = false,
}) => {
  const { theme } = useAppContext();
  const isLight = theme === 'light';
  const isCompact = compact || compactOnMobile;
  const optionGroups = useMemo(() => getProductOptionGroups(product), [product]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const availableStock = useMemo(
    () => getAvailableStock(product, selectedOptions),
    [product, selectedOptions],
  );

  useEffect(() => {
    setSelectedOptions(defaultSelectedOptionsForProduct(product));
  }, [product.id, optionGroups, product]);

  const handleAddToCartWithOptions = () => {
    const resolved = snapSelectionToInStock(product, optionGroups, selectedOptions);
    if (availableStock <= 0) {
      window.alert('This item is out of stock.');
      return;
    }
    onAddToCart(product, resolved, 1);
  };

  const colorGroup = optionGroups.find((g) => g.name.toLowerCase() === 'color');
  const cardOptionGroups = colorGroup ? [colorGroup] : optionGroups.slice(0, 1);

  return (
    <div
      className={`group overflow-hidden rounded-xl transition-all duration-300 flex flex-col h-full cursor-pointer relative border ${
        isCompact ? 'max-sm:rounded-lg' : ''
      } ${
        isCompared
          ? 'border-[#CDA032] shadow-[0_0_0_1px_rgba(205,160,50,0.35)]'
          : isLight
            ? 'border-black/12 bg-white hover:border-[#CDA032]/35 shadow-lg'
            : 'border-white/15 bg-black hover:border-white/25 shadow-2xl'
      }`}
    >
      <div className={`absolute top-2 left-2 z-20 flex flex-col gap-1 ${isCompact ? 'top-1.5 left-1.5 max-sm:top-1 max-sm:left-1' : ''}`}>
        {product.new && (
          <span className="bg-white text-black text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg">NEW</span>
        )}
        {product.discount && (
          <span className="bg-[#CDA032] text-black text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg italic">-{product.discount}%</span>
        )}
      </div>

      <div className={`absolute top-2 right-2 z-30 flex flex-col gap-1.5 ${isCompact ? 'top-1.5 right-1.5 gap-1 max-sm:top-1 max-sm:right-1' : ''}`}>
        <button
          type="button"
          className={`transition-all rounded-full border hover:bg-[#CDA032] hover:text-black hover:border-[#CDA032] ${
            isCompact ? 'p-1.5' : 'p-2'
          } ${
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
        <div className={`bb-product-card-media bb-product-card-media--store relative ${isCompact ? 'bb-product-card-media--store-compact' : ''}`}>
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
          className={`flex flex-col gap-1 ${isCompact ? 'p-2' : 'p-2.5'} ${isLight ? 'bg-white' : 'bg-black'}`}
        >
          <div className="space-y-1 min-w-0">
            <p
              className={`font-bold uppercase tracking-[0.18em] truncate ${
                isCompact ? 'text-[7px]' : 'text-[8px]'
              } ${isLight ? 'text-[#B38B21]' : 'text-[#CDA032]'}`}
            >
              {product.category}
            </p>
            <h3
              className={`font-bold leading-snug line-clamp-2 group-hover:text-[#CDA032] transition-colors ${
                isCompact ? 'text-[11px]' : 'text-xs'
              } ${isLight ? 'text-black' : 'text-white'}`}
            >
              {product.name}
            </h3>
            <div className={`flex items-center gap-1 ${isCompact ? 'max-sm:hidden' : ''}`}>
              <div className="flex gap-px">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={9}
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
              <span className={`text-[9px] ${isLight ? 'text-black/45' : 'text-white/50'}`}>
                ({product.reviewCount || 0})
              </span>
            </div>
          </div>

          {cardOptionGroups.length > 0 && (
            <div
              className={`flex flex-wrap items-center gap-1 min-h-0 ${isCompact ? 'max-sm:hidden' : ''}`}
            >
              {cardOptionGroups.flatMap((variant) => {
                const selectedValue = toOptionString(selectedOptions[variant.name] || '');
                const isColor = variant.name.toLowerCase() === 'color';

                return variant.options.slice(0, isColor ? 5 : 3).map((opt, optIdx) => {
                  const o = toOptionString(opt);
                  const ol = o.toLowerCase();
                  const trialOpts = snapSelectionToInStock(product, optionGroups, {
                    ...selectedOptions,
                    [variant.name]: o,
                  });
                  const optStock = getAvailableStock(product, trialOpts);
                  const optDisabled = optStock <= 0;
                  return (
                    <button
                      key={`${variant.name}-${optIdx}-${o}`}
                      type="button"
                      title={`${variant.name}: ${o}`}
                      disabled={optDisabled}
                      aria-label={`${variant.name} ${o}${selectedValue === o ? ', selected' : ''}${optDisabled ? ', out of stock' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (optDisabled) return;
                        setSelectedOptions((prev) =>
                          snapSelectionToInStock(product, optionGroups, { ...prev, [variant.name]: o }),
                        );
                      }}
                      className={
                        isColor
                          ? `shrink-0 w-4 h-4 rounded-full border transition-all ${ol === 'white' ? (isLight ? 'ring-1 ring-black/20 ' : 'ring-1 ring-white/35 ') : ''}${
                              optDisabled
                                ? 'opacity-30 cursor-not-allowed border-black/10'
                                : selectedValue === o
                                  ? 'border-[#CDA032] ring-1 ring-[#CDA032]/50'
                                  : isLight
                                    ? 'border-black/25 hover:border-black/45'
                                    : 'border-white/25 hover:border-white/45'
                            }`
                          : `shrink-0 px-1.5 py-0.5 rounded text-[8px] font-semibold transition-all border ${
                              optDisabled
                                ? 'opacity-30 cursor-not-allowed border-black/10'
                                : selectedValue === o
                                  ? 'border-[#CDA032] bg-[#CDA032]/15 text-[#CDA032]'
                                  : isLight
                                    ? 'border-black/15 bg-zinc-50 text-black/80 hover:border-black/30'
                                    : 'border-white/15 text-white/60 hover:border-white/35'
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
                });
              })}
              {optionGroups.length > cardOptionGroups.length && (
                <span className={`text-[8px] font-medium ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                  +{optionGroups.length - cardOptionGroups.length} more
                </span>
              )}
            </div>
          )}

          <div className={`flex items-end justify-between gap-2 pt-0.5 ${isCompact ? 'gap-1' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className={`font-black tracking-tight tabular-nums ${isCompact ? 'text-sm' : 'text-base'} ${isLight ? 'text-black' : 'text-white'}`}>
                  {formatCurrency(product.price)}
                </span>
                {product.discount && (
                  <span className={`line-through text-[10px] ${isLight ? 'text-black/40' : 'text-white/35'}`}>
                    {formatCurrency(product.price * (1 + product.discount / 100))}
                  </span>
                )}
              </div>
              <ProductAvailabilityBadge available={availableStock} isLight={isLight} minimal />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddToCartWithOptions();
              }}
              disabled={availableStock <= 0}
              title={availableStock <= 0 ? 'Out of stock' : 'Add to cart'}
              aria-label={availableStock <= 0 ? 'Out of stock' : 'Add to cart'}
              className={`shrink-0 bg-[#CDA032] hover:bg-[#c29a28] text-black rounded-full font-bold transition-all flex items-center justify-center shadow-md active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none ${
                isCompact ? 'h-8 w-8' : 'h-9 w-9'
              } ${TW_DARK_GOLD_BTN_DEPTH}`}
            >
              <ShoppingCart size={isCompact ? 14 : 15} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
};
