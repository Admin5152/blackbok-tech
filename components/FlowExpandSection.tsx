/**
 * Expandable section with a gold “expand” tag — used for easy-to-miss
 * authorize / terms blocks on Repair (and Trade details).
 */
import React from 'react';
import { ChevronDown } from 'lucide-react';

type Props = {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  /** Soft highlight so the block isn’t missed on mobile */
  emphasize?: boolean;
  className?: string;
  tagLabel?: string;
};

export function FlowExpandSection({
  title,
  summary,
  open,
  onToggle,
  children,
  emphasize = false,
  className = '',
  tagLabel = 'Tap to expand',
}: Props) {
  return (
    <section
      className={`rounded-3xl border overflow-hidden transition-colors ${
        emphasize
          ? 'border-[#CDA032]/55 bg-[#CDA032]/10 shadow-[0_0_0_1px_rgba(205,160,50,0.12)]'
          : 'border-[var(--bb-border)] bg-[var(--bb-surface)]'
      } ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-start sm:items-center gap-3 px-4 sm:px-5 py-4 text-left"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base sm:text-lg font-black tracking-tight">{title}</h3>
            <span className="inline-flex items-center rounded-full border border-[#CDA032]/45 bg-[#CDA032]/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#CDA032]">
              {open ? 'Open' : tagLabel}
            </span>
          </div>
          {!open && summary ? (
            <p className="text-xs sm:text-sm opacity-60 leading-snug line-clamp-2">{summary}</p>
          ) : null}
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 mt-0.5 text-[#CDA032] transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="px-4 sm:px-5 pb-5 pt-0 border-t border-[var(--bb-border)]/60 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="pt-4">{children}</div>
        </div>
      ) : null}
    </section>
  );
}

type ChoiceCardProps = {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
};

/** Large tappable choice — clearer than a native &lt;select&gt; on mobile. */
export function FlowChoiceCard({ selected, title, description, onClick }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex-1 w-full p-4 text-left rounded-2xl border transition-all ${
        selected
          ? 'bg-[#CDA032]/12 border-[#CDA032] ring-1 ring-[#CDA032]/40'
          : 'bg-[var(--bb-surface-2)] border-[var(--bb-border)] opacity-80 hover:opacity-100 hover:border-[#CDA032]/35'
      }`}
    >
      <p className={`text-sm font-black ${selected ? 'text-[#CDA032]' : ''}`}>{title}</p>
      <p className="text-[11px] mt-1.5 leading-snug opacity-65">{description}</p>
    </button>
  );
}
