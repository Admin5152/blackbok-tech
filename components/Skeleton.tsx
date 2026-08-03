import React from 'react';

type Tone = 'light' | 'dark';

function toneClass(isLight: boolean): string {
  return isLight ? 'bg-black/[0.06]' : 'bg-white/[0.08]';
}

/** Base shimmer block */
export const Skeleton: React.FC<{
  className?: string;
  isLight?: boolean;
  style?: React.CSSProperties;
}> = ({ className = '', isLight = false, style }) => (
  <div
    className={`animate-pulse rounded-lg ${toneClass(isLight)} ${className}`}
    style={style}
    aria-hidden
  />
);

export const ProductCardSkeleton: React.FC<{ isLight?: boolean; compact?: boolean }> = ({
  isLight = false,
  compact = false,
}) => (
  <div
    className={`overflow-hidden rounded-2xl border ${
      isLight ? 'border-black/5 bg-white' : 'border-white/5 bg-[var(--bb-surface)]'
    }`}
  >
    <Skeleton isLight={isLight} className={compact ? 'aspect-square rounded-none' : 'aspect-[4/5] rounded-none'} />
    <div className={`space-y-2 ${compact ? 'p-2.5' : 'p-4'}`}>
      <Skeleton isLight={isLight} className="h-2.5 w-1/3" />
      <Skeleton isLight={isLight} className="h-3.5 w-4/5" />
      <Skeleton isLight={isLight} className="h-3 w-1/2" />
    </div>
  </div>
);

export const ProductGridSkeleton: React.FC<{
  isLight?: boolean;
  count?: number;
  compact?: boolean;
  className?: string;
}> = ({ isLight = false, count = 8, compact = false, className = '' }) => (
  <div
    className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5 ${className}`}
    role="status"
    aria-label="Loading products"
  >
    {Array.from({ length: count }, (_, i) => (
      <ProductCardSkeleton key={i} isLight={isLight} compact={compact} />
    ))}
    <span className="sr-only">Loading…</span>
  </div>
);

export const ListRowSkeleton: React.FC<{ isLight?: boolean }> = ({ isLight = false }) => (
  <div
    className={`flex items-center gap-3 rounded-xl border p-3 ${
      isLight ? 'border-black/5 bg-white' : 'border-white/5 bg-[var(--bb-surface)]'
    }`}
  >
    <Skeleton isLight={isLight} className="h-14 w-14 shrink-0 rounded-lg" />
    <div className="min-w-0 flex-1 space-y-2">
      <Skeleton isLight={isLight} className="h-3 w-2/3" />
      <Skeleton isLight={isLight} className="h-2.5 w-1/3" />
    </div>
    <Skeleton isLight={isLight} className="h-8 w-16 shrink-0 rounded-lg" />
  </div>
);

export const ListSkeleton: React.FC<{
  isLight?: boolean;
  count?: number;
  className?: string;
}> = ({ isLight = false, count = 5, className = '' }) => (
  <div className={`space-y-3 ${className}`} role="status" aria-label="Loading list">
    {Array.from({ length: count }, (_, i) => (
      <ListRowSkeleton key={i} isLight={isLight} />
    ))}
    <span className="sr-only">Loading…</span>
  </div>
);

/** Full-bleed PDP placeholder */
export const ProductDetailSkeleton: React.FC<{ isLight?: boolean }> = ({ isLight = false }) => (
  <div
    className={`min-h-[70vh] px-4 py-8 sm:px-6 ${isLight ? 'bg-[#FAFAFA]' : 'bg-black'}`}
    role="status"
    aria-label="Loading product"
  >
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
      <Skeleton isLight={isLight} className="aspect-square w-full rounded-2xl" />
      <div className="space-y-4 pt-2">
        <Skeleton isLight={isLight} className="h-3 w-24" />
        <Skeleton isLight={isLight} className="h-8 w-4/5" />
        <Skeleton isLight={isLight} className="h-6 w-32" />
        <Skeleton isLight={isLight} className="h-24 w-full rounded-xl" />
        <div className="flex gap-2 pt-2">
          <Skeleton isLight={isLight} className="h-11 flex-1 rounded-xl" />
          <Skeleton isLight={isLight} className="h-11 w-11 rounded-xl" />
        </div>
      </div>
    </div>
    <span className="sr-only">Loading product…</span>
  </div>
);

/** Compact session / route loading */
export const PageSectionSkeleton: React.FC<{
  isLight?: boolean;
  variant?: 'grid' | 'list' | 'detail';
  count?: number;
}> = ({ isLight = false, variant = 'list', count }) => {
  if (variant === 'grid') return <ProductGridSkeleton isLight={isLight} count={count ?? 8} compact />;
  if (variant === 'detail') return <ProductDetailSkeleton isLight={isLight} />;
  return <ListSkeleton isLight={isLight} count={count ?? 5} />;
};

export type { Tone };
