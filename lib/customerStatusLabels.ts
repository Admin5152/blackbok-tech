/** Plain-language status labels shown to customers (not admin DB jargon). */

import {
  normalizeOrderStatusForUi,
  normalizeRepairStatusForUi,
  normalizeTradeStatusForUi,
} from './api';

export function customerOrderStatusLabel(uiStatus: string, opts?: { pickup?: boolean }): string {
  if (opts?.pickup) {
    const pickupMap: Record<string, string> = {
      Pending: 'Order placed — waiting to prepare',
      Processing: 'Being prepared for pickup',
      Shipped: 'Ready for pickup at the store',
      Delivered: 'Picked up',
      Cancelled: 'Cancelled',
      Refunded: 'Refunded',
    };
    return pickupMap[uiStatus] ?? uiStatus;
  }
  const map: Record<string, string> = {
    Pending: 'Order placed — waiting to process',
    Processing: 'Being prepared',
    Shipped: 'On the way to you',
    Delivered: 'Delivered',
    Cancelled: 'Cancelled',
    Refunded: 'Refunded',
  };
  return map[uiStatus] ?? uiStatus;
}

export function customerOrderStatusShort(uiStatus: string, opts?: { pickup?: boolean }): string {
  if (opts?.pickup) {
    const pickupMap: Record<string, string> = {
      Pending: 'Processing',
      Processing: 'Preparing',
      Shipped: 'Ready for pickup',
      Delivered: 'Picked up',
      Cancelled: 'Cancelled',
      Refunded: 'Refunded',
    };
    return pickupMap[uiStatus] ?? uiStatus;
  }
  const map: Record<string, string> = {
    Pending: 'Processing',
    Processing: 'Preparing',
    Shipped: 'On the way',
    Delivered: 'Delivered',
    Cancelled: 'Cancelled',
    Refunded: 'Refunded',
  };
  return map[uiStatus] ?? uiStatus;
}

export function customerRepairStatusLabel(uiStatus: string): string {
  const map: Record<string, string> = {
    Pending: 'Request received',
    Received: 'Request received',
    Diagnosing: 'Diagnosis in progress',
    'Estimate Sent': 'Repair quote ready — review in Repair',
    'In Repair': 'Repair in progress',
    Ready: 'Ready for pickup',
    Completed: 'Repair finished',
    Rejected: 'Request closed',
    Cancelled: 'Cancelled',
  };
  return map[uiStatus] ?? uiStatus;
}

export function customerRepairStatusShort(uiStatus: string): string {
  const map: Record<string, string> = {
    Pending: 'Received',
    Received: 'Received',
    Diagnosing: 'Diagnosing',
    'Estimate Sent': 'Quote ready',
    'In Repair': 'In repair',
    Ready: 'Ready',
    Completed: 'Finished',
    Rejected: 'Closed',
    Cancelled: 'Cancelled',
  };
  return map[uiStatus] ?? uiStatus;
}

export function customerTradeStatusLabel(uiStatus: string): string {
  const map: Record<string, string> = {
    Pending: 'Submitted — we are reviewing',
    Inspecting: 'Inspecting your device',
    'Under Review': 'Under review',
    'Offer sent': 'Cash offer ready — accept or decline',
    'Offer Made': 'Cash offer ready — accept or decline',
    'Awaiting User': 'Waiting for your answer on the offer',
    Accepted: 'You accepted — bring your device to BlackBox',
    Scheduled: 'Visit scheduled',
    Completed: 'Trade-in finished',
    Rejected: 'Offer declined or closed',
    Cancelled: 'Cancelled',
    Expired: 'Estimate expired — start a new one',
  };
  return map[uiStatus] ?? uiStatus;
}

export function customerTradeStatusShort(uiStatus: string): string {
  const map: Record<string, string> = {
    Pending: 'Submitted',
    Inspecting: 'Inspecting',
    'Under Review': 'Reviewing',
    'Offer sent': 'Offer ready',
    'Offer Made': 'Offer ready',
    'Awaiting User': 'Your response',
    Accepted: 'Accepted',
    Scheduled: 'Scheduled',
    Completed: 'Complete',
    Rejected: 'Closed',
    Cancelled: 'Cancelled',
    Expired: 'Expired',
  };
  return map[uiStatus] ?? uiStatus;
}

export function formatCustomerStatusShort(
  kind: 'order' | 'repair' | 'trade',
  rawStatus: unknown
): string {
  const s = String(rawStatus ?? '');
  if (kind === 'order') return customerOrderStatusShort(normalizeOrderStatusForUi(s));
  if (kind === 'repair') return customerRepairStatusShort(normalizeRepairStatusForUi(s));
  return customerTradeStatusShort(normalizeTradeStatusForUi(s));
}

export function formatCustomerStatusLong(
  kind: 'order' | 'repair' | 'trade',
  rawStatus: unknown
): string {
  const s = String(rawStatus ?? '');
  if (kind === 'order') return customerOrderStatusLabel(normalizeOrderStatusForUi(s));
  if (kind === 'repair') return customerRepairStatusLabel(normalizeRepairStatusForUi(s));
  return customerTradeStatusLabel(normalizeTradeStatusForUi(s));
}

export function customerStatusLabelForDeletion(
  kind: 'order' | 'repair' | 'trade',
  uiStatus: string
): string {
  return formatCustomerStatusLong(kind, uiStatus);
}

/** Tailwind badge tones for profile/history chips (light + dark). */
export function customerStatusBadgeClasses(
  rawStatus: unknown,
  kind: 'order' | 'repair' | 'trade',
  isLight: boolean
): string {
  const ui =
    kind === 'order'
      ? normalizeOrderStatusForUi(String(rawStatus ?? ''))
      : kind === 'repair'
        ? normalizeRepairStatusForUi(String(rawStatus ?? ''))
        : normalizeTradeStatusForUi(String(rawStatus ?? ''));

  const done = new Set([
    'Delivered',
    'Completed',
    'Cancelled',
    'Refunded',
    'Rejected',
  ]);
  const active = new Set([
    'Pending',
    'Processing',
    'Shipped',
    'Received',
    'Diagnosing',
    'Estimate Sent',
    'In Repair',
    'Ready',
    'Inspecting',
    'Offer sent',
    'Offer Made',
    'Awaiting User',
    'Accepted',
  ]);

  if (done.has(ui)) {
    return isLight ? 'text-emerald-800 bg-emerald-100' : 'text-green-400 bg-green-500/10';
  }
  if (active.has(ui)) {
    return isLight ? 'text-amber-900 bg-amber-100' : 'text-amber-400 bg-amber-500/10';
  }
  return isLight ? 'text-blue-900 bg-blue-100' : 'text-blue-400 bg-blue-500/10';
}
