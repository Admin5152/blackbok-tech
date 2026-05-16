import { useEffect } from 'react';

const REVEAL_SELECTOR = '.reveal-on-scroll:not(.reveal-visible)';

export function scanScrollReveal(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('bb-scroll-reveal-scan'));
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Fade/slide elements in when they enter the viewport. Add class `reveal-on-scroll` in markup. */
export function useScrollReveal(rescanKey?: string): void {
  useEffect(() => {
    if (prefersReducedMotion()) {
      document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
        el.classList.add('reveal-visible');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.06,
        rootMargin: '0px 0px -4% 0px',
      },
    );

    const scan = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => observer.observe(el));
    };

    scan();

    const onRoute = () => {
      window.requestAnimationFrame(scan);
    };
    window.addEventListener('bb-scroll-reveal-scan', onRoute);

    return () => {
      observer.disconnect();
      window.removeEventListener('bb-scroll-reveal-scan', onRoute);
    };
  }, [rescanKey]);
}
