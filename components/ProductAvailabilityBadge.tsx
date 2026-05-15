interface ProductAvailabilityBadgeProps {
  /** Count available for current configuration */
  available: number;
  isLight: boolean;
  /** Tighter sizing for dense cards (grid) */
  compact?: boolean;
}

/** Clear in-stock count / out-of-stock callout for PDP, cards, and quick view. */
export function ProductAvailabilityBadge({
  available,
  isLight,
  compact,
}: ProductAvailabilityBadgeProps) {
  const inStock = available > 0;
  const gap = compact ? 'gap-x-1.5' : 'gap-x-2';

  return (
    <div
      role="status"
      className={`inline-flex max-w-full flex-wrap items-baseline rounded-lg border px-2.5 py-1.5 ${gap} ${
        inStock
          ? isLight
            ? 'border-[#CDA032]/65 bg-[#CDA032]/14 text-black shadow-sm'
            : 'border-[#CDA032]/55 bg-[#CDA032]/18 text-white shadow-[0_0_0_1px_rgba(212,175,55,0.12)]'
          : isLight
            ? 'border-red-500/65 bg-red-50 text-red-950'
            : 'border-red-500/55 bg-red-950/65 text-red-50'
      }`}
    >
      <span
        className={`font-black tabular-nums leading-none tracking-tight text-[#CDA032] ${
          compact ? 'text-sm' : 'text-base sm:text-lg'
        }`}
      >
        {inStock ? available : '0'}
      </span>
      <span
        className={`font-black uppercase tracking-[0.16em] ${
          compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'
        } ${isLight ? (inStock ? 'text-black/75' : 'text-red-900/85') : inStock ? 'text-white/90' : 'text-red-100'}`}
      >
        {inStock ? (available === 1 ? 'unit in stock' : 'units in stock') : 'out of stock'}
      </span>
    </div>
  );
}
