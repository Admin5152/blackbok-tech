/** Canonical iPhone series → models catalog shared by Repair and Trades flows. */
export type AppleIphoneSeriesGroup = {
  series: string;
  models: string[];
};

export const APPLE_IPHONE_CATALOG: AppleIphoneSeriesGroup[] = [
  {
    series: 'iPhone 17',
    models: ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17 Air', 'iPhone 17'],
  },
  {
    series: 'iPhone 16',
    models: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16E'],
  },
  {
    series: 'iPhone 15',
    models: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15'],
  },
  {
    series: 'iPhone 14',
    models: ['iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14'],
  },
  {
    series: 'iPhone 13',
    models: ['iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 Mini', 'iPhone 13'],
  },
  {
    series: 'iPhone 12',
    models: ['iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12 Mini', 'iPhone 12'],
  },
  {
    series: 'iPhone 11',
    models: ['iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11'],
  },
  {
    series: 'iPhone X Series',
    models: [
      'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
      'iPhone Xs Max', 'iPhone Xs', 'iPhone Xr',
    ],
  },
  { series: 'iPhone SE', models: ['iPhone SE'] },
  { series: 'iPhone 8', models: ['iPhone 8 Plus', 'iPhone 8'] },
  { series: 'iPhone 7', models: ['iPhone 7 Plus', 'iPhone 7'] },
  {
    series: 'iPhone 6 Series',
    models: ['iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus'],
  },
  { series: 'Other iPhones', models: ['Other iPhone'] },
];

const CATALOG_MODELS = new Set(APPLE_IPHONE_CATALOG.flatMap((g) => g.models));

/** Flat list of all catalog models (newest series first). */
export function getAllAppleIphoneCatalogModels(): string[] {
  return APPLE_IPHONE_CATALOG.flatMap((g) => g.models);
}

/** Group a flat model list by series, preserving catalog order. */
export function buildAppleIphoneSeriesGroups(models: string[]): Record<string, string[]> {
  const modelSet = new Set(models);
  const groups: Record<string, string[]> = {};

  for (const { series, models: catalogModels } of APPLE_IPHONE_CATALOG) {
    const filtered = catalogModels.filter((m) => modelSet.has(m));
    if (filtered.length > 0) groups[series] = filtered;
  }

  const uncategorized = models.filter((m) => !CATALOG_MODELS.has(m));
  if (uncategorized.length > 0) {
    groups['Other iPhones'] = [...(groups['Other iPhones'] ?? []), ...uncategorized];
  }

  return groups;
}

/** Series keys in catalog order (newest first), only those present in groups. */
export function getOrderedAppleIphoneSeriesKeys(groups: Record<string, string[]>): string[] {
  const ordered = APPLE_IPHONE_CATALOG.map((g) => g.series).filter((s) => groups[s]?.length);
  if (groups['Other iPhones']?.length && !ordered.includes('Other iPhones')) {
    ordered.push('Other iPhones');
  }
  return ordered;
}

/** Models for a series in display order (Pro Max first within the series). */
export function getAppleIphoneModelsForSeries(
  series: string,
  groups: Record<string, string[]>,
): string[] {
  const models = groups[series];
  if (!models) return [];
  return [...models].reverse();
}
