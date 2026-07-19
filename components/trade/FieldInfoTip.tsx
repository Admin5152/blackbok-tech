/**
 * Tap/click info tip — shows how to find IMEI / serial (and similar help).
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';

type Props = {
  title: string;
  body: string;
  className?: string;
  label?: string;
};

export function FieldInfoTip({ title, body, className = '', label }: Props) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full p-0.5 text-[#CDA032] hover:bg-[#CDA032]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]"
        aria-label={label || title}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
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
            {title}
          </span>
          <span className="block text-xs leading-relaxed text-[color:var(--bb-text)] opacity-80">
            {body}
          </span>
        </span>
      )}
    </span>
  );
}
