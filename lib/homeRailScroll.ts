import { getLenis } from './lenisScroll';

/** True when the rail cannot scroll further in the wheel direction along X. */
function railAtHorizontalEdge(rail: HTMLElement, deltaX: number): boolean {
  const max = rail.scrollWidth - rail.clientWidth;
  if (max <= 0) return true;
  if (deltaX > 0) return rail.scrollLeft >= max - 1;
  if (deltaX < 0) return rail.scrollLeft <= 1;
  return false;
}

function scrollPageBy(deltaY: number): void {
  if (!deltaY) return;
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(lenis.scroll + deltaY, { immediate: true });
    return;
  }
  window.scrollBy({ top: deltaY, left: 0, behavior: 'auto' });
}

/** Snap rail to the card nearest the rail’s left edge after a manual swipe. */
function snapRailToNearest(rail: HTMLElement): void {
  const items = rail.querySelectorAll<HTMLElement>('[data-home-rail-item]');
  if (items.length === 0) return;

  const railLeft = rail.getBoundingClientRect().left;
  let best: HTMLElement | null = null;
  let bestDist = Infinity;

  items.forEach((el) => {
    const dist = Math.abs(el.getBoundingClientRect().left - railLeft);
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  });

  if (!best) return;
  rail.scrollTo({ left: best.offsetLeft, behavior: 'smooth' });
}

/**
 * Home horizontal product rails must not trap vertical page scroll.
 *
 * Rails use `data-lenis-prevent`, so Lenis ignores them — without this binder,
 * vertical swipes on Feature picks / phones images freeze the page on mobile.
 * We own both axes: vertical → page (Lenis), horizontal → rail.
 */
export function bindHomeRailScroll(rail: HTMLElement): () => void {
  let touchStartX = 0;
  let touchStartY = 0;
  let lastTouchX = 0;
  let lastTouchY = 0;
  let axis: 'undecided' | 'x' | 'y' = 'undecided';

  const onWheel = (e: WheelEvent) => {
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    if (absY < 2 && absX < 2) return;

    const mostlyVertical = absY > absX * 0.9;
    const mostlyHorizontal = absX > absY * 0.9;

    if (mostlyHorizontal && !railAtHorizontalEdge(rail, e.deltaX)) {
      return;
    }

    if (!mostlyVertical && !mostlyHorizontal) {
      if (!railAtHorizontalEdge(rail, e.deltaX)) return;
    }

    if (!mostlyVertical && mostlyHorizontal) return;

    e.preventDefault();
    scrollPageBy(e.deltaY);
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    lastTouchX = touchStartX;
    lastTouchY = touchStartY;
    axis = 'undecided';
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = x - touchStartX;
    const dy = y - touchStartY;

    if (axis === 'undecided') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      // Prefer vertical page scroll when the gesture is clearly up/down.
      axis = Math.abs(dy) >= Math.abs(dx) * 0.85 ? 'y' : 'x';
    }

    e.preventDefault();

    if (axis === 'y') {
      const delta = lastTouchY - y;
      lastTouchY = y;
      scrollPageBy(delta);
      return;
    }

    const delta = lastTouchX - x;
    lastTouchX = x;
    rail.scrollLeft += delta;
  };

  const onTouchEnd = () => {
    if (axis === 'x') snapRailToNearest(rail);
    axis = 'undecided';
  };

  rail.addEventListener('wheel', onWheel, { passive: false });
  rail.addEventListener('touchstart', onTouchStart, { passive: true });
  rail.addEventListener('touchmove', onTouchMove, { passive: false });
  rail.addEventListener('touchend', onTouchEnd, { passive: true });
  rail.addEventListener('touchcancel', onTouchEnd, { passive: true });

  return () => {
    rail.removeEventListener('wheel', onWheel);
    rail.removeEventListener('touchstart', onTouchStart);
    rail.removeEventListener('touchmove', onTouchMove);
    rail.removeEventListener('touchend', onTouchEnd);
    rail.removeEventListener('touchcancel', onTouchEnd);
  };
}

export function bindAllHomeRails(): () => void {
  const rails = document.querySelectorAll<HTMLElement>('.bb-home-rail');
  const unbind = Array.from(rails, (el) => bindHomeRailScroll(el));
  return () => unbind.forEach((fn) => fn());
}
