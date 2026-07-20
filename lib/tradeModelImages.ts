/**
 * Resolve a photo for a trade-in model card.
 * Prefer trade_devices.image_url, then a linked shop product image.
 */
import type { Product } from '../types';
import type { TradeDeviceRow } from '../types/supabase';
import { getIphoneModelImage } from './repairAppleModels';

function productImageUrl(p: Product): string | null {
  const fromGallery = p.images?.find((img) => img.is_primary)?.url || p.images?.[0]?.url;
  const url = (fromGallery || p.image || p.image_url || '').trim();
  return url || null;
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Match shop catalog products to a trade_devices model name. */
export function findProductImageForTradeModel(
  model: string,
  products: Product[] | undefined | null,
): string | null {
  if (!products?.length || !model.trim()) return null;
  const key = normalizeKey(model);

  const byTradeModel = products.find(
    (p) => p.trade_model && normalizeKey(p.trade_model) === key,
  );
  const img1 = byTradeModel ? productImageUrl(byTradeModel) : null;
  if (img1) return img1;

  const byNameExact = products.find((p) => normalizeKey(p.name || '') === key);
  const img2 = byNameExact ? productImageUrl(byNameExact) : null;
  if (img2) return img2;

  // Prefer products whose name starts with the model (e.g. "iPhone 15 Pro 256GB")
  const byNamePrefix = products.find((p) => {
    const n = normalizeKey(p.name || '');
    return n === key || n.startsWith(`${key} `) || n.startsWith(`${key}-`);
  });
  return byNamePrefix ? productImageUrl(byNamePrefix) : null;
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
  return null;
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
