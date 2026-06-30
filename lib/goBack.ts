/** Browser back when possible; otherwise navigate to `fallbackTo`. */
export function goBack(
  navigate: (opts: { to: string }) => void,
  fallbackTo = '/',
): void {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back();
    return;
  }
  navigate({ to: fallbackTo });
}
