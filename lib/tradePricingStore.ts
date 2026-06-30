import {
  IPAD_TRADE_PURCHASE_PRICES,
  IPHONE_TRADE_PURCHASE_PRICES,
  normalizeTradeModelKey,
} from '../data/tradeInPrices';
import { readLocalStorageJson, writeLocalStorageJson } from './localStorageJson';
import { TRADE_COMPONENT_KEYS, type TradeComponentKey } from './tradeValuation';

export const TRADE_DEVICE_PRICES_KEY = 'bb_v4_trade_device_prices';
export const TRADE_COMPONENT_PERCENTS_KEY = 'bb_v4_trade_component_percents';
export const TRADE_PRICING_UPDATED_EVENT = 'bb_trade_pricing_updated';

export type TradeDevicePriceOverrides = Record<string, number>;
export type TradeComponentPercentOverrides = Partial<Record<TradeComponentKey, number>>;

const VALID_COMPONENT_KEYS = new Set<string>(TRADE_COMPONENT_KEYS);

function dispatchPricingUpdated(): void {
  window.dispatchEvent(new CustomEvent(TRADE_PRICING_UPDATED_EVENT));
}

export function readTradeDevicePriceOverrides(): TradeDevicePriceOverrides {
  const parsed = readLocalStorageJson<unknown>(TRADE_DEVICE_PRICES_KEY);
  if (!parsed || typeof parsed !== 'object') return {};
  const out: TradeDevicePriceOverrides = {};
  for (const [model, price] of Object.entries(parsed as Record<string, unknown>)) {
    const n = typeof price === 'number' ? price : parseFloat(String(price));
    if (model.trim() && Number.isFinite(n) && n >= 0) out[normalizeTradeModelKey(model)] = Math.round(n);
  }
  return out;
}

export function persistTradeDevicePriceOverrides(overrides: TradeDevicePriceOverrides): void {
  const clean: TradeDevicePriceOverrides = {};
  for (const [model, price] of Object.entries(overrides)) {
    const key = normalizeTradeModelKey(model);
    if (!key) continue;
    const n = Number(price);
    if (Number.isFinite(n) && n >= 0) clean[key] = Math.round(n);
  }
  if (Object.keys(clean).length === 0) {
    localStorage.removeItem(TRADE_DEVICE_PRICES_KEY);
  } else {
    writeLocalStorageJson(TRADE_DEVICE_PRICES_KEY, clean);
  }
  dispatchPricingUpdated();
}

export function readTradeComponentPercentOverrides(): TradeComponentPercentOverrides {
  const parsed = readLocalStorageJson<unknown>(TRADE_COMPONENT_PERCENTS_KEY);
  if (!parsed || typeof parsed !== 'object') return {};
  const out: TradeComponentPercentOverrides = {};
  for (const [key, raw] of Object.entries(parsed as Record<string, unknown>)) {
    if (!VALID_COMPONENT_KEYS.has(key)) continue;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (Number.isFinite(n) && n >= 0 && n <= 100) out[key as TradeComponentKey] = n;
  }
  return out;
}

export function persistTradeComponentPercentOverrides(overrides: TradeComponentPercentOverrides): void {
  const clean: TradeComponentPercentOverrides = {};
  for (const [key, n] of Object.entries(overrides) as [TradeComponentKey, number | undefined][]) {
    if (n == null || !VALID_COMPONENT_KEYS.has(key)) continue;
    if (Number.isFinite(n) && n >= 0 && n <= 100) clean[key] = n;
  }
  if (Object.keys(clean).length === 0) {
    localStorage.removeItem(TRADE_COMPONENT_PERCENTS_KEY);
  } else {
    writeLocalStorageJson(TRADE_COMPONENT_PERCENTS_KEY, clean);
  }
  dispatchPricingUpdated();
}

function buildDefaultAllTradePrices(): Record<string, number> {
  return {
    ...IPHONE_TRADE_PURCHASE_PRICES,
    ...IPAD_TRADE_PURCHASE_PRICES,
  };
}

export function getDefaultTradeDevicePrices(deviceType: 'smartphone' | 'tablet'): Record<string, number> {
  return deviceType === 'tablet'
    ? { ...IPAD_TRADE_PURCHASE_PRICES }
    : { ...IPHONE_TRADE_PURCHASE_PRICES };
}

export function getMergedTradeDevicePrices(deviceType: 'smartphone' | 'tablet'): Record<string, number> {
  const defaults = getDefaultTradeDevicePrices(deviceType);
  const overrides = readTradeDevicePriceOverrides();
  const merged = { ...defaults };
  for (const [model, price] of Object.entries(overrides)) {
    const inTable =
      deviceType === 'tablet'
        ? model in IPAD_TRADE_PURCHASE_PRICES || model.toLowerCase().includes('ipad')
        : model in IPHONE_TRADE_PURCHASE_PRICES || model.toLowerCase().includes('iphone');
    if (inTable) merged[model] = price;
  }
  return merged;
}

export function getMergedAllTradePrices(): Record<string, number> {
  return { ...buildDefaultAllTradePrices(), ...readTradeDevicePriceOverrides() };
}

export function lookupTradeBasePrice(modelKey: string): number | null {
  const allTradePrices = getMergedAllTradePrices();
  const key = normalizeTradeModelKey(modelKey);
  if (!key) return null;
  if (key in allTradePrices) return allTradePrices[key];
  const lower = key.toLowerCase();
  const hit = Object.keys(allTradePrices).find((k) => k.toLowerCase() === lower);
  return hit ? allTradePrices[hit] : null;
}

export function clearTradePricingOverrides(): void {
  localStorage.removeItem(TRADE_DEVICE_PRICES_KEY);
  localStorage.removeItem(TRADE_COMPONENT_PERCENTS_KEY);
  dispatchPricingUpdated();
}
