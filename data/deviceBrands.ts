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

const OTHER_BRAND = 'Other';

const BRAND_SORT_INDEX = new Map(
  DEVICE_BRANDS.filter((b) => b.id !== OTHER_BRAND).map((b, i) => [b.id, i]),
);

function normalizeBrandId(id: string): string {
  const hit = DEVICE_BRANDS.find((b) => b.id.toLowerCase() === id.trim().toLowerCase());
  return hit?.id ?? id;
}

function brandSortRank(id: string): number {
  const norm = normalizeBrandId(id);
  if (norm === OTHER_BRAND) return 10_000;
  return BRAND_SORT_INDEX.get(norm) ?? 5_000;
}

/** Catalogue order with **Other** always last (never A–Z). */
export function sortDeviceBrands<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => brandSortRank(a.id) - brandSortRank(b.id));
}

export function findDeviceBrand(id: string): DeviceBrandOption | undefined {
  return DEVICE_BRANDS.find((b) => b.id === id);
}
