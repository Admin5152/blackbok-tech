
import React, { useMemo, useState, useEffect } from 'react';
import { X, Minus, Plus, ShoppingCart, Star, ShieldCheck, ArrowLeft, Package } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { getProductOptionGroups, initialSelectedFromGroups, toOptionString } from '../lib/productOptions';
import { useAppContext } from '../App';

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

  useEffect(() => {
    setSelectedOptions(initialSelectedFromGroups(groupedVariants));
    setQuantity(1);
  }, [product, groupedVariants]);

  if (!product || !isOpen) return null;

  const handleAddToCart = () => {
    const missing = groupedVariants.filter((g) => !selectedOptions[g.name]?.trim());
    if (missing.length > 0) {
      window.alert(`Please select: ${missing.map((g) => g.name).join(', ')}`);
      return;
    }
    onAddToCart(product, selectedOptions, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-5xl border rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 max-h-[95vh] md:max-h-[85vh] ${
          isLight ? 'border-black/10' : 'border-white/10'
        }`}
        style={{ backgroundColor: 'var(--bb-surface)', color: 'var(--bb-text)' }}
      >
        {/* Header - Full Width */}
        <div
          className={`flex items-center justify-between gap-4 p-4 sm:p-6 border-b shrink-0 ${
            isLight ? 'border-black/10 bg-black/[0.03]' : 'border-white/5 bg-black/5'
          }`}
        >
          <div className="min-w-0">
            <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-[#CDA032]">
              Terminal Quick-View
            </h2>
            <p className="mt-1 text-sm sm:text-lg font-black tracking-tight truncate uppercase italic">
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-3 rounded-2xl transition-all border shadow-lg group ${
              isLight
                ? 'bg-black/[0.04] border-black/10 hover:bg-black hover:text-white'
                : 'bg-white/5 border-white/5 hover:bg-white hover:text-black'
            }`}
          >
            <X size={20} className="transition-transform group-hover:rotate-90" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Visual Data Module (Image) */}
          <div className="w-full md:w-1/2 bg-gradient-to-br from-black/20 to-transparent flex items-center justify-center p-6 sm:p-12 shrink-0 h-[30vh] md:h-auto overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
            <img
              src={product.image || product.image_url || ''}
              alt={product.name}
              className="max-w-full max-h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-700"
            />
          </div>

          {/* Technical Specifications (Info) */}
          <div className="w-full md:w-1/2 p-6 sm:p-10 overflow-y-auto custom-scrollbar space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-[#CDA032]/10 text-[#CDA032] text-[8px] font-black uppercase tracking-widest rounded-full border border-[#CDA032]/20">
                  {product.category}
                </span>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                    isLight ? 'bg-black/[0.04] border-black/10' : 'bg-white/5 border-white/5'
                  }`}
                >
                  <Star size={10} className="fill-[#CDA032] text-[#CDA032]" />
                  <span className="text-[9px] font-black" style={{ color: 'var(--bb-muted)' }}>
                    {product.rating || '4.5'}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase italic leading-[0.9] select-none">
                {product.name}
              </h2>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#CDA032]">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest line-through">
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

            <p className="text-sm sm:text-base font-medium leading-relaxed italic border-l-2 border-[#CDA032]/30 pl-6" style={{ color: 'var(--bb-muted)' }}>
              {product.description}
            </p>

            {/* Variants: color, storage, RAM (from chips, legacy groups, or SKU rows) */}
            <div className="space-y-6">
              {groupedVariants.length === 0 ? (
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--bb-muted)' }}>
                  No color or storage options for this listing — open the product page for full details.
                </p>
              ) : null}
              {groupedVariants.map(variant => (
                <div key={variant.name} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: 'var(--bb-muted)' }}>
                      {variant.name}
                    </label>
                    {selectedOptions[variant.name] && (
                      <span className="text-[9px] font-black uppercase text-[#CDA032] tracking-widest">
                            {selectedOptions[variant.name]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variant.options.map((option, optIdx) => {
                      const opt = toOptionString(option);
                      const ol = opt.toLowerCase();
                      return (
                      <button
                        key={`${variant.name}-${optIdx}-${opt}`}
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [variant.name]: opt }))}
                        className={`group relative px-4 sm:px-6 py-3 rounded-2xl border text-[9px] sm:text-[11px] font-black transition-all duration-300 ${selectedOptions[variant.name] === opt
                          ? 'border-[#CDA032] bg-[#CDA032] text-black shadow-2xl shadow-[#CDA032]/20'
                          : isLight
                            ? 'border-black/15 bg-zinc-100 text-black/90 shadow-sm hover:border-black/25 hover:bg-zinc-200'
                            : 'border-[color:var(--bb-border)] bg-[color:var(--bb-surface-2)] text-[color:var(--bb-text)] opacity-75 hover:opacity-100'
                          }`}
                      >
                        {variant.name === 'Color' ? (
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-3 h-3 rounded-full border shadow-sm ${selectedOptions[variant.name] === opt ? 'border-black/20' : 'border-white/10'}`}
                              style={{
                                backgroundColor: ol === 'black' ? '#000' :
                                  ol === 'white' ? '#fff' :
                                    ol === 'red' ? '#ef4444' :
                                      ol === 'blue' ? '#3b82f6' :
                                        ol === 'green' ? '#10b981' :
                                          ol === 'yellow' ? '#eab308' :
                                            ol === 'purple' ? '#a855f7' :
                                              ol === 'pink' ? '#ec4899' :
                                                ol === 'gray' || ol === 'grey' ? '#6b7280' :
                                                  ol === 'silver' ? '#9ca3af' :
                                                    ol === 'gold' || ol === 'golden' ? '#f59e0b' :
                                                      '#6b7280'
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

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch gap-4 pt-6">
                <div
                  className={`flex items-center justify-between sm:justify-center gap-8 rounded-2xl border px-6 py-4 ${
                    isLight ? 'bg-zinc-100 border-black/12' : 'bg-white/5 border-white/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className={`p-1 transition-colors ${
                      isLight ? 'text-black/40 hover:text-[#CDA032]' : 'text-white/20 hover:text-[#CDA032]'
                    }`}
                  >
                    <Minus size={20} />
                  </button>
                  <span
                    className={`text-xl font-black w-8 text-center tabular-nums ${
                      isLight ? 'text-black' : 'text-white'
                    }`}
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className={`p-1 transition-colors ${
                      isLight ? 'text-black/40 hover:text-[#CDA032]' : 'text-white/20 hover:text-[#CDA032]'
                    }`}
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-5 bg-white text-black font-black text-[11px] rounded-2xl shadow-2xl hover:bg-[#CDA032] hover:text-black transition-all uppercase tracking-[0.4em] flex items-center justify-center gap-4 active:scale-95 group"
                >
                  <div className="transition-transform group-hover:scale-125">
                    <ShoppingCart size={18} />
                  </div>
                  Authorize Purchase
                </button>
              </div>

              {/* Quality Flags */}
              <div
                className={`pt-8 border-t flex flex-wrap gap-6 opacity-30 ${
                  isLight ? 'border-black/10 text-black' : 'border-white/5 text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#CDA032]" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Global Warranty</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-[#CDA032]" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Express Deploy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
