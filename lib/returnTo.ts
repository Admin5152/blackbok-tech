/**
 * Safe internal return path for post-login redirects (idle logout, route guards).
 * Rejects open redirects — only same-app relative paths are allowed.
 */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

export function readReturnToFromSearch(search: Record<string, unknown>): string | null {
  const value = search.returnTo;
  return sanitizeReturnTo(typeof value === 'string' ? value : null);
}
