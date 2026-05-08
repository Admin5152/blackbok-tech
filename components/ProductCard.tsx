import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ShoppingCart, Heart, Eye, Star, Scale, FileText } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { useAppContext } from '../App';

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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.variants?.forEach(v => {
      if (v.options.length > 0) {
        initial[v.name] = v.options[0];
      }
    });
    return initial;
  });

  const handleAddToCartWithOptions = () => {
    onAddToCart(product, selectedOptions, 1);
  };

  return (
    <div
      className={`group border rounded-xl overflow-hidden transition-all duration-700 flex flex-col h-full cursor-pointer relative ${isCompared ? 'border-[#CDA032]' : 'border-white/[0.03] hover:border-[#CDA032]/20 shadow-2xl'}`}
      style={{ backgroundColor: 'var(--bb-surface)' }}
    >
      {/* Corner frame borders */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className={`absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 rounded-bl-xl transition-colors ${theme === 'dark' ? 'border-white/20' : 'border-[#CDA032]/40'}`} />
        <div className={`absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 rounded-br-xl transition-colors ${theme === 'dark' ? 'border-white/20' : 'border-[#CDA032]/40'}`} />
      </div>
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
        {product.new && (
          <span className="bg-white text-black text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg">NEW</span>
        )}
        {product.discount && (
          <span className="bg-[#CDA032] text-black text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg italic">-{product.discount}%</span>
        )}
      </div>

      <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 opacity-100 translate-x-0">
        <button
          className={`transition-all p-2 backdrop-blur-xl rounded-full border border-white/5 hover:bg-[#CDA032] hover:text-black ${isWishlisted ? 'text-[#CDA032]' : 'text-white/40'}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWishlist(product.id); }}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={12} className={isWishlisted ? 'fill-[#CDA032]' : ''} />
        </button>
        <button
          className={`transition-all p-2 backdrop-blur-xl rounded-full border border-white/5 hover:bg-[#CDA032] hover:text-black ${isCompared ? 'text-[#CDA032]' : 'text-white/40'}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare(product.id); }}
          aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
        >
          <Scale size={12} />
        </button>
      </div>

      <Link to="/product/$productId" params={{ productId: product.id } as any} className="flex-1 flex flex-col relative z-10">
        <div className="relative h-32 bg-black rounded-t-2xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {product.discount && (
            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-full text-[8px] font-black">
              -{product.discount}%
            </div>
          )}

          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center p-4">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView(product); }}
              className="w-full py-2 bg-white text-black text-[7px] font-black uppercase tracking-[0.4em] rounded-xl transform translate-y-8 group-hover:translate-y-0 transition-all duration-500 shadow-2xl flex items-center justify-center gap-2"
            >
              <Eye size={10} /> QUICK VIEW
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 italic">{product.category}</p>
            <h3 className="text-[10px] font-black text-white leading-tight uppercase italic line-clamp-2 tracking-wide group-hover:text-[#CDA032] transition-colors">{product.name}</h3>
            <div className="flex items-center gap-1 pt-1">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={7} className={i < Math.floor(product.rating || 4) ? 'fill-[#CDA032] text-[#CDA032]' : 'text-white/5'} />
                ))}
              </div>
              <span className="text-[8px] text-white/10 font-black italic">({product.reviewCount || 0})</span>
            </div>
          </div>

          {/* Variant Selection */}
          <div className="space-y-3">
            {product.variants?.map(variant => {
              const selectedValue = selectedOptions[variant.name] || '';
              const isColor = variant.name.toLowerCase() === 'color';

              return (
                <div key={variant.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-white/50 font-medium italic">{variant.name}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                      {variant.options.map(opt => (
                        <button
                          key={opt}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedOptions(prev => ({ ...prev, [variant.name]: opt }));
                          }}
                          className={isColor
                            ? `w-5 h-5 rounded-full border-2 transition-all ${selectedValue === opt ? 'border-white scale-110' : 'border-gray-400 hover:border-gray-300'}`
                            : `px-2 py-0.5 rounded text-[8px] font-black tracking-widest transition-all border ${selectedValue === opt ? 'border-[#CDA032] bg-[#CDA032]/20 text-[#CDA032]' : 'border-white/20 hover:border-white/40 text-white/60 hover:text-white'}`
                          }
                          style={isColor ? {
                            backgroundColor: opt.toLowerCase() === 'black' ? '#000' :
                              opt.toLowerCase() === 'white' ? '#fff' :
                                opt.toLowerCase() === 'red' ? '#ef4444' :
                                  opt.toLowerCase() === 'blue' ? '#3b82f6' :
                                    opt.toLowerCase() === 'green' ? '#10b981' :
                                      opt.toLowerCase() === 'purple' ? '#a855f7' :
                                        opt.toLowerCase() === 'pink' ? '#ec4899' :
                                          opt.toLowerCase() === 'gold' ? '#f59e0b' :
                                            opt.toLowerCase() === 'silver' ? '#9ca3af' :
                                              opt.toLowerCase().includes('space gray') ? '#4B4B4D' :
                                                opt.toLowerCase().includes('midnight') ? '#1C2938' :
                                                  '#6b7280'
                          } : {}}
                        >
                          {!isColor && opt}
                        </button>
                      ))}
                    </div>
                  {selectedValue && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {isColor && (
                        <div
                          className="w-3 h-3 rounded-full border border-white/30"
                          style={{
                            backgroundColor: selectedValue.toLowerCase() === 'black' ? '#000' :
                              selectedValue.toLowerCase() === 'white' ? '#fff' :
                                selectedValue.toLowerCase() === 'red' ? '#ef4444' :
                                  selectedValue.toLowerCase() === 'blue' ? '#3b82f6' :
                                    selectedValue.toLowerCase() === 'green' ? '#10b981' :
                                      selectedValue.toLowerCase() === 'purple' ? '#a855f7' :
                                        selectedValue.toLowerCase() === 'pink' ? '#ec4899' :
                                          selectedValue.toLowerCase() === 'gold' ? '#f59e0b' :
                                            selectedValue.toLowerCase() === 'silver' ? '#9ca3af' :
                                              selectedValue.toLowerCase().includes('space gray') ? '#4B4B4D' :
                                                selectedValue.toLowerCase().includes('midnight') ? '#1C2938' :
                                                  '#6b7280'
                          }}
                        />
                      )}
                      <span className="text-[8px] text-white/60 font-bold tracking-wider">{selectedValue}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-black text-white tracking-tighter">{formatCurrency(product.price)}</span>
              {product.discount && (
                <span className="text-[8px] text-white/30 line-through font-bold">
                  {formatCurrency(product.price * (1 + product.discount / 100))}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToCartWithOptions(); }}
                className="w-full py-4 bg-[#CDA032] hover:bg-[#B38B21] text-black rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[#CDA032]/20 active:scale-95"
              >
                <ShoppingCart size={13} strokeWidth={3} /> ADD TO CART
              </button>

              <Link
                to="/product/$productId"
                params={{ productId: product.id } as any}
                onClick={(e) => e.stopPropagation()}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[8px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 active:scale-95"
              >
                <FileText size={11} className="text-[#CDA032]" /> VIEW DETAILS
              </Link>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};
