/**
 * Hash-router entry fix: bare https://blackboxghana.com/ or /# must become /#/
 * so TanStack Router (createHashHistory) can mount.
 *
 * CRITICAL: Never rewrite away `#access_token=…` / `?code=…` — those must be
 * consumed by `consumeAuthRedirect` (or supabase-js) first. Rewriting early
 * caused password-reset "link expired" failures.
 */
export function ensureHashRoute(): void {
  if (typeof window === 'undefined') return;

  try {
    const { location: loc } = window;
    const hash = loc.hash || '';
    const path = loc.pathname || '/';
    const search = loc.search || '';

    // Implicit tokens in the fragment — leave alone for auth consume.
    if (/^#(access_token|refresh_token|error)=/i.test(hash)) return;
    if (/access_token=/i.test(hash) && !hash.startsWith('#/')) return;

    // PKCE code (or error) still in the real query string — leave alone.
    if (/[?&](code|error)=/i.test(search) || /(?:^\?|&)code=/i.test(search)) return;
    if (search.includes('code=')) return;

    if (hash.startsWith('#/')) return;

    // Marker-only recovery / confirm (no secrets yet) → hash route, keep search.
    if (search.includes('type=recovery') && !search.includes('code=')) {
      loc.replace(`${loc.origin}/#/reset-password${search}`);
      return;
    }
    if (
      (search.includes('type=email_confirm') || search.includes('type=signup')) &&
      !search.includes('code=')
    ) {
      loc.replace(`${loc.origin}/#/emailconfirm${search}`);
      return;
    }

    let route = '/';
    if (path && path !== '/' && path !== '/index.html') {
      route = path.startsWith('/') ? path : `/${path}`;
    }

    if (!hash || hash === '#') {
      loc.replace(`${loc.origin}/#${route}${search}`);
      return;
    }

    if (hash.length > 1 && hash.charAt(1) !== '/') {
      const rest = hash.slice(1).replace(/^\//, '');
      loc.replace(`${loc.origin}/#/${rest}${search}`);
    }
  } catch {
    /* ignore */
  }
}
