/** Lenis smooth scroll — desktop pointer only; phones/tablets use native scroll. */
export function shouldUseSmoothScroll(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.matchMedia('(pointer: coarse)').matches) return false;
  if (window.matchMedia('(max-width: 1024px)').matches) return false;
  return true;
}
