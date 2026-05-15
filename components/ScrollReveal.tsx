import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useScrollReveal } from '../hooks/useScrollReveal';

/** Observes `.reveal-on-scroll` elements site-wide; re-scans on route change. */
export function ScrollReveal() {
  const { href } = useLocation();
  useScrollReveal(href);

  useEffect(() => {
    window.dispatchEvent(new Event('bb-scroll-reveal-scan'));
  }, [href]);

  return null;
}
