import React from 'react';
import { X, Tag, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import { Category } from '../types';
import { formatCurrency } from '../lib/utils';

export type StoreCategoryRow =
  | { key: string; label: string; value: 'All'; icon: React.ReactNode; count: number }
  | { key: string; label: string; value: Category; icon: React.ReactNode; count: number }
  | { key: string; label: string; value: '__promotions__'; icon: React.ReactNode; count: number };

export const STORE_PRICE_SLIDER_MAX = 15000;
export const STORE_PRICE_SLIDER_STEP = 100;

const PRICE_PRESETS = [
  { label: 'Under GH₵5k', range: { min: 0, max: 5000 } },
  { label: 'GH₵5k – 10k', range: { min: 5000, max: 10000 } },
  { label: 'GH₵10k+', range: { min: 10000, max: STORE_PRICE_SLIDER_MAX } },
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
  onPresetPrice: (range: { min: number; max: number }) => void;
  onPriceRangeChange: (range: { min: number; max: number }) => void;
  activeFiltersCount: number;
  onClearAll: () => void;
  onClose?: () => void;
  resultCount: number;
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
      <div className="bb-store-filter-slider__labels">
        <span>GH₵0</span>
        <span>GH₵{STORE_PRICE_SLIDER_MAX.toLocaleString()}</span>
      </div>
      <div className="bb-store-filter-slider__wrap">
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
  onAdjustMin,
  onAdjustMax,
  onPresetPrice,
  onPriceRangeChange,
  activeFiltersCount,
  onClearAll,
  onClose,
  resultCount,
}) => {
  const isDrawer = variant === 'drawer';
  const borderSubtle = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const inputBg = isLight ? '#ffffff' : '#0a0a0a';

  const isPresetActive = (min: number, max: number) =>
    priceRange.min === min && priceRange.max === max;

  const body = (
  <>
      {/* Categories */}
      <section className="bb-store-filter-section">
        <h3 className="bb-store-filter-section__title">Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categoryOptions.map((cat) => {
            const active = isCategoryRowActive(cat);
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onCategoryClick(cat)}
                className={`${chipClass(active, isLight)} w-full text-left`}
              >
                <span className="bb-store-filter-chip__icon">{cat.icon}</span>
                <span className="bb-store-filter-chip__label min-w-0 truncate">{cat.label}</span>
                <span className="bb-store-filter-chip__count">{cat.count}</span>
              </button>
            );
          })}
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

      {/* Price */}
      <section className="bb-store-filter-section">
        <h3 className="bb-store-filter-section__title">Price</h3>
        <p className="bb-store-filter-range-summary">
          {formatCurrency(priceRange.min)} – {formatCurrency(priceRange.max)}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {PRICE_PRESETS.map(({ label, range }) => {
            const active = isPresetActive(range.min, range.max);
            return (
              <button
                key={label}
                type="button"
                onClick={() => onPresetPrice(range)}
                className={`bb-store-filter-preset ${active ? 'bb-store-filter-preset--active' : isLight ? 'bb-store-filter-preset--light' : 'bb-store-filter-preset--dark'}`}
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

        <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-50 mb-3">Custom range</p>
        <div className="space-y-3">
          {(['Min', 'Max'] as const).map((kind) => {
            const isMin = kind === 'Min';
            return (
              <div key={kind}>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5 block">
                  {kind} (GH₵)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => (isMin ? onAdjustMin(-100) : onAdjustMax(-100))}
                    className="bb-store-filter-step"
                    aria-label={`Decrease ${kind.toLowerCase()} price`}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={15000}
                    step={100}
                    value={isMin ? minInput : maxInput}
                    onChange={(e) => (isMin ? onMinInputChange(e.target.value) : onMaxInputChange(e.target.value))}
                    onBlur={onCommitPrice}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        onCommitPrice();
                      }
                    }}
                    className="bb-store-filter-input flex-1"
                    style={{
                      backgroundColor: inputBg,
                      borderColor: borderSubtle,
                      color: isLight ? '#000' : '#fff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => (isMin ? onAdjustMin(100) : onAdjustMax(100))}
                    className="bb-store-filter-step"
                    aria-label={`Increase ${kind.toLowerCase()} price`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );

  if (isDrawer) {
    return (
      <div className="bb-store-filter-panel bb-store-filter-panel--drawer flex h-full min-h-0 flex-col">
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

        <div className="bb-store-filter-panel__body flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 space-y-6 [-webkit-overflow-scrolling:touch]">
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
    <div className={`bb-store-filter-panel bb-store-filter-panel--sidebar ${isLight ? 'bb-store-filter-panel--sidebar-light' : ''}`}>
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
      <div className="space-y-6">{body}</div>
    </div>
  );
};
