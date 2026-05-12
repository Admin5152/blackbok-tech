import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import type { ProductImage } from '../../types';

// Re-export so consumers that already import from the gallery file keep working.
export type { ProductImage };

interface ProductImageGalleryProps {
  images: ProductImage[];
  fallbackUrl: string | null;
  productName: string;
  theme?: 'light' | 'dark';
}

/** Swipe distance (in px) before we treat it as a horizontal swipe. */
const SWIPE_THRESHOLD = 40;
/** If the gesture is more vertical than this, treat it as a scroll, not a swipe. */
const SWIPE_VERTICAL_GUARD = 50;

export const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images,
  fallbackUrl,
  productName,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  // Order the gallery: primary image first, then the rest by `sort_order`.
  const ordered = useMemo<ProductImage[]>(() => {
    if (!Array.isArray(images) || images.length === 0) return [];
    return [...images].sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    });
  }, [images]);

  const hasImages = ordered.length > 0;
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset to the first image whenever the underlying list identity changes
  // (e.g. user navigates to a different product).
  useEffect(() => {
    setActiveIndex(0);
  }, [ordered]);

  const safeIndex = hasImages ? Math.min(activeIndex, ordered.length - 1) : 0;
  const activeImage = hasImages ? ordered[safeIndex] : null;
  const currentUrl = activeImage?.url ?? fallbackUrl ?? '';
  const currentAlt = activeImage?.alt_text ?? productName ?? 'Product image';

  // ---- Touch swipe state ---------------------------------------------------
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>): void => {
    const touch = event.touches[0];
    if (!touch) return;
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>): void => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    setTouchStart(null);
    if (!touch) return;

    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;

    // Ignore predominantly-vertical gestures (treat as scroll).
    if (Math.abs(dy) > SWIPE_VERTICAL_GUARD && Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (ordered.length < 2) return;

    if (dx < 0) {
      setActiveIndex((i) => Math.min(i + 1, ordered.length - 1));
    } else {
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
  };

  // ---- Empty state ---------------------------------------------------------
  if (!currentUrl) {
    return (
      <div
        className={`rounded-3xl border aspect-square flex flex-col items-center justify-center gap-3 ${
          isLight
            ? 'border-black/10 bg-black/[0.02]'
            : 'border-white/10 bg-white/[0.02]'
        }`}
      >
        <ImageOff
          size={28}
          className={isLight ? 'text-black/20' : 'text-white/20'}
        />
        <span
          className={`text-[10px] font-black uppercase tracking-[0.35em] ${
            isLight ? 'text-black/30' : 'text-white/30'
          }`}
        >
          No image available
        </span>
      </div>
    );
  }

  const showThumbs = ordered.length > 1;

  return (
    <div className="space-y-4">
      {/* Primary image */}
      <div
        className={`group relative rounded-3xl overflow-hidden border shadow-2xl ${
          isLight
            ? 'border-black/10 bg-black/[0.03]'
            : 'border-white/10 bg-black/30 backdrop-blur-sm'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="aspect-square w-full overflow-hidden">
          <img
            key={activeImage?.id ?? 'fallback'}
            src={currentUrl}
            alt={currentAlt}
            draggable={false}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        </div>

        {/* Desktop prev/next arrows. Visible on hover for pointer devices and
            hidden on mobile (which uses swipe instead). */}
        {showThumbs && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() =>
                setActiveIndex((i) => (i === 0 ? ordered.length - 1 : i - 1))
              }
              className={`hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 ${
                isLight
                  ? 'bg-white/80 text-black border border-black/10 hover:bg-white'
                  : 'bg-black/60 text-white border border-white/10 hover:bg-black/80'
              }`}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() =>
                setActiveIndex((i) => (i === ordered.length - 1 ? 0 : i + 1))
              }
              className={`hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 ${
                isLight
                  ? 'bg-white/80 text-black border border-black/10 hover:bg-white'
                  : 'bg-black/60 text-white border border-white/10 hover:bg-black/80'
              }`}
            >
              <ChevronRight size={18} />
            </button>

            {/* Mobile-only position dots */}
            <div
              className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5"
              aria-hidden="true"
            >
              {ordered.map((image, idx) => (
                <span
                  key={image.id}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === safeIndex
                      ? 'w-4 bg-[#CDA032]'
                      : isLight
                        ? 'w-1.5 bg-black/30'
                        : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {showThumbs && (
        <div
          role="tablist"
          aria-label={`${productName} image gallery thumbnails`}
          className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1"
        >
          {ordered.map((image, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={image.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={
                  image.alt_text ?? `${productName} image ${idx + 1}`
                }
                onClick={() => setActiveIndex(idx)}
                className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  isActive
                    ? 'border-[#CDA032] shadow-[0_0_0_3px_rgba(205,160,50,0.2)]'
                    : isLight
                      ? 'border-black/10 hover:border-black/30 opacity-70 hover:opacity-100'
                      : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={image.url}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
