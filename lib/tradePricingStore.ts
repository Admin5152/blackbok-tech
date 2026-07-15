import { supabase } from './supabase';
import { TRADE_COMPONENT_KEYS, type TradeComponentKey } from './tradeComponentKeys';
import { normalizeTradeModelKey } from '../data/tradeInPrices';

export const TRADE_PRICING_UPDATED_EVENT = 'bb_trade_pricing_updated';

function dispatchPricingUpdated(): void {
  window.dispatchEvent(new CustomEvent(TRADE_PRICING_UPDATED_EVENT));
}

// In-memory cache
let baseValuesCache: any[] = [];
let deductionsCache: any[] = [];
let isCacheLoaded = false;

export async function fetchTradePricing() {
  const [baseRes, deducRes] = await Promise.all([
    supabase.from('trade_base_values').select('*').eq('is_active', true),
    supabase.from('trade_fault_deductions').select('*').eq('is_active', true)
  ]);
  
  if (baseRes.data) baseValuesCache = baseRes.data;
  if (deducRes.data) deductionsCache = deducRes.data;
  
  isCacheLoaded = true;
  dispatchPricingUpdated();
}

export function getCachedBaseValues() {
  return baseValuesCache;
}

export function getCachedDeductions() {
  return deductionsCache;
}

export function getModelsForType(deviceType: 'smartphone' | 'tablet'): string[] {
  const models = new Set(baseValuesCache.map(r => String(r.model)));
  return Array.from(models).filter(m => {
    if (deviceType === 'tablet') return m.toLowerCase().includes('ipad');
    return m.toLowerCase().includes('iphone');
  });
}

export function getStorageTiersForModel(model: string): string[] {
  const tiers = new Set(
    baseValuesCache
      .filter(r => normalizeTradeModelKey(r.model) === normalizeTradeModelKey(model))
      .map(r => String(r.storage))
  );
  // Sort them loosely: 64GB, 128GB, 256GB, 512GB, 1TB, 2TB
  const order: Record<string, number> = {
    '64GB': 1, '128GB': 2, '256GB': 3, '512GB': 4, '1TB': 5, '2TB': 6
  };
  return Array.from(tiers).sort((a, b) => (order[a] || 99) - (order[b] || 99));
}

export function getSimVariantsForModel(model: string): string[] {
  const variants = new Set(
    baseValuesCache
      .filter(r => normalizeTradeModelKey(r.model) === normalizeTradeModelKey(model))
      .map(r => String(r.sim_variant))
  );
  return Array.from(variants);
}

export function lookupBaseValue(model: string, storage: string, simVariant: string): number | null {
  const hit = baseValuesCache.find(r => 
    normalizeTradeModelKey(r.model) === normalizeTradeModelKey(model) &&
    String(r.storage).toLowerCase() === String(storage).toLowerCase() &&
    String(r.sim_variant).toLowerCase() === String(simVariant).toLowerCase()
  );
  return hit?.base_value ?? null;
}

export function lookupDeductions(model: string): Map<TradeComponentKey, number> {
  const m = new Map<TradeComponentKey, number>();
  const rows = deductionsCache.filter(r => normalizeTradeModelKey(r.model) === normalizeTradeModelKey(model));
  for (const r of rows) {
    if (TRADE_COMPONENT_KEYS.includes(r.fault_code as any)) {
      m.set(r.fault_code as TradeComponentKey, r.deduction);
    }
  }
  return m;
}

export function isPricingLoaded() {
  return isCacheLoaded;
}
