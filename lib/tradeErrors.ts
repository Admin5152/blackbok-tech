/**
 * Friendly trade / inventory / RLS error mapping for customer + staff UI.
 *
 * WHY: PostgREST and Postgres raise opaque codes (42501, unique_violation).
 * Never show blank screens — always return a readable string from tradeCopy.
 */
import { TRADE_COPY } from './tradeCopy';

export function tradeFriendlyError(e: unknown): string {
  const err = e as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };
  const raw = [err?.message, err?.details, err?.hint, err?.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    err?.code === '42501' ||
    /permission denied|row-level security|rls|not authorized|jwt/i.test(raw)
  ) {
    return TRADE_COPY.errors.rlsDenied;
  }

  if (
    /out of stock|insufficient stock|stock.*insufficient|cannot decrement/i.test(raw)
  ) {
    return TRADE_COPY.errors.outOfStock;
  }

  if (/duplicate_imei|uq_trade_active_imei|duplicate key.*imei/i.test(raw)) {
    return TRADE_COPY.errors.duplicateImei;
  }

  const msg = [err?.message, err?.details, err?.hint].filter(Boolean).join(' — ');
  return msg || TRADE_COPY.errors.generic;
}

/** True when the error is the completion OOS path (staff can switch target). */
export function isOutOfStockCompletionError(e: unknown): boolean {
  const err = e as { message?: string; details?: string; hint?: string };
  const raw = [err?.message, err?.details, err?.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /out of stock|insufficient stock|cannot decrement|does not match the target/i.test(
    raw,
  );
}

/**
 * Staff toast / banner: prefer mapped edge-case copy, else verbatim DB text
 * (e.g. offer-requires-value).
 */
export function staffTradeError(e: unknown): string {
  if (isOutOfStockCompletionError(e)) return TRADE_COPY.errors.outOfStock;
  const friendly = tradeFriendlyError(e);
  if (friendly !== TRADE_COPY.errors.generic) return friendly;
  const err = e as { message?: string; details?: string; hint?: string };
  const parts = [err?.message, err?.details, err?.hint].filter(Boolean);
  return parts.join(' — ') || TRADE_COPY.errors.generic;
}
