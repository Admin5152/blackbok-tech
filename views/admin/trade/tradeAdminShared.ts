/**
 * Shared staff labels / status helpers for Trade Admin UI.
 * Plain staff copy — do not import customer-facing tradeCopy here.
 */
export const TRADE_ADMIN_STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  inspecting: 'Inspecting',
  under_review: 'Under review',
  offer_made: 'Offer made',
  awaiting_user: 'Awaiting user',
  accepted: 'Accepted',
  scheduled: 'Scheduled',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/** Legacy UI labels → DB + v7 statuses for filter tabs */
export const TRADE_ADMIN_STATUS_TABS = [
  'All',
  'submitted',
  'inspecting',
  'under_review',
  'offer_made',
  'awaiting_user',
  'accepted',
  'scheduled',
  'completed',
  'rejected',
  'cancelled',
  'expired',
] as const;

export type TradeAdminStatusTab = (typeof TRADE_ADMIN_STATUS_TABS)[number];

export function toDbTradeStatus(status?: string): string {
  const value = String(status || '').trim();
  const lower = value.toLowerCase();
  if (TRADE_ADMIN_STATUS_LABELS[lower]) return lower;
  const legacy: Record<string, string> = {
    Pending: 'submitted',
    Inspecting: 'inspecting',
    'Under Review': 'under_review',
    'Offer Made': 'offer_made',
    'Offer sent': 'offer_made',
    'Awaiting User': 'awaiting_user',
    Accepted: 'accepted',
    Scheduled: 'scheduled',
    Completed: 'completed',
    Rejected: 'rejected',
    Cancelled: 'cancelled',
    Expired: 'expired',
  };
  return legacy[value] || lower || 'submitted';
}

export function tradeAdminStatusLabel(status?: string): string {
  const db = toDbTradeStatus(status);
  return TRADE_ADMIN_STATUS_LABELS[db] || status || 'Submitted';
}

export const TRADE_ADMIN_NAV = [
  { to: '/admin/trade', label: 'Queue', end: true },
  { to: '/admin/trade/pricing', label: 'Pricing', end: false },
  { to: '/admin/trade/thresholds', label: 'Thresholds', end: false },
  { to: '/admin/trade/config', label: 'Config', end: false },
  { to: '/admin/trade/questionnaire', label: 'Questionnaire', end: false },
  { to: '/admin/trade/aesthetics', label: 'Aesthetics', end: false },
  { to: '/admin/trade/audit', label: 'Audit', end: false },
] as const;
