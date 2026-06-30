/**
 * BlackBox trade-in purchase prices (GH₵) — amount we pay before condition deductions.
 * Update values here without changing valuation logic.
 */
/** iPhone base trade-in purchase prices */
export const IPHONE_TRADE_PURCHASE_PRICES: Record<string, number> = {
  'iPhone 6': 180,
  'iPhone 6 Plus': 220,
  'iPhone 6s': 240,
  'iPhone 6s Plus': 280,
  'iPhone 7': 300,
  'iPhone 7 Plus': 380,
  'iPhone 8': 420,
  'iPhone 8 Plus': 520,
  'iPhone X': 750,
  'iPhone Xr': 900,
  'iPhone Xs': 1050,
  'iPhone Xs Max': 1200,
  'iPhone 11': 1100,
  'iPhone 11 Pro': 1400,
  'iPhone 11 Pro Max': 1650,
  'iPhone 12': 1500,
  'iPhone 12 Mini': 950,
  'iPhone 12 Pro': 1900,
  'iPhone 12 Pro Max': 2200,
  'iPhone 13': 2000,
  'iPhone 13 Mini': 1200,
  'iPhone 13 Pro': 2400,
  'iPhone 13 Pro Max': 2700,
  'iPhone 14': 2800,
  'iPhone 14 Plus': 3100,
  'iPhone 14 Pro': 3600,
  'iPhone 14 Pro Max': 4000,
  'iPhone 15': 3200,
  'iPhone 15 Plus': 3500,
  'iPhone 15 Pro': 4200,
  'iPhone 15 Pro Max': 4800,
  'iPhone 16E': 2600,
  'iPhone 16': 3800,
  'iPhone 16 Plus': 4200,
  'iPhone 16 Pro': 5000,
  'iPhone 16 Pro Max': 5600,
  'iPhone 17': 4800,
  'iPhone 17 Air': 5200,
  'iPhone 17 Pro': 5800,
  'iPhone 17 Pro Max': 6500,
};

/** iPad base trade-in purchase prices */
export const IPAD_TRADE_PURCHASE_PRICES: Record<string, number> = {
  'iPad mini': 900,
  'iPad (10th gen)': 1200,
  'iPad Air M1': 1500,
  'iPad Air M2': 1800,
  'iPad Pro M2': 2800,
  'iPad Pro M4': 3600,
  'Older iPad': 600,
};

export function normalizeTradeModelKey(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function listTradeModelsForType(deviceType: 'smartphone' | 'tablet'): string[] {
  const table = deviceType === 'tablet' ? IPAD_TRADE_PURCHASE_PRICES : IPHONE_TRADE_PURCHASE_PRICES;
  return Object.keys(table);
}
