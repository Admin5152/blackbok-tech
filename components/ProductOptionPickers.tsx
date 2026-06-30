import React from 'react';
import type { Product } from '../types';
import {
  getProductOptionGroups,
  getAvailableStock,
  snapSelectionToInStock,
  toOptionString,
  type ProductOptionGroup,
} from '../lib/productOptions';

type Props = {
  product: Product;
  groups?: ProductOptionGroup[];
  selectedOptions: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  showStockHints?: boolean;
  /** When true, OOS chips cannot be selected (cart + trade-in). */
  strictStock?: boolean;
  className?: string;
};

export const ProductOptionPickers: React.FC<Props> = ({
  product,
  groups: groupsProp,
  selectedOptions,
  onChange,
  showStockHints = true,
  strictStock = false,
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
              const trial = snapSelectionToInStock(product, groups, {
                ...selectedOptions,
                [g.name]: opt,
              });
              const trialStock = showStockHints || strictStock ? getAvailableStock(product, trial) : 1;
              const disabled = strictStock && trialStock <= 0;
              return (
                <button
                  key={`${g.name}-${opt}`}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange(snapSelectionToInStock(product, groups, { ...selectedOptions, [g.name]: opt }))
                  }
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    active
                      ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032]'
                      : disabled
                        ? 'border-[var(--bb-border)] opacity-35 cursor-not-allowed'
                        : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/40'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {showStockHints && !strictStock && available <= 0 && (
        <p className="text-[11px] text-amber-500/90">This combination is currently out of stock.</p>
      )}
      {strictStock && available <= 0 && (
        <p className="text-[11px] text-red-400/90">Out of stock — choose another configuration.</p>
      )}
    </div>
  );
};

