/**
 * Spec Screen 7 — Summary: upgrade balance (top-up vs refund).
 *
 * Headline money = upgrade_price − trade_credit (after deductions).
 * Red = customer tops up · Green = we balance / cash to them.
 * Breakdown still shows base, deductions, credit, and upgrade price.
 * Money lines ONLY from last compute_trade_estimate RPC + target snapshot.
 * TODO(D8): payment line is placeholder until client answers top-up method.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Info } from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { TradePhasePills } from '../../components/trade/TradePhasePills';
import { getTradeConfigValue } from '../../lib/tradeApi';
import { formatGhs } from '../../lib/money';
import { TRADE_COPY, simVariantLabel } from '../../lib/tradeCopy';
import { computeTradeBalanceDisplay } from '../../lib/tradeBalanceDisplay';
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
  const isTopUp = balance.kind === 'top_up';
  const isGreen =
    balance.kind === 'refund' ||
    balance.kind === 'cash' ||
    balance.kind === 'even' ||
    balance.kind === 'credit';

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
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
      <TradePhasePills active="review" maxReachable="review" />
      <div className="space-y-2">
        <h2 className="text-3xl font-black tracking-tight">
          {TRADE_COPY.summary.heading}
        </h2>
        <p className="opacity-60 text-sm">{TRADE_COPY.summary.subheading}</p>
      </div>

      {zeroEstimate && (
        <div
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
          role="status"
        >
          {TRADE_COPY.summary.manualReview}
        </div>
      )}

      <div className="rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] overflow-hidden shadow-2xl">
        <div className="p-6 sm:p-8 border-b border-[var(--bb-border)] bg-black/5 dark:bg-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#CDA032]/10 blur-3xl rounded-full" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-2 relative">
            {TRADE_COPY.summary.bannerEyebrow}
          </p>
          <h3 className="text-2xl font-black mb-1 relative">{lock.model}</h3>
          <p className="text-base sm:text-lg opacity-80 relative">
            {lock.storage} · {simVariantLabel(lock.sim)} · {lock.color}
          </p>
          {targetLabel && (
            <p className="text-sm opacity-70 mt-3 relative">
              {TRADE_COPY.summary.tradingInto}:{' '}
              <span className="font-semibold text-[color:var(--bb-text)]">
                {targetLabel}
              </span>
            </p>
          )}

          {/* Headline = difference (top-up / refund), not raw trade credit */}
          {!zeroEstimate && (
            <div className="mt-6 relative">
              <p
                className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                  isTopUp ? 'text-red-500' : 'text-emerald-600'
                }`}
              >
                {headlineLabel}
              </p>
              <p
                className={`text-4xl sm:text-5xl font-black tabular-nums tracking-tighter ${
                  isTopUp ? 'text-red-500' : isGreen ? 'text-emerald-600' : 'text-[#CDA032]'
                }`}
              >
                {formatGhs(balance.amount)}
              </p>
              {isTopUp && (
                <p className="text-xs text-red-500/80 mt-2">
                  {TRADE_COPY.summary.topUpPayableAtBlackBox}
                </p>
              )}
              {balance.kind === 'refund' && (
                <p className="text-xs text-emerald-600/80 mt-2">
                  {TRADE_COPY.summary.balanceRefunded}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="opacity-70">{TRADE_COPY.summary.baseValue}</span>
              <span className="font-bold tabular-nums">{formatGhs(est.base_value)}</span>
            </div>

            {est.deductions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">
                  {TRADE_COPY.summary.deductions}
                </p>
                {est.deductions.map((d) => (
                  <div
                    key={d.component}
                    className="flex justify-between items-center text-sm font-medium"
                  >
                    <span className="opacity-70 capitalize">
                      {d.component.replace(/_/g, ' ')}
                    </span>
                    <span className="font-bold text-red-500/90 tabular-nums">
                      −{formatGhs(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!zeroEstimate && (
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="opacity-70">{TRADE_COPY.summary.tradeInCredit}</span>
                <span className="font-bold tabular-nums text-emerald-600/90">
                  {formatGhs(est.estimate)}
                </span>
              </div>
            )}

            {!zeroEstimate && balance.upgradePrice != null && (
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="opacity-70">{TRADE_COPY.summary.price}</span>
                <span className="font-bold tabular-nums">
                  {formatGhs(balance.upgradePrice)}
                </span>
              </div>
            )}

            {!zeroEstimate && isTopUp && (
              <div className="flex justify-between items-center text-sm font-black pt-2">
                <span className="text-red-500">{TRADE_COPY.summary.topUpAmountLabel}</span>
                <span className="tabular-nums text-red-500">
                  {formatGhs(balance.amount)}
                </span>
              </div>
            )}

            {!zeroEstimate && balance.kind === 'refund' && (
              <div className="flex justify-between items-center text-sm font-black pt-2">
                <span className="text-emerald-600">
                  {TRADE_COPY.summary.refundAmountLabel}
                </span>
                <span className="tabular-nums text-emerald-600">
                  {formatGhs(balance.amount)}
                </span>
              </div>
            )}

            <p className="text-xs leading-relaxed opacity-60 pt-2">
              {TRADE_COPY.summary.estimateIsPreliminary}
            </p>

            <div className="flex gap-3 items-start p-4 bg-[#CDA032]/10 rounded-xl mt-2">
              <Info size={16} className="text-[#CDA032] shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs leading-relaxed text-[#CDA032] font-semibold">
                {TRADE_COPY.summary.validityPrefix} {validityDays}{' '}
                {TRADE_COPY.summary.validitySuffix}
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed opacity-50 border-t border-[var(--bb-border)] pt-6">
            {TRADE_COPY.summary.disclaimer}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void navigate({ to: '/trade/details' })}
        className="flex items-center justify-center gap-3 px-10 py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all w-full sm:w-auto shadow-[0_20px_40px_rgba(205,160,50,0.25)]"
      >
        {TRADE_COPY.summary.continueToDetails} <ArrowRight size={18} aria-hidden />
      </button>
    </section>
  );
}
