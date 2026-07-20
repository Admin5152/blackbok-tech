/**
 * Nested page-scroll locks (filter drawer, modals, mobile nav).
 * Stops Lenis while locked so wheel/touch reach overflow panels.
 */
import { getLenis } from './lenisScroll';

let lockCount = 0;
let savedBodyOverflow = '';

/** Call while a full-screen overlay needs the page frozen. Returns unlock. */
export function lockPageScroll(): () => void {
  if (typeof document === 'undefined') return () => {};

  if (lockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('bb-scroll-locked');
    try {
      getLenis()?.stop();
    } catch {
      // Lenis may not be active (mobile / reduced motion).
    }
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = savedBodyOverflow;
      document.documentElement.classList.remove('bb-scroll-locked');
      try {
        getLenis()?.start();
      } catch {
        // ignore
      }
    }
  };
}
