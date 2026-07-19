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
