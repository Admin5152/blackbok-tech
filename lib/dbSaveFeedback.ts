/**
 * Consistent “saved to database / not saved” copy for toasts and banners.
 * WHY: Staff and customers need an explicit signal when a write hit Supabase
 * (or when RLS / network left the UI looking saved while the DB did not).
 */

import { friendlyError } from './friendlyErrors';

export function dbSavedMessage(what: string): string {
  const label = String(what || 'Changes').trim() || 'Changes';
  return `Saved to database — ${label}`;
}

export function dbNotSavedMessage(e: unknown, action = 'save'): string {
  const detail = friendlyError(e, action);
  return `Not saved to database — ${detail}`;
}

export function dbSavedShort(count?: number, noun = 'row'): string {
  if (count == null) return 'Saved to database.';
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const plural = n === 1 ? noun : `${noun}s`;
  return `Saved to database — ${n} ${plural}.`;
}
