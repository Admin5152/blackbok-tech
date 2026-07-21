import type { ProductImage, ProductVariant } from '../types';
import { toOptionString } from './productOptions';

export function normalizeColorName(color?: string | null): string {
  return toOptionString(color).toLowerCase();
}

export function findVariantsForColor(
  variants: ProductVariant[] | undefined,
  color: string,
): ProductVariant[] {
  const want = normalizeColorName(color);
  if (!want) return [];
  return (variants ?? []).filter((v) => normalizeColorName(v.color) === want);
}

/** First variant.image_url for a colour (shared across storage/SIM rows). */
export function imageUrlForColor(
  variants: ProductVariant[] | undefined,
  color: string,
): string | null {
  for (const v of findVariantsForColor(variants, color)) {
    const url = String(v.image_url ?? '').trim();
    if (url) return url;
  }
  return null;
}

/**
 * PDP / trade preview gallery — variant id, then colour-linked gallery rows,
 * then variant.image_url, then generic gallery.
 */
export function galleryImagesForSelection(opts: {
  images?: ProductImage[];
  variants?: ProductVariant[];
  variantId?: string | null;
  color?: string | null;
}): ProductImage[] {
  const all = opts.images ?? [];
  const { variantId, color, variants } = opts;

  if (variantId) {
    const forVariant = all.filter((img) => img.variant_id === variantId);
    if (forVariant.length) return forVariant;
  }

  if (color) {
    const colorVids = new Set(
      findVariantsForColor(variants, color)
        .map((v) => v.id)
        .filter(Boolean) as string[],
    );
    const matched = all.filter((img) => img.variant_id && colorVids.has(img.variant_id));
    if (matched.length) return matched;

    const direct = imageUrlForColor(variants, color);
    if (direct) {
      return [
        {
          id: `variant-color-${normalizeColorName(color)}`,
          url: direct,
          sort_order: 0,
          is_primary: false,
        },
      ];
    }
  }

  const generic = all.filter((img) => !img.variant_id);
  return generic.length ? generic : all;
}

export function displayImageForColorSelection(opts: {
  color?: string | null;
  variantImage?: string | null;
  productImage?: string | null;
  variants?: ProductVariant[];
}): string | null {
  const fromVariant = String(opts.variantImage ?? '').trim();
  if (fromVariant) return fromVariant;
  if (opts.color) {
    const fromColor = imageUrlForColor(opts.variants, opts.color);
    if (fromColor) return fromColor;
  }
  const fallback = String(opts.productImage ?? '').trim();
  return fallback || null;
}
