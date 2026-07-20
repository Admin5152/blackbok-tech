/**
 * Client-side session idle configuration.
 *
 * Supabase enforces inactivity only at JWT refresh boundaries (up to ~27m in
 * edge cases). The frontend owns a strict 10-minute *visible* idle timer so
 * logout happens after 10m of inactivity while the tab is in the foreground.
 * Minimizing / hiding the tab pauses the clock — it does not sign you out.
 */

/** Strict inactivity threshold while the tab is visible. */
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

/** Minimum interval between activity-driven timer resets (avoids thrash). */
export const ACTIVITY_THROTTLE_MS = 1_000;

/**
 * Poll interval for timestamp comparison (Date.now() - lastActivity).
 * Not the sole mechanism — we compare wall-clock deltas, not setTimeout alone.
 */
export const IDLE_CHECK_INTERVAL_MS = 1_000;

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
  'You were signed out due to inactivity. Please log in again.';

/** Matches `STORAGE_KEYS.USER` in App.tsx — duplicated to avoid circular imports. */
export const APP_USER_STORAGE_KEY = 'bb_v4_user';

/** Set by voluntary sign-out so cross-tab SIGNED_OUT does not show idle messaging. */
export const MANUAL_SIGNOUT_FLAG = 'bb_manual_signout';
