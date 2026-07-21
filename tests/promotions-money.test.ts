/**
 * Promotions money helpers — display-edge only.
 * Mirrors the SQL contract for floor/clamp behaviour (tests, not checkout path).
 */
import { describe, expect, it } from 'vitest';
import {
  formatGHS,
  ghsToPesewas,
  pesewasToGhs,
  PESEWAS_PER_CEDI,
} from '../lib/promotions';
import { cartToPromoQuoteItems, buildCheckoutPromoItems, deliveryPromoItem, repairPromoItems, tradeTopUpPromoItems } from '../lib/promoCart';
import { promoFriendlyMessage } from '../lib/promoErrors';
import type { CartItem } from '../types';

/** Same clamp rules as public.promo_compute_discount (integer pesewas). */
function computeDiscountPesewas(args: {
  discountType: 'fixed' | 'percentage';
  amountOff?: number;
  percentOff?: number;
  maxDiscount?: number | null;
  eligibleSubtotal: number;
}): number {
  const sub = args.eligibleSubtotal;
  if (sub <= 0) return 0;
  let d: number;
  if (args.discountType === 'percentage') {
    d = Math.floor((sub * (args.percentOff ?? 0)) / 100);
    if (args.maxDiscount != null) d = Math.min(d, args.maxDiscount);
  } else {
    d = args.amountOff ?? 0;
  }
  return Math.max(0, Math.min(d, sub));
}

describe('promotions money helpers', () => {
  it('treats GHS 1500.00 as 150000 pesewas', () => {
    expect(ghsToPesewas(1500)).toBe(150_000);
    expect(PESEWAS_PER_CEDI).toBe(100);
  });

  it('formats pesewas with en-GH currency (no raw pesewas)', () => {
    const s = formatGHS(150_000);
    expect(s).toMatch(/1,500\.00/);
    expect(s).not.toMatch(/150000/);
  });

  it('round-trips display conversion without inventing floats for money writes', () => {
    expect(pesewasToGhs(5050)).toBe(50.5);
    expect(ghsToPesewas(50.5)).toBe(5050);
  });
});

describe('promo_compute_discount contract (SQL mirror)', () => {
  it('rounds percentage discounts down', () => {
    // 999 pesewas * 10% = 99.9 → floor 99
    expect(
      computeDiscountPesewas({
        discountType: 'percentage',
        percentOff: 10,
        maxDiscount: 20_000,
        eligibleSubtotal: 999,
      }),
    ).toBe(99);
  });

  it('clamps a fixed discount to the cart', () => {
    expect(
      computeDiscountPesewas({
        discountType: 'fixed',
        amountOff: 50_000,
        eligibleSubtotal: 12_000,
      }),
    ).toBe(12_000);
  });

  it('lets the percentage cap win over the raw percentage', () => {
    expect(
      computeDiscountPesewas({
        discountType: 'percentage',
        percentOff: 50,
        maxDiscount: 5_000,
        eligibleSubtotal: 100_000,
      }),
    ).toBe(5_000);
  });

  it('never returns a negative total contribution', () => {
    expect(
      computeDiscountPesewas({
        discountType: 'fixed',
        amountOff: 0,
        eligibleSubtotal: 1000,
      }),
    ).toBe(0);
  });
});

describe('cartToPromoQuoteItems', () => {
  it('maps category names to UUIDs when provided', () => {
    const cart = [
      {
        id: 'p1',
        product_id: 'p1',
        name: 'Phone',
        price: 10,
        quantity: 2,
        category: 'iPhone',
      },
    ] as CartItem[];
    const map = new Map([['iPhone', 'cat-uuid-1']]);
    const items = cartToPromoQuoteItems(cart, map);
    expect(items[0].category_id).toBe('cat-uuid-1');
    expect(items[0].unit_price_pesewas).toBe(1000);
    expect(items[0].qty).toBe(2);
  });

  it('adds delivery line for checkout quotes', () => {
    const cart = [
      { id: 'p1', product_id: 'p1', name: 'Phone', price: 100, quantity: 1 },
    ] as CartItem[];
    const items = buildCheckoutPromoItems(cart, 50);
    expect(items).toHaveLength(2);
    expect(items[1].kind).toBe('delivery');
    expect(items[1].unit_price_pesewas).toBe(5000);
  });

  it('builds repair and trade-in quote lines', () => {
    expect(repairPromoItems(150)[0]).toEqual({
      kind: 'repair',
      unit_price_pesewas: 15000,
      qty: 1,
    });
    expect(tradeTopUpPromoItems(80)[0]).toEqual({
      kind: 'tradein_topup',
      unit_price_pesewas: 8000,
      qty: 1,
    });
    expect(deliveryPromoItem(0)).toBeNull();
  });
});

describe('promoFriendlyMessage', () => {
  it('uses min order hint with formatted GHS', () => {
    expect(
      promoFriendlyMessage({
        ok: false,
        reason: 'min_order_not_met',
        message: 'ignored',
        min_order_pesewas: 30000,
      }),
    ).toMatch(/300\.00/);
  });

  it('falls back for unknown codes', () => {
    expect(
      promoFriendlyMessage({ ok: false, reason: 'not_found', message: 'This code is not valid.' }),
    ).toMatch(/couldn't find that code/i);
  });
});
