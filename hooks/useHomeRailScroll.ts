import { useEffect } from 'react';
import { bindAllHomeRails } from '../lib/homeRailScroll';

/**
 * Wire vertical scroll-through on homepage horizontal product rails.
 * Re-binds when `bindKey` changes (e.g. product counts) so new cards get handlers.
 */
export function useHomeRailScroll(bindKey?: string | number): void {
  useEffect(() => {
    let unbind = bindAllHomeRails();
    // Rails hydrate with products a tick later — rebind once.
    const retry = window.setTimeout(() => {
      unbind();
      unbind = bindAllHomeRails();
    }, 500);
    return () => {
      window.clearTimeout(retry);
      unbind();
    };
  }, [bindKey]);
}
