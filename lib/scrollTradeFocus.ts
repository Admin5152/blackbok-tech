/**
 * Keep the active trade-in step / question in view while filling on mobile.
 * Works with Lenis when enabled; falls back to window.scrollTo.
 */
import { getLenis } from './lenisScroll';

const DEFAULT_OFFSET_PX = 112;

export function scrollTradeFocusIntoView(
  el: Element | null | undefined,
  opts?: { offset?: number; behavior?: ScrollBehavior; immediate?: boolean },
): void {
  if (!el || typeof window === 'undefined') return;
  const offset = opts?.offset ?? DEFAULT_OFFSET_PX;
  const run = () => {
    try {
      const rect = el.getBoundingClientRect();
      const y = Math.max(0, rect.top + window.pageYOffset - offset);
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(y, {
          immediate: Boolean(opts?.immediate),
          duration: opts?.immediate ? 0 : 0.55,
        });
        return;
      }
      window.scrollTo({
        top: y,
        behavior: opts?.immediate ? 'auto' : (opts?.behavior ?? 'smooth'),
      });
    } catch {
      /* ignore */
    }
  };
  // Wait one frame so conditional question/step DOM has laid out
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}

/** Focus a field and scroll it into view (Details / lead capture). */
export function focusTradeField(
  el: HTMLElement | null | undefined,
  opts?: { offset?: number },
): void {
  if (!el) return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    try {
      el.focus();
    } catch {
      /* ignore */
    }
  }
  scrollTradeFocusIntoView(el, opts);
}
