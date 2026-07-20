/**
 * Spec Screen 3 — Model pick (Repair split: preview pane + scrollable grid).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Check, Smartphone } from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { PageBackButton } from '../../components/PageBackButton';
import { getTradeModelsInCategory } from '../../lib/tradeApi';
import {
  modelsInCategoryFromPriced,
  peekPricedActiveModels,
} from '../../lib/tradeCatalogCache';
import { TRADE_COPY } from '../../lib/tradeCopy';
import { TRADE_CARD_MODEL, tradeCardSelected } from '../../lib/tradeUi';
import { track, TRADE_ANALYTICS } from '../../lib/analytics';
import { useAppContext } from '../../lib/appContext';
import type { TradeDeviceRow } from '../../types/supabase';

function shortModelName(model: string, category: string | null): string {
  const stripped = model
    .replace(/^iPhone\s+/i, '')
    .replace(/^iPad\s+/i, '');
  if (category && stripped.toLowerCase().startsWith(category.toLowerCase())) {
    return stripped;
  }
  return stripped;
}

export function TradeModelScreen() {
  const { theme } = useAppContext();
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();
  const isLight = theme === 'light';
  const cachedModels =
    state.deviceType && state.category
      ? (() => {
          const peek = peekPricedActiveModels(state.deviceType);
          return peek
            ? modelsInCategoryFromPriced(state.deviceType, state.category, peek)
            : null;
        })()
      : null;
  const [models, setModels] = useState<TradeDeviceRow[]>(cachedModels ?? []);
  const [loading, setLoading] = useState(cachedModels == null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.deviceType || !state.category) {
      void navigate({
        to: state.deviceType ? '/trade/category' : '/trade/type',
        replace: true,
      });
    }
  }, [state.deviceType, state.category, navigate]);

  useEffect(() => {
    track(TRADE_ANALYTICS.FLOW_STEP_VIEW, { step: 'model' });
  }, []);

  useEffect(() => {
    if (!state.deviceType || !state.category) return;
    const peek = peekPricedActiveModels(state.deviceType);
    if (peek) {
      setModels(
        modelsInCategoryFromPriced(state.deviceType, state.category, peek),
      );
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const rows = await getTradeModelsInCategory(
          state.deviceType!,
          state.category!,
        );
        if (!cancelled) setModels(rows);
      } catch (e) {
        console.warn('getTradeModelsInCategory failed', e);
        if (!cancelled) setError(TRADE_COPY.states.errorPricing);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.deviceType, state.category]);

  const pick = (model: string) => {
    dispatch({ type: 'SET_MODEL', model });
    void navigate({ to: '/trade/config' });
  };

  if (!state.deviceType || !state.category) return null;

  const typeLabel =
    state.deviceType === 'ipad'
      ? TRADE_COPY.deviceType.ipad
      : TRADE_COPY.deviceType.iphone;
  const seriesLabel =
    state.deviceType === 'ipad'
      ? state.category
      : state.category === 'XR'
        ? 'iPhone XR'
        : `iPhone ${state.category}`;

  const selectedRow = models.find((m) => m.model === state.model) ?? null;

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

  if (models.length === 0) {
    return (
      <div className="text-center py-12 px-4 space-y-2 max-w-md mx-auto">
        <p className="text-sm text-[color:var(--bb-muted)]">
          {TRADE_COPY.states.emptyDevices}
        </p>
        <p className="text-xs text-[color:var(--bb-muted)] leading-relaxed">
          {TRADE_COPY.states.emptyDevicesHint}
        </p>
        <PageBackButton
          isLight={isLight}
          to="/trade/category"
          label={TRADE_COPY.back}
        />
      </div>
    );
  }

  return (
    <section className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-80 truncate">
            {typeLabel} › Apple › {seriesLabel}
          </p>
          <h2 className="text-2xl font-bold tracking-tight">
            {TRADE_COPY.model.heading}
          </h2>
        </div>
        <PageBackButton
          isLight={isLight}
          to="/trade/category"
          label={TRADE_COPY.back}
        />
      </div>

      {/* Repair-style split: preview | grid */}
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6">
        <div className="lg:w-[220px] xl:w-[260px] shrink-0">
          <div className="rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-5 flex flex-col items-center justify-center gap-4 min-h-[220px] sticky top-28">
            <div className="w-full aspect-[3/4] max-h-[200px] rounded-2xl bg-[var(--bb-surface-2)] flex items-center justify-center overflow-hidden">
              {selectedRow?.image_url ? (
                <img
                  src={selectedRow.image_url}
                  alt=""
                  width={180}
                  height={240}
                  className="h-full w-auto object-contain p-3 drop-shadow-xl"
                />
              ) : (
                <Smartphone
                  size={48}
                  strokeWidth={1.25}
                  className="text-[color:var(--bb-muted)] opacity-40"
                  aria-hidden
                />
              )}
            </div>
            <div className="text-center">
              {state.model ? (
                <>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#CDA032]/60 mb-0.5">
                    {TRADE_COPY.layout.selected}
                  </p>
                  <p className="text-sm font-black text-[#CDA032] leading-tight">
                    {state.model}
                  </p>
                </>
              ) : (
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">
                  {TRADE_COPY.layout.selectModelHint}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 content-start max-h-[520px] overflow-y-auto pr-1"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(205,160,50,0.3) transparent',
            }}
          >
            {models.map((m) => {
              const selected = state.model === m.model;
              return (
                <button
                  key={m.model}
                  type="button"
                  onClick={() => pick(m.model)}
                  className={`${TRADE_CARD_MODEL} ${tradeCardSelected(selected)}`}
                >
                  {selected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#CDA032] flex items-center justify-center">
                      <Check size={9} className="text-black" strokeWidth={4} aria-hidden />
                    </div>
                  )}
                  <div className="w-full h-14 flex items-center justify-center">
                    {m.image_url ? (
                      <img
                        src={m.image_url}
                        alt=""
                        width={48}
                        height={56}
                        className={`h-12 w-auto object-contain transition-all ${
                          selected
                            ? 'scale-110 drop-shadow-lg'
                            : 'opacity-60 group-hover:opacity-90'
                        }`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <Smartphone
                        size={28}
                        className={selected ? 'text-[#CDA032]' : 'opacity-40'}
                        aria-hidden
                      />
                    )}
                  </div>
                  <p
                    className={`text-[11px] font-black leading-tight text-center ${
                      selected ? 'text-[#CDA032]' : ''
                    }`}
                  >
                    {shortModelName(m.model, state.category)}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--bb-border)]/50">
            <p className="text-xs font-bold uppercase tracking-widest text-[#CDA032] mb-2">
              {TRADE_COPY.config.heading}
            </p>
            <p className="text-xs text-[color:var(--bb-muted)]">
              Storage, SIM and colour unlock on the next step after you pick a
              model.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
