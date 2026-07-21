# Idle logout QA checklist

Manual verification for the client-side **12-minute visible** inactivity logout (`SessionTimeoutProvider` / `useIdleLogout`).

Minimizing or hiding the tab **pauses** the idle clock — time in the background does not count. Logout only after ~12 minutes of no input while the tab is visible.

For faster local testing, temporarily set `IDLE_TIMEOUT_MS` in `lib/sessionIdleConfig.ts` to a short value (e.g. `60_000`), then restore before merge.

## Single tab

- [ ] Sign in and stay idle (no mouse/keyboard/scroll) for 12 minutes with the tab visible → signed out and redirected to `/#/auth?reason=session_expired`.
- [ ] Login page shows: “You were signed out due to inactivity. Please log in again.” (accessible banner with `role="status"`).
- [ ] `returnTo` in the URL matches the page you were on before logout.
- [ ] After re-login, you land on the `returnTo` route (non-admin accounts).
- [ ] Moving the mouse or pressing a key before 12 minutes resets the timer (no logout).
- [ ] Minimize / switch away for >12 minutes, then return → still signed in (idle clock was paused).
- [ ] Navigating between protected routes (e.g. `/profile` → `/history`) does **not** reset or leak the timer; idle still fires at 12m from last real activity while visible.
- [ ] Voluntary **Sign out** from the navbar goes home with success toast — **not** the inactivity message.

## Multi-tab

- [ ] Open two tabs while signed in. Activity in tab B resets idle in tab A (no logout while either tab is active).
- [ ] Idle logout in tab A signs out tab B within ~1–2 seconds (BroadcastChannel + Supabase `SIGNED_OUT`).
- [ ] Tab B shows the same session-expired message and `returnTo` behavior.
- [ ] Manual sign-out in one tab clears auth in the other tab without inactivity messaging.

## Sleep / wake

- [ ] Sign in, leave tab **visible** and idle, put machine to sleep for >12 minutes, wake → logout occurs shortly after wake if the tab is still considered visible idle.
- [ ] Sign in, minimize before sleep, wake and restore tab → session remains (hidden time was paused).

## Protected routes after timeout

- [ ] After idle logout, visiting `/profile`, `/history`, `/checkout`, or `/admin` redirects to login or shows sign-in wall (live `user === null`, not stale cached user).
- [ ] Admin route re-validates live Supabase session; expired session shows access restricted / sign-in flow.

## API / Supabase after timeout

- [ ] After idle logout, placing an order at checkout fails with a clear session message (not infinite retry or silent success).
- [ ] In-flight requests after sign-out fail cleanly; UI does not render protected data from a stale session.
