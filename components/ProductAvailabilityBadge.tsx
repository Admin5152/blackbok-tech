interface ProductAvailabilityBadgeProps {
  /** Count available for current configuration */
  available: number;
  isLight: boolean;
  /** Tighter sizing for dense cards (grid) */
  compact?: boolean;
  /** Single-line pill beside price (minimal padding) */
  inline?: boolean;
}

/** Clear in-stock count / out-of-stock callout for PDP, cards, and quick view. */
export function ProductAvailabilityBadge({
  available,
  isLight,
  compact,
  inline,
}: ProductAvailabilityBadgeProps) {
  const inStock = available > 0;
  const dense = compact || inline;
  const gap = dense ? 'gap-x-1' : 'gap-x-2';

  return (
    <div
      role="status"
      className={`inline-flex max-w-full items-center rounded-full border ${
        inline && !inStock ? '' : 'flex-nowrap whitespace-nowrap'
      } ${inline ? 'px-2 py-0.5' : dense ? 'px-2 py-1' : 'px-2.5 py-1.5'} ${gap} ${
        inStock
          ? isLight
            ? 'border-[#CDA032]/65 bg-[#CDA032]/14 text-black shadow-sm'
            : 'border-[#CDA032]/55 bg-[#CDA032]/18 text-white shadow-[0_0_0_1px_rgba(212,175,55,0.12)]'
          : isLight
            ? 'border-red-500/65 bg-red-50 text-red-950'
            : 'border-red-500/55 bg-red-950/65 text-red-50'
      }`}
    >
      {inline && !inStock ? (
        <span
          className={`font-black uppercase tracking-[0.14em] text-[8px] ${
            isLight ? 'text-red-900/90' : 'text-red-100'
          }`}
        >
          sold out
        </span>
      ) : (
        <>
          {(inStock || !inline) && (
            <span
              className={`font-black tabular-nums leading-none tracking-tight ${
                inStock ? 'text-[#CDA032]' : isLight ? 'text-red-800' : 'text-red-100'
              } ${inline ? 'text-xs' : dense ? 'text-sm' : 'text-base sm:text-lg'}`}
            >
              {inStock ? available : '0'}
            </span>
          )}
          <span
            className={`font-black uppercase tracking-[0.12em] leading-tight ${
              inline ? 'text-[7px]' : dense ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'
            } ${isLight ? (inStock ? 'text-black/75' : 'text-red-900/85') : inStock ? 'text-white/90' : 'text-red-100'}`}
          >
            {inline
              ? inStock
                ? available === 1
                  ? 'unit'
                  : 'units'
                : null
              : inStock
                ? available === 1
                  ? 'unit in stock'
                  : 'units in stock'
                : 'out of stock'}
          </span>
        </>
      )}
    </div>
  );
}
