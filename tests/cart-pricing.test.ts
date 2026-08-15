import { describe, expect, it } from 'vitest';
import {
  cartPayableTotal,
  cartSubtotal,
  orderDiscountGhs,
  orderPayableTotal,
} from '../lib/cartTotals';
import { databaseSellPrice } from '../lib/productPrice';

describe('canonical cart pricing', () => {
  it('keeps a GH₵899 database price at GH₵899 through cart total', () => {
    const price = databaseSellPrice({ price: 899, discount: 0 });
    expect(price).toBe(899);
    expect(cartSubtotal([{ price, quantity: 1 }])).toBe(899);
    expect(cartPayableTotal([{ price, quantity: 1 }])).toBe(899);
  });

  it('keeps a GH₵7,999 database price at GH₵7,999', () => {
    const price = databaseSellPrice({ price: 7_999, discount: 0 });
    expect(cartPayableTotal([{ price, quantity: 1 }])).toBe(7_999);
  });

  it('uses the selected database SKU price without an added fee', () => {
    const price = databaseSellPrice(
      { price: 7_999, discount: 0 },
      { price: 8_499, price_modifier: 0 },
    );
    expect(price).toBe(8_499);
    expect(cartPayableTotal([{ price, quantity: 2 }])).toBe(16_998);
  });

  it('uses base plus modifier and the database discount consistently', () => {
    const price = databaseSellPrice(
      { price: 1_000, discount: 10 },
      { price: 0, price_modifier: 200 },
    );
    expect(price).toBe(1_080);
    expect(cartPayableTotal([{ price, quantity: 1 }])).toBe(1_080);
  });

  it('subtracts an explicit discount but never adds tax or fees', () => {
    const lines = [{ price: 899, quantity: 1 }];
    expect(cartPayableTotal(lines, 49)).toBe(850);
  });

  it('keeps a fully discounted zero-total order at 0', () => {
    expect(orderPayableTotal({ total: 0 }, 899)).toBe(0);
    expect(orderDiscountGhs({ discount_amount: 899 })).toBe(899);
    expect(orderDiscountGhs({ discount_pesewas: 49_00 })).toBe(49);
  });
});
