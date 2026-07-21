/**
 * Consume Supabase Auth redirect tokens before the hash router rewrites the URL.
 *
 * WHY: This app uses `createHashHistory`. Recovery links often land as:
 *   https://site.com/?type=recovery#access_token=…&refresh_token=…&type=recovery
 * or (PKCE):
 *   https://site.com/?code=…&type=recovery
 *
 * Navigating to `/#/reset-password` replaces the hash and can wipe tokens
 * before `detectSessionInUrl` finishes — then `updateUser({ password })`
 * fails with "Auth session missing" (shown as "link expired").
 */
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export type AuthCallbackKind = 'recovery' | 'signup' | 'invite' | 'magiclink' | 'other' | null;

function paramsFromSearch(search: string): URLSearchParams {
  const q = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(q);
}

/** Implicit-flow tokens live in `#access_token=…` (not `#/route`). */
function paramsFromImplicitHash(hash: string): URLSearchParams {
  if (!hash || hash.startsWith('#/')) return new URLSearchParams();
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

/** After hash-router rewrite, query can sit inside the hash: `#/path?code=…`. */
function paramsFromHashRouteQuery(hash: string): URLSearchParams {
  if (!hash.startsWith('#/')) return new URLSearchParams();
  const qIndex = hash.indexOf('?');
  if (qIndex < 0) return new URLSearchParams();
  return new URLSearchParams(hash.slice(qIndex + 1));
}

function firstParam(sources: URLSearchParams[], key: string): string | null {
  for (const p of sources) {
    const v = p.get(key);
    if (v) return v;
  }
  return null;
}

function detectKind(sources: URLSearchParams[]): AuthCallbackKind {
  const type = (firstParam(sources, 'type') || '').toLowerCase();
  if (type === 'recovery') return 'recovery';
  if (type === 'signup' || type === 'email' || type === 'email_confirm') return 'signup';
  if (type === 'invite') return 'invite';
  if (type === 'magiclink') return 'magiclink';
  if (firstParam(sources, 'access_token') || firstParam(sources, 'code')) return 'other';
  return null;
}

/**
 * Parse/exchange auth redirect params and persist the session.
 * Safe to call multiple times (no-ops once URL no longer has tokens).
 */
export async function consumeAuthRedirect(): Promise<AuthCallbackKind> {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return null;

  const { location } = window;
  const searchParams = paramsFromSearch(location.search || '');
  const implicitParams = paramsFromImplicitHash(location.hash || '');
  const hashRouteParams = paramsFromHashRouteQuery(location.hash || '');
  const sources = [searchParams, implicitParams, hashRouteParams];

  const errorDescription =
    firstParam(sources, 'error_description') || firstParam(sources, 'error');
  if (errorDescription) {
    console.warn('Auth redirect error:', errorDescription);
    return null;
  }

  const client = getSupabaseClient();
  const kind = detectKind(sources);
  let established = false;

  const code = firstParam(sources, 'code');
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn('exchangeCodeForSession failed:', error.message);
    } else {
      established = true;
    }
  }

  const access_token = firstParam(sources, 'access_token');
  const refresh_token = firstParam(sources, 'refresh_token');
  if (!established && access_token && refresh_token) {
    const { error } = await client.auth.setSession({ access_token, refresh_token });
    if (error) {
      console.warn('setSession from recovery hash failed:', error.message);
    } else {
      established = true;
    }
  }

  // If tokens were already consumed by supabase-js detectSessionInUrl, still
  // treat recovery markers as success when a session exists.
  if (!established && kind) {
    const { data } = await client.auth.getSession();
    if (data.session) established = true;
  }

  if (!established) {
    // Marker-only URL (e.g. ?type=recovery) with no tokens yet — caller may wait.
    return kind;
  }

  // Strip secrets from the address bar, keep the intended hash route.
  try {
    const dest =
      kind === 'recovery'
        ? `${location.origin}/#/reset-password`
        : kind === 'signup'
          ? `${location.origin}/#/emailconfirm`
          : `${location.origin}/#/`;
    if (location.href !== dest) {
      window.history.replaceState(window.history.state, '', dest);
    }
  } catch {
    /* ignore */
  }

  return kind;
}

/** True when the entry URL looks like a password-recovery redirect. */
export function urlLooksLikePasswordRecovery(): boolean {
  if (typeof window === 'undefined') return false;
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  return (
    /(?:^|[?&#])type=recovery(?:&|$)/i.test(search) ||
    /(?:^|[?&#])type=recovery(?:&|$)/i.test(hash) ||
    /access_token=.*type=recovery/i.test(hash)
  );
}
