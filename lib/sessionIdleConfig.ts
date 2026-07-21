/**
 * Client-side session idle configuration (PWA + browser).
 *
 * Supabase JWT refresh can keep tokens alive longer than product policy.
 * The frontend enforces a strict **7-day wall-clock** inactivity logout:
 * time counts while the app is closed, minimized, or in the background.
 */

/** Days without activity before automatic sign-out. */
export const IDLE_TIMEOUT_DAYS = 7;

/** Wall-clock inactivity threshold (ms). */
export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;

/** Minimum interval between activity-driven timer resets (avoids thrash). */
export const ACTIVITY_THROTTLE_MS = 1_000;

/**
 * Poll interval while the app is open. Also checked on tab/PWA resume.
 */
export const IDLE_CHECK_INTERVAL_MS = 60_000;

/**
 * Optional warning lead time before logout (e.g. "60s remaining" modal).
 * Not wired yet; reserved so a warning UI can be added without refactor.
 */
export const IDLE_WARNING_BEFORE_MS = 60_000;

/** Shared last-activity epoch (ms) — synced across tabs via localStorage + BroadcastChannel. */
export const SESSION_IDLE_STORAGE_KEY = 'bb_session_last_activity';

/** BroadcastChannel name for cross-tab activity + idle logout sync. */
export const SESSION_IDLE_BROADCAST_CHANNEL = 'bb_session_idle';

/** Set briefly when idle logout initiates so other tabs detect intentional sign-out. */
export const SESSION_IDLE_FORCE_LOGOUT_KEY = 'bb_session_force_logout';

/** Query param value for login redirect after idle logout. */
export const SESSION_EXPIRED_REASON = 'session_expired';

export const SESSION_EXPIRED_MESSAGE =
  'You were signed out after 7 days of inactivity. Please log in again.';

/** Matches `STORAGE_KEYS.USER` in App.tsx — duplicated to avoid circular imports. */
export const APP_USER_STORAGE_KEY = 'bb_v4_user';

/** Set by voluntary sign-out so cross-tab SIGNED_OUT does not show idle messaging. */
export const MANUAL_SIGNOUT_FLAG = 'bb_manual_signout';
