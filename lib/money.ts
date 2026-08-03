/**
 * Single GHS money formatter for the whole app.
 *
 * Role: every customer- and admin-visible Ghana Cedi amount goes through
 * formatGhs() so currency prefix, locale, and rounding stay consistent.
 * lib/utils.formatCurrency re-exports this — do not invent a second formatter.
 */

/**
 * Format an amount as Ghana Cedis (GH₵).
 * @param amount - numeric value (non-finite → GH₵0)
 * @returns e.g. "GH₵4,200"
 */
export function formatGhs(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'GH₵0';
  const formatted = n.toLocaleString('en-GH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `GH₵${formatted}`;
}

/**
 * iPad / catalogue copy style: "GHS 14,999" (no cedis symbol, no decimals).
 * Prefer formatGhs() elsewhere for app-wide consistency.
 */
export function formatGhsPlain(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'GHS 0';
  const formatted = Math.round(n).toLocaleString('en-GH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `GHS ${formatted}`;
}
