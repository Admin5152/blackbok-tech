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
  return (
    <div className={`rounded-2xl border ${valuation.hasKnownBasePrice ? 'border-[#CDA032]/25 bg-[#CDA032]/5' : 'border-[var(--bb-border)] bg-[var(--bb-surface-2])'} space-y-3 ${compact ? 'p-3' : 'p-4'}`}>
      {valuation.hasKnownBasePrice ? (
        <div className="flex justify-between gap-3 text-sm">
          <span className="opacity-70">Trade-in purchase price</span>
          <span className="font-bold tabular-nums">{formatCurrency(valuation.basePurchasePrice)}</span>
        </div>
      ) : (
        <div className="flex justify-between gap-3 text-sm">
          <span className="opacity-70">Trade-in purchase price</span>
          <span className="font-bold tabular-nums text-[#CDA032]/60">Select storage to see</span>
        </div>
      )}

      {valuation.deductions.length > 0 && (
        <div className="space-y-1.5 border-t border-[#CDA032]/15 pt-2">
          <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Repair deductions</p>
          {valuation.deductions.map((line) => (
            <div key={line.key} className="flex justify-between gap-2 text-xs">
              <span className="opacity-75">
                {line.label}
              </span>
              <span className="font-semibold text-red-500/90 tabular-nums">−{formatCurrency(line.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-2 text-xs pt-1 border-t border-[#CDA032]/10">
            <span className="opacity-70">Total deduction</span>
            <span className="font-bold tabular-nums">−{formatCurrency(valuation.totalDeductionAmount)}</span>
          </div>
        </div>
      )}

      {valuation.hasKnownBasePrice ? (
        <div className="flex justify-between gap-3 pt-2 border-t border-[#CDA032]/20">
          <span className="text-sm font-black uppercase tracking-wide text-[#CDA032]">Final trade-in credit</span>
          <span className="text-lg font-black text-[#CDA032] tabular-nums">
            {formatCurrency(valuation.finalTradeValue)}
          </span>
        </div>
      ) : (
        <div className="flex justify-between gap-3 pt-2 border-t border-[var(--bb-border)]/20">
          <span className="text-sm font-black uppercase tracking-wide text-[#CDA032]/60">Final trade-in credit</span>
          <span className="text-lg font-black text-[#CDA032]/60 tabular-nums">
            Select storage to calculate
          </span>
        </div>
      )}

      {valuation.needsManualReview && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-2 text-xs text-red-400 font-bold">
          Device has severe damage. Final credit requires manual review upon inspection.
        </div>
      )}

      {valuation.hasKnownBasePrice && targetPrice != null && targetPrice > 0 && (
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
        {valuation.hasKnownBasePrice ? 'Estimate only — final credit confirmed after physical inspection.' : 'Select your device storage capacity above to see your complete trade-in estimate.'}
      </p>
    </div>
  );
};
