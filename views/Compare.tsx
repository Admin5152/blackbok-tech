import React, { useMemo, useState } from 'react';
import { Plus, Search, Info, Trash2, ShoppingCart, GitCompare } from 'lucide-react';
import { useAppContext } from '../App';
import { formatCurrency } from '../lib/utils';
import { PageBackButton } from '../components/PageBackButton';
import {
  buildCompareWinsByProductId,
  COMPARE_PICKER_PAGE_SIZE,
  filterComparePickerProducts,
  resolveCompareProducts,
} from '../lib/compareProducts';

export const Compare: React.FC = () => {
  const { products: allProducts, compareIds, onToggleCompare, onAddToCart, theme } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const isLight = theme === 'light';

  const compareProducts = useMemo(
    () => resolveCompareProducts(allProducts, compareIds),
    [allProducts, compareIds],
  );

  const compareWinsById = useMemo(
    () => buildCompareWinsByProductId(compareProducts),
    [compareProducts],
  );

  const availableProducts = useMemo(
    () => filterComparePickerProducts(allProducts, compareIds, searchTerm),
    [allProducts, compareIds, searchTerm],
  );

  const containerClass = isLight ? 'bg-white border-black/10' : 'bg-[var(--bb-surface)] border-[var(--bb-border)]';
  const textMuted = 'text-[color:var(--bb-muted)]';
  const cardBg = isLight ? 'bg-black/[0.02]' : 'bg-white/[0.02]';

  return (
    <div className="min-h-screen pt-24 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-[var(--bb-bg)] text-[var(--bb-text)]">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-6">
          <PageBackButton isLight={isLight} fallbackTo="/store" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 sm:mb-12">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center ${
                isLight ? 'bg-black text-white' : 'bg-[#CDA032] text-black'
              }`}
            >
              <GitCompare size={28} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight">Compare products</h1>
              <p className="text-sm text-[color:var(--bb-muted)] mt-1">
                Side-by-side specs and pricing for up to 4 items.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPanel((v) => !v)}
            className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-[0.98] ${
              showAddPanel
                ? 'bg-[#CDA032] text-black'
                : isLight
                  ? 'bg-black text-white hover:bg-black/85'
                  : 'bg-[var(--bb-surface)] border border-[var(--bb-border)] hover:border-[#CDA032]/40'
            }`}
          >
            <Plus size={16} />
            {showAddPanel ? 'Done adding' : 'Add products'}
          </button>
        </div>

        {showAddPanel && (
          <div className={`mb-10 p-6 sm:p-8 rounded-2xl border ${containerClass}`}>
            <div className="relative mb-6">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--bb-muted)]" />
              <input
                type="search"
                placeholder="Search products to compare…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-transparent border border-[var(--bb-border)] rounded-xl text-sm outline-none focus:border-[#CDA032] transition-colors"
              />
            </div>
            {availableProducts.length === 0 ? (
              <p className="text-sm text-[color:var(--bb-muted)]">No matching products found.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {availableProducts.slice(0, COMPARE_PICKER_PAGE_SIZE).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onToggleCompare(product.id)}
                    className={`p-3 sm:p-4 rounded-xl border transition-all text-left flex flex-col gap-3 group ${
                      isLight
                        ? 'border-black/8 hover:border-black/20 hover:bg-black/[0.03]'
                        : 'border-[var(--bb-border)] hover:border-[#CDA032]/40 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="aspect-square bg-black rounded-lg p-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <img
                        src={product.image || product.image_url || ''}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold leading-snug line-clamp-2 mb-1">{product.name}</p>
                      <p className="text-[10px] font-bold text-[#CDA032] tabular-nums">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {compareProducts.length === 0 ? (
          <div className="py-24 sm:py-32 rounded-2xl border border-dashed border-[var(--bb-border)] flex flex-col items-center justify-center text-center px-6">
            <Info size={40} className="mb-4 text-[color:var(--bb-muted)] opacity-60" />
            <p className="text-base font-bold mb-2">No products to compare yet</p>
            <p className={`text-sm max-w-md ${textMuted}`}>
              Add items from the shop using the scale icon on any product card, then open this page to
              compare them.
            </p>
            <button
              type="button"
              onClick={() => setShowAddPanel(true)}
              className="mt-6 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#CDA032] text-black"
            >
              Add products
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto pb-8 bb-scrollbar">
            <div className="flex gap-4 sm:gap-6 min-w-max px-1">
              {compareProducts.map((product) => {
                const wins = compareWinsById.get(product.id) ?? [];
                const inStock = (product.stock ?? 0) > 0;

                return (
                  <article
                    key={product.id}
                    className="w-[min(100vw-2rem,320px)] flex flex-col rounded-2xl border transition-shadow hover:shadow-lg"
                    style={{ borderColor: 'var(--bb-border)', backgroundColor: 'var(--bb-surface)' }}
                  >
                    <div className="p-6 border-b border-[var(--bb-border)] relative">
                      <button
                        type="button"
                        onClick={() => onToggleCompare(product.id)}
                        className="absolute top-4 right-4 p-2 rounded-full text-[color:var(--bb-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        aria-label={`Remove ${product.name} from compare`}
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="flex flex-col items-center text-center gap-4 pt-2">
                        <div className="w-28 h-28 rounded-2xl bg-black p-4 flex items-center justify-center">
                          <img
                            src={product.image || product.image_url || ''}
                            alt={product.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <h2 className="text-base font-bold leading-snug line-clamp-2">{product.name}</h2>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#CDA032] mt-1">
                            {product.category}
                          </p>
                        </div>
                        <p className="text-xl font-black tabular-nums">{formatCurrency(product.price)}</p>
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col gap-6">
                      {wins.length > 0 && (
                        <div>
                          <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textMuted}`}>
                            Highlights
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {wins.map((win) => (
                              <span
                                key={win.key}
                                className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                                  win.highlight
                                    ? 'bg-[#CDA032] text-black'
                                    : `${cardBg} border border-[var(--bb-border)]`
                                }`}
                              >
                                {win.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textMuted}`}>
                          Specifications
                        </h3>
                        {product.specs && product.specs.length > 0 ? (
                          <ul className="space-y-1.5">
                            {product.specs.slice(0, 4).map((spec) => (
                              <li
                                key={spec}
                                className={`px-3 py-2 rounded-lg text-[11px] font-medium ${cardBg} border border-[var(--bb-border)]`}
                              >
                                {spec}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={`text-xs ${textMuted}`}>No specifications listed.</p>
                        )}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className={textMuted}>Availability</span>
                          <span className="font-bold">{inStock ? 'In stock' : 'Out of stock'}</span>
                        </div>
                        {(product.rating ?? 0) > 0 && (
                          <div className="flex justify-between gap-2">
                            <span className={textMuted}>Rating</span>
                            <span className="font-bold tabular-nums">
                              {product.rating?.toFixed(1)} ({product.reviewCount ?? 0})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 pt-0 mt-auto">
                      <button
                        type="button"
                        onClick={() => onAddToCart(product)}
                        disabled={!inStock}
                        aria-label={inStock ? `Add ${product.name} to cart` : `${product.name} is out of stock`}
                        className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-[#CDA032] text-black hover:bg-[#B38B21] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ShoppingCart size={16} />
                        {inStock ? 'Add to cart' : 'Out of stock'}
                      </button>
                    </div>
                  </article>
                );
              })}

              {compareIds.length < 4 && (
                <button
                  type="button"
                  onClick={() => setShowAddPanel(true)}
                  className="w-[min(100vw-2rem,320px)] min-h-[280px] self-stretch rounded-2xl border border-dashed border-[var(--bb-border)] flex flex-col items-center justify-center gap-4 hover:border-[#CDA032]/50 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full border border-dashed border-[var(--bb-border)] flex items-center justify-center text-[color:var(--bb-muted)]">
                    <Plus size={28} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--bb-muted)]">
                    Add another product
                  </p>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
