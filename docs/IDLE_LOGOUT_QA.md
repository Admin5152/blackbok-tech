# Idle logout QA checklist

Manual verification for the client-side **7-day wall-clock** inactivity logout (`SessionTimeoutProvider` / `useIdleLogout`).

Time counts while the PWA/browser tab is **closed or in the background**. Opening the app after 7+ days with no activity should sign the user out immediately.

For faster local testing, temporarily set `IDLE_TIMEOUT_MS` in `lib/sessionIdleConfig.ts` to a short value (e.g. `60_000`), then restore before merge.

## Single tab

- [ ] Sign in, use the app, then do not return for 7 days → on next open, signed out and redirected to `/#/auth?reason=session_expired`.
- [ ] Login page shows: “You were signed out after 7 days of inactivity. Please log in again.” (accessible banner with `role="status"`).
- [ ] `returnTo` in the URL matches the page you were on before logout (when applicable).
- [ ] Moving the mouse or pressing a key within 7 days resets the timer (no logout).
- [ ] Closing the PWA / tab and reopening within 7 days → still signed in.
- [ ] Navigating between protected routes does **not** reset or leak the timer; only real input updates `lastActivity`.
- [ ] Voluntary **Sign out** from the navbar goes home with success toast — **not** the inactivity message.

## Multi-tab

- [ ] Open two tabs while signed in. Activity in tab B resets idle in tab A (no logout while either tab is active).
- [ ] Idle logout in tab A signs out tab B within ~1–2 minutes (BroadcastChannel + Supabase `SIGNED_OUT`).
- [ ] Tab B shows the same session-expired message and `returnTo` behavior.
- [ ] Manual sign-out in one tab clears auth in the other tab without inactivity messaging.

## PWA / mobile

- [ ] Install as PWA, sign in, close for 7+ days, reopen → signed out with inactivity message.
- [ ] Install as PWA, sign in, use daily for a week → still signed in.
- [ ] Switch away from the browser tab for several days without using the app → signed out on return after 7 days total idle.

## Protected routes & API

- [ ] After idle logout, visiting `/profile`, `/history`, `/checkout`, or `/admin` redirects to login or shows sign-in wall.
- [ ] Admin route re-validates live Supabase session; expired session shows access restricted / sign-in flow.
- [ ] After idle logout, placing an order at checkout fails with a clear session message (not infinite retry or silent success).
