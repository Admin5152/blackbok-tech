/**
 * Spec Screen 5 — Target device picker (live shop SKUs from v_trade_targets).
 *
 * Drilldown: category → model card → storage → SIM (when sim_type differs) →
 * colour chips with per-variant display_image swap + effective_price via
 * formatGhs(). Cross-type allowed (iPhone trade-in may pick any sellable target).
 *
 * Out-of-stock colours are HIDDEN (Decision Sheet D11: no stock reservation —
 * first come, first served; stock confirmed at BlackBox visit).
 *
 * "Cash trade-in only" sets targetLock with variantId=null.
 *
 * LOUD: effective_price shown here is a DISPLAY SNAPSHOT only. On submit the
 * server trigger fn_trade_snapshot_target_price re-derives price + top-up.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Banknote, Info, Smartphone } from 'lucide-react';
import { useTradeFlow } from '../../components/trade/TradeFlowProvider';
import { TradePhasePills } from '../../components/trade/TradePhasePills';
import { getTradeTargets } from '../../lib/tradeApi';
import { formatGhs } from '../../lib/money';
import { TRADE_COPY, simVariantLabel } from '../../lib/tradeCopy';
import {
  distinctTargetCategories,
  distinctTargetSims,
  distinctTargetStorage,
  filterInStockTargets,
  findTargetSku,
  groupTargetsByProduct,
  targetColorRows,
  type TargetProductSummary,
} from '../../lib/tradeTargetHelpers';
import type { TradeTargetLock } from '../../lib/tradeFlowState';
import { useAppContext } from '../../lib/appContext';
import type { TradeTargetRow } from '../../types/supabase';

type Phase = 'browse' | 'configure';

export function TradeTargetScreen() {
  const { theme, notify } = useAppContext();
  const isLight = theme === 'light';
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();

  const [rows, setRows] = useState<TradeTargetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('browse');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<TargetProductSummary | null>(null);
  const [storage, setStorage] = useState<string | null>(null);
  const [sim, setSim] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

  // Guard: need deviceLock from Screen 4
  useEffect(() => {
    if (!state.deviceLock) {
      void navigate({ to: '/trade/config', replace: true });
    }
  }, [state.deviceLock, navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // inStockOnly defaults true — D11 hide OOS
        const data = await getTradeTargets({ inStockOnly: true });
        if (!cancelled) setRows(filterInStockTargets(data));
      } catch {
        if (!cancelled) setError(TRADE_COPY.states.errorPricing);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => distinctTargetCategories(rows), [rows]);

  const products = useMemo(() => {
    const filtered = categoryFilter
      ? rows.filter((r) => r.category === categoryFilter)
      : rows;
    return groupTargetsByProduct(filtered);
  }, [rows, categoryFilter]);

  const storageOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return distinctTargetStorage(rows, selectedProduct.productId);
  }, [rows, selectedProduct]);

  /** Products with no storage chip (e.g. accessories) skip the storage step */
  const storageResolved =
    storageOptions.length === 0 || storage != null;

  const simOptions = useMemo(() => {
    if (!selectedProduct || !storageResolved) return [];
    return distinctTargetSims(
      rows,
      selectedProduct.productId,
      storageOptions.length === 0 ? null : storage,
    );
  }, [rows, selectedProduct, storage, storageOptions.length, storageResolved]);

  // Auto-skip SIM when only one (or none / single)
  useEffect(() => {
    if (!selectedProduct || !storageResolved) return;
    if (simOptions.length === 0) {
      if (sim !== null) setSim(null);
      return;
    }
    if (simOptions.length === 1 && sim !== simOptions[0]) {
      setSim(simOptions[0]);
    }
  }, [selectedProduct, storageResolved, simOptions, sim]);

  const colorOptions = useMemo(() => {
    if (!selectedProduct || !storageResolved) return [];
    const needSim = simOptions.length > 0;
    if (needSim && !sim) return [];
    return targetColorRows(
      rows,
      selectedProduct.productId,
      storageOptions.length === 0 ? null : storage,
      sim,
    );
  }, [
    rows,
    selectedProduct,
    storage,
    sim,
    simOptions,
    storageOptions.length,
    storageResolved,
  ]);

  const selectedSku = useMemo(() => {
    if (!selectedProduct || !storageResolved) return null;
    const needSim = simOptions.length > 0;
    if (needSim && !sim) return null;
    // Colour required when multiple colour rows exist; auto-pick sole SKU
    if (colorOptions.length === 1 && color == null) {
      return colorOptions[0];
    }
    if (colorOptions.length > 1 && color == null) return null;
    return findTargetSku(
      rows,
      selectedProduct.productId,
      storageOptions.length === 0 ? null : storage,
      sim,
      color,
    );
  }, [
    rows,
    selectedProduct,
    storage,
    sim,
    color,
    simOptions,
    colorOptions,
    storageOptions.length,
    storageResolved,
  ]);

  // Auto-select the only colour / sole SKU
  useEffect(() => {
    if (colorOptions.length === 1 && color == null) {
      setColor(colorOptions[0].color);
    }
  }, [colorOptions, color]);

  /** Image swaps with colour — prefer variant display_image */
  const previewImage =
    selectedSku?.display_image ??
    selectedProduct?.image ??
    null;

  const chipClass = (selected: boolean) =>
    `rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
      selected
        ? 'border-[#CDA032] bg-[#CDA032]/15 text-[#CDA032]'
        : isLight
          ? 'border-black/10 bg-white hover:border-[#CDA032]/40'
          : 'border-white/10 bg-white/[0.03] hover:border-[#CDA032]/40'
    }`;

  const openConfigure = (p: TargetProductSummary) => {
    setSelectedProduct(p);
    setStorage(null);
    setSim(null);
    setColor(null);
    setPhase('configure');
  };

  const lockTarget = (lock: TradeTargetLock) => {
    dispatch({ type: 'LOCK_TARGET', lock });
    void navigate({ to: '/trade/condition' });
  };

  const handleCashOnly = () => {
    lockTarget({
      productId: null,
      variantId: null,
      productName: null,
      storage: null,
      simType: null,
      color: null,
      effectivePrice: null,
      displayImage: null,
      cashOnly: true,
    });
  };

  const handleConfirmSku = () => {
    if (!selectedProduct || !selectedSku) {
      notify(TRADE_COPY.states.errorPricing, 'error');
      return;
    }
    // DISPLAY SNAPSHOT — server re-derives effective_price on submit (Phase 5).
    // variantId may be null for product-level (no SKU matrix) rows; the
    // insert trigger fn_trade_autoresolve_target fills it when possible.
    lockTarget({
      productId: selectedProduct.productId,
      variantId: selectedSku.variant_id,
      productName: selectedProduct.name,
      storage: selectedSku.storage,
      simType: selectedSku.sim_type,
      color: selectedSku.color,
      effectivePrice: Number(selectedSku.effective_price) || 0,
      displayImage: selectedSku.display_image,
      cashOnly: false,
    });
  };

  if (!state.deviceLock) return null;

  if (loading) {
    return (
      <p className="text-center py-16 text-sm text-[color:var(--bb-muted)]">
        {TRADE_COPY.states.loading}
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-center py-16 text-sm text-red-500" role="alert">
        {error}
      </p>
    );
  }

  // ── Configure SKU phase ──
  if (phase === 'configure' && selectedProduct) {
    return (
      <section aria-labelledby="trade-target-config-heading" className="space-y-6">
        <TradePhasePills active="upgrade" maxReachable="upgrade" />
        <button
          type="button"
          onClick={() => setPhase('browse')}
          className={`text-xs font-bold underline-offset-2 hover:underline ${
            isLight ? 'text-black/50' : 'text-white/45'
          }`}
        >
          ← {TRADE_COPY.back}
        </button>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div
            className={`w-full sm:w-40 aspect-square rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ${
              isLight ? 'bg-black/[0.04]' : 'bg-white/[0.06]'
            }`}
          >
            {previewImage ? (
              <img
                src={previewImage}
                alt=""
                className="w-full h-full object-contain p-3"
              />
            ) : (
              <Smartphone size={40} className="text-[#CDA032]/60" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1
              id="trade-target-config-heading"
              className="text-xl sm:text-2xl font-black tracking-tight"
            >
              {selectedProduct.name}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#CDA032] mt-1">
              {TRADE_COPY.target.configureSku}
            </p>
            {/* DISPLAY-ONLY price — server re-derives on submit */}
            {selectedSku && (
              <p className="mt-3 text-2xl font-black tabular-nums text-[#CDA032]">
                {formatGhs(Number(selectedSku.effective_price) || 0)}
              </p>
            )}
            {selectedProduct.hasTradeModel && (
              <p
                className={`mt-1 text-[10px] ${
                  isLight ? 'text-black/35' : 'text-white/30'
                }`}
              >
                Linked trade model: {selectedProduct.tradeModel}
              </p>
            )}
          </div>
        </div>

        {/* Storage */}
        {storageOptions.length > 0 && (
          <fieldset>
            <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
              {TRADE_COPY.target.storage}
            </legend>
            <div className="flex flex-wrap gap-2">
              {storageOptions.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setStorage(tier);
                    setSim(null);
                    setColor(null);
                  }}
                  className={chipClass(storage === tier)}
                >
                  {tier}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* SIM — only when sim_type differs across in-stock rows */}
        {storageResolved && simOptions.length > 0 && (
          <fieldset>
            <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
              {TRADE_COPY.target.simType}
            </legend>
            <div className="flex flex-wrap gap-2">
              {simOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSim(s);
                    setColor(null);
                  }}
                  className={chipClass(sim === s)}
                >
                  {simVariantLabel(s)}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* Colour — OOS hidden (D11); image swaps via selectedSku.display_image */}
        {storageResolved && (simOptions.length === 0 || sim) && (
          <fieldset>
            <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
              {TRADE_COPY.target.color}
            </legend>
            {colorOptions.length === 0 ? (
              <p className={`text-sm ${isLight ? 'text-black/45' : 'text-white/40'}`}>
                {TRADE_COPY.target.noStockInCategory}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((row) => {
                  const name = row.color ?? 'Standard';
                  const selected =
                    color === row.color ||
                    (colorOptions.length === 1 && selectedSku?.variant_id === row.variant_id);
                  return (
                    <button
                      key={row.variant_id ?? name}
                      type="button"
                      onClick={() => setColor(row.color)}
                      className={`inline-flex items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
                        selected
                          ? 'border-[#CDA032] bg-[#CDA032]/15'
                          : isLight
                            ? 'border-black/10 bg-white hover:border-[#CDA032]/40'
                            : 'border-white/10 bg-white/[0.03] hover:border-[#CDA032]/40'
                      }`}
                    >
                      {name}
                      <span className="text-[10px] font-black text-[#CDA032] tabular-nums">
                        {formatGhs(Number(row.effective_price) || 0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        )}

        {/* D11 availability note */}
        <div
          className={`flex gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${
            isLight
              ? 'border-black/8 bg-black/[0.03] text-black/55'
              : 'border-white/8 bg-white/[0.04] text-white/50'
          }`}
        >
          <Info size={16} className="shrink-0 mt-0.5 text-[#CDA032]" aria-hidden />
          <span>{TRADE_COPY.target.availabilityNote}</span>
        </div>

        <button
          type="button"
          disabled={!selectedSku}
          onClick={handleConfirmSku}
          className="w-full sm:w-auto min-w-[12rem] rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-8 py-4 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 transition-all"
        >
          {TRADE_COPY.target.nextCondition}
        </button>
      </section>
    );
  }

  // ── Browse phase ──
  return (
    <section aria-labelledby="trade-target-heading" className="space-y-6">
      <TradePhasePills active="upgrade" maxReachable="upgrade" />
      <div className="space-y-2">
        <h2
          id="trade-target-heading"
          className="text-2xl font-bold tracking-tight"
        >
          {TRADE_COPY.target.heading}
        </h2>
        <p className={`text-sm ${isLight ? 'text-black/55' : 'text-white/50'}`}>
          {TRADE_COPY.target.subheading}
        </p>
        <p className={`text-xs ${isLight ? 'text-black/45' : 'text-white/40'}`}>
          {TRADE_COPY.target.pickHint}
        </p>
        {state.deviceLock && (
          <p
            className={`text-xs ${
              isLight ? 'text-black/40' : 'text-white/35'
            }`}
          >
            Trading in: {state.deviceLock.model} · {state.deviceLock.storage}
            {state.deviceLock.color ? ` · ${state.deviceLock.color}` : ''}
          </p>
        )}
      </div>

      {/* Cash trade-in only — target=null path */}
      <button
        type="button"
        onClick={handleCashOnly}
        className={`w-full flex items-start gap-4 rounded-2xl border-2 p-4 sm:p-5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
          state.targetLock?.cashOnly
            ? 'border-[#CDA032] bg-[#CDA032]/10'
            : isLight
              ? 'border-black/10 bg-white hover:border-[#CDA032]/40'
              : 'border-white/10 bg-white/[0.03] hover:border-[#CDA032]/40'
        }`}
      >
        <Banknote size={28} className="text-[#CDA032] shrink-0 mt-0.5" aria-hidden />
        <span>
          <span className="block text-sm font-black uppercase tracking-widest">
            {TRADE_COPY.target.cashOnly}
          </span>
          <span
            className={`block text-xs mt-1 leading-relaxed ${
              isLight ? 'text-black/50' : 'text-white/45'
            }`}
          >
            {TRADE_COPY.target.cashOnlyHint}
          </span>
        </span>
      </button>

      {/* Category filter — cross-type allowed */}
      {categories.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
            {TRADE_COPY.target.browseByCategory}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={chipClass(categoryFilter === null)}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={chipClass(categoryFilter === cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* D11 note */}
      <div
        className={`flex gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${
          isLight
            ? 'border-black/8 bg-black/[0.03] text-black/55'
            : 'border-white/8 bg-white/[0.04] text-white/50'
        }`}
      >
        <Info size={16} className="shrink-0 mt-0.5 text-[#CDA032]" aria-hidden />
        <span>{TRADE_COPY.target.availabilityNote}</span>
      </div>

      {products.length === 0 ? (
        <p className="text-center py-12 text-sm text-[color:var(--bb-muted)]">
          {TRADE_COPY.states.emptyTargets}
        </p>
      ) : (
        <>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032]">
            {TRADE_COPY.target.pickModel}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {products.map((p) => {
              const selected =
                state.targetLock &&
                !state.targetLock.cashOnly &&
                state.targetLock.productId === p.productId;
              return (
                <button
                  key={p.productId}
                  type="button"
                  onClick={() => openConfigure(p)}
                  className={`flex flex-col items-center rounded-2xl border-2 p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
                    selected
                      ? 'border-[#CDA032] bg-[#CDA032]/10'
                      : isLight
                        ? 'border-black/10 bg-white hover:border-[#CDA032]/40'
                        : 'border-white/10 bg-white/[0.03] hover:border-[#CDA032]/40'
                  }`}
                >
                  <div
                    className={`w-full aspect-square rounded-xl mb-3 flex items-center justify-center overflow-hidden ${
                      isLight ? 'bg-black/[0.04]' : 'bg-white/[0.06]'
                    }`}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt=""
                        className="w-full h-full object-contain p-2"
                        loading="lazy"
                      />
                    ) : (
                      <Smartphone size={32} className="text-[#CDA032]/60" aria-hidden />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-center leading-snug">
                    {p.name}
                  </span>
                  <span className="mt-1.5 text-[11px] font-black tabular-nums text-[#CDA032]">
                    from {formatGhs(p.priceFrom)}
                  </span>
                  {p.hasTradeModel && (
                    <span
                      className={`mt-1 text-[8px] font-black uppercase tracking-wider ${
                        isLight ? 'text-black/30' : 'text-white/25'
                      }`}
                    >
                      trade-linked
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {state.targetLock && !state.targetLock.cashOnly && (
        <p
          className={`text-center text-xs ${
            isLight ? 'text-black/45' : 'text-white/40'
          }`}
        >
          {TRADE_COPY.target.selectedLabel}: {state.targetLock.productName}
          {state.targetLock.storage ? ` · ${state.targetLock.storage}` : ''}
          {state.targetLock.color ? ` · ${state.targetLock.color}` : ''}
          {' · '}
          {formatGhs(state.targetLock.effectivePrice ?? 0)}
        </p>
      )}
    </section>
  );
}
