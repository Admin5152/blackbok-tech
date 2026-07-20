/**
 * Compact tap-to-flip explainer — slim chip; opens a short math card.
 */
import React, { useId, useState } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { TRADE_COPY } from '../../lib/tradeCopy';

export function TradeHowItWorksFlipCard() {
  const [flipped, setFlipped] = useState(false);
  const panelId = useId();

  return (
    <div className="w-full sm:w-auto sm:min-w-[15rem] sm:max-w-[18rem] [perspective:1200px]">
      <button
        type="button"
        aria-expanded={flipped}
        aria-controls={panelId}
        onClick={() => setFlipped((v) => !v)}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bb-bg)] rounded-xl"
      >
        <div
          id={panelId}
          className={`relative w-full [transform-style:preserve-3d] transition-transform duration-500 ease-[cubic-bezier(0.4,0.2,0.2,1)] ${
            flipped ? 'min-h-[9.5rem]' : 'min-h-[2.5rem]'
          }`}
          style={{
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div
            className={`absolute inset-0 flex items-center gap-2 rounded-xl border border-[#CDA032]/30 bg-[#CDA032]/[0.07] px-2.5 py-1.5 [backface-visibility:hidden] ${
              flipped ? 'pointer-events-none' : ''
            }`}
          >
            <Info size={14} className="shrink-0 text-[#CDA032]" aria-hidden />
            <span className="min-w-0 flex-1 text-[10px] font-black uppercase tracking-wider text-[#CDA032] truncate">
              {TRADE_COPY.summary.howItWorksTitle}
            </span>
            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-[#CDA032]/80">
              Flip
            </span>
          </div>

          <div
            className={`absolute inset-0 rounded-xl border border-[#CDA032]/40 bg-[var(--bb-surface)] px-2.5 py-2 [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden ${
              flipped ? '' : 'pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-[#CDA032]">
                {TRADE_COPY.summary.howItWorksTitle}
              </p>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider text-[#CDA032]/80">
                <RotateCcw size={10} aria-hidden />
                Back
              </span>
            </div>

            <ol className="space-y-1">
              {TRADE_COPY.summary.howItWorksSteps.map((step, i) => (
                <li key={step} className="flex gap-1.5 text-[10px] leading-snug">
                  <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#CDA032] text-[8px] font-black text-black mt-px">
                    {i + 1}
                  </span>
                  <span className="opacity-85">{step}</span>
                </li>
              ))}
            </ol>

            <p className="mt-1.5 rounded-md border border-[#CDA032]/20 bg-[#CDA032]/[0.06] px-1.5 py-1 text-[10px] leading-snug font-medium opacity-90">
              {TRADE_COPY.summary.howItWorksExample}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
