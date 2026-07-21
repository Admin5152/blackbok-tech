/** Scroll a home horizontal product rail by one snap card (smooth, snap-aligned). */
export function scrollHomeRail(railId: string, direction: 'prev' | 'next'): void {
  const rail = document.getElementById(railId);
  if (!rail) return;

  const items = rail.querySelectorAll<HTMLElement>('[data-home-rail-item]');
  if (items.length === 0) {
    rail.scrollBy({ left: direction === 'next' ? 320 : -320, behavior: 'smooth' });
    return;
  }

  const railRect = rail.getBoundingClientRect();
  const railCenter = railRect.left + railRect.width / 2;

  let activeIndex = 0;
  let bestDist = Infinity;
  items.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const center = r.left + r.width / 2;
    const dist = Math.abs(center - railCenter);
    if (dist < bestDist) {
      bestDist = dist;
      activeIndex = i;
    }
  });

  const nextIndex =
    direction === 'next'
      ? Math.min(activeIndex + 1, items.length - 1)
      : Math.max(activeIndex - 1, 0);

  items[nextIndex].scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'start',
  });
}

/**
 * Auto-carousel step: advances one card, then loops to the start when at the end
 * (or to the end when stepping prev from the start).
 */
export function scrollHomeRailLoop(railId: string, direction: 'prev' | 'next' = 'next'): void {
  const rail = document.getElementById(railId);
  if (!rail) return;

  const items = rail.querySelectorAll<HTMLElement>('[data-home-rail-item]');
  if (items.length <= 1) return;

  const railRect = rail.getBoundingClientRect();
  const railCenter = railRect.left + railRect.width / 2;

  let activeIndex = 0;
  let bestDist = Infinity;
  items.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const center = r.left + r.width / 2;
    const dist = Math.abs(center - railCenter);
    if (dist < bestDist) {
      bestDist = dist;
      activeIndex = i;
    }
  });

  let nextIndex: number;
  if (direction === 'next') {
    nextIndex = activeIndex >= items.length - 1 ? 0 : activeIndex + 1;
  } else {
    nextIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
  }

  items[nextIndex].scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'start',
  });
}
