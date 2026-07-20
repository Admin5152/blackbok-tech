/**
 * Spec Screen 7 — Summary: upgrade balance (top-up vs refund).
 *
 * Compact layout so the full card fits with less scrolling.
 * Money lines ONLY from last compute_trade_estimate RPC + target snapshot.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { TradePhasePills } from '../../components/trade/TradePhasePills';
import { TradeHowItWorksFlipCard } from '../../components/trade/TradeHowItWorksFlipCard';
import { getTradeConfigValue } from '../../lib/tradeApi';
import { formatGhs } from '../../lib/money';
import { TRADE_COPY, simVariantLabel } from '../../lib/tradeCopy';
import { computeTradeBalanceDisplay, tradeBalanceAccentClass } from '../../lib/tradeBalanceDisplay';
import { track, TRADE_ANALYTICS } from '../../lib/analytics';

export function TradeSummaryScreen() {
  const { state } = useTradeFlow();
  const navigate = useNavigate();
  const [validityDays, setValidityDays] = useState('7');

  useEffect(() => {
    if (!state.quizComplete || !state.deviceLock || !state.lastEstimate) {
      void navigate({ to: '/trade/condition', replace: true });
    }
  }, [state.quizComplete, state.deviceLock, state.lastEstimate, navigate]);

  useEffect(() => {
    getTradeConfigValue('estimate_validity_days', '7')
      .then(setValidityDays)
      .catch(() => setValidityDays('7'));
  }, []);

  useEffect(() => {
    track(TRADE_ANALYTICS.FLOW_STEP_VIEW, { step: 'summary' });
  }, []);

  if (!state.deviceLock || !state.lastEstimate) return null;

  const est = state.lastEstimate;
  const lock = state.deviceLock;
  const target = state.targetLock;
  const balance = computeTradeBalanceDisplay({
    estimate: est.estimate,
    target,
  });
  const zeroEstimate = est.estimate <= 0;
  const accent = tradeBalanceAccentClass(balance.kind);
  const isTopUp = balance.kind === 'top_up';
  const isEven = balance.kind === 'even';

  const headlineLabel =
    balance.kind === 'top_up'
      ? TRADE_COPY.summary.headlineTopUp
      : balance.kind === 'refund'
        ? TRADE_COPY.summary.headlineRefund
        : balance.kind === 'even'
          ? TRADE_COPY.summary.headlineEven
          : TRADE_COPY.summary.headlineCash;

  const targetLabel =
    target && !target.cashOnly
      ? [
          target.productName,
          target.storage,
          target.ram,
          target.simType && target.simType !== 'single'
            ? simVariantLabel(target.simType)
            : null,
          target.color,
        ]
          .filter(Boolean)
          .join(' · ')
      : target?.cashOnly
        ? TRADE_COPY.summary.cashOnlySelected
        : null;

  return (
    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-1">
      <TradePhasePills active="review" maxReachable="review" />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-2xl font-black tracking-tight">
            {TRADE_COPY.summary.heading}
          </h2>
          <p className="opacity-55 text-xs sm:text-sm leading-snug">
            {TRADE_COPY.summary.subheading}
          </p>
        </div>
        <TradeHowItWorksFlipCard />
      </div>

      {zeroEstimate && (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
          role="status"
        >
          {TRADE_COPY.summary.manualReview}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface)] overflow-hidden">
        <div className="px-4 py-3.5 sm:px-5 border-b border-[var(--bb-border)] bg-black/[0.03] dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#CDA032] mb-0.5">
                {TRADE_COPY.summary.bannerEyebrow}
              </p>
              <h3 className="text-lg font-black leading-tight">{lock.model}</h3>
              <p className="text-xs opacity-70 mt-0.5">
                {lock.storage} · {simVariantLabel(lock.sim)} · {lock.color}
              </p>
              {targetLabel && (
                <p className="text-[11px] opacity-60 mt-1.5 leading-snug">
                  {TRADE_COPY.summary.tradingInto}:{' '}
                  <span className="font-semibold text-[color:var(--bb-text)]">{targetLabel}</span>
                </p>
              )}
            </div>

            {!zeroEstimate && (
              <div className="text-right shrink-0">
                <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${accent}`}>
                  {headlineLabel}
                </p>
                <p className={`text-2xl sm:text-3xl font-black tabular-nums tracking-tight ${accent}`}>
                  {formatGhs(balance.amount)}
                </p>
              </div>
            )}
          </div>

          {!zeroEstimate && (isTopUp || balance.kind === 'refund' || isEven || balance.formulaHint) && (
            <p className="text-[10px] opacity-50 mt-2 leading-snug">
              {isTopUp
                ? TRADE_COPY.summary.topUpPayableAtBlackBox
                : balance.kind === 'refund'
                  ? TRADE_COPY.summary.balanceRefunded
                  : isEven
                    ? TRADE_COPY.summary.headlineEvenHint
                    : null}
              {balance.formulaHint ? (
                <span className="block tabular-nums mt-0.5">{balance.formulaHint}</span>
              ) : null}
            </p>
          )}

          <p
            className="mt-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-amber-950 dark:text-amber-50"
            role="status"
          >
            <span className="font-black uppercase tracking-wider text-[9px] text-amber-700 dark:text-amber-200 mr-1">
              Estimate only
            </span>
            {TRADE_COPY.summary.estimateIsPreliminary}
          </p>
        </div>

        <div className="px-4 py-3 sm:px-5 space-y-2 text-sm">
          <div className="flex justify-between items-center gap-3 text-xs">
            <span className="opacity-65">{TRADE_COPY.summary.baseValue}</span>
            <span className="font-bold tabular-nums">{formatGhs(est.base_value)}</span>
          </div>

          {est.deductions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#CDA032]">
                {TRADE_COPY.summary.deductions}
              </p>
              {est.deductions.map((d) => (
                <div
                  key={d.component}
                  className="flex justify-between items-center gap-3 text-xs"
                >
                  <span className="opacity-65 capitalize">{d.component.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-red-500/90 tabular-nums">
                    −{formatGhs(d.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!zeroEstimate && (
            <div className="flex justify-between items-center gap-3 text-xs">
              <span className="opacity-65">{TRADE_COPY.summary.tradeInCredit}</span>
              <span className="font-bold tabular-nums text-emerald-600/90">
                {formatGhs(est.estimate)}
              </span>
            </div>
          )}

          {!zeroEstimate && balance.upgradePrice != null && (
            <div className="flex justify-between items-center gap-3 text-xs">
              <span className="opacity-65">{TRADE_COPY.summary.price}</span>
              <span className="font-bold tabular-nums">{formatGhs(balance.upgradePrice)}</span>
            </div>
          )}

          {!zeroEstimate && isTopUp && (
            <div className="flex justify-between items-center gap-3 text-xs font-black pt-1 border-t border-[var(--bb-border)]">
              <span className="text-red-500">{TRADE_COPY.summary.topUpAmountLabel}</span>
              <span className="tabular-nums text-red-500">{formatGhs(balance.amount)}</span>
            </div>
          )}

          {!zeroEstimate && balance.kind === 'refund' && (
            <div className="flex justify-between items-center gap-3 text-xs font-black pt-1 border-t border-[var(--bb-border)]">
              <span className="text-emerald-600">{TRADE_COPY.summary.refundAmountLabel}</span>
              <span className="tabular-nums text-emerald-600">{formatGhs(balance.amount)}</span>
            </div>
          )}

          {!zeroEstimate && isEven && (
            <div className="flex justify-between items-center gap-3 text-xs font-black pt-1 border-t border-[var(--bb-border)]">
              <span className="text-[#CDA032]">{TRADE_COPY.summary.headlineEven}</span>
              <span className="tabular-nums text-[#CDA032]">{formatGhs(0)}</span>
            </div>
          )}

          <p className="text-[10px] opacity-50 leading-snug pt-1">
            {TRADE_COPY.summary.validityPrefix} {validityDays}{' '}
            {TRADE_COPY.summary.validitySuffix}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void navigate({ to: '/trade/details' })}
        className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.18em] text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all w-full sm:w-auto"
      >
        {TRADE_COPY.summary.continueToDetails} <ArrowRight size={16} aria-hidden />
      </button>
    </section>
  );
}
