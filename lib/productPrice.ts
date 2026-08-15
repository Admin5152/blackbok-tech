import type { Product, ProductVariant } from '../types';
import { applyDealDiscountToAmount } from './dealOfTheDay';
import { resolveSkuEffectivePrice } from './skuPrice';

/**
 * Resolve a sell price exclusively from the current database product/SKU row.
 * There are deliberately no tax, service-fee, shipping, or markup inputs here.
 */
export function databaseSellPrice(
  product: Pick<Product, 'price' | 'discount'>,
  variant?: Pick<ProductVariant, 'price' | 'price_modifier'> | null,
): number {
  const basePrice = Number(product.price ?? 0);
  const databasePrice = variant
    ? resolveSkuEffectivePrice({
        productPrice: basePrice,
        variantPrice: variant.price,
        priceModifier: variant.price_modifier,
      })
    : basePrice;

  // A product discount is an explicit database field and can only reduce price.
  return applyDealDiscountToAmount(databasePrice, product);
}

export function findDatabaseVariant(
  product: Pick<Product, 'variants'>,
  variantId: string | null | undefined,
): ProductVariant | null {
  const wanted = String(variantId ?? '').trim();
  if (!wanted) return null;
  return product.variants?.find((variant) => String(variant.id ?? '') === wanted) ?? null;
}
