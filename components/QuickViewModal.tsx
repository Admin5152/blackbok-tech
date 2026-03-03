
import React, { useState } from 'react';
import { X, Minus, Plus, ShoppingCart, Star, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, options: Record<string, string>, qty: number) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose, onAddToCart }) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  if (!product || !isOpen) return null;

  const handleAddToCart = () => {
    onAddToCart(product, selectedOptions, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-5xl border border-white/10 rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 max-h-[90vh] md:max-h-[80vh]"
        style={{ backgroundColor: 'var(--bb-surface)', color: 'var(--bb-text)' }}
      >
        {/* Header spans full width */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-white/5 bg-black/5">
          <div className="min-w-0">
            <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.35em] text-white/60">
              Quick View
            </h2>
            <p className="mt-1 text-sm sm:text-base font-semibold truncate">
              {product.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white hover:text-black rounded-full transition-all border border-white/5"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white hover:text-black rounded-full transition-all border border-white/5"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Two-column content: image left, details right */}
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Image Column */}
          <div className="w-full md:w-1/2 bg-black flex items-center justify-center p-6 sm:p-8 md:p-10">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>

          {/* Info Column */}
          <div className="w-full md:w-1/2 p-4 sm:p-6 md:p-8 overflow-y-auto no-scrollbar space-y-4 sm:space-y-5">
            <div className="space-y-2 sm:space-y-3">
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">
                {product.category}
              </p>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tighter uppercase italic leading-tight">
                {product.name}
              </h2>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <span className="text-lg sm:text-xl md:text-2xl font-black">
                  {formatCurrency(product.price)}
                </span>
                <div className="flex items-center gap-1">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-xs sm:text-sm font-bold text-white/60">
                    {product.rating || '4.5'} ({product.reviewCount || '0'})
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-white/40 leading-relaxed font-light italic">
              {product.description}
            </p>

            <div className="space-y-4 sm:space-y-5">
              {product.variants && product.variants.map(variant => (
                <div key={variant.name} className="space-y-2 sm:space-y-3">
                  <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/30">
                    {variant.name}
                  </label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {variant.options.map(option => (
                      <button
                        key={option}
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [variant.name]: option }))}
                        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border text-[8px] sm:text-[10px] font-black transition-all ${
                          selectedOptions[variant.name] === option
                            ? 'border-[#CDA032] bg-[#CDA032]/20 text-[#CDA032] shadow-lg shadow-[#CDA032]/20'
                            : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                        }`}
                      >
                        {variant.name === 'Color' ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`w-3 h-3 rounded-full border-2 ${
                                selectedOptions[variant.name] === option ? 'border-white' : 'border-gray-400'
                              }`}
                              style={{
                                backgroundColor: option.toLowerCase() === 'black' ? '#000' :
                                                option.toLowerCase() === 'white' ? '#fff' :
                                                option.toLowerCase() === 'red' ? '#ef4444' :
                                                option.toLowerCase() === 'blue' ? '#3b82f6' :
                                                option.toLowerCase() === 'green' ? '#10b981' :
                                                option.toLowerCase() === 'yellow' ? '#eab308' :
                                                option.toLowerCase() === 'purple' ? '#a855f7' :
                                                option.toLowerCase() === 'pink' ? '#ec4899' :
                                                option.toLowerCase() === 'gray' || option.toLowerCase() === 'grey' ? '#6b7280' :
                                                option.toLowerCase() === 'silver' ? '#9ca3af' :
                                                option.toLowerCase() === 'gold' || option.toLowerCase() === 'golden' ? '#f59e0b' :
                                                '#6b7280'
                              }}
                            />
                            <span className="text-[9px] sm:text-xs">{option}</span>
                          </div>
                        ) : (
                          option
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 pt-2">
                <div className="flex items-center gap-4 sm:gap-5 bg-white/5 border border-white/10 rounded-2xl px-4 sm:px-5 py-3 w-full sm:w-auto justify-between sm:justify-center">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-white/40 hover:text-white">
                    <Minus size={16} />
                  </button>
                  <span className="text-base sm:text-lg font-black w-6 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="text-white/40 hover:text-white">
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 w-full py-3 sm:py-4 bg-white text-black font-black text-[8px] sm:text-[10px] rounded-2xl shadow-xl hover:bg-white/90 active:scale-[0.98] transition-all uppercase tracking-[0.3em] flex items-center justify-center gap-2 sm:gap-3"
                >
                  <ShoppingCart size={14} /> Add to Bag
                </button>
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-white/5">
                <ShieldCheck size={18} className="text-white/40" />
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
                  BlackBox Elite Warranty // Verified Hardware
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
