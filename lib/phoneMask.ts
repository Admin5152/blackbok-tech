/**
 * Mask contact phone for customer-facing UI (show last 3–4 digits).
 * Admin detail screens should use the full value.
 */
export function maskPhone(value: string | null | undefined): string {
  if (value == null) return '—';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '—';
  if (digits.length <= 4) return '****';
  const last = digits.slice(-4);
  return `••• ••• ${last}`;
}

/** True when a string looks like it still holds a full phone (for accidental display). */
export function looksLikeFullPhone(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.replace(/\D/g, '').length >= 9 && !value.includes('•');
}

/**
 * Contact phone for forms — any country.
 * Accepts +, spaces, dashes, parentheses; requires 7–15 digits (ITU E.164 max).
 */
export function isValidContactPhone(raw: string): boolean {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return false;
  // Digits only for length; allow leading + and common separators in the original.
  if (!/^\+?[\d\s().\-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}
