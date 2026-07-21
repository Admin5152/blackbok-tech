/**
 * Cart ↔ promo_quote helpers and promo-code session persistence.
 * Discount amounts always come from the server — never computed here.
 */

import type { CartItem } from '../types';
import { ghsToPesewas, type PromoQuoteItem } from './promotions';

export const PROMO_STORAGE_KEYS = {
  checkout: 'bb_promo_code',
  repair: 'bb_promo_repair',
  trade: 'bb_promo_trade',
} as const;

export type PromoStorageKey = (typeof PROMO_STORAGE_KEYS)[keyof typeof PROMO_STORAGE_KEYS];

export function cartToPromoQuoteItems(
  cart: CartItem[],
  categoryIdByName?: ReadonlyMap<string, string> | null,
): PromoQuoteItem[] {
  return cart.map((item) => {
    const catName = item.category ? String(item.category).trim() : '';
    const category_id =
      catName && categoryIdByName ? categoryIdByName.get(catName) ?? null : null;
    return {
      kind: 'product' as const,
      product_id: String(item.product_id || item.id),
      category_id,
      unit_price_pesewas: ghsToPesewas(Number(item.price) || 0),
      qty: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    };
  });
}

export function deliveryPromoItem(shippingPesewas: number): PromoQuoteItem | null {
  if (!Number.isFinite(shippingPesewas) || shippingPesewas <= 0) return null;
  return {
    kind: 'delivery',
    unit_price_pesewas: Math.round(shippingPesewas),
    qty: 1,
  };
}

export function repairPromoItems(payableGhs: number): PromoQuoteItem[] {
  const pesewas = ghsToPesewas(payableGhs);
  if (pesewas <= 0) return [];
  return [{ kind: 'repair', unit_price_pesewas: pesewas, qty: 1 }];
}

export function tradeTopUpPromoItems(topUpGhs: number): PromoQuoteItem[] {
  const pesewas = ghsToPesewas(topUpGhs);
  if (pesewas <= 0) return [];
  return [{ kind: 'tradein_topup', unit_price_pesewas: pesewas, qty: 1 }];
}

/** Product cart + optional delivery line for checkout promo_quote. */
export function buildCheckoutPromoItems(
  cart: CartItem[],
  shippingGhs: number,
  categoryIdByName?: ReadonlyMap<string, string> | null,
): PromoQuoteItem[] {
  const items = cartToPromoQuoteItems(cart, categoryIdByName);
  const delivery = deliveryPromoItem(ghsToPesewas(shippingGhs));
  if (delivery) items.push(delivery);
  return items;
}

export function loadPersistedPromoCode(
  key: PromoStorageKey = PROMO_STORAGE_KEYS.checkout,
): string {
  try {
    return (sessionStorage.getItem(key) || '').trim().toUpperCase();
  } catch {
    return '';
  }
}

export function persistPromoCode(
  code: string | null,
  key: PromoStorageKey = PROMO_STORAGE_KEYS.checkout,
): void {
  try {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, trimmed);
  } catch {
    /* private mode */
  }
}

export function clearPersistedPromoCode(
  key: PromoStorageKey = PROMO_STORAGE_KEYS.checkout,
): void {
  persistPromoCode(null, key);
}
