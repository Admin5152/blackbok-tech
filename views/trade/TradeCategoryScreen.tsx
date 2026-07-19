/**
 * Spec Screen 2 — Series / product-line grid (Repair brand/series chrome).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { PageBackButton } from '../../components/PageBackButton';
import { getTradeCategories } from '../../lib/tradeApi';
import {
  categoriesFromPriced,
  peekPricedActiveModels,
} from '../../lib/tradeCatalogCache';
import { TRADE_COPY } from '../../lib/tradeCopy';
import { TRADE_CARD_TILE, tradeCardSelected } from '../../lib/tradeUi';
import { track, TRADE_ANALYTICS } from '../../lib/analytics';
import { useAppContext } from '../../lib/appContext';

function categoryLabel(deviceType: string | null, key: string): string {
  if (deviceType === 'ipad') {
    const map = TRADE_COPY.productLineLabels;
    return map[key as keyof typeof map] ?? key;
  }
  if (key === 'XR') return 'iPhone XR';
  return `iPhone ${key}`;
}

export function TradeCategoryScreen() {
  const { theme } = useAppContext();
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();
  const isLight = theme === 'light';
  const cachedCats =
    state.deviceType != null
      ? (() => {
          const peek = peekPricedActiveModels(state.deviceType);
          return peek ? categoriesFromPriced(state.deviceType, peek) : null;
        })()
      : null;
  const [categories, setCategories] = useState<string[]>(cachedCats ?? []);
  const [loading, setLoading] = useState(cachedCats == null);
  const [error, setError] = useState<string | null>(null);
  const [showNotListed, setShowNotListed] = useState(false);

  useEffect(() => {
    if (!state.deviceType) {
      void navigate({ to: '/trade/type', replace: true });
    }
  }, [state.deviceType, navigate]);

  useEffect(() => {
    track(TRADE_ANALYTICS.FLOW_STEP_VIEW, { step: 'category' });
  }, []);

  useEffect(() => {
    if (!state.deviceType) return;
    const peek = peekPricedActiveModels(state.deviceType);
    if (peek) {
      setCategories(categoriesFromPriced(state.deviceType, peek));
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const cats = await getTradeCategories(state.deviceType!);
        if (!cancelled) setCategories(cats);
      } catch (e) {
        console.warn('getTradeCategories failed', e);
        if (!cancelled) setError(TRADE_COPY.states.errorPricing);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.deviceType]);

  const pick = (category: string) => {
    dispatch({ type: 'SET_CATEGORY', category });
    void navigate({ to: '/trade/model' });
  };

  if (!state.deviceType) return null;

  if (loading) {
    return (
      <p className="text-center py-12 text-sm text-[color:var(--bb-muted)]">
        {TRADE_COPY.states.loadingDevices}
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-center py-12 text-sm text-red-500" role="alert">
        {error}
      </p>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-[color:var(--bb-muted)]">
        {TRADE_COPY.states.emptyDevices}
      </p>
    );
  }

  const typeLabel =
    state.deviceType === 'ipad'
      ? TRADE_COPY.deviceType.ipad
      : TRADE_COPY.deviceType.iphone;

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-70">
            {typeLabel}
          </p>
          <h2 className="text-2xl font-bold tracking-tight">
            {TRADE_COPY.category.heading}
          </h2>
        </div>
        <PageBackButton
          isLight={isLight}
          to="/trade/type"
          label={TRADE_COPY.back}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {categories.map((cat) => {
          const selected = state.category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => pick(cat)}
              className={`${TRADE_CARD_TILE} ${tradeCardSelected(selected)}`}
            >
              <span
                className={`text-sm font-bold text-center leading-snug ${
                  selected ? 'text-[#CDA032]' : ''
                }`}
              >
                {categoryLabel(state.deviceType, cat)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-[color:var(--bb-muted)]">
        <button
          type="button"
          onClick={() => setShowNotListed(true)}
          className="underline underline-offset-2 opacity-70 hover:opacity-100 hover:text-[#CDA032] transition-colors"
        >
          {TRADE_COPY.category.notListed}
        </button>
      </p>

      {showNotListed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trade-not-listed-title"
          onClick={() => setShowNotListed(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3
                id="trade-not-listed-title"
                className="text-lg font-black tracking-tight pr-2"
              >
                {TRADE_COPY.category.notListedTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowNotListed(false)}
                className="rounded-full p-1 opacity-50 hover:opacity-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm leading-relaxed opacity-70">
              {TRADE_COPY.category.notListedBody}
            </p>
            <button
              type="button"
              onClick={() => setShowNotListed(false)}
              className="w-full rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-6 py-3.5"
            >
              {TRADE_COPY.category.notListedClose}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
