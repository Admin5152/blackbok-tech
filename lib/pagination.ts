import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZES = {
  store: 24,
  list: 10,
  wishlist: 12,
  notifications: 15,
  catalog: 24,
} as const;

export function totalPages(itemCount: number, pageSize: number): number {
  if (itemCount <= 0 || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

export function paginateSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/**
 * Client-side pagination. Resets to page 1 when `resetKey` changes
 * (e.g. filters / search / active tab).
 */
export function usePagination<T>(
  items: T[],
  pageSize: number,
  resetKey?: string | number,
): {
  page: number;
  setPage: (p: number) => void;
  pageCount: number;
  pageItems: T[];
  total: number;
} {
  const [page, setPage] = useState(1);
  const pageCount = totalPages(items.length, pageSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(
    () => paginateSlice(items, page, pageSize),
    [items, page, pageSize],
  );

  return {
    page,
    setPage,
    pageCount,
    pageItems,
    total: items.length,
  };
}
