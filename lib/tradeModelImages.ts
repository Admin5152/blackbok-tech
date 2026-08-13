/**
 * Resolve a photo for a trade-in / repair model card.
 * Prefer trade_devices.image_url, then a linked shop product image, then silhouette.
 */
import type { Product } from '../types';
import type { TradeDeviceRow } from '../types/supabase';
import { getIphoneModelImage } from './repairAppleModels';

export function productImageUrl(p: Product): string | null {
  const fromGallery = p.images?.find((img) => img.is_primary)?.url || p.images?.[0]?.url;
  const url = (fromGallery || p.image || p.image_url || '').trim();
  return url || null;
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Match shop catalog products to a trade_devices / repair model name. */
export function findProductImageForTradeModel(
  model: string,
  products: Product[] | undefined | null,
): string | null {
  if (!products?.length || !model.trim()) return null;
  const key = normalizeKey(model);

  const candidates = products.filter((p) => {
    const trade = p.trade_model ? normalizeKey(p.trade_model) : '';
    const name = normalizeKey(p.name || '');
    return (
      trade === key ||
      name === key ||
      name.startsWith(`${key} `) ||
      name.startsWith(`${key}-`)
    );
  });

  // Prefer exact trade_model / name, then any image-bearing match; new before preowned.
  const rank = (p: Product): number => {
    const trade = p.trade_model ? normalizeKey(p.trade_model) : '';
    const name = normalizeKey(p.name || '');
    let score = 0;
    if (trade === key || name === key) score += 4;
    if (productImageUrl(p)) score += 2;
    const cond = String(p.condition || '').toLowerCase();
    if (cond === 'new' || p.is_new === true) score += 1;
    return score;
  };

  const sorted = [...candidates].sort((a, b) => rank(b) - rank(a));
  for (const p of sorted) {
    const img = productImageUrl(p);
    if (img) return img;
  }
  return null;
}

/**
 * Repair / trade picker image: shop product photo when uploaded, else silhouette.
 * Works for iPhone, iPad, and phones that share a catalog name / trade_model.
 */
export function resolveRepairModelImage(
  model: string | null | undefined,
  products?: Product[] | null,
  fallback?: string | null,
): string {
  const m = (model || '').trim();
  if (!m) return fallback || getIphoneModelImage('');
  const fromProduct = findProductImageForTradeModel(m, products);
  if (fromProduct) return fromProduct;
  if (fallback) return fallback;
  const lower = m.toLowerCase();
  if (lower.includes('ipad')) return '/iphone_modern.png';
  return getIphoneModelImage(m);
}

/** Series card image — prefer any product photo from models in that series. */
export function resolveRepairSeriesImage(
  series: string,
  modelsInSeries: string[] | undefined,
  products?: Product[] | null,
): string {
  const models = modelsInSeries?.length ? modelsInSeries : [series];
  for (const model of models) {
    const img = findProductImageForTradeModel(model, products);
    if (img) return img;
  }
  const bySeries = findProductImageForTradeModel(series, products);
  if (bySeries) return bySeries;
  return getIphoneModelImage(series);
}

export function resolveTradeModelImage(
  device: Pick<TradeDeviceRow, 'model' | 'device_type' | 'image_url'>,
  products?: Product[] | null,
): string | null {
  const direct = (device.image_url || '').trim();
  if (direct) return direct;

  const fromProduct = findProductImageForTradeModel(device.model, products);
  if (fromProduct) return fromProduct;

  if (device.device_type === 'iphone') {
    return getIphoneModelImage(device.model);
  }
  if (device.device_type === 'ipad') {
    return resolveRepairModelImage(device.model, products);
  }
  return null;
}

/** Image for the device the customer is trading in (summary sidebar). */
export function resolveTradedInSummaryImage(
  model: string | null | undefined,
  deviceType: 'iphone' | 'ipad' | string | null | undefined,
  products?: Product[] | null,
): string | null {
  const m = (model || '').trim();
  if (!m) return null;
  const dtype = deviceType === 'ipad' ? 'ipad' : 'iphone';
  return resolveTradeModelImage(
    { model: m, device_type: dtype, image_url: null },
    products,
  );
}

/** Image for the upgrade/target shop product (summary sidebar). */
export function resolveUpgradeSummaryImage(
  productId: string | null | undefined,
  products?: Product[] | null,
): string | null {
  if (!productId || !products?.length) return null;
  const hit = products.find((p) => p.id === productId);
  return hit ? productImageUrl(hit) : null;
}

export function enrichTradeModelsWithImages(
  models: TradeDeviceRow[],
  products?: Product[] | null,
): TradeDeviceRow[] {
  return models.map((m) => {
    const url = resolveTradeModelImage(m, products);
    if (!url || url === m.image_url) return m;
    return { ...m, image_url: url };
  });
}
