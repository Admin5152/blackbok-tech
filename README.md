# BlackBox Tech (blackbok-tech)

Vite + React storefront with Supabase (auth, Postgres, storage).

## Run locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Copy `.env.template` to `.env.local` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and other variables as needed (see `DEPLOYMENT.md`).
3. Start the dev server: `npm run dev` (default: http://localhost:3000)

## Session idle logout (7 days)

The frontend enforces a **7-day wall-clock inactivity logout**, independent of Supabase JWT refresh timing. This suits PWA use: time counts while the app is closed or in the background.

### How it works

- `SessionTimeoutProvider` (mounted once in `App.tsx` inside `AppContext.Provider`) runs `useIdleLogout`.
- User activity (`mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`, `click`) updates a shared `lastActivity` timestamp in `localStorage`, throttled to once per second.
- While signed in, the hook compares `Date.now() - lastActivity` to `IDLE_TIMEOUT_MS` (7 days). On expiry it calls `supabase.auth.signOut()`, clears local session state, and redirects to `/#/auth?reason=session_expired&returnTo=…`.
- On app/PWA **resume** (`pageshow`, `focus`, `visibilitychange`), an immediate check runs so a session that expired while closed is cleared on open.
- `App.tsx` bootstrap also checks idle **before** restoring cached user state (avoids a flash of signed-in UI after 7+ days away).
- Activity and forced logout sync across tabs via `BroadcastChannel` and `localStorage` (with Supabase `onAuthStateChange` as a backstop).
- Voluntary sign-out sets a flag so other tabs do not show the inactivity message.

### Timing guarantee

Logout occurs after **7 calendar days** without activity (± poll interval while the app is open). Closing the tab or PWA does **not** pause the clock.

### Configuration

Constants live in `lib/sessionIdleConfig.ts`:

| Constant | Default | Purpose |
|----------|---------|---------|
| `IDLE_TIMEOUT_DAYS` | `7` | Inactivity threshold in days |
| `IDLE_TIMEOUT_MS` | `7 * 24 * 60 * 60 * 1000` | Same threshold in milliseconds |
| `ACTIVITY_THROTTLE_MS` | `1000` | Min gap between activity resets |
| `IDLE_CHECK_INTERVAL_MS` | `60000` | Idle poll interval while app is open |
| `IDLE_WARNING_BEFORE_MS` | `60000` | Reserved for a future “logout in 60s” warning |

Shared read/write helpers: `lib/sessionIdle.ts`.

### QA checklist

See [`docs/IDLE_LOGOUT_QA.md`](docs/IDLE_LOGOUT_QA.md) for manual test cases (single tab, multi-tab, sleep/wake, protected routes, API after timeout).
