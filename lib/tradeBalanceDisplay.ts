/**
 * Upgrade balance display — what the customer pays or receives.
 *
 * Formula (upgrade path):
 *   trade_credit = compute_trade_estimate (base − questionnaire deductions)
 *   difference   = upgrade_device_price − trade_credit
 *
 *   Example: upgrade ₵12,000 − trade-in credit ₵4,000 = ₵8,000 top-up.
 *   Trading a higher-credit phone into a cheaper upgrade → refund (we owe them).
 *
 *   difference > 0  → top-up (red) — customer adds cash
 *   difference < 0  → refund (green) — we balance them
 *   difference = 0  → even (yellow / brand gold) — no cash either way
 *
 * Cash-only: show trade credit as green “you receive”.
 * Money amounts always come from server estimate + target snapshot price.
 */
import type { TradeTargetLock } from './tradeFlowState';
import { computeRefundFromCredit, computeTopUpFromCredit } from './skuPrice';

export type TradeBalanceKind = 'top_up' | 'refund' | 'even' | 'cash' | 'credit';

export interface TradeBalanceDisplay {
  kind: TradeBalanceKind;
  /** Absolute GHS amount to show as the headline */
  amount: number;
  /** Signed: positive = customer pays, negative = we pay customer */
  signedDifference: number | null;
  tradeCredit: number;
  upgradePrice: number | null;
  /** Plain equation for UI: "Upgrade − credit = …" */
  formulaHint: string | null;
}

export function computeTradeBalanceDisplay(opts: {
  /** Server trade-in credit after deductions */
  estimate: number;
  target: TradeTargetLock | null;
}): TradeBalanceDisplay {
  const tradeCredit = Math.max(0, Number(opts.estimate) || 0);
  const target = opts.target;

  if (!target || target.cashOnly) {
    return {
      kind: 'cash',
      amount: tradeCredit,
      signedDifference: null,
      tradeCredit,
      upgradePrice: null,
      formulaHint: null,
    };
  }

  const upgradePrice = Number(target.effectivePrice);
  // Missing / unset upgrade price → show credit only (never invent a top-up)
  if (!Number.isFinite(upgradePrice) || !(upgradePrice > 0)) {
    return {
      kind: 'credit',
      amount: tradeCredit,
      signedDifference: null,
      tradeCredit,
      upgradePrice: null,
      formulaHint: null,
    };
  }

  const topUp = computeTopUpFromCredit(upgradePrice, tradeCredit);
  const refund = computeRefundFromCredit(upgradePrice, tradeCredit);
  const signed = upgradePrice - tradeCredit;
  const formulaHint = `Phone you’re trading into GH₵${Math.round(upgradePrice).toLocaleString('en-GH')} − your phone’s value GH₵${Math.round(tradeCredit).toLocaleString('en-GH')}`;

  if (topUp > 0) {
    return {
      kind: 'top_up',
      amount: topUp,
      signedDifference: signed,
      tradeCredit,
      upgradePrice,
      formulaHint: `${formulaHint} = you add GH₵${topUp.toLocaleString('en-GH')}`,
    };
  }
  if (refund > 0) {
    return {
      kind: 'refund',
      amount: refund,
      signedDifference: signed,
      tradeCredit,
      upgradePrice,
      formulaHint: `${formulaHint} = you receive GH₵${refund.toLocaleString('en-GH')}`,
    };
  }
  return {
    kind: 'even',
    amount: 0,
    signedDifference: 0,
    tradeCredit,
    upgradePrice,
    formulaHint: `${formulaHint} = even`,
  };
}

export function isBalancePositiveForCustomer(kind: TradeBalanceKind): boolean {
  return kind === 'refund' || kind === 'cash' || kind === 'credit';
}

export function isBalanceTopUp(kind: TradeBalanceKind): boolean {
  return kind === 'top_up';
}

export function isBalanceEven(kind: TradeBalanceKind): boolean {
  return kind === 'even';
}

/**
 * Accent text class for the headline amount.
 * Red = you pay · Yellow = even · Green = we pay you / cash credit.
 */
export function tradeBalanceAccentClass(kind: TradeBalanceKind): string {
  if (kind === 'top_up') return 'text-red-500';
  if (kind === 'even') return 'text-[#CDA032]';
  if (kind === 'refund' || kind === 'cash' || kind === 'credit') return 'text-emerald-600';
  return 'text-[#CDA032]';
}
