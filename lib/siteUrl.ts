/**
 * Canonical public site origin for Supabase Auth email links (confirm signup,
 * password recovery). Set `VITE_APP_URL` in production so redirects match
 * your live domain. Falls back to `window.location.origin` in the browser.
 */
export function getSiteBaseUrl(): string {
  const raw = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
}

/** Redirect target after email confirmation (see App.tsx recovery / confirm handlers). */
export function authEmailConfirmRedirectUrl(): string {
  const base = getSiteBaseUrl();
  return `${base}/?type=email_confirm#/emailconfirm`;
}

/** Redirect target after password recovery email (see App.tsx). */
export function authPasswordRecoveryRedirectUrl(): string {
  const base = getSiteBaseUrl();
  return `${base}/?type=recovery#/reset-password`;
}
