/**
 * Hover / focus info tip for IMEI / serial help.
 */
import React, { useId, useState } from 'react';
import { Info } from 'lucide-react';
import { TRADE_COPY } from '../../lib/tradeCopy';

export function ImeiInfoTip({ className = '' }: { className?: string }) {
  const tipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full p-0.5 text-[#CDA032] hover:bg-[#CDA032]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]"
        aria-label={TRADE_COPY.config.imeiInfoTitle}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        <Info size={14} aria-hidden />
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 w-64 sm:w-72 rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-3 text-left shadow-xl"
        >
          <span className="block text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-1">
            {TRADE_COPY.config.imeiInfoTitle}
          </span>
          <span className="block text-xs leading-relaxed text-[color:var(--bb-text)] opacity-80">
            {TRADE_COPY.config.imeiInfoBody}
          </span>
        </span>
      )}
    </span>
  );
}
