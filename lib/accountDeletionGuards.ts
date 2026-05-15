import { normalizeOrderStatusForUi } from './api';
import { getSupabaseClient } from './supabase';

export type PendingDeletionItem = {
  kind: 'order' | 'repair' | 'trade';
  id: string;
  label: string;
  status: string;
};

export type DeletionPreview = {
  email: string;
  name: string;
  createdAt: string;
  orderCount: number;
  repairCount: number;
  tradeCount: number;
  pendingItems: PendingDeletionItem[];
};

const TERMINAL_ORDER_UI = new Set(['Delivered', 'Cancelled', 'Refunded']);
const TERMINAL_REPAIR_UI = new Set(['Completed', 'Rejected']);
const TERMINAL_TRADE_UI = new Set(['Completed', 'Rejected']);

export function isTerminalOrderStatus(status: string): boolean {
  return TERMINAL_ORDER_UI.has(normalizeOrderStatusForUi(status));
}

export function isTerminalRepairStatus(status: string): boolean {
  const s = status?.trim() || 'Pending';
  return TERMINAL_REPAIR_UI.has(s);
}

export function isTerminalTradeStatus(status: string): boolean {
  const s = status?.trim() || 'Pending';
  return TERMINAL_TRADE_UI.has(s);
}

/** Load account summary + any open orders, repairs, or trade-ins that block silent deletion. */
export async function getDeletionPreview(): Promise<DeletionPreview | null> {
  const client = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError || !user) return null;

  const { data: profile } = await client
    .from('profiles')
    .select('name, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const [{ data: orders }, { data: repairs }, { data: trades }] = await Promise.all([
    client.from('orders').select('id, status, display_id').eq('user_id', user.id),
    client.from('repair_requests').select('id, status, display_id, device_name').eq('user_id', user.id),
    client.from('trade_in_requests').select('id, status, display_id, device_name').eq('user_id', user.id),
  ]);

  const pendingItems: PendingDeletionItem[] = [];

  for (const o of orders ?? []) {
    const ui = normalizeOrderStatusForUi(o.status);
    if (!isTerminalOrderStatus(ui)) {
      pendingItems.push({
        kind: 'order',
        id: o.id,
        label: o.display_id ? `Order ${o.display_id}` : `Order ${String(o.id).slice(0, 8)}`,
        status: ui,
      });
    }
  }

  for (const r of repairs ?? []) {
    const ui =
      r.status && typeof r.status === 'string'
        ? r.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        : 'Pending';
    if (!isTerminalRepairStatus(ui)) {
      pendingItems.push({
        kind: 'repair',
        id: r.id,
        label: r.display_id
          ? `Repair ${r.display_id}`
          : `Repair ${r.device_name || String(r.id).slice(0, 8)}`,
        status: ui,
      });
    }
  }

  for (const t of trades ?? []) {
    const raw = String(t.status || 'submitted').toLowerCase();
    const ui =
      raw === 'completed'
        ? 'Completed'
        : raw === 'rejected'
          ? 'Rejected'
          : raw.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    if (!isTerminalTradeStatus(ui)) {
      pendingItems.push({
        kind: 'trade',
        id: t.id,
        label: t.display_id
          ? `Trade-in ${t.display_id}`
          : `Trade-in ${t.device_name || String(t.id).slice(0, 8)}`,
        status: ui,
      });
    }
  }

  return {
    email: user.email || '',
    name: profile?.name || 'Unknown',
    createdAt: profile?.created_at || user.created_at || '',
    orderCount: orders?.length ?? 0,
    repairCount: repairs?.length ?? 0,
    tradeCount: trades?.length ?? 0,
    pendingItems,
  };
}

/** Cancel open orders/repairs/trade-ins before account removal (user confirmed in UI). */
export async function cancelOpenRecordsForAccountDeletion(userId: string): Promise<{
  ok: boolean;
  error?: string;
  cancelled: { orders: number; repairs: number; trades: number };
}> {
  const client = getSupabaseClient();
  const cancelled = { orders: 0, repairs: 0, trades: 0 };

  const { data: orders } = await client.from('orders').select('id, status').eq('user_id', userId);
  for (const o of orders ?? []) {
    if (!isTerminalOrderStatus(normalizeOrderStatusForUi(o.status))) {
      const { error } = await client.from('orders').update({ status: 'cancelled' }).eq('id', o.id);
      if (error) return { ok: false, error: error.message, cancelled };
      cancelled.orders += 1;
    }
  }

  const { data: repairs } = await client
    .from('repair_requests')
    .select('id, status')
    .eq('user_id', userId);
  for (const r of repairs ?? []) {
    const ui =
      r.status && typeof r.status === 'string'
        ? r.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        : 'Pending';
    if (!isTerminalRepairStatus(ui)) {
      const { error } = await client.from('repair_requests').update({ status: 'cancelled' }).eq('id', r.id);
      if (error) return { ok: false, error: error.message, cancelled };
      cancelled.repairs += 1;
    }
  }

  const { data: trades } = await client
    .from('trade_in_requests')
    .select('id, status')
    .eq('user_id', userId);
  for (const t of trades ?? []) {
    const raw = String(t.status || 'submitted').toLowerCase();
    const ui =
      raw === 'completed'
        ? 'Completed'
        : raw === 'rejected'
          ? 'Rejected'
          : raw.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    if (!isTerminalTradeStatus(ui)) {
      const { error } = await client.from('trade_in_requests').update({ status: 'rejected' }).eq('id', t.id);
      if (error) return { ok: false, error: error.message, cancelled };
      cancelled.trades += 1;
    }
  }

  return { ok: true, cancelled };
}
