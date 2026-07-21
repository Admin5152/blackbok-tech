/**
 * Auth email link lifetime (signup confirm, password recovery, magic link, etc.).
 *
 * Supabase controls this with a single project setting: Email OTP expiration.
 * App copy and docs assume 15 minutes (900 seconds). Change the dashboard value
 * to match if you adjust this constant.
 *
 * Dashboard: Authentication → Sign In / Providers → Email → Email OTP expiration
 */
export const AUTH_EMAIL_LINK_EXPIRY_SECONDS = 15 * 60;
export const AUTH_EMAIL_LINK_EXPIRY_MINUTES = AUTH_EMAIL_LINK_EXPIRY_SECONDS / 60;
