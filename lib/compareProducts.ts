import type { Product } from '../types';

export const COMPARE_MAX_ITEMS = 4;
export const COMPARE_PICKER_PAGE_SIZE = 12;

export function normalizeCompareSearchText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function productCompareSearchHaystack(product: Product): string {
  return normalizeCompareSearchText(
    [product.name, product.brand, product.category, product.description].filter(Boolean).join(' '),
  );
}

/** Products eligible for the compare picker (excludes already-selected IDs). */
export function filterComparePickerProducts(
  allProducts: Product[],
  compareIds: string[],
  searchTerm: string,
): Product[] {
  const tokens = normalizeCompareSearchText(searchTerm).split(' ').filter(Boolean);
  return allProducts.filter((p) => {
    if (compareIds.includes(p.id)) return false;
    if (tokens.length === 0) return true;
    const haystack = productCompareSearchHaystack(p);
    return tokens.every((token) => haystack.includes(token));
  });
}

/** Preserve compare column order from `compareIds`. */
export function resolveCompareProducts(allProducts: Product[], compareIds: string[]): Product[] {
  return compareIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
}

export interface CompareWinBadge {
  key: string;
  label: string;
  highlight?: boolean;
}

export function getCompareWinBadges(product: Product, compared: Product[]): CompareWinBadge[] {
  if (compared.length === 0) return [];

  const minPrice = Math.min(...compared.map((x) => x.price));
  const maxRating = Math.max(...compared.map((x) => x.rating || 0));
  const wins: CompareWinBadge[] = [];

  if (product.price === minPrice) {
    wins.push({ key: 'price', label: 'Best price', highlight: true });
  }
  if (compared.length > 1 && maxRating > 0 && (product.rating || 0) === maxRating) {
    wins.push({ key: 'rating', label: 'Top rated' });
  }
  if ((product.stock ?? 0) > 0) {
    wins.push({ key: 'stock', label: 'In stock' });
  }

  return wins;
}

export function buildCompareWinsByProductId(compared: Product[]): Map<string, CompareWinBadge[]> {
  const map = new Map<string, CompareWinBadge[]>();
  for (const product of compared) {
    map.set(product.id, getCompareWinBadges(product, compared));
  }
  return map;
}
