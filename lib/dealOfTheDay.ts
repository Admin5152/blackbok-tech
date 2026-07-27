import type { Product } from '../types';

/** Discount % from product (0–100). Reuses existing `discount` column. */
export function getDealDiscountPercentage(p: Pick<Product, 'discount'>): number {
  const n = Number(p.discount ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Original list price used for deal math. */
export function getDealOriginalPrice(p: Pick<Product, 'price' | 'price_from'>): number {
  const n = Number(p.price_from ?? p.price ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Discounted price = original × (1 − discount%/100).
 * Returns original when there is no discount.
 */
export function getDealDiscountedPrice(
  p: Pick<Product, 'price' | 'price_from' | 'discount'>,
): number {
  const original = getDealOriginalPrice(p);
  const pct = getDealDiscountPercentage(p);
  if (pct <= 0) return original;
  return Math.round(original * (1 - pct / 100) * 100) / 100;
}

export function isDealOfTheDayProduct(
  p: Pick<Product, 'is_deal_of_the_day' | 'isDealOfTheDay'>,
): boolean {
  return Boolean(p.is_deal_of_the_day ?? p.isDealOfTheDay);
}

export function getDealPromoText(p: Pick<Product, 'promo_text' | 'promoText'>): string {
  return String(p.promo_text ?? p.promoText ?? '').trim();
}
