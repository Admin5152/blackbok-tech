import React, { useMemo, useState, useEffect } from 'react';
import { X, Minus, Plus, ShoppingCart, ShieldCheck, Package } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { useAppContext } from '../App';
import {
  getProductOptionGroups,
  defaultSelectedOptionsForProduct,
  snapSelectionToInStock,
  toOptionString,
  getAvailableStock,
} from '../lib/productOptions';
import { ProductAvailabilityBadge } from './ProductAvailabilityBadge';
import { lockPageScroll } from '../lib/pageScrollLock';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, options: Record<string, string>, qty: number) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose, onAddToCart }) => {
  const { theme } = useAppContext();
  const isLight = theme === 'light';
  const groupedVariants = useMemo(() => getProductOptionGroups(product), [product]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  const availableStock = useMemo(
    () => (product ? getAvailableStock(product, selectedOptions) : 0),
    [product, selectedOptions],
  );

  useEffect(() => {
    setSelectedOptions(product ? defaultSelectedOptionsForProduct(product) : {});
    setQuantity(1);
  }, [product, groupedVariants]);

  useEffect(() => {
    setQuantity((q) => Math.min(q, Math.max(1, availableStock || 1)));
  }, [availableStock]);

  // Lock page scroll while quick-view is open; modal panel scrolls instead
  useEffect(() => {
    if (!isOpen) return;
    return lockPageScroll();
  }, [isOpen]);

  if (!product || !isOpen) return null;

  const handleAddToCart = () => {
    if (!product || availableStock <= 0) {
      window.alert('This configuration is out of stock.');
      return;
    }
    const resolved = snapSelectionToInStock(product, groupedVariants, selectedOptions);
    onAddToCart(product, resolved, quantity);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Product quick view"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div
        className={`relative z-10 flex h-[min(92vh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] sm:rounded-[3rem] border shadow-2xl animate-in zoom-in-95 duration-500 ${
          isLight ? 'border-black/10' : 'border-white/10'
        }`}
        style={{ backgroundColor: 'var(--bb-surface)', color: 'var(--bb-text)' }}
        data-lenis-prevent
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-4 border-b p-4 sm:p-5 ${
            isLight ? 'border-black/10 bg-black/[0.03]' : 'border-white/5 bg-black/5'
          }`}
        >
          <div className="min-w-0">
            <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-[#CDA032]">
              Terminal Quick-View
            </h2>
            <p className="mt-1 truncate text-sm sm:text-lg font-black uppercase italic tracking-tight">
              {product.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-2xl border p-3 shadow-lg transition-all group ${
              isLight
                ? 'bg-black/[0.04] border-black/10 hover:bg-black hover:text-white'
                : 'bg-white/5 border-white/5 hover:bg-white hover:text-black'
            }`}
            aria-label="Close quick view"
          >
            <X size={20} className="transition-transform group-hover:rotate-90" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div
            className={`relative h-[26vh] max-h-[220px] w-full shrink-0 overflow-hidden md:h-auto md:max-h-none md:w-1/2 ${
              isLight
                ? 'bg-[#dfe1e6]'
                : 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-black'
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.12] md:opacity-10" />
            <img
              src={product.image || product.image_url || ''}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </div>

          <div
            className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-5 sm:p-8 md:w-1/2"
            style={{ WebkitOverflowScrolling: 'touch' }}
            data-lenis-prevent
          >
            <div className="space-y-6 pb-2">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-[#CDA032]/20 bg-[#CDA032]/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-[#CDA032]">
                    {product.category}
                  </span>
                </div>

                <h2 className="select-none text-2xl sm:text-3xl font-black uppercase italic leading-[0.95] tracking-tighter">
                  {product.name}
                </h2>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#CDA032]">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest line-through opacity-30">
                    {formatCurrency(product.price * 1.2)}
                  </span>
                </div>
                {groupedVariants.length > 0 && (
                  <p
                    className="text-[10px] font-black uppercase tracking-[0.25em] leading-relaxed"
                    style={{ color: 'var(--bb-muted)' }}
                  >
                    {groupedVariants
                      .map((g) => {
                        const sel = selectedOptions[g.name]?.trim();
                        return sel ? `${g.name}: ${sel}` : null;
                      })
                      .filter(Boolean)
                      .join(' · ') || 'Choose options below'}
                  </p>
                )}
              </div>

              <p
                className="border-l-2 border-[#CDA032]/30 pl-5 text-sm font-medium italic leading-relaxed"
                style={{ color: 'var(--bb-muted)' }}
              >
                {product.description}
              </p>

              <div className="space-y-5">
                {groupedVariants.length === 0 ? (
                  <p
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: 'var(--bb-muted)' }}
                  >
                    No color or storage options for this listing — open the product page for full
                    details.
                  </p>
                ) : null}
                {groupedVariants.map((variant) => (
                  <div key={variant.name} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label
                        className="text-[9px] font-black uppercase tracking-[0.3em]"
                        style={{ color: 'var(--bb-muted)' }}
                      >
                        {variant.name}
                      </label>
                      {selectedOptions[variant.name] && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#CDA032]">
                          {selectedOptions[variant.name]}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {variant.options.map((option, optIdx) => {
                        const opt = toOptionString(option);
                        const ol = opt.toLowerCase();
                        const trialOpts = product
                          ? snapSelectionToInStock(product, groupedVariants, {
                              ...selectedOptions,
                              [variant.name]: opt,
                            })
                          : selectedOptions;
                        const optDisabled = product
                          ? getAvailableStock(product, trialOpts) <= 0
                          : false;
                        return (
                          <button
                            key={`${variant.name}-${optIdx}-${opt}`}
                            type="button"
                            disabled={optDisabled}
                            onClick={() => {
                              if (!product || optDisabled) return;
                              setSelectedOptions((prev) =>
                                snapSelectionToInStock(product, groupedVariants, {
                                  ...prev,
                                  [variant.name]: opt,
                                }),
                              );
                            }}
                            className={`group relative rounded-2xl border px-4 sm:px-5 py-2.5 text-[9px] sm:text-[11px] font-black transition-all duration-300 ${
                              optDisabled
                                ? 'cursor-not-allowed border-black/10 opacity-35'
                                : selectedOptions[variant.name] === opt
                                  ? 'border-[#CDA032] bg-[#CDA032] text-black shadow-2xl shadow-[#CDA032]/20'
                                  : isLight
                                    ? 'border-black/15 bg-zinc-100 text-black/90 shadow-sm hover:border-black/25 hover:bg-zinc-200'
                                    : 'border-[color:var(--bb-border)] bg-[color:var(--bb-surface-2)] text-[color:var(--bb-text)] opacity-75 hover:opacity-100'
                            }`}
                          >
                            {variant.name === 'Color' ? (
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`h-3 w-3 rounded-full border shadow-sm ${
                                    selectedOptions[variant.name] === opt
                                      ? 'border-black/20'
                                      : 'border-white/10'
                                  }`}
                                  style={{
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
                                                : ol === 'yellow'
                                                  ? '#eab308'
                                                  : ol === 'purple'
                                                    ? '#a855f7'
                                                    : ol === 'pink'
                                                      ? '#ec4899'
                                                      : ol === 'gray' || ol === 'grey'
                                                        ? '#6b7280'
                                                        : ol === 'silver'
                                                          ? '#9ca3af'
                                                          : ol === 'gold' || ol === 'golden'
                                                            ? '#f59e0b'
                                                            : '#6b7280',
                                  }}
                                />
                                {opt}
                              </div>
                            ) : (
                              opt
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <ProductAvailabilityBadge available={availableStock} isLight={isLight} />

                <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row">
                  <div
                    className={`flex items-center justify-between gap-8 rounded-2xl border px-5 py-3.5 sm:justify-center ${
                      isLight ? 'bg-zinc-100 border-black/12' : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className={`p-1 transition-colors ${
                        isLight
                          ? 'text-black/40 hover:text-[#CDA032]'
                          : 'text-white/20 hover:text-[#CDA032]'
                      }`}
                    >
                      <Minus size={20} />
                    </button>
                    <span
                      className={`w-8 text-center text-xl font-black tabular-nums ${
                        isLight ? 'text-black' : 'text-white'
                      }`}
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.min(q + 1, Math.max(1, availableStock)))
                      }
                      disabled={quantity >= availableStock}
                      className={`p-1 transition-colors disabled:pointer-events-none disabled:opacity-30 ${
                        isLight
                          ? 'text-black/40 hover:text-[#CDA032]'
                          : 'text-white/20 hover:text-[#CDA032]'
                      }`}
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={availableStock <= 0}
                    className="group flex flex-1 items-center justify-center gap-4 rounded-2xl bg-white py-4 text-[11px] font-black uppercase tracking-[0.35em] text-black shadow-2xl transition-all hover:bg-[#CDA032] hover:text-black active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <span className="transition-transform group-hover:scale-125">
                      <ShoppingCart size={18} />
                    </span>
                    {availableStock <= 0 ? 'Out of stock' : 'Authorize Purchase'}
                  </button>
                </div>

                <div
                  className={`flex flex-wrap gap-6 border-t pt-5 opacity-30 ${
                    isLight ? 'border-black/10 text-black' : 'border-white/5 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[#CDA032]" />
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      2 Month Warranty
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-[#CDA032]" />
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      Express Deploy
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
