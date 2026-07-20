/**
 * Safe deep-links from in-app notifications → tracking / account pages.
 * Always use route templates + params (never interpolate into `to`) so
 * TanStack Router does not throw into the SYSTEM ANOMALY error boundary.
 */
import type { Notification } from '../hooks/useNotifications';

export type NotificationNavigateTarget =
  | { to: '/account/trade-ins' }
  | { to: '/account/notifications' }
  | {
      to: '/tracking/$type/$id';
      params: { type: 'order' | 'repair' | 'trade'; id: string };
    };

export function tradeNotificationTarget(n: Notification): NotificationNavigateTarget {
  if (!n.reference_id) return { to: '/account/trade-ins' };
  const blob = `${n.title} ${n.body}`.toLowerCase();
  if (blob.includes('offer') || blob.includes('awaiting')) {
    return { to: '/account/trade-ins' };
  }
  return {
    to: '/tracking/$type/$id',
    params: { type: 'trade', id: n.reference_id },
  };
}

export function notificationNavigateTarget(
  n: Notification,
): NotificationNavigateTarget | null {
  if (n.type === 'trade') return tradeNotificationTarget(n);
  if (!n.reference_id) return null;
  if (n.type === 'order') {
    return {
      to: '/tracking/$type/$id',
      params: { type: 'order', id: n.reference_id },
    };
  }
  if (n.type === 'repair') {
    return {
      to: '/tracking/$type/$id',
      params: { type: 'repair', id: n.reference_id },
    };
  }
  return null;
}

/** Options object safe to pass to `navigate(...)`. */
export function toNavigateOptions(target: NotificationNavigateTarget): {
  to: string;
  params?: Record<string, string>;
} {
  if (target.to === '/tracking/$type/$id') {
    return {
      to: '/tracking/$type/$id',
      params: target.params,
    };
  }
  return { to: target.to };
}
