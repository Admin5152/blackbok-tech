import { getLenis } from './lenisScroll';

/** Visible auto-advance duration so users notice the carousel moving. */
export const HOME_RAIL_SCROLL_MS = 1400;

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

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Track in-flight rail animations so we don't stack intervals mid-scroll. */
const railAnimating = new WeakMap<HTMLElement, number>();

/**
 * Horizontally scroll a home product rail to an item without moving the page.
 * Uses a timed animation (~1.4s for autoplay) so the motion is noticeable.
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

  if (durationMs <= 0) {
    rail.scrollLeft = targetLeft;
    restorePageScrollY(pageY);
    rail.style.scrollSnapType = prevSnap;
    return;
  }

  const start = performance.now();

  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    rail.scrollLeft = startLeft + delta * easeInOutCubic(t);
    restorePageScrollY(pageY);

    if (t < 1) {
      railAnimating.set(rail, requestAnimationFrame(tick));
      return;
    }

    rail.scrollLeft = targetLeft;
    restorePageScrollY(pageY);
    rail.style.scrollSnapType = prevSnap;
    railAnimating.delete(rail);
    requestAnimationFrame(() => restorePageScrollY(pageY));
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

  // Manual arrows: a bit snappier than autoplay (~0.9s).
  scrollRailToItem(rail, items[nextIndex], 900);
}

/**
 * Auto-carousel step: advances one card (~1.4s), then loops to the start when at the end.
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
