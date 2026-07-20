/**
 * Customer cancel for an order or trade-in (early lifecycle only).
 * Stops click propagation so nested History/Profile cards stay safe.
 */
import React, { useState } from 'react';
import {
  canCancelOrder,
  canCancelTrade,
  cancelOwnOrder,
  cancelOwnTrade,
} from '../lib/customerCancel';
import { TRADE_COPY } from '../lib/tradeCopy';
import type { Order, TradeRequest } from '../types';

type OrderProps = {
  kind: 'order';
  order: Pick<Order, 'id' | 'status'>;
  onCancelled: (orderId: string) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  isLight?: boolean;
  className?: string;
};

type TradeProps = {
  kind: 'trade';
  trade: Pick<TradeRequest, 'id' | 'status'>;
  onCancelled: (tradeId: string) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  isLight?: boolean;
  className?: string;
};

type Props = OrderProps | TradeProps;

export const CancelRequestButton: React.FC<Props> = (props) => {
  const { notify, isLight = false, className = '' } = props;
  const [busy, setBusy] = useState(false);

  const allowed =
    props.kind === 'order' ? canCancelOrder(props.order) : canCancelTrade(props.trade);

  if (!allowed) return null;

  const label =
    props.kind === 'order' ? 'Cancel order' : TRADE_COPY.status.cancelRequest;
  const hint =
    props.kind === 'order'
      ? 'Cancel before we start preparing your order.'
      : TRADE_COPY.status.cancelAllowedUntil;

  const run = async () => {
    if (busy) return;
    const ok = window.confirm(
      props.kind === 'order'
        ? 'Cancel this order? Stock will be released if it was reserved.'
        : 'Cancel this trade-in request? You can start a new one later.',
    );
    if (!ok) return;

    setBusy(true);
    try {
      if (props.kind === 'order') {
        const result = await cancelOwnOrder(props.order.id);
        if (!result.ok) {
          notify(result.error || 'Could not cancel this order.', 'error');
          return;
        }
        props.onCancelled(props.order.id);
        notify('Order cancelled.', 'info');
      } else {
        const result = await cancelOwnTrade(props.trade.id);
        if (!result.ok) {
          notify(result.error || 'Could not cancel this trade-in.', 'error');
          return;
        }
        props.onCancelled(props.trade.id);
        notify('Trade-in cancelled.', 'info');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={className}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={busy}
        title={hint}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void run();
        }}
        className={`text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-40 ${
          isLight
            ? 'text-red-700 hover:text-red-900 underline-offset-2 hover:underline'
            : 'text-red-400 hover:text-red-300 underline-offset-2 hover:underline'
        }`}
      >
        {busy ? 'Cancelling…' : label}
      </button>
    </div>
  );
};
