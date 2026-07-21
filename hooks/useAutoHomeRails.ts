import { useEffect } from 'react';
import { scrollHomeRailLoop } from '../lib/homeCarouselScroll';

/**
 * Auto-advance homepage product rails (phones / laptops / highlights).
 * Pauses while the user hovers, focuses, touches, or manually scrolls a rail,
 * and while the tab is hidden.
 */
export function useAutoHomeRails(
  railIds: string[],
  intervalMs = 4500,
): void {
  useEffect(() => {
    if (typeof window === 'undefined' || railIds.length === 0) return;

    const cleanups: Array<() => void> = [];

    for (const railId of railIds) {
      let paused = false;
      let resumeTimer: ReturnType<typeof setTimeout> | null = null;

      const pause = (ms = 0) => {
        paused = true;
        if (resumeTimer) clearTimeout(resumeTimer);
        if (ms > 0) {
          resumeTimer = setTimeout(() => {
            paused = false;
          }, ms);
        }
      };

      const resume = () => {
        if (resumeTimer) clearTimeout(resumeTimer);
        paused = false;
      };

      const bind = () => {
        const rail = document.getElementById(railId);
        if (!rail) return null;

        const onPointerEnter = () => pause();
        const onPointerLeave = () => resume();
        const onFocusIn = () => pause();
        const onFocusOut = () => resume();
        const onScroll = () => pause(7000);
        const onTouchStart = () => pause(7000);

        rail.addEventListener('mouseenter', onPointerEnter);
        rail.addEventListener('mouseleave', onPointerLeave);
        rail.addEventListener('focusin', onFocusIn);
        rail.addEventListener('focusout', onFocusOut);
        rail.addEventListener('scroll', onScroll, { passive: true });
        rail.addEventListener('touchstart', onTouchStart, { passive: true });

        return () => {
          rail.removeEventListener('mouseenter', onPointerEnter);
          rail.removeEventListener('mouseleave', onPointerLeave);
          rail.removeEventListener('focusin', onFocusIn);
          rail.removeEventListener('focusout', onFocusOut);
          rail.removeEventListener('scroll', onScroll);
          rail.removeEventListener('touchstart', onTouchStart);
        };
      };

      // Rails mount with products; retry briefly if not ready yet.
      let unbindRail: (() => void) | null = bind();
      const retry = window.setTimeout(() => {
        if (!unbindRail) unbindRail = bind();
      }, 800);

      const tick = window.setInterval(() => {
        if (paused || document.visibilityState === 'hidden') return;
        scrollHomeRailLoop(railId, 'next');
      }, intervalMs);

      cleanups.push(() => {
        window.clearInterval(tick);
        window.clearTimeout(retry);
        if (resumeTimer) clearTimeout(resumeTimer);
        unbindRail?.();
      });
    }

    return () => {
      cleanups.forEach((c) => c());
    };
  }, [railIds.join('|'), intervalMs]);
}
