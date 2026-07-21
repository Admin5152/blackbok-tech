import { useEffect } from 'react';
import { isHomeRailAnimating, scrollHomeRailLoop } from '../lib/homeCarouselScroll';

/**
 * Auto-advance cadence: ~0.65s smooth slide + pause before the next card.
 */
export const HOME_RAIL_AUTO_MS = 2900;

/**
 * Auto-advance homepage product rails (phones / laptops / highlights).
 * Manual swipe / arrows still work; auto pauses briefly after user interaction,
 * while the tab is hidden, and while the rail is mostly off-screen.
 */
export function useAutoHomeRails(
  railIds: string[],
  intervalMs = HOME_RAIL_AUTO_MS,
): void {
  useEffect(() => {
    if (typeof window === 'undefined' || railIds.length === 0) return;

    const cleanups: Array<() => void> = [];

    for (const railId of railIds) {
      let paused = false;
      let inView = false;
      let resumeTimer: ReturnType<typeof setTimeout> | null = null;
      let io: IntersectionObserver | null = null;

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

        const onPointerEnter = () => pause(12000);
        const onPointerLeave = () => resume();
        const onFocusIn = () => pause(12000);
        const onFocusOut = () => resume();
        const onScroll = () => pause(12000);
        const onTouchStart = () => pause(12000);
        const onPointerDown = () => pause(12000);
        const onWheel = () => pause(12000);

        rail.addEventListener('mouseenter', onPointerEnter);
        rail.addEventListener('mouseleave', onPointerLeave);
        rail.addEventListener('focusin', onFocusIn);
        rail.addEventListener('focusout', onFocusOut);
        rail.addEventListener('scroll', onScroll, { passive: true });
        rail.addEventListener('touchstart', onTouchStart, { passive: true });
        rail.addEventListener('pointerdown', onPointerDown);
        rail.addEventListener('wheel', onWheel, { passive: true });

        io = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            inView = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.25);
          },
          { threshold: [0, 0.25, 0.4, 0.6, 1], rootMargin: '0px' },
        );
        io.observe(rail);

        return () => {
          rail.removeEventListener('mouseenter', onPointerEnter);
          rail.removeEventListener('mouseleave', onPointerLeave);
          rail.removeEventListener('focusin', onFocusIn);
          rail.removeEventListener('focusout', onFocusOut);
          rail.removeEventListener('scroll', onScroll);
          rail.removeEventListener('touchstart', onTouchStart);
          rail.removeEventListener('pointerdown', onPointerDown);
          rail.removeEventListener('wheel', onWheel);
          io?.disconnect();
          io = null;
        };
      };

      let unbindRail: (() => void) | null = bind();
      const retry = window.setTimeout(() => {
        if (!unbindRail) unbindRail = bind();
      }, 800);

      const tick = window.setInterval(() => {
        if (paused || !inView || document.visibilityState === 'hidden') return;
        if (isHomeRailAnimating(railId)) return;
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
