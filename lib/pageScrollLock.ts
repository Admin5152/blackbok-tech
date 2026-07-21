/**
 * Nested page-scroll locks (filter drawer, modals, mobile nav).
 * Stops Lenis while locked so wheel/touch reach overflow panels.
 * Pins body scrollY so unlock does not jump the page (esp. mobile Safari).
 */
import { getLenis } from './lenisScroll';

let lockCount = 0;
let savedBodyOverflow = '';
let savedBodyPosition = '';
let savedBodyTop = '';
let savedBodyLeft = '';
let savedBodyRight = '';
let savedBodyWidth = '';
let savedScrollY = 0;

function readScrollY(): number {
  try {
    const lenis = getLenis();
    if (lenis && typeof lenis.scroll === 'number') return lenis.scroll;
  } catch {
    // ignore
  }
  return window.scrollY || window.pageYOffset || 0;
}

function restoreScrollY(y: number): void {
  try {
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(y, { immediate: true });
      return;
    }
  } catch {
    // fall through
  }
  window.scrollTo(0, y);
}

/** Call while a full-screen overlay needs the page frozen. Returns unlock. */
export function lockPageScroll(): () => void {
  if (typeof document === 'undefined') return () => {};

  if (lockCount === 0) {
    savedScrollY = readScrollY();
    savedBodyOverflow = document.body.style.overflow;
    savedBodyPosition = document.body.style.position;
    savedBodyTop = document.body.style.top;
    savedBodyLeft = document.body.style.left;
    savedBodyRight = document.body.style.right;
    savedBodyWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
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
      document.body.style.position = savedBodyPosition;
      document.body.style.top = savedBodyTop;
      document.body.style.left = savedBodyLeft;
      document.body.style.right = savedBodyRight;
      document.body.style.width = savedBodyWidth;
      document.documentElement.classList.remove('bb-scroll-locked');
      try {
        getLenis()?.start();
      } catch {
        // ignore
      }
      restoreScrollY(savedScrollY);
    }
  };
}
