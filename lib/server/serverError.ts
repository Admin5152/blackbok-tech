/**
 * Normalize errors from Supabase, Resend, web-push, etc. for API responses.
 */
export function formatServerError(err: unknown): string {
  if (err instanceof Error) return err.message.trim() || 'Unknown error';
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const parts = [o.message, o.details, o.hint]
      .filter((v) => typeof v === 'string' && v.trim())
      .map((v) => String(v).trim());
    if (parts.length) return parts.join(' — ');
  }
  return String(err || 'Unknown error');
}

export function isPushNotConfiguredMessage(message: string): boolean {
  return /VAPID|SERVICE_ROLE|not configured|Push is not configured/i.test(message);
}

export function isMissingPushTableMessage(message: string): boolean {
  return /push_subscriptions|42P01|schema cache|PGRST205/i.test(message);
}

export function pushConfigError(message: string): Error {
  const err = new Error(message);
  (err as Error & { code?: string }).code = 'PUSH_NOT_CONFIGURED';
  return err;
}
