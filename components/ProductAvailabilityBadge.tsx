interface ProductAvailabilityBadgeProps {
  /** Count available for current configuration */
  available: number;
  isLight: boolean;
  /** Tighter sizing for dense cards (grid) */
  compact?: boolean;
  /** Single-line pill beside price (minimal padding) */
  inline?: boolean;
  /** Grid cards: "In stock" / "Out of stock" without unit counts */
  minimal?: boolean;
}

/** Clear in-stock count / out-of-stock callout for PDP, cards, and quick view. */
export function ProductAvailabilityBadge({
  available,
  isLight,
  compact,
  inline,
  minimal,
}: ProductAvailabilityBadgeProps) {
  const inStock = available > 0;
  const dense = compact || inline || minimal;
  const gap = dense ? 'gap-x-1' : 'gap-x-2';

  if (minimal) {
    return (
      <span
        role="status"
        className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide ${
          inStock
            ? isLight
              ? 'text-emerald-700'
              : 'text-emerald-400'
            : isLight
              ? 'text-red-700'
              : 'text-red-400'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            inStock ? 'bg-emerald-500' : 'bg-red-500'
          }`}
          aria-hidden
        />
        {inStock ? 'In stock' : 'Out of stock'}
      </span>
    );
  }

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
        <span
          className={`font-black uppercase tracking-[0.12em] leading-tight ${
            inline ? 'text-[7px]' : dense ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'
          } ${isLight ? (inStock ? 'text-black/75' : 'text-red-900/85') : inStock ? 'text-white/90' : 'text-red-100'}`}
        >
          {inStock ? 'in stock' : 'out of stock'}
        </span>
      )}
    </div>
  );
}
