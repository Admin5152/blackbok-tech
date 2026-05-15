/** Plain-language status labels shown to customers (not admin DB jargon). */

export function customerOrderStatusLabel(uiStatus: string): string {
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

export function customerTradeStatusLabel(uiStatus: string): string {
  const map: Record<string, string> = {
    Pending: 'Submitted — we are reviewing',
    Inspecting: 'Inspecting your device',
    'Offer sent': 'Cash offer ready — accept or decline',
    'Offer Made': 'Cash offer ready — accept or decline',
    'Awaiting User': 'Waiting for your answer on the offer',
    Accepted: 'You accepted the offer — we will arrange drop-off/pickup',
    Completed: 'Trade-in finished',
    Rejected: 'Offer declined or closed',
  };
  return map[uiStatus] ?? uiStatus;
}

/** Shorter label for badges and compact UI */
export function customerTradeStatusShort(uiStatus: string): string {
  const map: Record<string, string> = {
    Pending: 'Submitted',
    Inspecting: 'Inspecting',
    'Offer sent': 'Offer ready',
    'Offer Made': 'Offer ready',
    'Awaiting User': 'Your response',
    Accepted: 'Offer accepted',
    Completed: 'Complete',
    Rejected: 'Closed',
  };
  return map[uiStatus] ?? uiStatus;
}

export function customerStatusLabelForDeletion(
  kind: 'order' | 'repair' | 'trade',
  uiStatus: string
): string {
  if (kind === 'order') return customerOrderStatusLabel(uiStatus);
  if (kind === 'repair') return customerRepairStatusLabel(uiStatus);
  return customerTradeStatusLabel(uiStatus);
}
