/**
 * Hash-router entry fix: bare https://blackboxghana.com/ or /# must become /#/
 * so TanStack Router (createHashHistory) can mount. Safe for Supabase auth
 * tokens in search or hash.
 */
export function ensureHashRoute(): void {
  if (typeof window === 'undefined') return;

  try {
    const { location: loc } = window;
    const hash = loc.hash || '';
    const path = loc.pathname || '/';
    const search = loc.search || '';

    if (/^#(access_token|refresh_token|error)=/i.test(hash)) return;
    if (hash.startsWith('#/')) return;

    if (search.includes('type=recovery')) {
      loc.replace(`${loc.origin}/#/reset-password${search}`);
      return;
    }
    if (search.includes('type=email_confirm') || search.includes('type=signup')) {
      loc.replace(`${loc.origin}/#/emailconfirm${search}`);
      return;
    }
    if (search && /[?&](access_token|code)=/i.test(search)) {
      loc.replace(`${loc.origin}/#/${search}`);
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
