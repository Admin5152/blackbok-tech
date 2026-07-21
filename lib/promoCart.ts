/**
 * Cart ↔ promo_quote helpers and promo-code session persistence.
 * Discount amounts always come from the server — never computed here.
 */

import type { CartItem } from '../types';
import { ghsToPesewas, type PromoQuoteItem } from './promotions';

const PROMO_CODE_KEY = 'bb_promo_code';

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

export function loadPersistedPromoCode(): string {
  try {
    return (sessionStorage.getItem(PROMO_CODE_KEY) || '').trim().toUpperCase();
  } catch {
    return '';
  }
}

export function persistPromoCode(code: string | null): void {
  try {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) sessionStorage.removeItem(PROMO_CODE_KEY);
    else sessionStorage.setItem(PROMO_CODE_KEY, trimmed);
  } catch {
    /* private mode */
  }
}

export function clearPersistedPromoCode(): void {
  persistPromoCode(null);
}
