import type { BrandLogoId } from '../components/BrandLogo';

export type DeviceBrandOption = { id: BrandLogoId; label: string };

export const DEVICE_BRANDS: DeviceBrandOption[] = [
  { id: 'Apple', label: 'Apple' },
  { id: 'Samsung', label: 'Samsung' },
  { id: 'Google', label: 'Google' },
  { id: 'Sony', label: 'Sony' },
  { id: 'Microsoft', label: 'Microsoft' },
  { id: 'Nintendo', label: 'Nintendo' },
  { id: 'Dell', label: 'Dell' },
  { id: 'HP', label: 'HP' },
  { id: 'Lenovo', label: 'Lenovo' },
  { id: 'Other', label: 'Other' },
];

/** Customer device categories (repair + trade-in). */
export type DeviceCategoryId =
  | 'smartphone'
  | 'tablet'
  | 'laptop'
  | 'gaming'
  | 'smartwatch'
  | 'other';

const OTHER_BRAND = 'Other';

/**
 * Brands that actually make products in each category.
 * Nintendo → consoles only; Dell/HP/Lenovo → laptops only; etc.
 */
const BRAND_IDS_BY_DEVICE_TYPE: Record<DeviceCategoryId, readonly BrandLogoId[]> = {
  smartphone: ['Apple', 'Samsung', 'Google', 'Sony', 'Other'],
  tablet: ['Apple', 'Samsung', 'Google', 'Other'],
  laptop: ['Apple', 'Microsoft', 'Dell', 'HP', 'Lenovo', 'Other'],
  gaming: ['Sony', 'Microsoft', 'Nintendo', 'Other'],
  smartwatch: ['Apple', 'Samsung', 'Google', 'Other'],
  other: ['Other'],
};

const BRAND_SORT_INDEX = new Map(
  DEVICE_BRANDS.filter((b) => b.id !== OTHER_BRAND).map((b, i) => [b.id, i]),
);

function normalizeBrandId(id: string): BrandLogoId {
  const hit = DEVICE_BRANDS.find((b) => b.id.toLowerCase() === id.trim().toLowerCase());
  return (hit?.id ?? 'Other') as BrandLogoId;
}

function brandSortRank(id: string): number {
  const norm = normalizeBrandId(id);
  if (norm === OTHER_BRAND) return 10_000;
  return BRAND_SORT_INDEX.get(norm) ?? 5_000;
}

/** Normalizes repair `smartwatch` and trade-in `watch` to one category key. */
export function normalizeDeviceCategory(deviceType: string): DeviceCategoryId | null {
  const t = deviceType.trim().toLowerCase();
  if (t === 'watch' || t === 'smartwatch') return 'smartwatch';
  if (Object.prototype.hasOwnProperty.call(BRAND_IDS_BY_DEVICE_TYPE, t)) {
    return t as DeviceCategoryId;
  }
  return null;
}

export function getBrandIdsForDeviceType(deviceType: string): BrandLogoId[] {
  const category = normalizeDeviceCategory(deviceType);
  if (!category) return [...DEVICE_BRANDS.map((b) => b.id)];
  return [...BRAND_IDS_BY_DEVICE_TYPE[category]];
}

export function isBrandValidForDeviceType(brand: string, deviceType: string): boolean {
  const category = normalizeDeviceCategory(deviceType);
  if (!category) return true;
  const normalized = normalizeBrandId(brand);
  return BRAND_IDS_BY_DEVICE_TYPE[category].includes(normalized);
}

/**
 * Brands shown on repair / trade-in pickers for a device category.
 * Merges catalog-only brands (e.g. admin-added lines) when provided.
 */
export function getBrandsForDeviceType(
  deviceType: string,
  extraBrandIds?: Iterable<string>,
): DeviceBrandOption[] {
  const ids = new Set<string>(getBrandIdsForDeviceType(deviceType));

  if (extraBrandIds) {
    for (const raw of extraBrandIds) {
      const id = raw?.trim();
      if (!id) continue;
      ids.add(normalizeBrandId(id));
    }
  }

  const rows = [...ids].map((id) => {
    const preset = findDeviceBrand(id);
    return preset ?? { id: normalizeBrandId(id), label: id };
  });

  return sortDeviceBrands(rows);
}

/** Catalogue order with **Other** always last (never A–Z). */
export function sortDeviceBrands<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => brandSortRank(a.id) - brandSortRank(b.id));
}

export function findDeviceBrand(id: string): DeviceBrandOption | undefined {
  return DEVICE_BRANDS.find((b) => b.id === id);
}

/** All preset brand labels (admin reference). */
export const ALL_DEVICE_BRAND_LABELS = DEVICE_BRANDS.map((b) => b.label);
