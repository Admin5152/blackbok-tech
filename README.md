# BlackBox Tech (blackbok-tech)

Vite + React storefront with Supabase (auth, Postgres, storage).

## Run locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Copy `.env.template` to `.env.local` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and other variables as needed (see `DEPLOYMENT.md`).
3. Start the dev server: `npm run dev` (default: http://localhost:3000)

## Session idle logout (12 minutes)

The frontend enforces a **strict 12-minute inactivity logout**, independent of Supabase JWT refresh timing. Backend inactivity settings alone can leave an authenticated window of up to ~27 minutes; client-side idle tracking closes that gap.

### How it works

- `SessionTimeoutProvider` (mounted once in `App.tsx` inside `AppContext.Provider`) runs `useIdleLogout`.
- User activity (`mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`, `click`, and tab refocus via `visibilitychange`) updates a shared `lastActivity` timestamp, throttled to once per second.
- Every second, the hook compares `Date.now() - lastActivity` to `IDLE_TIMEOUT_MS` (12 minutes). When the threshold is reached, it calls `supabase.auth.signOut()`, clears local session state, and redirects to `/#/auth?reason=session_expired&returnTo=…`.
- Activity and forced logout sync across tabs via `BroadcastChannel` and `localStorage` (with Supabase `onAuthStateChange` as a backstop).
- Voluntary sign-out sets a flag so other tabs do not show the inactivity message.

### Timing guarantee

Logout occurs at **12 minutes ± ~1 second** of true inactivity (poll interval), regardless of when the access token would refresh.

### Configuration

Constants live in `lib/sessionIdleConfig.ts`:

| Constant | Default | Purpose |
|----------|---------|---------|
| `IDLE_TIMEOUT_MS` | `12 * 60 * 1000` | Inactivity threshold |
| `ACTIVITY_THROTTLE_MS` | `1000` | Min gap between activity resets |
| `IDLE_CHECK_INTERVAL_MS` | `1000` | Idle poll interval |
| `IDLE_WARNING_BEFORE_MS` | `60000` | Reserved for a future “logout in 60s” warning |

### QA checklist

See [`docs/IDLE_LOGOUT_QA.md`](docs/IDLE_LOGOUT_QA.md) for manual test cases (single tab, multi-tab, sleep/wake, protected routes, API after timeout).
