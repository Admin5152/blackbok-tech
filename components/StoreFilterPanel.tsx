import React, { useState } from 'react';
import { X, ChevronDown, Tag } from 'lucide-react';
import { Category } from '../types';
import { formatCurrency } from '../lib/utils';
import { STORE_PRICE_SLIDER_MAX, STORE_PRICE_SLIDER_STEP, STORE_CATEGORY_FILTER_GROUPS } from '../lib/storeFilters';

export { STORE_PRICE_SLIDER_MAX, STORE_PRICE_SLIDER_STEP } from '../lib/storeFilters';

export type StoreCategoryRow =
  | { key: string; label: string; value: 'All'; icon: React.ReactNode; count: number }
  | { key: string; label: string; value: Category; icon: React.ReactNode; count: number };

const PRICE_PRESETS = [
  { label: 'Any price', range: { min: 0, max: STORE_PRICE_SLIDER_MAX } },
  { label: 'Under GH₵5,000', range: { min: 0, max: 5000 } },
  { label: 'GH₵5,000 – 10,000', range: { min: 5000, max: 10000 } },
  { label: 'GH₵10,000 – 20,000', range: { min: 10000, max: 20000 } },
  { label: 'GH₵20,000 & above', range: { min: 20000, max: STORE_PRICE_SLIDER_MAX } },
] as const;

export interface StoreFilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface StoreFilterPanelProps {
  variant: 'drawer' | 'sidebar';
  isLight: boolean;
  categoryOptions: StoreCategoryRow[];
  isCategoryRowActive: (cat: StoreCategoryRow) => boolean;
  onCategoryClick: (cat: StoreCategoryRow) => void;
  showPromotionsOnly: boolean;
  onTogglePromotions: () => void;
  priceRange: { min: number; max: number };
  minInput: string;
  maxInput: string;
  onMinInputChange: (v: string) => void;
  onMaxInputChange: (v: string) => void;
  onCommitPrice: () => void;
  onAdjustMin: (delta: number) => void;
  onAdjustMax: (delta: number) => void;
  onPriceRangeChange: (range: { min: number; max: number }) => void;
  activeFiltersCount: number;
  onClearAll: () => void;
  onClose?: () => void;
  resultCount: number;
  /** Brand chips (Audio / Watches / Android / Laptops). */
  brandOptions?: StoreFilterOption[];
  activeBrand?: string;
  onBrandClick?: (value: string) => void;
  /** Series / line chips. */
  seriesOptions?: StoreFilterOption[];
  activeSeries?: string;
  onSeriesClick?: (value: string) => void;
  /** New / Used (or All). */
  conditionOptions?: StoreFilterOption[];
  activeCondition?: string;
  onConditionClick?: (value: string) => void;
}

function clampPriceRange(min: number, max: number): { min: number; max: number } {
  const step = STORE_PRICE_SLIDER_STEP;
  const cap = STORE_PRICE_SLIDER_MAX;
  let lo = Math.max(0, Math.min(cap, Math.round(min / step) * step));
  let hi = Math.max(0, Math.min(cap, Math.round(max / step) * step));
  if (lo > hi - step) lo = Math.max(0, hi - step);
  if (hi < lo + step) hi = Math.min(cap, lo + step);
  return { min: lo, max: hi };
}

function FilterAccordion({
  title,
  open,
  onToggle,
  children,
  badge,
  hint,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string | number | null;
  hint?: string | null;
}) {
  return (
    <section className="bb-mp-filter-section">
      <button
        type="button"
        className="bb-mp-filter-section__head"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="bb-mp-filter-section__title">{title}</span>
        {badge != null && badge !== '' && (
          <span className="bb-mp-filter-section__badge">{badge}</span>
        )}
        <ChevronDown
          size={14}
          className={`bb-mp-filter-section__chev ${open ? 'bb-mp-filter-section__chev--open' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="bb-mp-filter-section__body">
          {hint ? <p className="bb-mp-filter-hint bb-mp-filter-hint--block">{hint}</p> : null}
          {children}
        </div>
      )}
    </section>
  );
}

function FilterCheckRow({
  label,
  count,
  checked,
  onClick,
  indent,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onClick: () => void;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      className={`bb-mp-filter-row ${indent ? 'bb-mp-filter-row--indent' : ''} ${
        checked ? 'bb-mp-filter-row--active' : ''
      }`}
      onClick={onClick}
      aria-pressed={checked}
    >
      <span className={`bb-mp-filter-check ${checked ? 'bb-mp-filter-check--on' : ''}`} aria-hidden>
        {checked ? '✓' : ''}
      </span>
      <span className="bb-mp-filter-row__label">{label}</span>
      {typeof count === 'number' && (
        <span className="bb-mp-filter-row__count">({count})</span>
      )}
    </button>
  );
}

function OptionList({
  options,
  activeValue,
  onClick,
  allLabel,
  scroll,
}: {
  options: StoreFilterOption[];
  activeValue?: string;
  onClick: (value: string) => void;
  allLabel: string;
  scroll?: boolean;
}) {
  const active = activeValue || 'all';
  return (
    <div className={`bb-mp-filter-list ${scroll ? 'bb-mp-filter-list--scroll' : ''}`}>
      <FilterCheckRow
        label={allLabel}
        checked={active === 'all' || active === ''}
        onClick={() => onClick('all')}
      />
      {options.map((opt) => (
        <FilterCheckRow
          key={opt.value}
          label={opt.label}
          count={opt.count}
          checked={active === opt.value}
          onClick={() => onClick(opt.value)}
        />
      ))}
    </div>
  );
}

export const StoreFilterPanel: React.FC<StoreFilterPanelProps> = ({
  variant,
  isLight,
  categoryOptions,
  isCategoryRowActive,
  onCategoryClick,
  showPromotionsOnly,
  onTogglePromotions,
  priceRange,
  minInput,
  maxInput,
  onMinInputChange,
  onMaxInputChange,
  onCommitPrice,
  onAdjustMin: _onAdjustMin,
  onAdjustMax: _onAdjustMax,
  onPriceRangeChange,
  activeFiltersCount,
  onClearAll,
  onClose,
  resultCount,
  brandOptions,
  activeBrand,
  onBrandClick,
  seriesOptions,
  activeSeries,
  onSeriesClick,
  conditionOptions,
  activeCondition,
  onConditionClick,
}) => {
  const isDrawer = variant === 'drawer';
  const borderSubtle = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
  const inputBg = isLight ? '#ffffff' : '#0a0a0a';

  const hasBrand = Boolean(brandOptions && brandOptions.length > 0 && onBrandClick);
  const hasSeries = Boolean(seriesOptions && seriesOptions.length > 0 && onSeriesClick);
  const hasCondition = Boolean(conditionOptions && conditionOptions.length > 0 && onConditionClick);

  const activeCat = categoryOptions.find((c) => isCategoryRowActive(c) && c.value !== 'All');

  const [openSections, setOpenSections] = useState({
    category: true,
    brand: true,
    series: true,
    condition: true,
    price: true,
    deals: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isPresetActive = (min: number, max: number) =>
    priceRange.min === min && priceRange.max === max;

  /** Group shop categories for the filter list (Audio, Computers, …). */
  const groupedCategoryRows = React.useMemo(() => {
    const deals = categoryOptions.filter((c) => c.value === 'All' || c.key === 'deals');
    const rest = categoryOptions.filter((c) => c.value !== 'All' && c.key !== 'deals');
    const byKey = new Map(rest.map((c) => [String(c.value), c]));
    const used = new Set<string>();
    const groups: { id: string; label: string | null; rows: StoreCategoryRow[] }[] = [];

    for (const g of STORE_CATEGORY_FILTER_GROUPS) {
      const rows = g.categories
        .map((name) => byKey.get(name))
        .filter((r): r is StoreCategoryRow => Boolean(r));
      if (rows.length === 0) continue;
      rows.forEach((r) => used.add(String(r.value)));
      groups.push({
        id: g.id,
        label: rows.length > 1 ? g.label : null,
        rows,
      });
    }
    const leftovers = rest.filter((r) => !used.has(String(r.value)));
    if (leftovers.length) {
      groups.push({ id: 'other', label: null, rows: leftovers });
    }
    return { deals, groups };
  }, [categoryOptions]);

  const body = (
    <div className="bb-mp-filter">
      <FilterAccordion
        title="Category"
        open={openSections.category}
        onToggle={() => toggleSection('category')}
        badge={activeCat?.label}
        hint="Pick a category, then refine brand, series, and condition below."
      >
        <div className="bb-mp-filter-list">
          {groupedCategoryRows.deals.map((cat) => (
            <FilterCheckRow
              key={cat.key}
              label={cat.label.replace(/^🔥\s*/, '')}
              count={cat.count}
              checked={isCategoryRowActive(cat)}
              onClick={() => onCategoryClick(cat)}
            />
          ))}
          {groupedCategoryRows.groups.map((group) => (
            <div key={group.id} className="bb-mp-filter-group">
              {group.label && (
                <p className="bb-mp-filter-group__label">{group.label}</p>
              )}
              {group.rows.map((cat) => {
                const active = isCategoryRowActive(cat);
                return (
                  <FilterCheckRow
                    key={cat.key}
                    label={cat.label.replace(/^🔥\s*/, '')}
                    count={cat.count}
                    checked={active}
                    indent={Boolean(group.label)}
                    onClick={() => onCategoryClick(cat)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </FilterAccordion>

      {hasBrand && (
        <FilterAccordion
          title="Brand"
          open={openSections.brand}
          onToggle={() => toggleSection('brand')}
          badge={
            activeBrand
              ? brandOptions!.find((o) => o.value === activeBrand)?.label
              : 'All'
          }
          hint="Optional — leave on All brands to browse everything in this category."
        >
          <OptionList
            options={brandOptions!}
            activeValue={activeBrand}
            onClick={onBrandClick!}
            allLabel="All brands"
          />
        </FilterAccordion>
      )}

      {hasSeries && (
        <FilterAccordion
          title="Series"
          open={openSections.series}
          onToggle={() => toggleSection('series')}
          badge={
            activeSeries
              ? seriesOptions!.find((o) => o.value === activeSeries)?.label
              : 'All'
          }
          hint={
            hasBrand && !activeBrand
              ? 'Tip: choose a brand first to narrow these lines.'
              : null
          }
        >
          <OptionList
            options={seriesOptions!}
            activeValue={activeSeries}
            onClick={onSeriesClick!}
            allLabel="All series"
            scroll
          />
        </FilterAccordion>
      )}

      {hasCondition && (
        <FilterAccordion
          title="Condition"
          open={openSections.condition}
          onToggle={() => toggleSection('condition')}
          badge={
            activeCondition && activeCondition !== 'all'
              ? conditionOptions!.find((o) => o.value === activeCondition)?.label
              : 'All'
          }
        >
          <OptionList
            options={conditionOptions!.filter((o) => o.value !== 'all')}
            activeValue={activeCondition}
            onClick={onConditionClick!}
            allLabel="All conditions"
          />
        </FilterAccordion>
      )}

      <FilterAccordion
        title="Price (GH₵)"
        open={openSections.price}
        onToggle={() => toggleSection('price')}
      >
        <div className="bb-mp-filter-price">
          <div className="bb-mp-filter-price__inputs">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={STORE_PRICE_SLIDER_MAX}
              step={STORE_PRICE_SLIDER_STEP}
              value={minInput}
              onChange={(e) => onMinInputChange(e.target.value)}
              onBlur={onCommitPrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onCommitPrice();
                }
              }}
              className="bb-mp-filter-price__input"
              style={{ backgroundColor: inputBg, borderColor: borderSubtle }}
              aria-label="Minimum price"
              placeholder="Min"
            />
            <span className="bb-mp-filter-price__dash">–</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={STORE_PRICE_SLIDER_MAX}
              step={STORE_PRICE_SLIDER_STEP}
              value={maxInput}
              onChange={(e) => onMaxInputChange(e.target.value)}
              onBlur={onCommitPrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onCommitPrice();
                }
              }}
              className="bb-mp-filter-price__input"
              style={{ backgroundColor: inputBg, borderColor: borderSubtle }}
              aria-label="Maximum price"
              placeholder="Max"
            />
            <button type="button" className="bb-mp-filter-price__go" onClick={onCommitPrice}>
              Go
            </button>
          </div>

          <div className="bb-mp-filter-list">
            {PRICE_PRESETS.map(({ label, range }) => (
              <FilterCheckRow
                key={label}
                label={label}
                checked={isPresetActive(range.min, range.max)}
                onClick={() => onPriceRangeChange(clampPriceRange(range.min, range.max))}
              />
            ))}
          </div>

          {(priceRange.min > 0 || priceRange.max < STORE_PRICE_SLIDER_MAX) && (
            <p className="bb-mp-filter-price__summary">
              {formatCurrency(priceRange.min)} – {formatCurrency(priceRange.max)}
              {priceRange.max >= STORE_PRICE_SLIDER_MAX ? '+' : ''}
            </p>
          )}
        </div>
      </FilterAccordion>

      <FilterAccordion
        title="Deals"
        open={openSections.deals}
        onToggle={() => toggleSection('deals')}
      >
        <FilterCheckRow
          label="On sale only"
          checked={showPromotionsOnly}
          onClick={onTogglePromotions}
        />
        <p className="bb-mp-filter-hint">
          <Tag size={11} aria-hidden /> Discounted items
        </p>
      </FilterAccordion>
    </div>
  );

  if (isDrawer) {
    return (
      <div
        className={`bb-store-filter-panel bb-store-filter-panel--drawer bb-mp-filter-panel flex h-full min-h-0 flex-col ${
          isLight ? 'bb-mp-filter-panel--light' : ''
        }`}
        data-lenis-prevent
      >
        <header className="bb-mp-filter-panel__header shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="bb-mp-filter-panel__title">Filter</h2>
            <p className="bb-mp-filter-panel__meta">
              {resultCount} {resultCount === 1 ? 'item' : 'items'}
            </p>
          </div>
          {activeFiltersCount > 0 && (
            <button type="button" onClick={onClearAll} className="bb-mp-filter-clear">
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="bb-store-filter-close"
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </header>

        <div
          className="bb-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
          data-lenis-prevent
        >
          {body}
        </div>

        <footer className="bb-mp-filter-panel__footer shrink-0">
          <button type="button" onClick={onClose} className="bb-mp-filter-apply">
            Show {resultCount} {resultCount === 1 ? 'result' : 'results'}
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div
      className={`bb-store-filter-panel bb-store-filter-panel--sidebar bb-mp-filter-panel ${
        isLight ? 'bb-store-filter-panel--sidebar-light bb-mp-filter-panel--light' : ''
      }`}
      data-lenis-prevent
    >
      <header className="bb-mp-filter-panel__header bb-mp-filter-panel__header--sidebar">
        <div className="min-w-0 flex-1">
          <h2 className="bb-mp-filter-panel__title">Filter</h2>
          <p className="bb-mp-filter-panel__meta">
            {resultCount} {resultCount === 1 ? 'result' : 'results'}
          </p>
        </div>
        {activeFiltersCount > 0 && (
          <button type="button" onClick={onClearAll} className="bb-mp-filter-clear">
            Clear all
          </button>
        )}
      </header>
      <div
        className="bb-scrollbar min-h-0 max-h-[min(calc(100dvh-9rem),48rem)] overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
        data-lenis-prevent
      >
        {body}
      </div>
    </div>
  );
};
