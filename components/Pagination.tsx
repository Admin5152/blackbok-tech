import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Total items (optional — shown as “Showing x–y of z”). */
  total?: number;
  pageSize?: number;
  isLight?: boolean;
  className?: string;
  /** Hide entirely when only one page (default true). */
  hideWhenSinglePage?: boolean;
}

/**
 * Shared prev/next + page indicator for store, history, profile, etc.
 */
export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
  isLight = false,
  className = '',
  hideWhenSinglePage = true,
}) => {
  if (hideWhenSinglePage && pageCount <= 1) return null;

  const safePage = Math.min(Math.max(1, page), Math.max(1, pageCount));
  const from =
    total != null && pageSize != null && total > 0
      ? (safePage - 1) * pageSize + 1
      : null;
  const to =
    total != null && pageSize != null && total > 0
      ? Math.min(safePage * pageSize, total)
      : null;

  const btnBase = `inline-flex items-center justify-center gap-1.5 min-w-[2.5rem] h-10 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors disabled:opacity-35 disabled:pointer-events-none`;
  const btnTone = isLight
    ? 'bg-white border-black/10 text-black hover:border-[#CDA032]/50 hover:bg-[#CDA032]/5'
    : 'bg-white/5 border-white/10 text-white hover:border-[#CDA032]/40 hover:bg-[#CDA032]/10';

  return (
    <nav
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 ${className}`}
      aria-label="Pagination"
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-widest ${
          isLight ? 'text-black/40' : 'text-white/35'
        }`}
      >
        {from != null && to != null ? (
          <>
            Showing {from}–{to} of {total}
          </>
        ) : (
          <>
            Page {safePage} of {pageCount}
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`${btnBase} ${btnTone}`}
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
          Prev
        </button>

        <span
          className={`px-3 text-[11px] font-black tabular-nums ${
            isLight ? 'text-black/70' : 'text-white/70'
          }`}
        >
          {safePage} / {pageCount}
        </span>

        <button
          type="button"
          className={`${btnBase} ${btnTone}`}
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
};
