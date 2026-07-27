/**
 * Resolve sellable SKU price the same way everywhere (shop, trade target, DB trigger).
 *
 * Rules:
 * - If variant has an absolute price > 0 → use it (ignore modifier).
 * - Treat 0 / null absolute price as “unset” (common DB default).
 * - Else product base + price_modifier.
 */
export function resolveSkuEffectivePrice(opts: {
  productPrice: number | null | undefined;
  variantPrice?: number | null | undefined;
  priceModifier?: number | null | undefined;
}): number {
  const base = Number(opts.productPrice);
  const absolute = Number(opts.variantPrice);
  const modifier = Number(opts.priceModifier);

  if (Number.isFinite(absolute) && absolute > 0) {
    return absolute;
  }

  const safeBase = Number.isFinite(base) ? base : 0;
  const safeMod = Number.isFinite(modifier) ? modifier : 0;
  return Math.max(0, safeBase + safeMod);
}

/**
 * When admin changes the product list/base price, scale fixed SKU prices so PDP
 * (which prefers variant.price over products.price) stays in sync.
 * Rows without an absolute price keep using base + modifier.
 */
export function scaleAbsoluteSkuPrices<T extends { price?: number | null }>(
  rows: T[],
  previousBasePrice: number,
  nextBasePrice: number,
): T[] {
  const prev = Number(previousBasePrice);
  const next = Number(nextBasePrice);
  if (!(prev > 0) || !(next >= 0) || Math.abs(next - prev) < 0.0001) return rows;
  const ratio = next / prev;
  return rows.map((row) => {
    const abs = row.price != null ? Number(row.price) : NaN;
    if (!Number.isFinite(abs) || abs <= 0) return row;
    return {
      ...row,
      price: Math.round(abs * ratio * 100) / 100,
    };
  });
}

/**
 * Top-up the customer pays (never negative).
 * upgrade − tradeCredit; when trading into a cheaper phone credit can exceed upgrade → 0 top-up (refund path).
 */
export function computeTopUpFromCredit(upgradePrice: number, tradeCredit: number): number {
  const price = Number.isFinite(upgradePrice) ? upgradePrice : 0;
  const credit = Number.isFinite(tradeCredit) ? Math.max(0, tradeCredit) : 0;
  if (!(price > 0)) return 0;
  return Math.max(0, Math.round(price - credit));
}

/** Cash back when trade credit exceeds upgrade price. */
export function computeRefundFromCredit(upgradePrice: number, tradeCredit: number): number {
  const price = Number.isFinite(upgradePrice) ? upgradePrice : 0;
  const credit = Number.isFinite(tradeCredit) ? Math.max(0, tradeCredit) : 0;
  if (!(price > 0)) return 0;
  return Math.max(0, Math.round(credit - price));
}
