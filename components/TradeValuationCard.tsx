import React from 'react';
import type { TradeValuationResult } from '../lib/tradeValuation';
import { formatCurrency } from '../lib/utils';

interface Props {
  valuation: TradeValuationResult;
  targetPrice?: number;
  topUp?: number;
  compact?: boolean;
}

export const TradeValuationCard: React.FC<Props> = ({
  valuation,
  targetPrice,
  topUp,
  compact = false,
}) => {
  if (!valuation.hasKnownBasePrice) {
    return (
      <div className={`rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] ${compact ? 'p-3' : 'p-4'}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-1">Estimated credit</p>
        <p className="text-sm opacity-70">Quote after inspection — we could not match this model to our price list.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-[#CDA032]/25 bg-[#CDA032]/5 space-y-3 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex justify-between gap-3 text-sm">
        <span className="opacity-70">Trade-in purchase price</span>
        <span className="font-bold tabular-nums">{formatCurrency(valuation.basePurchasePrice)}</span>
      </div>

      {valuation.deductions.length > 0 && (
        <div className="space-y-1.5 border-t border-[#CDA032]/15 pt-2">
          <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Repair deductions</p>
          {valuation.deductions.map((line) => (
            <div key={line.key} className="flex justify-between gap-2 text-xs">
              <span className="opacity-75">
                {line.label} ({line.percent}%)
              </span>
              <span className="font-semibold text-red-500/90 tabular-nums">−{formatCurrency(line.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-2 text-xs pt-1 border-t border-[#CDA032]/10">
            <span className="opacity-70">Total deduction ({valuation.totalDeductionPercent}%)</span>
            <span className="font-bold tabular-nums">−{formatCurrency(valuation.totalDeductionAmount)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between gap-3 pt-2 border-t border-[#CDA032]/20">
        <span className="text-sm font-black uppercase tracking-wide text-[#CDA032]">Final trade-in credit</span>
        <span className="text-lg font-black text-[#CDA032] tabular-nums">
          {formatCurrency(valuation.finalTradeValue)}
        </span>
      </div>

      {targetPrice != null && targetPrice > 0 && (
        <>
          <div className="flex justify-between gap-3 text-sm border-t border-[var(--bb-border)]/50 pt-2">
            <span className="opacity-70">New device price</span>
            <span className="font-bold tabular-nums">{formatCurrency(targetPrice)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-sm font-black">Amount to top up</span>
            <span className="text-base font-black tabular-nums">{formatCurrency(topUp ?? 0)}</span>
          </div>
        </>
      )}

      <p className="text-[9px] opacity-50 leading-relaxed">
        Estimate only — final credit confirmed after physical inspection.
      </p>
    </div>
  );
};
