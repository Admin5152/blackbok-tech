/**
 * Customer accept / decline for a staff trade-in offer.
 *
 * WHY: History, Profile, Tracking, and My trade-ins all need the same
 * mutation + local status sync so the UI flips immediately after click.
 */
import { updateTradeRequest } from './api';
import { tradeHasValidOffer } from './tradeOffer';
import type { TradeRequest } from '../types';

export function tradeNeedsOfferResponse(t: Pick<TradeRequest, 'status'> | null | undefined): boolean {
  if (!t) return false;
  const raw = String(t.status || '').toLowerCase().replace(/\s+/g, '_');
  const ui = String(t.status || '');
  return (
    raw === 'awaiting_user' ||
    raw === 'offer_made' ||
    ui === 'Awaiting User' ||
    ui === 'Offer sent' ||
    ui === 'Offer Made'
  );
}

export type TradeOfferRespondResult = {
  ok: boolean;
  status?: 'Accepted' | 'Rejected';
  error?: string;
};

/**
 * Persist accept/decline. Accept requires a positive offer amount (server
 * may already enforce this for offer_made — we guard client-side too).
 */
export async function respondToTradeOffer(
  trade: TradeRequest,
  accept: boolean,
): Promise<TradeOfferRespondResult> {
  if (accept && !tradeHasValidOffer(trade)) {
    return {
      ok: false,
      error: 'This offer is not ready yet — staff must set an offer value first.',
    };
  }

  try {
    const status = accept ? 'Accepted' : 'Rejected';
    await updateTradeRequest(trade.id, { status });
    return { ok: true, status };
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Could not update this request.';
    return { ok: false, error: msg };
  }
}

/** Apply Accepted/Rejected onto a trades list (immutable). */
export function patchTradeStatusInList(
  list: TradeRequest[],
  tradeId: string,
  status: 'Accepted' | 'Rejected',
): TradeRequest[] {
  return list.map((t) => (t.id === tradeId ? { ...t, status } : t));
}
