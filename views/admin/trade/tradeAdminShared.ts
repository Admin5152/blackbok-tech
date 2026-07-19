/**
 * Shared staff labels / status helpers for Trade Admin UI.
 * Plain staff copy — do not import customer-facing tradeCopy here.
 */
import { TRADE_ADMIN_NAV_PLAIN, TRADE_ADMIN_STATUS_PLAIN } from '../../../lib/tradeAdminCopy';

export const TRADE_ADMIN_STATUS_LABELS: Record<string, string> = {
  submitted: TRADE_ADMIN_STATUS_PLAIN.submitted,
  inspecting: TRADE_ADMIN_STATUS_PLAIN.inspecting,
  under_review: TRADE_ADMIN_STATUS_PLAIN.under_review,
  offer_made: TRADE_ADMIN_STATUS_PLAIN.offer_made,
  awaiting_user: TRADE_ADMIN_STATUS_PLAIN.awaiting_user,
  accepted: TRADE_ADMIN_STATUS_PLAIN.accepted,
  scheduled: TRADE_ADMIN_STATUS_PLAIN.scheduled,
  completed: TRADE_ADMIN_STATUS_PLAIN.completed,
  rejected: TRADE_ADMIN_STATUS_PLAIN.rejected,
  cancelled: TRADE_ADMIN_STATUS_PLAIN.cancelled,
  expired: TRADE_ADMIN_STATUS_PLAIN.expired,
};

/** Legacy UI labels → DB statuses for filter tabs */
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
  if (TRADE_ADMIN_STATUS_LABELS[lower] || TRADE_ADMIN_STATUS_PLAIN[lower]) return lower;
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
  return TRADE_ADMIN_STATUS_LABELS[db] || status || 'New request';
}

export const TRADE_ADMIN_NAV = [
  { to: '/admin/trade', label: TRADE_ADMIN_NAV_PLAIN.Queue, end: true, introKey: 'queue' as const },
  {
    to: '/admin/trade/devices',
    label: TRADE_ADMIN_NAV_PLAIN['Tradable devices'],
    end: false,
    introKey: 'devices' as const,
  },
  {
    to: '/admin/trade/upgrades',
    label: TRADE_ADMIN_NAV_PLAIN['Upgrade targets'],
    end: false,
    introKey: 'upgrades' as const,
  },
  {
    to: '/admin/trade/pricing',
    label: TRADE_ADMIN_NAV_PLAIN['Pricing & deductions'],
    end: false,
    introKey: 'pricing' as const,
  },
  {
    to: '/admin/trade/thresholds',
    label: TRADE_ADMIN_NAV_PLAIN.Thresholds,
    end: false,
    introKey: 'thresholds' as const,
  },
  {
    to: '/admin/trade/config',
    label: TRADE_ADMIN_NAV_PLAIN.Config,
    end: false,
    introKey: 'config' as const,
  },
  {
    to: '/admin/trade/questionnaire',
    label: TRADE_ADMIN_NAV_PLAIN.Questionnaire,
    end: false,
    introKey: 'questionnaire' as const,
  },
  {
    to: '/admin/trade/aesthetics',
    label: TRADE_ADMIN_NAV_PLAIN.Aesthetics,
    end: false,
    introKey: 'aesthetics' as const,
  },
  {
    to: '/admin/trade/audit',
    label: TRADE_ADMIN_NAV_PLAIN.Audit,
    end: false,
    introKey: 'audit' as const,
  },
] as const;
