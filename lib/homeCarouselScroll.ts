import { getLenis } from './lenisScroll';

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

/**
 * Horizontally scroll a home product rail to an item without moving the page.
 * Disables snap briefly so proximity snap cannot pull the document.
 */
function scrollRailToItem(
  rail: HTMLElement,
  item: HTMLElement,
  behavior: ScrollBehavior = 'smooth',
): void {
  const pageY = readPageScrollY();
  const railRect = rail.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const left = itemRect.left - railRect.left + rail.scrollLeft;

  const prevSnap = rail.style.scrollSnapType;
  rail.style.scrollSnapType = 'none';

  rail.scrollTo({ left, behavior });

  const restore = () => restorePageScrollY(pageY);
  restore();
  requestAnimationFrame(() => {
    restore();
    rail.style.scrollSnapType = prevSnap;
    // One more restore after snap re-enables (snap can still nudge once).
    requestAnimationFrame(restore);
  });
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

  scrollRailToItem(rail, items[nextIndex], 'smooth');
}

/**
 * Auto-carousel step: advances one card, then loops to the start when at the end.
 * Uses instant horizontal scroll so smooth + snap cannot yank the page.
 */
export function scrollHomeRailLoop(railId: string, direction: 'prev' | 'next' = 'next'): void {
  const rail = document.getElementById(railId);
  if (!rail) return;

  const items = rail.querySelectorAll<HTMLElement>('[data-home-rail-item]');
  if (items.length <= 1) return;

  const activeIndex = activeRailItemIndex(rail, items);

  let nextIndex: number;
  if (direction === 'next') {
    nextIndex = activeIndex >= items.length - 1 ? 0 : activeIndex + 1;
  } else {
    nextIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
  }

  // Instant: autoplay must never run a multi-hundred-ms smooth scroll under the user.
  scrollRailToItem(rail, items[nextIndex], 'auto');
}
