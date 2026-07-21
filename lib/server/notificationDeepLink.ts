/**
 * Shared deep-link paths for email CTAs and Web Push clicks.
 * Keep relative paths so the browser / SW can open same-origin routes.
 */

export type NotificationLinkInput = {
  type?: string | null;
  title?: string | null;
  body?: string | null;
  reference_id?: string | null;
};

export function notificationDeepPath(input: NotificationLinkInput): string {
  const type = String(input.type || 'info').toLowerCase();
  const ref = (input.reference_id || '').trim();
  const blob = `${input.title || ''} ${input.body || ''}`.toLowerCase();

  if (type === 'order' && ref) return `/tracking/order/${ref}`;
  if (type === 'repair' && ref) return `/tracking/repair/${ref}`;
  if (type === 'trade') {
    if (blob.includes('offer') || blob.includes('awaiting')) {
      return '/account/trade-ins';
    }
    if (ref) return `/tracking/trade/${ref}`;
    return '/account/trade-ins';
  }
  if (type === 'order') return '/profile';
  if (type === 'repair') return '/profile';
  return '/account/notifications';
}

export function notificationAbsoluteUrl(
  input: NotificationLinkInput,
  env = process.env,
): string {
  const base = (
    env.VITE_APP_URL ||
    env.APP_URL ||
    'https://blackboxghana.com'
  ).replace(/\/$/, '');
  return `${base}${notificationDeepPath(input)}`;
}
