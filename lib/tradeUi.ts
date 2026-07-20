/**
 * Shared Trade UI class tokens — mirrored from Repair selection cards.
 */

/** Large device-type cards (Repair deviceTypes) */
export const TRADE_CARD_TYPE =
  'flex flex-col items-center justify-center p-6 sm:p-8 min-h-[11rem] rounded-3xl border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]';

/** Series / category tiles */
export const TRADE_CARD_TILE =
  'relative flex flex-col items-center justify-center gap-2 min-h-11 p-4 sm:p-5 rounded-2xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]';

/** Model image cards */
export const TRADE_CARD_MODEL =
  'relative flex flex-col items-center gap-2 p-3 pt-4 min-h-[9.5rem] rounded-2xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]';

export function tradeCardSelected(selected: boolean): string {
  return selected
    ? 'bg-[#CDA032]/10 border-[#CDA032] shadow-[0_0_30px_rgba(205,160,50,0.15)] ring-1 ring-[#CDA032]'
    : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40 hover:shadow-[0_0_16px_rgba(205,160,50,0.1)]';
}
