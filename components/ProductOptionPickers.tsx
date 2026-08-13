import React from 'react';
import type { Product } from '../types';
import {
  getProductOptionGroups,
  getAvailableStock,
  snapSelectionToInStock,
  toOptionString,
  isProductOptionAvailable,
  type ProductOptionGroup,
} from '../lib/productOptions';
import { StockAwareOptionButton } from './StockAwareOptionButton';

type Props = {
  product: Product;
  groups?: ProductOptionGroup[];
  selectedOptions: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  showStockHints?: boolean;
  /** When true, OOS chips cannot become the active selection (cart + trade-in). */
  strictStock?: boolean;
  className?: string;
};

export const ProductOptionPickers: React.FC<Props> = ({
  product,
  groups: groupsProp,
  selectedOptions,
  onChange,
  showStockHints = true,
  strictStock = true,
  className = '',
}) => {
  const groups = groupsProp ?? getProductOptionGroups(product);
  if (groups.length === 0) return null;

  const available = getAvailableStock(product, selectedOptions);

  return (
    <div className={`space-y-4 ${className}`}>
      {groups.map((g) => (
        <div key={g.name}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">{g.name}</p>
          <div className="flex flex-wrap gap-2">
            {g.options.map((opt) => {
              const active = toOptionString(selectedOptions[g.name]) === opt;
              const inStock = isProductOptionAvailable(
                product,
                selectedOptions,
                g.name,
                opt,
                groups,
              );
              const outOfStock = !inStock;
              return (
                <StockAwareOptionButton
                  key={`${g.name}-${opt}`}
                  outOfStock={outOfStock}
                  selected={active}
                  label={opt}
                  onSelect={() =>
                    onChange(
                      snapSelectionToInStock(product, groups, {
                        ...selectedOptions,
                        [g.name]: opt,
                      }),
                    )
                  }
                  className={`relative px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    active && !outOfStock
                      ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032]'
                      : outOfStock
                        ? 'border-[var(--bb-border)] opacity-40 grayscale cursor-not-allowed'
                        : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/40'
                  }`}
                >
                  {opt}
                </StockAwareOptionButton>
              );
            })}
          </div>
        </div>
      ))}
      {showStockHints && available <= 0 && (
        <p className={`text-[11px] ${strictStock ? 'text-red-400/90' : 'text-amber-500/90'}`}>
          {strictStock
            ? 'Out of stock — choose another configuration.'
            : 'This combination is currently out of stock.'}
        </p>
      )}
    </div>
  );
};
