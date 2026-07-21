import { getLenis } from './lenisScroll';

/** True when the rail cannot scroll further in the wheel direction along X. */
function railAtHorizontalEdge(rail: HTMLElement, deltaX: number): boolean {
  const max = rail.scrollWidth - rail.clientWidth;
  if (max <= 0) return true;
  if (deltaX > 0) return rail.scrollLeft >= max - 1;
  if (deltaX < 0) return rail.scrollLeft <= 1;
  return false;
}

/**
 * Home horizontal product rails must not trap vertical page scroll.
 * - Touch: CSS uses pan-y + pan-x (not pan-x only).
 * - Wheel: forward mostly-vertical deltas to Lenis / window.
 *   Use immediate Lenis steps — animated tweens felt like random jumps
 *   while the cursor was over a carousel.
 */
export function bindHomeRailScroll(rail: HTMLElement): () => void {
  const onWheel = (e: WheelEvent) => {
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    if (absY < 2) return;

    const mostlyVertical = absY > absX * 0.9;
    const mostlyHorizontal = absX > absY * 0.9;

    if (mostlyHorizontal && !railAtHorizontalEdge(rail, e.deltaX)) {
      return;
    }

    if (!mostlyVertical && !mostlyHorizontal) {
      if (!railAtHorizontalEdge(rail, e.deltaX)) return;
    }

    if (!mostlyVertical && mostlyHorizontal) return;

    const lenis = getLenis();
    if (lenis) {
      e.preventDefault();
      lenis.scrollTo(lenis.scroll + e.deltaY, { immediate: true });
      return;
    }

    e.preventDefault();
    window.scrollBy({ top: e.deltaY, left: 0, behavior: 'auto' });
  };

  rail.addEventListener('wheel', onWheel, { passive: false });
  return () => rail.removeEventListener('wheel', onWheel);
}

export function bindAllHomeRails(): () => void {
  const rails = document.querySelectorAll<HTMLElement>('.bb-home-rail');
  const unbind = Array.from(rails, (el) => bindHomeRailScroll(el));
  return () => unbind.forEach((fn) => fn());
}
