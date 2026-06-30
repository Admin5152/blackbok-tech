import type { Order, RepairRequest, TradeRequest } from '../types';

export function sortByDateDesc<T extends { date: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function buildProfileHistoryPreview(
  orders: Order[],
  trades: TradeRequest[],
  repairs: RepairRequest[],
  limit = 5,
) {
  return {
    orders: sortByDateDesc(orders).slice(0, limit),
    trades: sortByDateDesc(trades).slice(0, limit),
    repairs: sortByDateDesc(repairs).slice(0, limit),
  };
}

export type PurchaseLedgerKind = 'purchase' | 'repair' | 'trade_credit' | 'trade_active';

export type PurchaseLedgerRow = {
  key: string;
  kind: PurchaseLedgerKind;
  id: string;
  date: string;
  order?: Order;
  repair?: RepairRequest;
  trade?: TradeRequest;
};

export function buildPurchaseHistoryLedger(
  orders: Order[],
  repairs: RepairRequest[],
  trades: TradeRequest[],
): PurchaseLedgerRow[] {
  const rows: PurchaseLedgerRow[] = [];
  for (const o of orders) {
    rows.push({ key: `p-${o.id}`, kind: 'purchase', id: o.id, date: o.date, order: o });
  }
  for (const r of repairs) {
    rows.push({ key: `r-${r.id}`, kind: 'repair', id: r.id, date: r.date, repair: r });
  }
  for (const t of trades) {
    const kind: PurchaseLedgerKind = t.status === 'Completed' ? 'trade_credit' : 'trade_active';
    rows.push({ key: `t-${t.id}`, kind, id: t.id, date: t.date, trade: t });
  }
  return sortByDateDesc(rows);
}
