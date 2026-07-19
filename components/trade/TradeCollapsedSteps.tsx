/**
 * Repair-style collapsed prior steps with blue Change links.
 * Sidebar stays read-only — edit always happens here in the main column.
 */
import React from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useTradeFlow } from './TradeFlowProvider';
import { TRADE_COPY, simVariantLabel } from '../../lib/tradeCopy';
import { formatGhs } from '../../lib/money';

type TradePath =
  | '/trade/type'
  | '/trade/category'
  | '/trade/model'
  | '/trade/config'
  | '/trade/target'
  | '/trade/condition'
  | '/trade/summary'
  | '/trade/details';

const PATH_STEP: Record<string, number> = {
  '/trade/type': 1,
  '/trade/category': 2,
  '/trade/model': 3,
  '/trade/config': 4,
  '/trade/target': 5,
  '/trade/condition': 6,
  '/trade/summary': 7,
  '/trade/details': 8,
};

function seriesLabel(
  deviceType: string | null,
  category: string | null,
): string {
  if (!category) return '';
  if (deviceType === 'ipad') {
    const map = TRADE_COPY.productLineLabels;
    return map[category as keyof typeof map] ?? category;
  }
  if (category === 'XR') return 'iPhone XR';
  return `iPhone ${category}`;
}

function CollapsedRow({
  label,
  value,
  changeLabel = TRADE_COPY.collapsed.change,
  secondaryLabel,
  onChange,
  onSecondary,
}: {
  label?: string;
  value: string;
  changeLabel?: string;
  secondaryLabel?: string;
  onChange: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-5 sm:py-6 border-b border-[var(--bb-border)] animate-in fade-in">
      <div className="space-y-1 min-w-0">
        {label && (
          <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">
            {label}
          </p>
        )}
        <h3 className="text-lg sm:text-xl font-black truncate">{value}</h3>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
        {onSecondary && secondaryLabel && (
          <button
            type="button"
            onClick={onSecondary}
            className="text-xs font-bold text-[color:var(--bb-muted)] hover:text-[#CDA032] transition-colors px-2 py-1 rounded-lg border border-transparent hover:border-[#CDA032]/30"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onChange}
          className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors"
        >
          {changeLabel}
        </button>
      </div>
    </div>
  );
}

export function TradeCollapsedSteps() {
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const step = PATH_STEP[pathname] ?? 1;

  if (step <= 1 || pathname.includes('/confirmation')) return null;

  const typeLabel =
    state.deviceType === 'ipad'
      ? TRADE_COPY.deviceType.ipad
      : state.deviceType === 'iphone'
        ? TRADE_COPY.deviceType.iphone
        : '';
  const series = seriesLabel(state.deviceType, state.category);
  const lock = state.deviceLock;
  const target = state.targetLock;
  const est = state.lastEstimate;

  const go = (to: TradePath) => {
    void navigate({ to });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Reopen model picker; keep type + series (Repair “Change model”) */
  const changeModelKeepSeries = () => {
    if (state.category) {
      dispatch({ type: 'SET_CATEGORY', category: state.category });
    }
    go('/trade/model');
  };

  /** Full device reopen from later major steps */
  const changeDeviceDetails = () => {
    if (state.deviceType && state.category) {
      dispatch({ type: 'SET_CATEGORY', category: state.category });
      go('/trade/model');
      return;
    }
    if (state.deviceType) {
      go('/trade/category');
      return;
    }
    go('/trade/type');
  };

  const changeTarget = () => {
    dispatch({ type: 'CLEAR_TARGET' });
    dispatch({ type: 'RESET_QUIZ' });
    go('/trade/target');
  };

  const changeCondition = () => {
    dispatch({ type: 'RESET_QUIZ' });
    go('/trade/condition');
  };

  const deviceSummary = lock
    ? `${lock.model} · ${lock.storage} · ${simVariantLabel(lock.sim)}`
    : state.model
      ? state.model
      : [typeLabel, series].filter(Boolean).join(' · ');

  const targetSummary = target
    ? target.cashOnly
      ? TRADE_COPY.summary.cashOnlySelected
      : [target.productName, target.storage].filter(Boolean).join(' · ')
    : '';

  const quizCount = Object.keys(state.quizAnswers).length;
  const conditionSummary =
    state.quizComplete && est
      ? TRADE_COPY.collapsed.conditionDone
      : quizCount > 0
        ? TRADE_COPY.collapsed.conditionInProgress
        : '';

  /* ── Early wizard: granular collapses (Repair sub-step style) ── */
  if (step <= 4) {
    return (
      <div className="mb-2">
        {step > 1 && state.deviceType && (
          <CollapsedRow
            value={typeLabel}
            onChange={() => go('/trade/type')}
          />
        )}
        {step > 2 && state.category && (
          <CollapsedRow
            value={series}
            changeLabel={TRADE_COPY.collapsed.changeSeries}
            onChange={() => go('/trade/category')}
          />
        )}
        {step > 3 && state.model && (
          <CollapsedRow
            value={state.model}
            changeLabel={TRADE_COPY.collapsed.changeModel}
            secondaryLabel={TRADE_COPY.collapsed.differentModel}
            onChange={() => go('/trade/model')}
            onSecondary={changeModelKeepSeries}
          />
        )}
      </div>
    );
  }

  /* ── Later steps: major section collapses (Repair step > N) ── */
  return (
    <div className="mb-2">
      {deviceSummary && (
        <CollapsedRow
          label={TRADE_COPY.collapsed.deviceDetails}
          value={deviceSummary}
          onChange={changeDeviceDetails}
        />
      )}
      {step > 5 && target && (
        <CollapsedRow
          label={TRADE_COPY.collapsed.tradingInto}
          value={targetSummary}
          onChange={changeTarget}
        />
      )}
      {step > 6 && conditionSummary && (
        <CollapsedRow
          label={TRADE_COPY.collapsed.condition}
          value={conditionSummary}
          onChange={changeCondition}
        />
      )}
      {step > 7 && est && (
        <CollapsedRow
          label={TRADE_COPY.collapsed.estimate}
          value={formatGhs(est.estimate)}
          onChange={() => go('/trade/summary')}
        />
      )}
    </div>
  );
}
