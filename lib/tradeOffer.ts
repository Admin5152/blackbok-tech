import type { TradeInRequest } from '../types';

/** Positive offer amount from a trade row, or null if missing/invalid. */
export function tradeOfferAmount(trade: Partial<TradeInRequest> | null | undefined): number | null {
  if (!trade) return null;
  const raw =
    trade.finalValue ??
    (trade as { final_value?: unknown }).final_value ??
    trade.offeredPrice ??
    (trade as { offered_price?: unknown }).offered_price;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function tradeHasValidOffer(trade: Partial<TradeInRequest> | null | undefined): boolean {
  return tradeOfferAmount(trade) != null;
}

/** Parse admin offer input (GH₵). */
export function parseOfferInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}
