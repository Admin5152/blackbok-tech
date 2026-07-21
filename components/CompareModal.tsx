import React, { useState } from 'react';
import { X, ShoppingCart, Trash2, CheckCircle2, Scale, Info, Plus, Search, ArrowLeft, GitCompare } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';

interface CompareModalProps {
  products: Product[];
  allProducts: Product[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onAdd: (id: string) => void;
  onAddToCart: (p: Product) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  products, allProducts, isOpen, onClose, onRemove, onAdd, onAddToCart
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDevices, setShowAddDevices] = useState(false);

  if (!isOpen) return null;

  const availableProducts = allProducts.filter(p =>
    !products.find(cp => cp.id === p.id) &&
    (searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-12">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={onClose} />

      <div className="relative w-full max-w-[1440px] bg-black border border-white/10 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-black">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white hover:text-black rounded-full transition-all border border-white/5"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black">
              <GitCompare size={20} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-serif-luxury font-black italic uppercase tracking-tighter">Compare from shop</h2>
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/20 italic">{products.length} products selected</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddDevices(!showAddDevices)}
              className="px-4 py-2 bg-[#B38B21] text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-xl flex items-center gap-2 hover:bg-[#B38B21]/90 transition-colors"
            >
              <Plus size={14} /> {showAddDevices ? 'Done' : 'Add products'}
            </button>
            <button onClick={onClose} className="p-4 bg-white/5 hover:bg-white hover:text-black rounded-full transition-all border border-white/10">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Add Devices Section */}
        {showAddDevices && (
          <div className="border-b border-white/5 bg-[#0a0a0a] p-6">
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search devices to compare..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#B38B21] transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
              {availableProducts.slice(0, 8).map(p => (
                <button
                  key={p.id}
                  onClick={() => onAdd(p.id)}
                  className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-[#B38B21] transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <img src={p.image} alt={p.name} className="w-8 h-8 object-contain" />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">{p.name}</p>
                      <p className="text-[9px] text-white/40">{formatCurrency(p.price)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-3 md:p-6 bb-scrollbar">
          {products.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10 py-40">
              <Info size={64} className="mb-8" />
              <p className="text-xs font-black uppercase tracking-[0.5em] italic">Select products to compare.</p>
            </div>
          ) : (
            <>
              {/* Desktop side-by-side comparison */}
              <div className="hidden lg:block">
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {products.map((p) => (
                    <div key={p.id} className="flex-1 min-w-[220px] max-w-[260px]">
                      <div className="bg-[#050505] border border-white/10 rounded-2xl overflow-hidden h-full flex flex-col">
                        {/* Product Header */}
                        <div className="relative p-3 border-b border-white/5 bg-black">
                          <button
                            onClick={() => onRemove(p.id)}
                            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                            aria-label="Remove from compare"
                          >
                            <X size={14} />
                          </button>
                          <div className="text-center space-y-1.5">
                            <div className="w-14 h-14 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden mx-auto mb-2">
                              <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                            </div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wide line-clamp-2">{p.name}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">{p.category}</p>
                            <p className="text-base font-black text-white">{formatCurrency(p.price)}</p>
                          </div>
                        </div>

                        {/* Product Details */}
                        <div className="p-3 space-y-2.5">
                          <div className="space-y-2">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Price</h4>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-base font-black text-white break-words">{formatCurrency(p.price)}</span>
                              {products.length > 1 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {products.map(other => {
                                    if (other.id === p.id) return null;
                                    const priceDiff = other.price - p.price;
                                    return (
                                      <div key={other.id} className="flex-shrink-0">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${priceDiff > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                                          }`}>
                                          {priceDiff > 0 ? '+' : '-'}{formatCurrency(Math.abs(priceDiff))}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Highlights</h4>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const bestPrice = Math.min(...products.map(p => p.price));
                                const bestStock = products.filter(p => p.stock > 0).length;
                                const bestRating = Math.max(...products.map(p => p.rating || 0));

                                const isBestPrice = p.price === bestPrice;
                                const isBestStock = p.stock > 0 && bestStock === 1;
                                const isBestRating = p.rating === bestRating;

                                const wins = [];
                                if (isBestPrice) wins.push('Best Price');
                                if (isBestStock) wins.push('In Stock');
                                if (isBestRating) wins.push('Top Rated');

                                return (
                                  <div className="flex gap-1">
                                    {wins.map((win, i) => (
                                      <span key={i} className="px-2 py-1 bg-[#B38B21] text-black text-[8px] font-black uppercase tracking-widest rounded-full">
                                        {win}
                                      </span>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Status</h4>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${p.stock > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                {p.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Rating</h4>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <div key={i} className={`w-2 h-2 rounded-full ${i < Math.floor(p.rating || 4) ? 'bg-[#B38B21]' : 'bg-white/10'
                                    }`} />
                                ))}
                              </div>
                              <span className="text-sm text-white/60">({p.reviewCount || 0})</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Key specs</h4>
                            <div className="space-y-1.5">
                              {p.specs?.slice(0, 4).map((spec, i) => (
                                <div key={i} className="text-[10px] text-white/70 bg-white/5 rounded-lg px-2.5 py-1.5">
                                  {spec}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Included</h4>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-white/10" />
                                <span className="text-[10px] text-white/60">Free Shipping</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-white/10" />
                                <span className="text-[10px] text-white/60">2 Month Warranty</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-white/10" />
                                <span className="text-[10px] text-white/60">Returns</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Performance</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-center">
                                <div className="text-[10px] text-white/30">Speed</div>
                                <div className="text-sm font-black text-white">Fast</div>
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] text-white/30">Quality</div>
                                <div className="text-sm font-black text-white">Premium</div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => onAddToCart(p)}
                              className="w-full py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.35em] rounded-2xl active:scale-[0.98] transition-transform"
                            >
                              <ShoppingCart size={14} className="mr-2" />
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile comparison cards */}
              <div className="lg:hidden space-y-4">
                {products.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-[#050505] overflow-hidden">
                    <div className="p-4">
                      {/* Header with image and basic info */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-20 h-20 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-black uppercase tracking-widest italic break-words">{p.name}</h3>
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic mt-1">{p.category}</p>
                            </div>
                            <button
                              onClick={() => onRemove(p.id)}
                              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/60 flex-shrink-0"
                              aria-label="Remove from compare"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Price and Status */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.35em] text-white/30">Price</p>
                          <p className="text-sm font-black italic tracking-tighter mt-1 break-words">{formatCurrency(p.price)}</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.35em] text-white/30">Status</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/60 italic mt-1">
                            {p.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                          </p>
                        </div>
                      </div>

                      {/* Core specs */}
                      <div className="rounded-xl bg-white/5 border border-white/10 p-3 mb-4">
                        <p className="text-[8px] font-black uppercase tracking-[0.35em] text-white/30">Core specs</p>
                        <div className="mt-2 space-y-2">
                          {p.specs?.slice(0, 2).map((spec, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-white/40 mt-1.5 shrink-0" />
                              <p className="text-[9px] font-bold text-white/60 leading-snug break-words">{spec}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Add to Cart Button */}
                      <div className="p-3 border-t border-white/10 bg-white/5 -mx-4 -mb-4 rounded-b-2xl">
                        <button
                          onClick={() => onAddToCart(p)}
                          className="w-full py-3 bg-white text-black text-[9px] font-black uppercase tracking-[0.35em] rounded-xl active:scale-[0.98] transition-transform"
                        >
                          <ShoppingCart size={12} className="mr-2 inline" />
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed comparison table */}
              <div className="mt-6 p-4 bg-[#0a0a0a] border border-white/10 rounded-2xl">
                <h3 className="text-base font-black uppercase tracking-wider text-white mb-4">Detailed Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-2 text-[9px] font-black uppercase tracking-widest text-white/30">Feature</th>
                        {products.map(p => (
                          <th key={p.id} className="p-2 text-center min-w-[120px]">
                            <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden mx-auto mb-1">
                              <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="text-xs font-black text-white uppercase tracking-wider truncate">{p.name}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5">
                        <td className="p-2 text-[9px] font-black uppercase tracking-widest text-white/30">Price</td>
                        {products.map(p => (
                          <td key={p.id} className="p-2 text-center">
                            <span className="text-xs font-black text-white">{formatCurrency(p.price)}</span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="p-2 text-[9px] font-black uppercase tracking-widest text-white/30">Stock</td>
                        {products.map(p => (
                          <td key={p.id} className="p-2 text-center">
                            <span className={`px-1 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${p.stock > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                              {p.stock > 0 ? 'Available' : 'Out of Stock'}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="p-2 text-[9px] font-black uppercase tracking-widest text-white/30">Rating</td>
                        {products.map(p => (
                          <td key={p.id} className="p-2 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < Math.floor(p.rating || 4) ? 'bg-[#B38B21]' : 'bg-white/10'
                                    }`} />
                                ))}
                              </div>
                              <span className="text-xs text-white/60">({p.reviewCount || 0})</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="p-2 text-[9px] font-black uppercase tracking-widest text-white/30">Category</td>
                        {products.map(p => (
                          <td key={p.id} className="p-2 text-center">
                            <span className="text-xs text-white/60">{p.category}</span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-2 text-[9px] font-black uppercase tracking-widest text-white/30">Best For</td>
                        {products.map(p => (
                          <td key={p.id} className="p-2 text-center">
                            <span className="text-xs text-white/60">
                              {p.category === 'iPhone' ? 'Mobile Users' :
                                p.category === 'Laptop' ? 'Professionals' :
                                  p.category === 'Gaming' ? 'Gamers' :
                                    p.category === 'Accessories' ? 'General Use' : 'Tech Enthusiasts'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
