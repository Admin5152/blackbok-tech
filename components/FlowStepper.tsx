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
}

interface AdminFlowBarProps {
  steps: AdminFlowStep[];
  activeKey: string;
  accent?: string;
}

/** Compact workflow rail for admin review modals. */
export const AdminFlowBar: React.FC<AdminFlowBarProps> = ({ steps, activeKey, accent = '#B38B21' }) => {
  const activeIndex = Math.max(0, steps.findIndex((s) => s.key === activeKey));
  return (
    <div className="flex flex-wrap items-center gap-1 mb-4">
      {steps.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && <span className="text-white/20 text-[10px]">→</span>}
            <span
              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                active
                  ? 'text-black'
                  : done
                    ? 'text-white/70 bg-white/10'
                    : 'text-white/30 bg-white/[0.03]'
              }`}
              style={active ? { backgroundColor: accent } : undefined}
            >
              {s.label}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
