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

    // Horizontal: native pan-x on the rail (CSS touch-action).
    if (axis === 'x') return;

    e.preventDefault();
    const delta = lastTouchY - y;
    lastTouchY = y;
    scrollPageBy(delta);
  };

  const onTouchEnd = () => {
    axis = 'undecided';
  };

  let dragPointerId: number | null = null;
  let dragStartX = 0;
  let dragScrollLeft = 0;

  const endDrag = (pointerId: number) => {
    if (dragPointerId === null || pointerId !== dragPointerId) return;
    const pid = dragPointerId;
    dragPointerId = null;
    rail.classList.remove('bb-home-rail--dragging');
    try {
      rail.releasePointerCapture(pid);
    } catch {
      // ignore
    }
    snapRailToNearest(rail);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select, label')) return;

    dragPointerId = e.pointerId;
    dragStartX = e.clientX;
    dragScrollLeft = rail.scrollLeft;
    rail.classList.add('bb-home-rail--dragging');
    rail.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (dragPointerId === null || e.pointerId !== dragPointerId) return;
    rail.scrollLeft = dragScrollLeft - (e.clientX - dragStartX);
    e.preventDefault();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (dragPointerId === null || e.pointerId !== dragPointerId) return;
    endDrag(e.pointerId);
  };

  const onPointerCancel = (e: PointerEvent) => {
    if (dragPointerId === null || e.pointerId !== dragPointerId) return;
    endDrag(e.pointerId);
  };

  rail.addEventListener('wheel', onWheel, { passive: false });
  rail.addEventListener('touchstart', onTouchStart, { passive: true });
  rail.addEventListener('touchmove', onTouchMove, { passive: false });
  rail.addEventListener('touchend', onTouchEnd, { passive: true });
  rail.addEventListener('touchcancel', onTouchEnd, { passive: true });
  rail.addEventListener('pointerdown', onPointerDown);
  rail.addEventListener('pointermove', onPointerMove, { passive: false });
  rail.addEventListener('pointerup', onPointerUp);
  rail.addEventListener('pointercancel', onPointerCancel);

  return () => {
    rail.removeEventListener('wheel', onWheel);
    rail.removeEventListener('touchstart', onTouchStart);
    rail.removeEventListener('touchmove', onTouchMove);
    rail.removeEventListener('touchend', onTouchEnd);
    rail.removeEventListener('touchcancel', onTouchEnd);
    rail.removeEventListener('pointerdown', onPointerDown);
    rail.removeEventListener('pointermove', onPointerMove);
    rail.removeEventListener('pointerup', onPointerUp);
    rail.removeEventListener('pointercancel', onPointerCancel);
  };
}

export function bindAllHomeRails(): () => void {
  const rails = document.querySelectorAll<HTMLElement>('.bb-home-rail');
  const unbind = Array.from(rails, (el) => bindHomeRailScroll(el));
  return () => unbind.forEach((fn) => fn());
}
