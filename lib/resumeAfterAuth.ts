/**
 * When a guest starts trade-in / repair (or checkout) and is sent to sign in,
 * we stash their draft in sessionStorage and restore it after login.
 */
const ENVELOPE_KEY = 'bb_resume_after_auth';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type ResumeFlowKind = 'trades' | 'repair';

const RESTORE_KEYS: Record<ResumeFlowKind, string> = {
  trades: 'bb_restore_trades',
  repair: 'bb_restore_repair',
};

interface Envelope {
  v: 1;
  flow: ResumeFlowKind;
  state: unknown;
  savedAt: number;
}

export function saveResumeAfterAuth(flow: ResumeFlowKind, state: unknown): void {
  try {
    const env: Envelope = { v: 1, flow, state, savedAt: Date.now() };
    sessionStorage.setItem(ENVELOPE_KEY, JSON.stringify(env));
  } catch {
    /* quota / private mode */
  }
}

export function clearResumeAfterAuth(): void {
  try {
    sessionStorage.removeItem(ENVELOPE_KEY);
  } catch {
    /* ignore */
  }
}

export function peekResumeAfterAuth(): ResumeFlowKind | null {
  try {
    const raw = sessionStorage.getItem(ENVELOPE_KEY);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope;
    if (env.v !== 1 || !env.flow || typeof env.savedAt !== 'number') return null;
    if (Date.now() - env.savedAt > MAX_AGE_MS) return null;
    return env.flow;
  } catch {
    return null;
  }
}

/**
 * After a successful customer login: move the draft to a per-route key
 * so the target page can `takeRestorePayload` on mount. Returns the flow
 * to navigate to, or null if nothing was pending / expired.
 */
export function activateResumeAfterLogin(): ResumeFlowKind | null {
  try {
    const raw = sessionStorage.getItem(ENVELOPE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(ENVELOPE_KEY);
    const env = JSON.parse(raw) as Envelope;
    if (env.v !== 1 || !env.flow || typeof env.savedAt !== 'number') return null;
    if (Date.now() - env.savedAt > MAX_AGE_MS) return null;
    const key = RESTORE_KEYS[env.flow];
    if (!key) return null;
    sessionStorage.setItem(key, JSON.stringify(env.state));
    return env.flow;
  } catch {
    return null;
  }
}

export function takeRestorePayload(kind: ResumeFlowKind): unknown | null {
  const key = RESTORE_KEYS[kind];
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function peekRestorePayload(kind: ResumeFlowKind): unknown | null {
  const key = RESTORE_KEYS[kind];
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearRestorePayload(kind: ResumeFlowKind): void {
  try {
    sessionStorage.removeItem(RESTORE_KEYS[kind]);
  } catch {
    /* ignore */
  }
}
