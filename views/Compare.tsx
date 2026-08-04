import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Info, Trash2, ShoppingCart, GitCompare, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAppContext } from '../App';
import { formatCurrency } from '../lib/utils';
import { PageBackButton } from '../components/PageBackButton';
import {
  buildCompareRows,
  buildCompareWinsByProductId,
  buildForkForProduct,
  buildRuling,
  COMPARE_MAX_ITEMS,
  COMPARE_PICKER_PAGE_SIZE,
  filterComparePickerProducts,
  groupCompareRows,
  resolveCompareProducts,
  scoreCompareProducts,
  type CompareRow,
} from '../lib/compareProducts';
import { usePagination } from '../lib/pagination';
import { Pagination } from '../components/Pagination';
import type { Product } from '../types';
import { productRouteParam } from '../lib/productUrl';

type CompareAddPanelProps = {
  isLight: boolean;
  containerClass: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  products: Product[];
  compareCount: number;
  onAdd: (productId: string) => void;
  onClose: () => void;
  sticky?: boolean;
};

const CompareAddPanel: React.FC<CompareAddPanelProps> = ({
  isLight,
  containerClass,
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  categories,
  products,
  compareCount,
  onAdd,
  onClose,
  sticky = false,
}) => {
  const pickerPaging = usePagination(
    products,
    COMPARE_PICKER_PAGE_SIZE,
    `${searchTerm}|${categoryFilter}|${products.length}`,
  );

  return (
    <div
      id="compare-add-panel"
      className={`mb-8 p-6 sm:p-8 rounded-2xl border ${containerClass} ${
        sticky ? 'sticky top-20 sm:top-24 z-20 shadow-lg' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-bold">Add a device to compare</p>
          <p className="text-xs text-[color:var(--bb-muted)] mt-0.5">
            {compareCount} of {COMPARE_MAX_ITEMS} selected — tap a product below to add it.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`p-2 rounded-lg transition-colors ${
            isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
          }`}
          aria-label="Close add panel"
        >
          <X size={18} />
        </button>
      </div>

      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--bb-muted)]"
        />
        <input
          type="search"
          placeholder="Search by name, brand, or category…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          autoFocus
          className="w-full pl-12 pr-4 py-3.5 bg-transparent border border-[var(--bb-border)] rounded-xl text-sm outline-none focus:border-[#CDA032] transition-colors"
        />
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            type="button"
            onClick={() => onCategoryChange('all')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors ${
              categoryFilter === 'all'
                ? 'bg-[#CDA032] text-black'
                : isLight
                  ? 'bg-black/5 text-black/70 hover:bg-black/10'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#CDA032] text-black'
                  : isLight
                    ? 'bg-black/5 text-black/70 hover:bg-black/10'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm font-medium mb-1">No matching products</p>
          <p className="text-xs text-[color:var(--bb-muted)]">
            Try another search or browse the shop to find more devices.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 max-h-[min(60vh,420px)] overflow-y-auto bb-scrollbar pr-1">
            {pickerPaging.pageItems.map((product) => {
              const displayPrice = product.price_from ?? product.price;
              const inStock = (product.total_stock ?? product.stock ?? 0) > 0;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onAdd(product.id)}
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
                      {formatCurrency(displayPrice)}
                    </p>
                    <p className={`text-[9px] mt-1 ${inStock ? 'text-emerald-600' : 'text-[color:var(--bb-muted)]'}`}>
                      {inStock ? 'In stock' : 'Out of stock'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <Pagination
            page={pickerPaging.page}
            pageCount={pickerPaging.pageCount}
            onPageChange={pickerPaging.setPage}
            total={pickerPaging.total}
            pageSize={COMPARE_PICKER_PAGE_SIZE}
            isLight={isLight}
            className="pt-2"
          />
        </div>
      )}
    </div>
  );
};

function productImage(p: Product): string {
  return p.image || p.image_url || '';
}

function productPrice(p: Product): number {
  return p.price_from ?? p.price;
}

function truncateName(name: string, max = 28): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

type ProductColumnHeaderProps = {
  product: Product;
  isLight: boolean;
  badges: { key: string; label: string; highlight?: boolean }[];
  score?: number;
  showScore?: boolean;
  onRemove: () => void;
  onAddToCart: () => void;
  onOpen: () => void;
};

const ProductColumnHeader: React.FC<ProductColumnHeaderProps> = ({
  product,
  isLight,
  badges,
  score,
  showScore,
  onRemove,
  onAddToCart,
  onOpen,
}) => {
  const inStock = (product.total_stock ?? product.stock ?? 0) > 0;
  return (
    <div className="bb-compare-col-head">
      <button
        type="button"
        onClick={onRemove}
        className="bb-compare-col-head__remove"
        aria-label={`Remove ${product.name} from compare`}
      >
        <Trash2 size={14} />
      </button>
      <button type="button" onClick={onOpen} className="bb-compare-col-head__product">
        <div className="bb-compare-col-head__img">
          <img src={productImage(product)} alt="" />
        </div>
        <h3 className="bb-compare-col-head__name">{product.name}</h3>
        <p className="bb-compare-col-head__cat">{product.category}</p>
        <p className="bb-compare-col-head__price">{formatCurrency(productPrice(product))}</p>
        {showScore && typeof score === 'number' && (
          <p className="bb-compare-col-head__score">
            <span>{score}</span>
            <em>wins</em>
          </p>
        )}
      </button>
      {badges.length > 0 && (
        <div className="bb-compare-col-head__badges">
          {badges.map((b) => (
            <span
              key={b.key}
              className={`bb-compare-badge ${b.highlight ? 'bb-compare-badge--hot' : ''}`}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onAddToCart}
        disabled={!inStock}
        className={`bb-compare-col-head__cart ${isLight ? 'bb-compare-col-head__cart--light' : ''}`}
      >
        <ShoppingCart size={14} />
        {inStock ? 'Add to cart' : 'Out of stock'}
      </button>
    </div>
  );
};

type SpecMatrixProps = {
  products: Product[];
  rows: CompareRow[];
  isLight: boolean;
  winsById: Map<string, { key: string; label: string; highlight?: boolean }[]>;
  scoresById?: Map<string, number>;
  showScores?: boolean;
  atLimit: boolean;
  onRemove: (id: string) => void;
  onAddToCart: (p: Product) => void;
  onOpen: (p: Product) => void;
  onAddSlot: () => void;
};

const SpecMatrix: React.FC<SpecMatrixProps> = ({
  products,
  rows,
  isLight,
  winsById,
  scoresById,
  showScores,
  atLimit,
  onRemove,
  onAddToCart,
  onOpen,
  onAddSlot,
}) => {
  const groups = useMemo(() => groupCompareRows(rows), [rows]);
  const colCount = products.length + (atLimit ? 0 : 1);

  return (
    <div className={`bb-compare-matrix ${isLight ? 'bb-compare-matrix--light' : ''}`}>
      <div
        className="bb-compare-matrix__scroll bb-scrollbar"
        style={{ ['--bb-compare-cols' as string]: colCount }}
      >
        <div className="bb-compare-matrix__sticky">
          <div className="bb-compare-matrix__label-cell bb-compare-matrix__label-cell--head">
            <span>At a glance</span>
          </div>
          {products.map((p) => (
            <ProductColumnHeader
              key={p.id}
              product={p}
              isLight={isLight}
              badges={winsById.get(p.id) ?? []}
              score={scoresById?.get(p.id)}
              showScore={showScores}
              onRemove={() => onRemove(p.id)}
              onAddToCart={() => onAddToCart(p)}
              onOpen={() => onOpen(p)}
            />
          ))}
          {!atLimit && (
            <button type="button" onClick={onAddSlot} className="bb-compare-add-slot">
              <Plus size={22} />
              <span>Add device</span>
            </button>
          )}
        </div>

        {groups.map((g) => (
          <div key={g.group} className="bb-compare-matrix__group">
            <div className="bb-compare-matrix__group-title" style={{ gridColumn: '1 / -1' }}>
              {g.group}
            </div>
            {g.rows.map((row) => (
              <React.Fragment key={row.key}>
                <div className="bb-compare-matrix__label-cell">{row.label}</div>
                {products.map((p) => {
                  const isWin = row.winnerIds.includes(p.id);
                  const isEven = row.winnerIds.length === 0 && products.length > 1;
                  return (
                    <div
                      key={`${row.key}-${p.id}`}
                      className={`bb-compare-matrix__cell ${
                        isWin ? 'bb-compare-matrix__cell--win' : ''
                      } ${isEven ? 'bb-compare-matrix__cell--even' : ''}`}
                    >
                      <span>{row.values[p.id] ?? '—'}</span>
                      {isWin && products.length === 2 && (
                        <em className="bb-compare-matrix__verdict">Wins</em>
                      )}
                      {isEven && products.indexOf(p) === 0 && (
                        <em className="bb-compare-matrix__verdict bb-compare-matrix__verdict--even">
                          Even
                        </em>
                      )}
                    </div>
                  );
                })}
                {!atLimit && <div className="bb-compare-matrix__cell bb-compare-matrix__cell--empty" />}
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

type VersusDuelProps = {
  products: [Product, Product];
  rows: CompareRow[];
  isLight: boolean;
  winsById: Map<string, { key: string; label: string; highlight?: boolean }[]>;
  onRemove: (id: string) => void;
  onAddToCart: (p: Product) => void;
  onOpen: (p: Product) => void;
  onAddSlot: () => void;
  atLimit: boolean;
};

const VersusDuel: React.FC<VersusDuelProps> = ({
  products,
  rows,
  isLight,
  winsById,
  onRemove,
  onAddToCart,
  onOpen,
  onAddSlot,
  atLimit,
}) => {
  const [a, b] = products;
  const ruling = useMemo(() => buildRuling(products, rows), [products, rows]);
  const scores = useMemo(() => scoreCompareProducts(products, rows), [products, rows]);
  const scoresById = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scores) m.set(s.productId, s.wins);
    return m;
  }, [scores]);
  const forkA = useMemo(() => buildForkForProduct(a, b, rows), [a, b, rows]);
  const forkB = useMemo(() => buildForkForProduct(b, a, rows), [a, b, rows]);

  return (
    <div className={`bb-compare-versus ${isLight ? 'bb-compare-versus--light' : ''}`}>
      <section className="bb-compare-duel">
        <div className="bb-compare-duel__side">
          <ProductColumnHeader
            product={a}
            isLight={isLight}
            badges={winsById.get(a.id) ?? []}
            score={scoresById.get(a.id)}
            showScore
            onRemove={() => onRemove(a.id)}
            onAddToCart={() => onAddToCart(a)}
            onOpen={() => onOpen(a)}
          />
        </div>
        <div className="bb-compare-duel__vs" aria-hidden>
          <span>vs</span>
        </div>
        <div className="bb-compare-duel__side">
          <ProductColumnHeader
            product={b}
            isLight={isLight}
            badges={winsById.get(b.id) ?? []}
            score={scoresById.get(b.id)}
            showScore
            onRemove={() => onRemove(b.id)}
            onAddToCart={() => onAddToCart(b)}
            onOpen={() => onOpen(b)}
          />
        </div>
      </section>

      {ruling && (
        <section className="bb-compare-ruling">
          <p className="bb-compare-ruling__eyebrow">The ruling</p>
          <h2 className="bb-compare-ruling__summary">{ruling.summary}</h2>
          {ruling.winLabels.length > 0 && (
            <div className="bb-compare-ruling__chips">
              {ruling.winLabels.map((label) => (
                <span key={label} className="bb-compare-badge bb-compare-badge--hot">
                  {label}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="bb-compare-fork">
        <h2 className="bb-compare-section-title">The fork</h2>
        <div className="bb-compare-fork__grid">
          <div className="bb-compare-fork__col">
            <h3>
              {truncateName(a.name)} — if you care about…
            </h3>
            {forkA.length === 0 ? (
              <p className="bb-compare-fork__empty">No clear edges on the facts we have.</p>
            ) : (
              <ul>
                {forkA.map((item) => (
                  <li key={item.key}>
                    <span className="bb-compare-fork__label">{item.label}</span>
                    <span className="bb-compare-fork__val">
                      {item.value}
                      {item.deltaLabel ? (
                        <em className="bb-compare-fork__delta">{item.deltaLabel}</em>
                      ) : null}
                    </span>
                    <span className="bb-compare-fork__vs">vs {item.opponentValue}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bb-compare-fork__col">
            <h3>
              {truncateName(b.name)} — if you care about…
            </h3>
            {forkB.length === 0 ? (
              <p className="bb-compare-fork__empty">No clear edges on the facts we have.</p>
            ) : (
              <ul>
                {forkB.map((item) => (
                  <li key={item.key}>
                    <span className="bb-compare-fork__label">{item.label}</span>
                    <span className="bb-compare-fork__val">
                      {item.value}
                      {item.deltaLabel ? (
                        <em className="bb-compare-fork__delta">{item.deltaLabel}</em>
                      ) : null}
                    </span>
                    <span className="bb-compare-fork__vs">vs {item.opponentValue}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="bb-compare-record">
        <h2 className="bb-compare-section-title">The record</h2>
        <SpecMatrix
          products={products}
          rows={rows}
          isLight={isLight}
          winsById={winsById}
          scoresById={scoresById}
          showScores={false}
          atLimit={atLimit}
          onRemove={onRemove}
          onAddToCart={onAddToCart}
          onOpen={onOpen}
          onAddSlot={onAddSlot}
        />
      </section>
    </div>
  );
};

export const Compare: React.FC = () => {
  const {
    products: allProducts,
    compareIds,
    onToggleCompare,
    onAddToCart,
    theme,
    notify,
  } = useAppContext();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const addPanelRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  const compareProducts = useMemo(
    () => resolveCompareProducts(allProducts, compareIds),
    [allProducts, compareIds],
  );

  const compareRows = useMemo(() => buildCompareRows(compareProducts), [compareProducts]);

  const compareWinsById = useMemo(
    () => buildCompareWinsByProductId(compareProducts),
    [compareProducts],
  );

  const scoresById = useMemo(() => {
    const scores = scoreCompareProducts(compareProducts, compareRows);
    const m = new Map<string, number>();
    for (const s of scores) m.set(s.productId, s.wins);
    return m;
  }, [compareProducts, compareRows]);

  const shopProducts = useMemo(
    () =>
      allProducts.filter((p) => {
        const status = String(p.status || 'active').toLowerCase();
        return status === 'active' || status === '';
      }),
    [allProducts],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of shopProducts) {
      if (p.category) set.add(String(p.category));
    }
    return Array.from(set).sort();
  }, [shopProducts]);

  const availableProducts = useMemo(() => {
    let list = filterComparePickerProducts(shopProducts, compareIds, searchTerm);
    if (categoryFilter !== 'all') {
      list = list.filter((p) => String(p.category) === categoryFilter);
    }
    return list;
  }, [shopProducts, compareIds, searchTerm, categoryFilter]);

  const openAddPanel = () => {
    setShowAddPanel(true);
  };

  const closeAddPanel = () => {
    setShowAddPanel(false);
    setSearchTerm('');
    setCategoryFilter('all');
  };

  const handleAddProduct = (productId: string) => {
    if (compareIds.length >= COMPARE_MAX_ITEMS) {
      notify(`Comparison limit reached (${COMPARE_MAX_ITEMS})`, 'error');
      return;
    }
    if (compareIds.includes(productId)) return;
    onToggleCompare(productId);
  };

  const openProduct = (product: Product) => {
    navigate({
      to: '/product/$productId' as any,
      params: { productId: productRouteParam(product) } as any,
    });
  };

  useEffect(() => {
    if (!showAddPanel) return;
    const t = window.setTimeout(() => {
      addPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    return () => window.clearTimeout(t);
  }, [showAddPanel]);

  const containerClass = isLight ? 'bg-white border-black/10' : 'bg-[var(--bb-surface)] border-[var(--bb-border)]';
  const textMuted = 'text-[color:var(--bb-muted)]';
  const atLimit = compareIds.length >= COMPARE_MAX_ITEMS;

  const pageTitle =
    compareProducts.length >= 2
      ? `${truncateName(compareProducts[0].name, 22)} vs ${truncateName(compareProducts[1].name, 22)}`
      : 'Compare products';

  const addPanelProps = {
    isLight,
    containerClass,
    searchTerm,
    onSearchChange: setSearchTerm,
    categoryFilter,
    onCategoryChange: setCategoryFilter,
    categories,
    products: availableProducts,
    compareCount: compareIds.length,
    onAdd: handleAddProduct,
    onClose: closeAddPanel,
  };

  return (
    <div className="min-h-screen pt-24 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-[var(--bb-bg)] text-[var(--bb-text)]">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-6">
          <PageBackButton isLight={isLight} fallbackTo="/store" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sm:mb-10">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center ${
                isLight ? 'bg-black text-white' : 'bg-[#CDA032] text-black'
              }`}
            >
              <GitCompare size={28} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{pageTitle}</h1>
              <p className={`text-sm mt-1 ${textMuted}`}>
                {compareProducts.length === 2
                  ? 'Head-to-head specs, ruling, and the full record.'
                  : `Side-by-side specs and pricing — up to ${COMPARE_MAX_ITEMS} devices.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs font-bold uppercase tracking-wider tabular-nums ${textMuted}`}>
              {compareIds.length}/{COMPARE_MAX_ITEMS}
            </span>
            {!atLimit && (
              <button
                type="button"
                onClick={() => (showAddPanel ? closeAddPanel() : openAddPanel())}
                className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-[0.98] ${
                  showAddPanel
                    ? 'bg-[#CDA032] text-black'
                    : isLight
                      ? 'bg-black text-white hover:bg-black/85'
                      : 'bg-[var(--bb-surface)] border border-[var(--bb-border)] hover:border-[#CDA032]/40'
                }`}
              >
                <Plus size={16} />
                {showAddPanel ? 'Done adding' : 'Add devices'}
              </button>
            )}
          </div>
        </div>

        <div ref={addPanelRef}>
          {showAddPanel && (
            <CompareAddPanel {...addPanelProps} sticky={compareProducts.length > 0} />
          )}
        </div>

        {compareProducts.length === 0 ? (
          <div className="py-24 sm:py-32 rounded-2xl border border-dashed border-[var(--bb-border)] flex flex-col items-center justify-center text-center px-6">
            <Info size={40} className="mb-4 text-[color:var(--bb-muted)] opacity-60" />
            <p className="text-base font-bold mb-2">No devices to compare yet</p>
            <p className={`text-sm max-w-md ${textMuted}`}>
              Add items from the shop using the scale icon on any product card, or search and pick
              devices below.
            </p>
            {!showAddPanel && (
              <button
                type="button"
                onClick={openAddPanel}
                className="mt-6 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#CDA032] text-black"
              >
                Add devices
              </button>
            )}
          </div>
        ) : compareProducts.length === 2 ? (
          <VersusDuel
            products={[compareProducts[0], compareProducts[1]]}
            rows={compareRows}
            isLight={isLight}
            winsById={compareWinsById}
            onRemove={onToggleCompare}
            onAddToCart={onAddToCart}
            onOpen={openProduct}
            onAddSlot={openAddPanel}
            atLimit={atLimit}
          />
        ) : (
          <SpecMatrix
            products={compareProducts}
            rows={compareRows}
            isLight={isLight}
            winsById={compareWinsById}
            scoresById={scoresById}
            showScores={compareProducts.length > 1}
            atLimit={atLimit}
            onRemove={onToggleCompare}
            onAddToCart={onAddToCart}
            onOpen={openProduct}
            onAddSlot={openAddPanel}
          />
        )}
      </div>
    </div>
  );
};
