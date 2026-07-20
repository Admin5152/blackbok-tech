/**
 * Customer cancel for orders (pending only) and trade-ins (until scheduled).
 */
import { supabase } from './supabase';
import { updateTradeRequest, normalizeOrderStatusForUi } from './api';
import { tradeFriendlyError } from './tradeErrors';
import { friendlyError } from './friendlyErrors';
import type { Order, TradeRequest } from '../types';

const ORDER_CANCELABLE = new Set(['pending', 'Pending']);

/** Trade statuses customers may cancel (before visit is scheduled). */
const TRADE_CANCELABLE = new Set([
  'submitted',
  'pending',
  'inspecting',
  'under_review',
  'under review',
  'offer_made',
  'offer sent',
  'offer made',
  'awaiting_user',
  'awaiting user',
  'accepted',
]);

function normTradeStatus(status?: string | null): string {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

export function canCancelOrder(
  order: Pick<Order, 'status'> | { status?: string } | null | undefined,
): boolean {
  if (!order?.status) return false;
  const ui = normalizeOrderStatusForUi(order.status);
  const raw = String(order.status).trim().toLowerCase();
  return ui === 'Pending' || ORDER_CANCELABLE.has(raw);
}

export function canCancelTrade(
  trade: Pick<TradeRequest, 'status'> | { status?: string } | null | undefined,
): boolean {
  if (!trade?.status) return false;
  const n = normTradeStatus(trade.status);
  // Also accept underscore form via replace already done for spaces
  const underscored = String(trade.status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return (
    TRADE_CANCELABLE.has(n) ||
    TRADE_CANCELABLE.has(underscored) ||
    TRADE_CANCELABLE.has(String(trade.status || '').trim().toLowerCase())
  );
}

export type CustomerCancelResult = {
  ok: boolean;
  error?: string;
};

/** Cancel own pending order via SECURITY DEFINER RPC (restores stock). */
export async function cancelOwnOrder(orderId: string): Promise<CustomerCancelResult> {
  const id = String(orderId || '').trim();
  if (!id) return { ok: false, error: 'Order not found.' };

  try {
    const { error } = await supabase.rpc('cancel_own_order', { p_order_id: id });
    if (error) {
      // Fallback: direct update if RPC not migrated yet (may fail RLS).
      if (/could not find the function|PGRST202|42883/i.test(error.message || '')) {
        const { error: upErr } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', id)
          .eq('status', 'pending');
        if (upErr) throw upErr;
        return { ok: true };
      }
      throw error;
    }
    return { ok: true };
  } catch (e: unknown) {
    return {
      ok: false,
      error: friendlyError(e, 'cancel this order'),
    };
  }
}

/** Cancel own trade-in before it is scheduled. */
export async function cancelOwnTrade(tradeId: string): Promise<CustomerCancelResult> {
  const id = String(tradeId || '').trim();
  if (!id) return { ok: false, error: 'Trade-in not found.' };

  try {
    const { error } = await supabase.rpc('cancel_own_trade', { p_trade_id: id });
    if (error) {
      if (/could not find the function|PGRST202|42883/i.test(error.message || '')) {
        await updateTradeRequest(id, { status: 'Cancelled' });
        return { ok: true };
      }
      throw error;
    }
    return { ok: true };
  } catch (e: unknown) {
    return {
      ok: false,
      error: tradeFriendlyError(e),
    };
  }
}

export function patchOrderStatusInList<T extends { id: string; status: string }>(
  list: T[],
  orderId: string,
  status: string,
): T[] {
  return list.map((o) => (o.id === orderId ? { ...o, status } : o));
}
