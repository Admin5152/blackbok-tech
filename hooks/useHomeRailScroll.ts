import { useEffect } from 'react';
import { bindAllHomeRails } from '../lib/homeRailScroll';

/** Wire vertical scroll-through on homepage horizontal product rails. */
export function useHomeRailScroll(): void {
  useEffect(() => {
    const unbind = bindAllHomeRails();
    return unbind;
  }, []);
}
