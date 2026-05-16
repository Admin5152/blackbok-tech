import { useEffect } from 'react';
import Lenis from 'lenis';
import { setLenis } from '../lib/lenisScroll';
import { shouldUseSmoothScroll } from '../lib/shouldUseSmoothScroll';

/** Desktop wheel smoothing; touch devices use native scroll for responsiveness. */
export function SmoothScroll() {
  useEffect(() => {
    if (!shouldUseSmoothScroll()) {
      setLenis(null);
      return;
    }

    const lenis = new Lenis({
      lerp: 0.2,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
      autoResize: true,
    });

    setLenis(lenis);
    document.documentElement.classList.add('lenis', 'lenis-smooth');

    let scrollEndTimer = 0;
    let rafPending = false;
    let lastDispatchedY = -1;

    const markScrolling = () => {
      if (!document.documentElement.classList.contains('bb-is-scrolling')) {
        document.documentElement.classList.add('bb-is-scrolling');
      }
      window.clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(() => {
        document.documentElement.classList.remove('bb-is-scrolling');
      }, 280);
    };

    lenis.on('scroll', (instance) => {
      markScrolling();
      if (rafPending) return;
      rafPending = true;
      window.requestAnimationFrame(() => {
        rafPending = false;
        const y = Math.round(instance.scroll);
        if (y === lastDispatchedY) return;
        lastDispatchedY = y;
        window.dispatchEvent(
          new CustomEvent('bb-scroll', { detail: { y } }),
        );
      });
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(scrollEndTimer);
      document.documentElement.classList.remove('lenis', 'lenis-smooth', 'bb-is-scrolling');
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
