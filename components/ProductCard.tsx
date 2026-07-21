/**
 * Storefront product card — layout preserved; data from v_product_page row.
 *
 * Displays: primary image, name, brand, price_from (+ "from" when range),
 * discount badge, condition badge, color dots (max 5 +n), stock state,
 * Trade-in eligible pill when trade_model is set. No client joins.
 */
import React, { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { ShoppingCart, Heart, Eye, Scale } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, TW_DARK_BTN_DEPTH, TW_DARK_GOLD_BTN_DEPTH } from '../lib/utils';
import { useAppContext } from '../App';
import { ProductAvailabilityBadge } from './ProductAvailabilityBadge';

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

function colorSwatch(name: string): string {
  const ol = name.toLowerCase();
  if (ol === 'black' || ol.includes('midnight') || ol.includes('space black')) return '#1C1C1E';
  if (ol === 'white' || ol.includes('starlight') || ol.includes('cloud')) return '#F5F5F7';
  if (ol.includes('red')) return '#ef4444';
  if (ol.includes('blue') || ol.includes('ultramarine')) return '#3b82f6';
  if (ol.includes('green') || ol.includes('teal') || ol.includes('sage')) return '#10b981';
  if (ol.includes('purple') || ol.includes('lavender')) return '#a855f7';
  if (ol.includes('pink')) return '#ec4899';
  if (ol.includes('gold')) return '#f59e0b';
  if (ol.includes('silver') || ol.includes('natural')) return '#9ca3af';
  if (ol.includes('space gray') || ol.includes('graphite')) return '#4B4B4D';
  return '#6b7280';
}

function conditionLabel(condition?: string | null, isNew?: boolean): string | null {
  if (isNew) return null;
  const c = (condition || '').toLowerCase();
  if (!c || c === 'new') return null;
  if (c.includes('refurb')) return 'Refurbished';
  if (c.includes('pre') || c.includes('used') || c.includes('owned')) return 'Pre-owned';
  return condition;
}

function stockLabel(total: number): { kind: 'in' | 'low' | 'out'; text: string } {
  if (total <= 0) return { kind: 'out', text: 'Out of stock' };
  if (total <= 3) return { kind: 'low', text: 'Low stock' };
  return { kind: 'in', text: 'In stock' };
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

  const priceFrom = Number(product.price_from ?? product.price ?? 0);
  const priceTo = Number(product.price_to ?? priceFrom);
  const showFrom = priceTo > priceFrom && Number.isFinite(priceTo);
  const totalStock = Math.max(
    0,
    Math.floor(Number(product.total_stock ?? product.stock ?? 0)),
  );
  const stock = stockLabel(totalStock);
  const cond = conditionLabel(product.condition, product.new || product.is_new);
  const colors = Array.isArray(product.colors) ? product.colors.filter(Boolean) : [];
  const visibleColors = colors.slice(0, 5);
  const extraColors = Math.max(0, colors.length - 5);
  const tradeEligible = Boolean(product.trade_model);

  const displayPrice = useMemo(() => {
    if (product.discount && product.discount > 0) {
      return priceFrom * (1 - product.discount / 100);
    }
    return priceFrom;
  }, [priceFrom, product.discount]);

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
        {product.discount != null && product.discount > 0 && (
          <span className="bg-[#CDA032] text-black text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg italic">-{product.discount}%</span>
        )}
        {cond && (
          <span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg ${
            isLight ? 'bg-black/80 text-white' : 'bg-white/90 text-black'
          }`}>
            {cond}
          </span>
        )}
        {tradeEligible && (
          <span className="bg-emerald-600 text-white text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg">
            Trade-in eligible
          </span>
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
              {product.brand || product.category}
            </p>
            <h3
              className={`font-bold leading-snug line-clamp-2 group-hover:text-[#CDA032] transition-colors ${
                isCompact ? 'text-[11px]' : 'text-xs'
              } ${isLight ? 'text-black' : 'text-white'}`}
            >
              {product.name}
            </h3>
          </div>

          {/* Color dots from view.colors[] — display only, max 5 +n */}
          {visibleColors.length > 0 && (
            <div className={`flex flex-wrap items-center gap-1 min-h-0 ${isCompact ? 'max-sm:hidden' : ''}`}>
              {visibleColors.map((c) => (
                <span
                  key={c}
                  title={c}
                  className={`shrink-0 w-4 h-4 rounded-full border ${
                    c.toLowerCase() === 'white'
                      ? isLight
                        ? 'ring-1 ring-black/20 border-black/15'
                        : 'ring-1 ring-white/35 border-white/20'
                      : isLight
                        ? 'border-black/20'
                        : 'border-white/25'
                  }`}
                  style={{ backgroundColor: colorSwatch(c) }}
                  aria-hidden
                />
              ))}
              {extraColors > 0 && (
                <span className={`text-[8px] font-medium ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                  +{extraColors}
                </span>
              )}
            </div>
          )}

          <div className={`flex items-end justify-between gap-2 pt-0.5 ${isCompact ? 'gap-1' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                {showFrom && (
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isLight ? 'text-black/45' : 'text-white/40'}`}>
                    from
                  </span>
                )}
                <span className={`font-black tracking-tight tabular-nums ${isCompact ? 'text-sm' : 'text-base'} ${isLight ? 'text-black' : 'text-white'}`}>
                  {formatCurrency(displayPrice)}
                </span>
                {product.discount != null && product.discount > 0 && (
                  <span className={`line-through text-[10px] ${isLight ? 'text-black/40' : 'text-white/35'}`}>
                    {formatCurrency(priceFrom)}
                  </span>
                )}
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-wide ${
                  stock.kind === 'out'
                    ? isLight
                      ? 'text-red-700'
                      : 'text-red-400'
                    : stock.kind === 'low'
                      ? isLight
                        ? 'text-amber-700'
                        : 'text-amber-400'
                      : isLight
                        ? 'text-emerald-700'
                        : 'text-emerald-400'
                }`}
              >
                {stock.text}
              </span>
              {/* Keep badge for a11y parity with older cards */}
              <span className="sr-only">
                <ProductAvailabilityBadge available={totalStock} isLight={isLight} minimal />
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Card has no SKU resolution — open PDP for variant pick, or add base if no stock block
                if (totalStock <= 0) {
                  window.alert('This item is out of stock.');
                  return;
                }
                onAddToCart(product, {}, 1);
              }}
              disabled={totalStock <= 0}
              title={totalStock <= 0 ? 'Out of stock' : 'Add to cart'}
              aria-label={totalStock <= 0 ? 'Out of stock' : 'Add to cart'}
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
