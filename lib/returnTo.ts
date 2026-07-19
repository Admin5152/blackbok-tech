/**
 * Safe internal return path for post-login redirects (idle logout, route guards).
 * Rejects open redirects — only same-app relative paths are allowed.
 *
 * WHY sessionStorage: hash router + signup→confirm→login can drop `?returnTo=`.
 * Persisting the path until a successful login keeps the customer on the page
 * they were working on (e.g. /trade/details).
 */
const RETURN_TO_KEY = 'auth.returnTo';

export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (/^https?:\/\//i.test(trimmed)) return null;
  // Never bounce back to auth itself
  if (trimmed === '/auth' || trimmed.startsWith('/auth?')) return null;
  return trimmed;
}

export function readReturnToFromSearch(search: Record<string, unknown>): string | null {
  const value = search.returnTo;
  return sanitizeReturnTo(typeof value === 'string' ? value : null);
}

/** Remember where to send the user after sign-in (survives hash/confirm hops). */
export function saveReturnTo(path: string | null | undefined): void {
  const safe = sanitizeReturnTo(path);
  if (!safe) return;
  try {
    sessionStorage.setItem(RETURN_TO_KEY, safe);
  } catch {
    /* private mode */
  }
}

/** Peek without clearing — used when hopping auth → confirm → auth. */
export function peekReturnTo(): string | null {
  try {
    return sanitizeReturnTo(sessionStorage.getItem(RETURN_TO_KEY));
  } catch {
    return null;
  }
}

export function clearReturnTo(): void {
  try {
    sessionStorage.removeItem(RETURN_TO_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve post-login destination: prop/URL first, then stored path.
 * Clears storage only when a destination is returned (successful login).
 */
export function resolveReturnTo(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    const safe = sanitizeReturnTo(c);
    if (safe) {
      clearReturnTo();
      return safe;
    }
  }
  try {
    const stored = sessionStorage.getItem(RETURN_TO_KEY);
    if (stored) {
      clearReturnTo();
      return sanitizeReturnTo(stored);
    }
  } catch {
    /* ignore */
  }
  return null;
}
