/**
 * Sticky Trade Summary sidebar — mirrors Repair Summary (read-only).
 * Edits happen via blue Change links in TradeCollapsedSteps.
 */
import React from 'react';
import {
  ClipboardList,
  RefreshCcw,
  Smartphone,
  HardDrive,
  ShoppingBag,
} from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { TRADE_COPY, simVariantLabel } from '../../lib/tradeCopy';
import { formatGhs } from '../../lib/money';
import { computeTradeBalanceDisplay, tradeBalanceAccentClass } from '../../lib/tradeBalanceDisplay';

function IconTile({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-[var(--bb-surface-2)] border border-[var(--bb-border)] flex items-center justify-center shrink-0">
      {children}
    </div>
  );
}

export function TradeSummarySidebar() {
  const { state } = useTradeFlow();
  const est = state.lastEstimate;
  const lock = state.deviceLock;
  const target = state.targetLock;
  const quizDone = state.quizComplete;

  const hasAnything =
    Boolean(state.deviceType) ||
    Boolean(state.model) ||
    Boolean(lock) ||
    Boolean(target) ||
    Boolean(est);

  if (!hasAnything) return null;

  const deviceLine =
    state.model ||
    (state.deviceType === 'ipad'
      ? TRADE_COPY.deviceType.ipad
      : state.deviceType === 'iphone'
        ? TRADE_COPY.deviceType.iphone
        : '');

  return (
    <div className="rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-xl">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-6 border-b border-[var(--bb-border)] pb-4">
        {TRADE_COPY.layout.summaryTitle}
      </h3>
      <div className="space-y-6">
        {deviceLine && (
          <div className="flex gap-4">
            <IconTile>
              <Smartphone size={18} className="text-[#CDA032]" aria-hidden />
            </IconTile>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">
                {TRADE_COPY.layout.summaryDevice}
              </p>
              <p className="text-sm font-bold leading-snug">
                {deviceLine}
                {state.category && !state.model ? ` · ${state.category}` : ''}
              </p>
            </div>
          </div>
        )}

        {lock && (
          <div className="flex gap-4">
            <IconTile>
              <HardDrive size={18} className="text-[#CDA032]" aria-hidden />
            </IconTile>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">
                {TRADE_COPY.layout.summarySpecs}
              </p>
              <p className="text-sm font-bold leading-snug">
                {lock.storage} · {simVariantLabel(lock.sim)}
                {lock.color ? ` · ${lock.color}` : ''}
              </p>
            </div>
          </div>
        )}

        {target && (
          <div className="flex gap-4">
            <IconTile>
              <ShoppingBag size={18} className="text-[#CDA032]" aria-hidden />
            </IconTile>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">
                {TRADE_COPY.layout.summaryTarget}
              </p>
              <p className="text-sm font-bold leading-snug">
                {target.cashOnly
                  ? TRADE_COPY.summary.cashOnlySelected
                  : [
                      target.productName,
                      target.storage,
                      target.ram,
                      target.color,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </p>
            </div>
          </div>
        )}

        {quizDone && (
          <div className="flex gap-4">
            <IconTile>
              <ClipboardList size={18} className="text-[#CDA032]" aria-hidden />
            </IconTile>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">
                {TRADE_COPY.collapsed.condition}
              </p>
              <p className="text-sm font-bold leading-snug">
                {TRADE_COPY.collapsed.conditionDone}
              </p>
            </div>
          </div>
        )}

        {est ? (
          <div className="pt-6 border-t border-[var(--bb-border)]">
            {(() => {
              const balance = computeTradeBalanceDisplay({
                estimate: est.estimate,
                target,
              });
              const accent = tradeBalanceAccentClass(balance.kind);
              const label =
                balance.kind === 'top_up'
                  ? TRADE_COPY.layout.summaryYouAdd
                  : balance.kind === 'refund' || balance.kind === 'cash'
                    ? TRADE_COPY.layout.summaryYouReceive
                    : balance.kind === 'even'
                      ? TRADE_COPY.layout.summaryEven
                      : TRADE_COPY.layout.summaryEstimate;
              return (
                <>
                  <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-2">
                    {label}
                  </p>
                  <p className={`text-2xl font-black tracking-tighter tabular-nums ${accent}`}>
                    {formatGhs(balance.amount)}
                  </p>
                  {balance.upgradePrice != null &&
                    (balance.kind === 'top_up' ||
                      balance.kind === 'refund' ||
                      balance.kind === 'even') && (
                    <div className="mt-3 space-y-1 text-[10px] opacity-60">
                      <div className="flex justify-between gap-2">
                        <span>{TRADE_COPY.questionnaire.liveUpgradePrice}</span>
                        <span className="tabular-nums font-bold">
                          {formatGhs(balance.upgradePrice)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>{TRADE_COPY.questionnaire.liveTradeCredit}</span>
                        <span className="tabular-nums font-bold">
                          {formatGhs(balance.tradeCredit)}
                        </span>
                      </div>
                      {est.deductions.length > 0 && (
                        <p className="text-[9px] text-red-500/80 pt-0.5">
                          {TRADE_COPY.questionnaire.liveDeductions}: −
                          {formatGhs(est.total_deductions)}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold leading-snug text-amber-800 dark:text-amber-100">
                    {TRADE_COPY.layout.summaryEstimateNote}
                  </p>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="pt-2 flex items-center gap-2 text-[color:var(--bb-muted)]">
            <RefreshCcw size={14} className="opacity-40" aria-hidden />
            <p className="text-[10px] uppercase tracking-wider opacity-50">
              {TRADE_COPY.layout.summaryPending}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
