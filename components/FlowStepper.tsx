import React from 'react';
import { Check } from 'lucide-react';

export interface FlowStep {
  id: number;
  label: string;
  hint?: string;
}

interface FlowStepperProps {
  steps: FlowStep[];
  currentStep: number;
  className?: string;
}

/** Horizontal wizard progress — used on customer trade-in & repair flows. */
export const FlowStepper: React.FC<FlowStepperProps> = ({ steps, currentStep, className = '' }) => (
  <nav
    aria-label="Progress"
    className={`rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-4 sm:p-5 ${className}`}
  >
    <ol className="flex items-start gap-0">
      {steps.map((s, i) => {
        const done = currentStep > s.id;
        const active = currentStep === s.id;
        return (
          <li key={s.id} className="flex flex-1 min-w-0 items-start">
            <div className="flex flex-col items-center text-center w-full min-w-0 px-0.5 sm:px-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all ${
                  done
                    ? 'bg-[#CDA032] text-black'
                    : active
                      ? 'bg-[#CDA032]/20 text-[#CDA032] ring-2 ring-[#CDA032]'
                      : 'bg-[var(--bb-surface-2)] text-[color:var(--bb-muted)] border border-[var(--bb-border)]'
                }`}
              >
                {done ? <Check size={14} strokeWidth={3} /> : s.id}
              </div>
              <p
                className={`mt-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider leading-tight ${
                  active ? 'text-[#CDA032]' : done ? 'text-[color:var(--bb-text)]' : 'text-[color:var(--bb-muted)]'
                }`}
              >
                {s.label}
              </p>
              {s.hint && active && (
                <p className="mt-1 text-[9px] text-[color:var(--bb-muted)] leading-snug hidden sm:block max-w-[8rem]">
                  {s.hint}
                </p>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 min-w-[0.5rem] mt-4 rounded-full ${
                  currentStep > s.id ? 'bg-[#CDA032]/60' : 'bg-[var(--bb-border)]'
                }`}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

export interface AdminFlowStep {
  key: string;
  label: string;
  hint?: string;
}

interface AdminFlowBarProps {
  steps: AdminFlowStep[];
  activeKey: string;
  accent?: string;
  /** Show active step hint under the rail */
  showHint?: boolean;
}

/** Compact workflow rail for admin review modals. */
export const AdminFlowBar: React.FC<AdminFlowBarProps> = ({
  steps,
  activeKey,
  accent = '#B38B21',
  showHint = true,
}) => {
  const activeIndex = Math.max(0, steps.findIndex((s) => s.key === activeKey));
  const active = steps[activeIndex];
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => {
          const done = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <React.Fragment key={s.key}>
              {i > 0 && <span className="text-white/15 text-[10px] select-none">→</span>}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'text-black shadow-[0_0_0_1px_rgba(0,0,0,0.15)]'
                    : done
                      ? 'text-white/75 bg-white/10'
                      : 'text-white/28 bg-white/[0.03]'
                }`}
                style={isActive ? { backgroundColor: accent } : undefined}
              >
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black ${
                    isActive ? 'bg-black/20 text-black' : done ? 'bg-white/15 text-white/80' : 'bg-white/5 text-white/35'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                {s.label}
              </span>
            </React.Fragment>
          );
        })}
      </div>
      {showHint && active?.hint && (
        <p className="mt-2.5 text-[11px] leading-snug text-white/50">
          <span className="font-black uppercase tracking-wider text-[9px] text-white/35 mr-1.5">
            Now
          </span>
          {active.hint}
        </p>
      )}
    </div>
  );
};
