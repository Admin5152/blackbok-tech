/**
 * In-app back navigation — never dump the shopper onto an external referrer
 * (Google, Instagram, etc.) when they tap Back on BlackBox.
 */
const SPA_HOPS_KEY = 'bb_spa_nav_hops';

function readHops(): number {
  try {
    return Math.max(0, Number(sessionStorage.getItem(SPA_HOPS_KEY) || '0') || 0);
  } catch {
    return 0;
  }
}

function writeHops(n: number): void {
  try {
    sessionStorage.setItem(SPA_HOPS_KEY, String(Math.max(0, n)));
  } catch {
    /* ignore */
  }
}

/** Call on each client-side route change so Back can use in-app history. */
export function noteSpaNavigation(): void {
  writeHops(readHops() + 1);
}

function referrerIsSameOrigin(): boolean {
  try {
    const ref = document.referrer;
    if (!ref) return false;
    return new URL(ref).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Browser back only when previous page was BlackBox; otherwise `fallbackTo`. */
export function goBack(
  navigate: (opts: { to: string }) => void,
  fallbackTo = '/',
): void {
  if (typeof window === 'undefined') {
    navigate({ to: fallbackTo });
    return;
  }

  const hops = readHops();
  const canUseHistory =
    window.history.length > 1 && (hops > 0 || referrerIsSameOrigin());

  if (canUseHistory) {
    if (hops > 0) writeHops(hops - 1);
    window.history.back();
    return;
  }

  navigate({ to: fallbackTo });
}
