/**
 * In-memory trade accept-catalog cache.
 *
 * Screens 1–3 were slow because every step re-ran:
 *   trade_devices → then trade_base_values filter (waterfall, no reuse).
 *
 * This module loads devices + priced model keys in parallel once per type,
 * caches ~5 minutes, and powers categories / models / iPad gate from memory.
 */
import { supabase } from './supabase';
import { sortIpadProductLines, sortIphoneSeries } from './tradeFlowState';
import type { TradeDeviceRow, TradeDeviceType } from '../types/supabase';

const TTL_MS = 5 * 60_000;

/** Columns needed for type → series → model grids (skip unused blobs). */
const DEVICE_LIST_COLS =
  'model,device_type,series,product_line,image_url,sort_order,biometric,is_active,threshold_value';

type CatalogEntry = {
  devices: TradeDeviceRow[];
  at: number;
};

const cache = new Map<TradeDeviceType, CatalogEntry>();
const inflight = new Map<TradeDeviceType, Promise<TradeDeviceRow[]>>();

function isFresh(entry: CatalogEntry | undefined): entry is CatalogEntry {
  return Boolean(entry && Date.now() - entry.at < TTL_MS);
}

/**
 * Active devices that have ≥1 active base_value row.
 * Parallel queries + short TTL cache.
 */
export async function getPricedActiveModelsCached(
  deviceType: TradeDeviceType,
): Promise<TradeDeviceRow[]> {
  const hit = cache.get(deviceType);
  if (isFresh(hit)) return hit.devices;

  const pending = inflight.get(deviceType);
  if (pending) return pending;

  const load = (async () => {
    const [devRes, baseRes] = await Promise.all([
      supabase
        .from('trade_devices')
        .select(DEVICE_LIST_COLS)
        .eq('is_active', true)
        .eq('device_type', deviceType)
        .order('sort_order', { ascending: true }),
      supabase.from('trade_base_values').select('model').eq('is_active', true),
    ]);

    if (devRes.error) throw devRes.error;
    if (baseRes.error) throw baseRes.error;

    const priced = new Set(
      (baseRes.data ?? []).map((r: { model: string }) => r.model),
    );
    const devices = ((devRes.data ?? []) as TradeDeviceRow[]).filter((d) =>
      priced.has(d.model),
    );

    cache.set(deviceType, { devices, at: Date.now() });
    return devices;
  })();

  inflight.set(deviceType, load);
  try {
    return await load;
  } finally {
    inflight.delete(deviceType);
  }
}

/** Warm cache for both types when entering /trade (non-blocking). */
export function prefetchTradeCatalog(): void {
  void getPricedActiveModelsCached('iphone').catch(() => undefined);
  void getPricedActiveModelsCached('ipad').catch(() => undefined);
}

export function invalidateTradeCatalogCache(): void {
  cache.clear();
  inflight.clear();
}

/** Sync read when cache is warm — used to skip loading flash on series/model. */
export function peekPricedActiveModels(
  deviceType: TradeDeviceType,
): TradeDeviceRow[] | null {
  const hit = cache.get(deviceType);
  return isFresh(hit) ? hit.devices : null;
}

export function categoriesFromPriced(
  deviceType: TradeDeviceType,
  priced: TradeDeviceRow[],
): string[] {
  if (deviceType === 'iphone') {
    const series = new Set<string>();
    for (const d of priced) {
      if (d.series) series.add(d.series);
    }
    return sortIphoneSeries(Array.from(series));
  }
  const lines = new Set<string>();
  for (const d of priced) {
    if (d.product_line) lines.add(d.product_line);
  }
  return sortIpadProductLines(Array.from(lines));
}

export function modelsInCategoryFromPriced(
  deviceType: TradeDeviceType,
  category: string,
  priced: TradeDeviceRow[],
): TradeDeviceRow[] {
  return priced
    .filter((d) => {
      if (deviceType === 'iphone') return d.series === category;
      return d.product_line === category;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}
