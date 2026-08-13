import type { Product } from '../types';

/** Discount % from product (0–100). Reuses existing `discount` column. */
export function getDealDiscountPercentage(p: Pick<Product, 'discount'>): number {
  const n = Number(p.discount ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Original list price used for deal math (family / from price). */
export function getDealOriginalPrice(p: Pick<Product, 'price' | 'price_from'>): number {
  const n = Number(p.price_from ?? p.price ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Apply product discount % to any amount (SKU effective price, list, etc.).
 * Returns the amount unchanged when there is no discount.
 */
export function applyDealDiscountToAmount(
  amount: number,
  p: Pick<Product, 'discount'>,
): number {
  const base = Number(amount);
  if (!Number.isFinite(base) || base <= 0) return 0;
  const pct = getDealDiscountPercentage(p);
  if (pct <= 0) return Math.round(base * 100) / 100;
  return Math.round(base * (1 - pct / 100) * 100) / 100;
}

/**
 * Discounted price = original × (1 − discount%/100).
 * Returns original when there is no discount.
 */
export function getDealDiscountedPrice(
  p: Pick<Product, 'price' | 'price_from' | 'discount'>,
): number {
  return applyDealDiscountToAmount(getDealOriginalPrice(p), p);
}

export function isDealOfTheDayProduct(
  p: Pick<Product, 'is_deal_of_the_day' | 'isDealOfTheDay'>,
): boolean {
  return Boolean(p.is_deal_of_the_day ?? p.isDealOfTheDay);
}

export function getDealPromoText(p: Pick<Product, 'promo_text' | 'promoText'>): string {
  return String(p.promo_text ?? p.promoText ?? '').trim();
}

/** True when shoppers should see deal chrome (badge / orange card). */
export function showDealOfTheDayChrome(
  p: Pick<Product, 'is_deal_of_the_day' | 'isDealOfTheDay' | 'discount'>,
): boolean {
  return isDealOfTheDayProduct(p);
}
