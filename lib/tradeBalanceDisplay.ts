/**
 * Upgrade balance display — what the customer pays or receives.
 *
 * Formula (upgrade path):
 *   difference = upgrade_device_price − trade_credit
 *   trade_credit = compute_trade_estimate (base − questionnaire deductions)
 *
 *   difference > 0  → top-up (red) — customer adds cash to get the new phone
 *   difference < 0  → refund (green) — trade credit exceeds upgrade price
 *   difference = 0  → even
 *
 * Cash-only: show trade credit as green “you receive”.
 * Money amounts always come from server estimate + target snapshot price.
 */
import type { TradeTargetLock } from './tradeFlowState';

export type TradeBalanceKind = 'top_up' | 'refund' | 'even' | 'cash' | 'credit';

export interface TradeBalanceDisplay {
  kind: TradeBalanceKind;
  /** Absolute GHS amount to show as the headline */
  amount: number;
  /** Signed: positive = customer pays, negative = we pay customer */
  signedDifference: number | null;
  tradeCredit: number;
  upgradePrice: number | null;
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
    };
  }

  const upgradePrice = Number(target.effectivePrice);
  if (!Number.isFinite(upgradePrice) || upgradePrice < 0) {
    // No usable upgrade price yet — show credit only
    return {
      kind: 'credit',
      amount: tradeCredit,
      signedDifference: null,
      tradeCredit,
      upgradePrice: null,
    };
  }

  const signed = upgradePrice - tradeCredit;
  if (signed > 0) {
    return {
      kind: 'top_up',
      amount: signed,
      signedDifference: signed,
      tradeCredit,
      upgradePrice,
    };
  }
  if (signed < 0) {
    return {
      kind: 'refund',
      amount: Math.abs(signed),
      signedDifference: signed,
      tradeCredit,
      upgradePrice,
    };
  }
  return {
    kind: 'even',
    amount: 0,
    signedDifference: 0,
    tradeCredit,
    upgradePrice,
  };
}

export function isBalancePositiveForCustomer(kind: TradeBalanceKind): boolean {
  return kind === 'refund' || kind === 'cash' || kind === 'credit';
}

export function isBalanceTopUp(kind: TradeBalanceKind): boolean {
  return kind === 'top_up';
}
