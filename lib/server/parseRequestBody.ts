/**
 * Normalize Vercel / Node request bodies (object, JSON string, or Buffer).
 */
export function parseRequestBody(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) {
    return parseRequestBody(raw.toString('utf8'));
  }

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return {};
}
