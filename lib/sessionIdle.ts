import {
  IDLE_TIMEOUT_MS,
  SESSION_IDLE_STORAGE_KEY,
} from './sessionIdleConfig';

/** Read shared last-activity epoch (ms), or null if never recorded. */
export function readLastActivityMs(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_IDLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLastActivityMs(timestamp: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_IDLE_STORAGE_KEY, String(timestamp));
  } catch {
    /* storage unavailable */
  }
}

export function clearLastActivityMs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_IDLE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** True when wall-clock idle time has reached the configured threshold. */
export function isIdleSessionExpired(now = Date.now()): boolean {
  const last = readLastActivityMs();
  if (last == null) return false;
  return now - last >= IDLE_TIMEOUT_MS;
}
