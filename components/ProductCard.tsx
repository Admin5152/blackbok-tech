import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ShoppingCart, Heart, Eye, Star, Scale } from 'lucide-react';
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
  const frameBorder = theme === 'dark' ? 'border-white/10' : 'border-black/10';
  const [selectedColor, setSelectedColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleAddToCartWithColor = () => {
    const options = selectedColor ? { Color: selectedColor } : {};
    onAddToCart(product, options, 1);
  };

  return (
    <div
      className={`group bg-[#080808] border rounded-xl overflow-hidden transition-all duration-700 flex flex-col h-full cursor-pointer relative ${isCompared ? 'border-[#CDA032]' : 'border-white/[0.03] hover:border-[#CDA032]/20 shadow-2xl'}`}
    >
      {/* Corner frame borders */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className={`absolute top-2 left-2 w-8 h-8 border-t border-l rounded-tl-lg transition-colors ${frameBorder}`} />
        <div className={`absolute top-2 right-2 w-8 h-8 border-t border-r rounded-tr-lg transition-colors ${frameBorder}`} />
        <div className={`absolute bottom-2 left-2 w-8 h-8 border-b border-l rounded-bl-lg transition-colors ${frameBorder}`} />
        <div className={`absolute bottom-2 right-2 w-8 h-8 border-b border-r rounded-br-lg transition-colors ${frameBorder}`} />
      </div>
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
        {product.new && (
          <span className="bg-white text-black text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg">NEW</span>
        )}
        {product.discount && (
          <span className="bg-[#CDA032] text-black text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg italic">-{product.discount}%</span>
        )}
      </div>

      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
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

      <Link to="/product/$productId" params={{ productId: product.id } as any} className="flex-1 flex flex-col">
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

          {/* Color Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-white/30 font-medium">Color</span>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="text-[8px] text-[#CDA032] hover:text-[#CDA032]/80 transition-colors"
              >
                {showColorPicker ? 'Hide' : 'Choose'}
              </button>
            </div>
            {showColorPicker && (
              <div className="flex flex-wrap gap-1.5">
                {['Black', 'White', 'Red', 'Blue', 'Green', 'Purple', 'Pink', 'Gold', 'Silver'].map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${selectedColor === color ? 'border-white scale-110' : 'border-gray-400 hover:border-gray-300'
                      }`}
                    style={{
                      backgroundColor: color.toLowerCase() === 'black' ? '#000' :
                        color.toLowerCase() === 'white' ? '#fff' :
                          color.toLowerCase() === 'red' ? '#ef4444' :
                            color.toLowerCase() === 'blue' ? '#3b82f6' :
                              color.toLowerCase() === 'green' ? '#10b981' :
                                color.toLowerCase() === 'purple' ? '#a855f7' :
                                  color.toLowerCase() === 'pink' ? '#ec4899' :
                                    color.toLowerCase() === 'gold' ? '#f59e0b' :
                                      color.toLowerCase() === 'silver' ? '#9ca3af' :
                                        '#6b7280'
                    }}
                  />
                ))}
              </div>
            )}
            {selectedColor && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full border border-white/30"
                  style={{
                    backgroundColor: selectedColor.toLowerCase() === 'black' ? '#000' :
                      selectedColor.toLowerCase() === 'white' ? '#fff' :
                        selectedColor.toLowerCase() === 'red' ? '#ef4444' :
                          selectedColor.toLowerCase() === 'blue' ? '#3b82f6' :
                            selectedColor.toLowerCase() === 'green' ? '#10b981' :
                              selectedColor.toLowerCase() === 'purple' ? '#a855f7' :
                                selectedColor.toLowerCase() === 'pink' ? '#ec4899' :
                                  selectedColor.toLowerCase() === 'gold' ? '#f59e0b' :
                                    selectedColor.toLowerCase() === 'silver' ? '#9ca3af' :
                                      '#6b7280'
                  }}
                />
                <span className="text-[8px] text-white/60">{selectedColor}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-black text-white tracking-tighter">{formatCurrency(product.price)}</span>
              {product.discount && (
                <span className="text-[8px] text-white/10 line-through font-bold">
                  {formatCurrency(product.price * (1 + product.discount / 100))}
                </span>
              )}
            </div>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToCartWithColor(); }}
              className="w-full py-3 border border-white/[0.02] hover:border-[#CDA032] group-hover:bg-[#CDA032]/5 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2"
            >
              <ShoppingCart size={13} /> ADD TO CART
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
};
