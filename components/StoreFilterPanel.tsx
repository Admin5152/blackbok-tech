import React from 'react';
import { X, Tag, SlidersHorizontal } from 'lucide-react';
import { Category } from '../types';
import { formatCurrency } from '../lib/utils';
import { STORE_PRICE_SLIDER_MAX, STORE_PRICE_SLIDER_STEP } from '../lib/storeFilters';

export { STORE_PRICE_SLIDER_MAX, STORE_PRICE_SLIDER_STEP } from '../lib/storeFilters';

export type StoreCategoryRow =
  | { key: string; label: string; value: 'All'; icon: React.ReactNode; count: number }
  | { key: string; label: string; value: Category; icon: React.ReactNode; count: number };

const PRICE_PRESETS = [
  { label: 'Any', range: { min: 0, max: STORE_PRICE_SLIDER_MAX } },
  { label: 'Under 5k', range: { min: 0, max: 5000 } },
  { label: '5k – 10k', range: { min: 5000, max: 10000 } },
  { label: '10k+', range: { min: 10000, max: STORE_PRICE_SLIDER_MAX } },
] as const;

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
  /** Optional series chips (iPhone / iPad / MacBooks). Empty activeSeries = All. */
  seriesOptions?: { value: string; label: string }[];
  /** Active series slug, or '' / undefined for All */
  activeSeries?: string;
  /** Pass '' to clear series (show all in category) */
  onSeriesClick?: (value: string) => void;
  /** Optional New / Used chips when browsing a condition category */
  conditionOptions?: { value: string; label: string }[];
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

function StorePriceRangeSlider({
  min,
  max,
  onChange,
}: {
  min: number;
  max: number;
  onChange: (range: { min: number; max: number }) => void;
}) {
  const minPct = (min / STORE_PRICE_SLIDER_MAX) * 100;
  const maxPct = (max / STORE_PRICE_SLIDER_MAX) * 100;

  return (
    <div className="bb-store-filter-slider" aria-label="Price range slider">
      <div className="bb-store-filter-slider__wrap bb-store-filter-slider__wrap--lg">
        <div className="bb-store-filter-slider__track" aria-hidden>
          <div
            className="bb-store-filter-slider__fill"
            style={{ left: `${minPct}%`, width: `${Math.max(0, maxPct - minPct)}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={STORE_PRICE_SLIDER_MAX}
          step={STORE_PRICE_SLIDER_STEP}
          value={min}
          onChange={(e) => {
            const nextMin = Number(e.target.value);
            onChange(clampPriceRange(nextMin, max));
          }}
          className="bb-store-filter-slider__input bb-store-filter-slider__input--min"
          aria-label="Minimum price"
          aria-valuemin={0}
          aria-valuemax={STORE_PRICE_SLIDER_MAX}
          aria-valuenow={min}
        />
        <input
          type="range"
          min={0}
          max={STORE_PRICE_SLIDER_MAX}
          step={STORE_PRICE_SLIDER_STEP}
          value={max}
          onChange={(e) => {
            const nextMax = Number(e.target.value);
            onChange(clampPriceRange(min, nextMax));
          }}
          className="bb-store-filter-slider__input bb-store-filter-slider__input--max"
          aria-label="Maximum price"
          aria-valuemin={0}
          aria-valuemax={STORE_PRICE_SLIDER_MAX}
          aria-valuenow={max}
        />
      </div>
    </div>
  );
}

function chipClass(active: boolean, isLight: boolean): string {
  if (active) {
    return 'bb-store-filter-chip bb-store-filter-chip--active';
  }
  return isLight ? 'bb-store-filter-chip bb-store-filter-chip--light' : 'bb-store-filter-chip bb-store-filter-chip--dark';
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
  seriesOptions,
  activeSeries,
  onSeriesClick,
  conditionOptions,
  activeCondition,
  onConditionClick,
}) => {
  const isDrawer = variant === 'drawer';
  const borderSubtle = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const inputBg = isLight ? '#ffffff' : '#0a0a0a';

  const isPresetActive = (min: number, max: number) =>
    priceRange.min === min && priceRange.max === max;

  const hasSeries = Boolean(seriesOptions && seriesOptions.length > 0 && onSeriesClick);
  const hasCondition = Boolean(conditionOptions && conditionOptions.length > 0 && onConditionClick);
  const activeCategoryLabel =
    categoryOptions.find((cat) => isCategoryRowActive(cat) && cat.value !== 'All')?.label ?? null;
  const conditionTitle =
    conditionOptions?.every((o) => o.value === 'new' || o.value === 'used') ? 'Condition' : 'Type';

  const body = (
  <>
      {/* Browse: category first, then series/condition nested under the pick */}
      <section className="bb-store-filter-section">
        <h3 className="bb-store-filter-section__title">Category</h3>
        <div className="bb-store-filter-category-list">
          {categoryOptions.map((cat) => {
            const active = isCategoryRowActive(cat);
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onCategoryClick(cat)}
                className={`${chipClass(active, isLight)} bb-store-filter-category-row w-full text-left`}
                aria-pressed={active}
              >
                <span className="bb-store-filter-chip__icon">{cat.icon}</span>
                <span className="bb-store-filter-chip__label min-w-0 truncate">{cat.label}</span>
                <span className="bb-store-filter-chip__count">{cat.count}</span>
              </button>
            );
          })}
        </div>

        {(hasSeries || hasCondition) && (
          <div className="bb-store-filter-nested">
            {activeCategoryLabel && (
              <p className="bb-store-filter-nested__eyebrow">
                In {activeCategoryLabel}
              </p>
            )}

            {hasSeries && (
              <div className="bb-store-filter-nested__block">
                <h4 className="bb-store-filter-nested__title">Series</h4>
                <div className="bb-store-filter-series-list">
                  <button
                    type="button"
                    onClick={() => onSeriesClick!('')}
                    className={`${chipClass(!activeSeries, isLight)} bb-store-filter-series-row w-full text-left`}
                    aria-pressed={!activeSeries}
                  >
                    <span className="bb-store-filter-chip__label">All series</span>
                  </button>
                  {seriesOptions!.map((opt) => {
                    const selected = activeSeries === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onSeriesClick!(opt.value)}
                        className={`${chipClass(selected, isLight)} bb-store-filter-series-row w-full text-left`}
                        aria-pressed={selected}
                      >
                        <span className="bb-store-filter-chip__label">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {hasCondition && (
              <div className="bb-store-filter-nested__block">
                <h4 className="bb-store-filter-nested__title">{conditionTitle}</h4>
                <div className="bb-store-filter-chip-row">
                  {conditionOptions!.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onConditionClick!(opt.value)}
                      className={chipClass(activeCondition === opt.value, isLight)}
                      aria-pressed={activeCondition === opt.value}
                    >
                      <span className="bb-store-filter-chip__label">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Price — quick presets + simple slider */}
      <section className="bb-store-filter-section">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="bb-store-filter-section__title mb-0">Price</h3>
          {(priceRange.min > 0 || priceRange.max < STORE_PRICE_SLIDER_MAX) && (
            <button
              type="button"
              onClick={() => onPriceRangeChange({ min: 0, max: STORE_PRICE_SLIDER_MAX })}
              className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <p className="bb-store-filter-range-summary bb-store-filter-range-summary--lg">
          {formatCurrency(priceRange.min)}
          <span className="opacity-40 mx-1.5">–</span>
          {formatCurrency(priceRange.max)}
          {priceRange.max >= STORE_PRICE_SLIDER_MAX ? '+' : ''}
        </p>

        <div className="bb-store-filter-price-presets mb-4">
          {PRICE_PRESETS.map(({ label, range }) => {
            const active = isPresetActive(range.min, range.max);
            return (
              <button
                key={label}
                type="button"
                onClick={() => onPriceRangeChange(range)}
                className={`bb-store-filter-preset bb-store-filter-preset--tap ${
                  active
                    ? 'bb-store-filter-preset--active'
                    : isLight
                      ? 'bb-store-filter-preset--light'
                      : 'bb-store-filter-preset--dark'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <StorePriceRangeSlider
          min={priceRange.min}
          max={priceRange.max}
          onChange={onPriceRangeChange}
        />

        <div className="bb-store-filter-price-inputs mt-3">
          <label className="bb-store-filter-price-field">
            <span className="bb-store-filter-price-field__label">Min</span>
            <div className="bb-store-filter-price-field__row">
              <span className="bb-store-filter-price-field__prefix" aria-hidden>
                GH₵
              </span>
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
                className="bb-store-filter-input bb-store-filter-input--price"
                style={{
                  backgroundColor: inputBg,
                  borderColor: borderSubtle,
                  color: isLight ? '#000' : '#fff',
                }}
                aria-label="Minimum price in Ghana cedis"
              />
            </div>
          </label>
          <label className="bb-store-filter-price-field">
            <span className="bb-store-filter-price-field__label">Max</span>
            <div className="bb-store-filter-price-field__row">
              <span className="bb-store-filter-price-field__prefix" aria-hidden>
                GH₵
              </span>
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
                className="bb-store-filter-input bb-store-filter-input--price"
                style={{
                  backgroundColor: inputBg,
                  borderColor: borderSubtle,
                  color: isLight ? '#000' : '#fff',
                }}
                aria-label="Maximum price in Ghana cedis"
              />
            </div>
          </label>
        </div>
      </section>

      {/* Promotions */}
      <section className="bb-store-filter-section">
        <button
          type="button"
          onClick={onTogglePromotions}
          className={`bb-store-filter-promo w-full ${showPromotionsOnly ? 'bb-store-filter-promo--on' : isLight ? 'bb-store-filter-promo--off-light' : 'bb-store-filter-promo--off-dark'}`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="bb-store-filter-promo__icon">
              <Tag size={15} />
            </span>
            <span className="text-left">
              <span className="block text-[11px] font-black uppercase tracking-[0.14em]">On sale</span>
              <span className={`block text-[10px] font-medium ${showPromotionsOnly ? 'text-black/60' : isLight ? 'text-black/45' : 'text-white/45'}`}>
                Show discounted items only
              </span>
            </span>
          </span>
          <span
            className={`bb-store-filter-switch ${showPromotionsOnly ? 'bb-store-filter-switch--on' : ''}`}
            aria-hidden
          >
            <span className="bb-store-filter-switch__thumb" />
          </span>
        </button>
      </section>

    </>
  );

  if (isDrawer) {
    return (
      <div
        className="bb-store-filter-panel bb-store-filter-panel--drawer flex h-full min-h-0 flex-col"
        data-lenis-prevent
      >
        <header className="bb-store-filter-panel__header shrink-0">
          <div className="flex items-start gap-3">
            <span className="bb-store-filter-panel__badge">
              <SlidersHorizontal size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black uppercase tracking-[0.12em]">Filters</h2>
              <p className="text-[11px] font-medium opacity-55 mt-0.5">
                {resultCount} {resultCount === 1 ? 'item' : 'items'} match
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="bb-store-filter-close"
              aria-label="Close filters"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div
          className="bb-store-filter-panel__body bb-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 space-y-6 [-webkit-overflow-scrolling:touch]"
          data-lenis-prevent
        >
          {body}
        </div>

        <footer className="bb-store-filter-panel__footer shrink-0 grid grid-cols-2 gap-2 p-4">
          <button
            type="button"
            onClick={onClearAll}
            disabled={activeFiltersCount === 0}
            className="bb-store-filter-footer-btn bb-store-filter-footer-btn--ghost disabled:opacity-35"
          >
            Clear all
          </button>
          <button type="button" onClick={onClose} className="bb-store-filter-footer-btn bb-store-filter-footer-btn--primary">
            View {resultCount}
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div
      className={`bb-store-filter-panel bb-store-filter-panel--sidebar ${isLight ? 'bb-store-filter-panel--sidebar-light' : ''}`}
      data-lenis-prevent
    >
      <header className="mb-5 pb-4 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="bb-store-filter-panel__badge">
            <SlidersHorizontal size={16} />
          </span>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em]">Refine</h2>
            <p className="text-[10px] font-medium opacity-50 mt-0.5">
              {resultCount} {resultCount === 1 ? 'result' : 'results'}
            </p>
          </div>
        </div>
        {activeFiltersCount > 0 && (
          <button type="button" onClick={onClearAll} className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#CDA032] hover:underline">
            Clear {activeFiltersCount} active filter{activeFiltersCount === 1 ? '' : 's'}
          </button>
        )}
      </header>
      <div
        className="bb-scrollbar min-h-0 max-h-[min(calc(100dvh-9rem),42rem)] overflow-y-auto overscroll-y-contain pr-1 space-y-6 [-webkit-overflow-scrolling:touch]"
        data-lenis-prevent
      >
        {body}
      </div>
    </div>
  );
};
