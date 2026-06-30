import type { Product, Category } from '../types';
import { normalizeProductCategory } from './api';

export const STORE_PRICE_SLIDER_MAX = 15000;
export const STORE_PRICE_SLIDER_STEP = 100;

export const STORE_PREFERRED_CATEGORIES = [
  'iPhone',
  'Laptop',
  'Tablet',
  'Gaming',
  'Audio',
  'Accessories',
  'Trades',
] as const;

export function getProductDiscountValue(discount: unknown): number {
  if (typeof discount === 'number') return Number.isFinite(discount) ? discount : 0;
  if (typeof discount === 'string') {
    const parsed = Number(discount.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function productTextHaystack(p: Product): string {
  return [
    p.name,
    p.description,
    p.brand,
    p.model,
    p.sku,
    p.category,
    Array.isArray(p.specs) ? p.specs.join(' ') : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function productMatchesStoreSearch(p: Product, qRaw: string): boolean {
  const q = qRaw.trim().toLowerCase();
  if (!q) return true;
  const hay = productTextHaystack(p);
  const productNorm = normalizeProductCategory(p.category);
  const words = q.split(/\s+/).filter(Boolean);
  return words.every((word) => {
    if (hay.includes(word)) return true;
    return normalizeProductCategory(word) === productNorm;
  });
}

export interface StoreBaseFilterOptions {
  searchTerm: string;
  priceMin: number;
  priceMax: number;
  promotionsOnly: boolean;
}

export function productPassesStoreBaseFilters(p: Product, opts: StoreBaseFilterOptions): boolean {
  if (!productMatchesStoreSearch(p, opts.searchTerm)) return false;
  const price = Number(p.price ?? 0);
  if (!Number.isFinite(price) || price < opts.priceMin || price > opts.priceMax) return false;
  if (opts.promotionsOnly && getProductDiscountValue(p.discount) <= 0) return false;
  return true;
}

export function buildOrderedStoreCategoryKeys(products: Product[]): string[] {
  const catalogKeys: Record<string, true> = {};
  products.forEach((p) => {
    catalogKeys[normalizeProductCategory(p.category)] = true;
  });
  const remaining = new Set(Object.keys(catalogKeys));
  const ordered: string[] = [];
  STORE_PREFERRED_CATEGORIES.forEach((cat) => {
    if (remaining.has(cat)) {
      ordered.push(cat);
      remaining.delete(cat);
    }
  });
  [...remaining]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .forEach((k) => ordered.push(k));
  return ordered;
}

export function countActiveStoreFilters(opts: {
  selectedCategories: Category[];
  priceMin: number;
  priceMax: number;
  promotionsOnly: boolean;
}): number {
  return [
    opts.selectedCategories.length > 0,
    opts.priceMin > 0,
    opts.priceMax < STORE_PRICE_SLIDER_MAX,
    opts.promotionsOnly,
  ].filter(Boolean).length;
}

export function productMatchesStoreCategories(
  p: Product,
  selectedCategories: Category[],
): boolean {
  if (selectedCategories.length === 0) return true;
  const normalized = normalizeProductCategory(p.category);
  return selectedCategories.some((sel) => normalizeProductCategory(sel) === normalized);
}
