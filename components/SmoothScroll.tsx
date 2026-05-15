import { useEffect } from 'react';
import Lenis from 'lenis';
import { setLenis } from '../lib/lenisScroll';

/** Inertial smooth scrolling (wheel/trackpad); pauses heavy CSS animations while scrolling. */
export function SmoothScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.11,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.1,
      wheelMultiplier: 0.92,
      duration: 1.05,
    });

    setLenis(lenis);
    document.documentElement.classList.add('lenis', 'lenis-smooth');

    let scrollEndTimer = 0;
    const markScrolling = () => {
      document.documentElement.classList.add('bb-is-scrolling');
      window.clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(() => {
        document.documentElement.classList.remove('bb-is-scrolling');
      }, 200);
    };
    lenis.on('scroll', (e) => {
      markScrolling();
      window.dispatchEvent(
        new CustomEvent('bb-scroll', { detail: { y: e.scroll } })
      );
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
