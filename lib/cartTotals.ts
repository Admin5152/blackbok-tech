export type PriceLine = {
  price: number;
  quantity: number;
};

/** Sum database-backed line prices in pesewas to avoid floating-point drift. */
export function cartSubtotal(lines: readonly PriceLine[]): number {
  const pesewas = lines.reduce((sum, line) => {
    const unitPesewas = Math.round(Number(line.price || 0) * 100);
    const quantity = Math.max(0, Math.floor(Number(line.quantity || 0)));
    return sum + unitPesewas * quantity;
  }, 0);
  return pesewas / 100;
}

/** Final merchandise total: subtotal minus an explicit discount, with no added fees. */
export function cartPayableTotal(
  lines: readonly PriceLine[],
  discountGhs = 0,
): number {
  const subtotalPesewas = Math.round(cartSubtotal(lines) * 100);
  const discountPesewas = Math.max(0, Math.round(Number(discountGhs || 0) * 100));
  return Math.max(0, subtotalPesewas - discountPesewas) / 100;
}

/** Resolve stored order discount in GHS (prefer discount_amount, else pesewas). */
export function orderDiscountGhs(order: {
  discount_amount?: number | null;
  discount_pesewas?: number | null;
}): number {
  const amount = Number(order.discount_amount ?? 0);
  if (Number.isFinite(amount) && amount > 0) return amount;
  const pesewas = Number(order.discount_pesewas ?? 0);
  if (Number.isFinite(pesewas) && pesewas > 0) return pesewas / 100;
  return 0;
}

/**
 * Prefer the stored payable snapshot (`orders.total_price` → `order.total`).
 * A valid fully discounted order may be 0 — do not treat 0 as missing.
 */
export function orderPayableTotal(
  order: { total?: number | null },
  fallback: number,
): number {
  const stored = Number(order.total);
  return Number.isFinite(stored) ? stored : fallback;
}
