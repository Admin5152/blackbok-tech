/**
 * Upgrade → Condition → Review pills (matches legacy Trades / screenshot flow).
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { TRADE_COPY } from '../../lib/tradeCopy';

export type TradeDetailPhase = 'upgrade' | 'condition' | 'review';

const PHASES: Array<{
  id: TradeDetailPhase;
  label: string;
  path: '/trade/target' | '/trade/condition' | '/trade/summary';
  order: number;
}> = [
  {
    id: 'upgrade',
    label: TRADE_COPY.phases.upgrade,
    path: '/trade/target',
    order: 1,
  },
  {
    id: 'condition',
    label: TRADE_COPY.phases.condition,
    path: '/trade/condition',
    order: 2,
  },
  {
    id: 'review',
    label: TRADE_COPY.phases.review,
    path: '/trade/summary',
    order: 3,
  },
];

export function TradePhasePills({
  active,
  /** Highest phase the user may jump back to (completed upstream) */
  maxReachable = 'condition',
}: {
  active: TradeDetailPhase;
  maxReachable?: TradeDetailPhase;
}) {
  const navigate = useNavigate();
  const activeOrder = PHASES.find((p) => p.id === active)?.order ?? 1;
  const maxOrder = PHASES.find((p) => p.id === maxReachable)?.order ?? activeOrder;

  return (
    <nav
      aria-label={TRADE_COPY.phases.navLabel}
      className="flex flex-wrap items-center gap-2 sm:gap-3"
    >
      {PHASES.map(({ id, label, path, order }, i) => {
        const isActive = id === active;
        const canJump = order < activeOrder && order <= maxOrder;
        return (
          <React.Fragment key={id}>
            {i > 0 && (
              <ChevronRight size={14} className="opacity-30 shrink-0" aria-hidden />
            )}
            <button
              type="button"
              disabled={!isActive && !canJump}
              onClick={() => {
                if (!canJump) return;
                void navigate({ to: path });
              }}
              className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                isActive
                  ? 'bg-[#CDA032] text-black'
                  : canJump
                    ? 'bg-[var(--bb-surface-2)] border border-[var(--bb-border)] opacity-80 hover:border-[#CDA032]/40'
                    : 'opacity-40 cursor-not-allowed'
              }`}
            >
              {label}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
