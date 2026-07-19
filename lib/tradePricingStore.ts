/**
 * Trade pricing cache — trade_base_values + trade_fault_deductions.
 *
 * Role in flow: Screen 4 config pickers (storage/SIM tiers) and legacy
 * component-based valuation fallback. Live questionnaire estimates use
 * compute_trade_estimate RPC (lib/tradeApi.ts) — this cache is for config
 * lookups and admin pricing viewer only.
 */
import { supabase } from './supabase';
import { TRADE_COMPONENT_KEYS, type TradeComponentKey } from './tradeComponentKeys';
import { normalizeTradeModelKey } from '../data/tradeInPrices';
import type { TradeBaseValueRow, TradeFaultDeductionRow } from '../types/supabase';

export const TRADE_PRICING_UPDATED_EVENT = 'bb_trade_pricing_updated';

function dispatchPricingUpdated(): void {
  window.dispatchEvent(new CustomEvent(TRADE_PRICING_UPDATED_EVENT));
}

// In-memory cache — populated by fetchTradePricing() on app boot
let baseValuesCache: TradeBaseValueRow[] = [];
let deductionsCache: TradeFaultDeductionRow[] = [];
let isCacheLoaded = false;

/** Load active pricing rows from Supabase into the in-memory cache */
export async function fetchTradePricing(): Promise<void> {
  const [baseRes, deducRes] = await Promise.all([
    supabase.from('trade_base_values').select('*').eq('is_active', true),
    supabase.from('trade_fault_deductions').select('*').eq('is_active', true),
  ]);

  if (baseRes.error) throw baseRes.error;
  if (deducRes.error) throw deducRes.error;

  baseValuesCache = (baseRes.data ?? []) as TradeBaseValueRow[];
  deductionsCache = (deducRes.data ?? []) as TradeFaultDeductionRow[];
  isCacheLoaded = true;
  dispatchPricingUpdated();
}

export function getCachedBaseValues(): readonly TradeBaseValueRow[] {
  return baseValuesCache;
}

export function getCachedDeductions(): readonly TradeFaultDeductionRow[] {
  return deductionsCache;
}

export function getModelsForType(deviceType: 'smartphone' | 'tablet'): string[] {
  const models = new Set(baseValuesCache.map((r) => String(r.model)));
  return Array.from(models).filter((m) => {
    if (deviceType === 'tablet') return m.toLowerCase().includes('ipad');
    return m.toLowerCase().includes('iphone');
  });
}

export function getStorageTiersForModel(model: string): string[] {
  const tiers = new Set(
    baseValuesCache
      .filter((r) => normalizeTradeModelKey(r.model) === normalizeTradeModelKey(model))
      .map((r) => String(r.storage)),
  );
  const order: Record<string, number> = {
    '64GB': 1, '128GB': 2, '256GB': 3, '512GB': 4, '1TB': 5, '2TB': 6,
  };
  return Array.from(tiers).sort((a, b) => (order[a] || 99) - (order[b] || 99));
}

export function getSimVariantsForModel(model: string): string[] {
  const variants = new Set(
    baseValuesCache
      .filter((r) => normalizeTradeModelKey(r.model) === normalizeTradeModelKey(model))
      .map((r) => String(r.sim_variant)),
  );
  // 'single' = no SIM split (pre-14, 17 Air eSIM-only) — hide picker
  return Array.from(variants).filter((v) => v !== 'single');
}

export function lookupBaseValue(model: string, storage: string, simVariant: string): number | null {
  const modelHits = baseValuesCache.filter(
    (r) => normalizeTradeModelKey(r.model) === normalizeTradeModelKey(model),
  );

  if (modelHits.length === 0) return null;

  const isSingleVariantModel = modelHits.every((r) => r.sim_variant === 'single');
  const effectiveSim = isSingleVariantModel ? 'single' : simVariant;

  const hit = modelHits.find(
    (r) =>
      String(r.storage).toLowerCase() === String(storage).toLowerCase() &&
      String(r.sim_variant).toLowerCase() === String(effectiveSim).toLowerCase(),
  );

  return hit?.base_value ?? null;
}

export function lookupDeductions(model: string): Map<TradeComponentKey, number> {
  const m = new Map<TradeComponentKey, number>();
  const rows = deductionsCache.filter(
    (r) => normalizeTradeModelKey(r.model) === normalizeTradeModelKey(model),
  );
  for (const r of rows) {
    if (TRADE_COMPONENT_KEYS.includes(r.fault_code as TradeComponentKey)) {
      m.set(r.fault_code as TradeComponentKey, r.deduction);
    }
  }
  return m;
}

export function isPricingLoaded(): boolean {
  return isCacheLoaded;
}

/**
 * Force-reload pricing cache after admin edits.
 * WHY: live ticker / config pickers read this cache; without invalidate,
 * staff would wait for a full page reload to see their own edits.
 */
export async function invalidateTradePricing(): Promise<void> {
  isCacheLoaded = false;
  await fetchTradePricing();
}
