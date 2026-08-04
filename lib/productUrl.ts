/**
 * Readable product URLs for the storefront PDP.
 * Prefer DB slug → name-based slug with short id → raw UUID (legacy).
 */
import type { Product } from '../types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProductUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** URL-safe slug from a product name (or any label). */
export function slugifyProductLabel(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

type ProductUrlSource = Pick<Product, 'id' | 'name'> & { slug?: string | null };

/** Path segment for `/product/$productId` — readable when possible. */
export function productRouteParam(product: ProductUrlSource): string {
  const dbSlug = String(product.slug || '').trim();
  if (dbSlug) return dbSlug;

  const nameSlug = slugifyProductLabel(product.name || '');
  const idPrefix = String(product.id || '').split('-')[0] || '';
  if (nameSlug && idPrefix) return `${nameSlug}--${idPrefix}`;
  if (nameSlug) return nameSlug;
  return product.id;
}

/** True when a catalog product matches a route param (id, slug, or name--prefix). */
export function productMatchesRouteParam(
  product: ProductUrlSource,
  param: string,
): boolean {
  const key = decodeURIComponent(param || '').trim();
  if (!key) return false;
  if (product.id === key) return true;
  const slug = String(product.slug || '').trim();
  if (slug && slug === key) return true;
  if (productRouteParam(product) === key) return true;
  return false;
}
