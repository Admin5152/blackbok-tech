/**
 * Scroll the primary document view to the top. Covers `window`,
 * `document.scrollingElement`, and `#root` (some mobile WebViews scroll
 * the inner root instead of the window).
 */
export function scrollToDocumentTop(): void {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const se = document.scrollingElement;
    if (se) (se as HTMLElement).scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const root = document.getElementById('root');
    if (root) (root as HTMLElement).scrollTop = 0;
  } catch {
    /* ignore */
  }
}
