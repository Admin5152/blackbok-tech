import { getLenis } from './lenisScroll';

/** Auto-advance slide duration — short enough to feel snappy, long enough to read. */
export const HOME_RAIL_SCROLL_MS = 650;

/** Read current page scroll Y (Lenis or window). */
function readPageScrollY(): number {
  try {
    const lenis = getLenis();
    if (lenis && typeof lenis.scroll === 'number') return lenis.scroll;
  } catch {
    // ignore
  }
  return window.scrollY || window.pageYOffset || 0;
}

/** Put the page back if horizontal rail scrolling nudged it (scroll anchoring). */
function restorePageScrollY(y: number): void {
  try {
    const lenis = getLenis();
    if (lenis) {
      if (Math.abs(lenis.scroll - y) > 0.5) {
        lenis.scrollTo(y, { immediate: true });
      }
      return;
    }
  } catch {
    // fall through
  }
  if (Math.abs((window.scrollY || 0) - y) > 0.5) {
    window.scrollTo(0, y);
  }
}

/** Smooth ease — soft start/stop so the rail doesn’t feel stepped. */
function easeInOutQuint(t: number): number {
  return t < 0.5
    ? 16 * t * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

/** Track in-flight rail animations so we don't stack intervals mid-scroll. */
const railAnimating = new WeakMap<HTMLElement, number>();
const railSnapRestore = new WeakMap<HTMLElement, number>();

/**
 * Horizontally scroll a home product rail to an item without moving the page.
 */
function scrollRailToItem(
  rail: HTMLElement,
  item: HTMLElement,
  durationMs: number,
): void {
  const pageY = readPageScrollY();
  const railRect = rail.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const targetLeft = itemRect.left - railRect.left + rail.scrollLeft;
  const startLeft = rail.scrollLeft;
  const delta = targetLeft - startLeft;
  if (Math.abs(delta) < 1) return;

  const prevSnap = rail.style.scrollSnapType;
  rail.style.scrollSnapType = 'none';

  const existing = railAnimating.get(rail);
  if (existing) cancelAnimationFrame(existing);
  const pendingSnap = railSnapRestore.get(rail);
  if (pendingSnap) window.clearTimeout(pendingSnap);

  if (durationMs <= 0) {
    rail.scrollLeft = targetLeft;
    restorePageScrollY(pageY);
    rail.style.scrollSnapType = prevSnap;
    return;
  }

  const start = performance.now();

  const tick = (now: number) => {
    const raw = Math.min(1, (now - start) / durationMs);
    const t = easeInOutQuint(raw);
    rail.scrollLeft = startLeft + delta * t;
    restorePageScrollY(pageY);

    if (raw < 1) {
      railAnimating.set(rail, requestAnimationFrame(tick));
      return;
    }

    rail.scrollLeft = targetLeft;
    restorePageScrollY(pageY);
    railAnimating.delete(rail);
    // Delay snap restore so CSS snap doesn’t yank the final frame.
    const snapTimer = window.setTimeout(() => {
      rail.style.scrollSnapType = prevSnap;
      restorePageScrollY(pageY);
      railSnapRestore.delete(rail);
    }, 80);
    railSnapRestore.set(rail, snapTimer);
  };

  railAnimating.set(rail, requestAnimationFrame(tick));
}

function activeRailItemIndex(rail: HTMLElement, items: NodeListOf<HTMLElement>): number {
  const railRect = rail.getBoundingClientRect();
  const railCenter = railRect.left + railRect.width / 2;

  let activeIndex = 0;
  let bestDist = Infinity;
  items.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const center = r.left + r.width / 2;
    const dist = Math.abs(center - railCenter);
    if (dist < bestDist) {
      bestDist = dist;
      activeIndex = i;
    }
  });
  return activeIndex;
}

/** True while an animated rail scroll is in progress. */
export function isHomeRailAnimating(railId: string): boolean {
  const rail = document.getElementById(railId);
  return Boolean(rail && railAnimating.has(rail));
}

/** Scroll a home horizontal product rail by one snap card (smooth, snap-aligned). */
export function scrollHomeRail(railId: string, direction: 'prev' | 'next'): void {
  const rail = document.getElementById(railId);
  if (!rail) return;

  const items = rail.querySelectorAll<HTMLElement>('[data-home-rail-item]');
  if (items.length === 0) {
    const pageY = readPageScrollY();
    rail.scrollBy({ left: direction === 'next' ? 320 : -320, behavior: 'smooth' });
    requestAnimationFrame(() => restorePageScrollY(pageY));
    return;
  }

  const activeIndex = activeRailItemIndex(rail, items);
  const nextIndex =
    direction === 'next'
      ? Math.min(activeIndex + 1, items.length - 1)
      : Math.max(activeIndex - 1, 0);

  scrollRailToItem(rail, items[nextIndex], HOME_RAIL_SCROLL_MS);
}

/**
 * Auto-carousel step: advances one card, then loops to the start when at the end.
 */
export function scrollHomeRailLoop(railId: string, direction: 'prev' | 'next' = 'next'): void {
  const rail = document.getElementById(railId);
  if (!rail) return;
  if (railAnimating.has(rail)) return;

  const items = rail.querySelectorAll<HTMLElement>('[data-home-rail-item]');
  if (items.length <= 1) return;

  const activeIndex = activeRailItemIndex(rail, items);

  let nextIndex: number;
  if (direction === 'next') {
    nextIndex = activeIndex >= items.length - 1 ? 0 : activeIndex + 1;
  } else {
    nextIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
  }

  scrollRailToItem(rail, items[nextIndex], HOME_RAIL_SCROLL_MS);
}
