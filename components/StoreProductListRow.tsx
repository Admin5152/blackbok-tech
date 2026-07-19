import React from 'react';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { ProductAvailabilityBadge } from './ProductAvailabilityBadge';
import {
  defaultSelectedOptionsForProduct,
  getAvailableStock,
} from '../lib/productOptions';

interface Props {
  product: Product;
  isLight: boolean;
  onQuickView: (product: Product) => void;
  onViewDetails: (productId: string) => void;
  onAddToCart: (product: Product) => void;
}

export const StoreProductListRow: React.FC<Props> = ({
  product,
  isLight,
  onQuickView,
  onViewDetails,
  onAddToCart,
}) => {
  const priceFrom = Number(product.price_from ?? product.price ?? 0);
  const priceTo = Number(product.price_to ?? priceFrom);
  const showFrom = priceTo > priceFrom;
  const totalStock = Math.max(0, Math.floor(Number(product.total_stock ?? product.stock ?? 0)));
  const available =
    product.variants?.length
      ? getAvailableStock(product, defaultSelectedOptionsForProduct(product))
      : totalStock;

  return (
    <article className="bb-store-list-row flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/40 transition-colors">
      <button
        type="button"
        className="bb-product-card-media bb-product-card-media--store-list shrink-0 rounded-lg text-left"
        onClick={() => onViewDetails(product.id)}
      >
        <img
          src={product.image || product.image_url || ''}
          alt={product.name}
          className="bb-product-card-img hover:scale-105 transition-transform duration-500"
        />
      </button>

      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => onViewDetails(product.id)}
              className="font-bold text-base sm:text-lg text-left hover:text-[#CDA032] transition-colors min-w-0 flex-1 basis-[min(100%,12rem)]"
            >
              {product.brand ? `${product.brand} · ` : ''}
              {product.name}
            </button>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
              {showFrom && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--bb-muted)]">
                  from
                </span>
              )}
              <span className="font-black text-base sm:text-lg text-[#CDA032] tabular-nums">
                {formatCurrency(priceFrom)}
              </span>
              {product.trade_model && (
                <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-600/15 text-emerald-500">
                  Trade-in eligible
                </span>
              )}
              <ProductAvailabilityBadge available={available} isLight={isLight} inline />
            </div>
          </div>
          {product.description && (
            <p className="text-xs sm:text-sm text-[color:var(--bb-muted)] mt-1.5 leading-relaxed line-clamp-2 max-w-2xl">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 mt-4 sm:mt-5 justify-end flex-wrap">
          <button
            type="button"
            onClick={() => onQuickView(product)}
            className="px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border border-[var(--bb-border)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Quick view
          </button>
          <button
            type="button"
            onClick={() => onViewDetails(product.id)}
            className="px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border border-[var(--bb-border)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={available <= 0}
            className="px-3 sm:px-4 py-2 bg-[#CDA032] text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#B38B21] active:scale-[0.98] transition-all disabled:opacity-40"
          >
            Add to cart
          </button>
        </div>
      </div>
    </article>
  );
};
