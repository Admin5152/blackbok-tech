/**
 * Accept / Decline buttons for a pending trade-in offer.
 * Stops click propagation so History/Profile cards can nest these safely.
 */
import React, { useState } from 'react';
import { TRADE_COPY } from '../lib/tradeCopy';
import {
  patchTradeStatusInList,
  respondToTradeOffer,
  tradeNeedsOfferResponse,
} from '../lib/tradeOfferRespond';
import { tradeHasValidOffer, tradeOfferAmount } from '../lib/tradeOffer';
import { track, TRADE_ANALYTICS } from '../lib/analytics';
import type { TradeRequest } from '../types';

type Props = {
  trade: TradeRequest;
  trades: TradeRequest[];
  setTrades: (next: TradeRequest[]) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  isLight?: boolean;
  /** Called after a successful status change (e.g. refetch local lists). */
  onResolved?: (trade: TradeRequest, status: 'Accepted' | 'Rejected') => void;
  className?: string;
};

export const TradeOfferRespondButtons: React.FC<Props> = ({
  trade,
  trades,
  setTrades,
  notify,
  isLight = false,
  onResolved,
  className = '',
}) => {
  const [busy, setBusy] = useState(false);

  if (!tradeNeedsOfferResponse(trade)) return null;

  const canAccept = tradeHasValidOffer(trade);

  const run = async (accept: boolean) => {
    setBusy(true);
    try {
      const result = await respondToTradeOffer(trade, accept);
      if (!result.ok || !result.status) {
        notify(result.error || TRADE_COPY.myTrades.updateError, 'error');
        return;
      }
      const next = patchTradeStatusInList(trades, trade.id, result.status);
      setTrades(next);
      onResolved?.({ ...trade, status: result.status }, result.status);
      track(TRADE_ANALYTICS.OFFER_RESPONSE, {
        accepted: accept,
        tradeId: trade.id,
        amount: tradeOfferAmount(trade) ?? null,
      });
      notify(
        accept ? 'Offer accepted' : 'Offer declined',
        accept ? 'success' : 'info',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`flex gap-2 ${className}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="Respond to trade-in offer"
    >
      <button
        type="button"
        disabled={busy || !canAccept}
        title={!canAccept ? 'Offer value not set yet' : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void run(true);
        }}
        className="flex-1 min-w-[7rem] rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-widest text-[10px] py-3 px-4 disabled:opacity-40"
      >
        {TRADE_COPY.myTrades.accept}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void run(false);
        }}
        className={`flex-1 min-w-[7rem] rounded-xl border font-black uppercase tracking-widest text-[10px] py-3 px-4 disabled:opacity-40 ${
          isLight
            ? 'border-black/20 text-black bg-white hover:bg-black/5'
            : 'border-white/20 text-white bg-white/5 hover:bg-white/10'
        }`}
      >
        {TRADE_COPY.myTrades.decline}
      </button>
    </div>
  );
};
