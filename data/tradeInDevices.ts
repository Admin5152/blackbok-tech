/**
 * Canonical trade-in device catalog — Apple iPhone & iPad only.
 */

export type TradeInCatalogDevice = {
  id: string;
  deviceType: 'smartphone' | 'tablet';
  brand: string;
  name: string;
  img: string;
  variants: string[];
};

const LEGACY_ID_TO_CANONICAL: Record<string, string> = {
  samsung: 'iphone',
  galaxy: 'iphone',
  other: 'iphone_other',
  watch: 'ipad',
  gaming: 'ipad',
  laptop: 'macbook',
};

export const TRADE_DEVICE_TYPE_OPTIONS: { id: TradeInCatalogDevice['deviceType']; label: string }[] = [
  { id: 'smartphone', label: 'iPhone' },
  { id: 'tablet', label: 'iPad' },
];

export const DEFAULT_TRADE_DEVICES: TradeInCatalogDevice[] = [
  {
    id: 'iphone',
    deviceType: 'smartphone',
    brand: 'Apple',
    name: 'iPhone',
    img: '/iphone_modern.png',
    variants: [
      'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17 Air', 'iPhone 17',
      'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16E',
      'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
      'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
      'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 Mini', 'iPhone 13',
      'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12 Mini', 'iPhone 12',
      'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
      'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
      'iPhone SE', 'iPhone 8 Plus', 'iPhone 8',
      'Other iPhone',
    ],
  },
  {
    id: 'ipad',
    deviceType: 'tablet',
    brand: 'Apple',
    name: 'iPad',
    img: '/iphone_modern.png',
    variants: [
      'iPad Pro M4', 'iPad Pro M2', 'iPad Air M2', 'iPad Air M1',
      'iPad (10th gen)', 'iPad mini', 'Older iPad', 'Other iPad',
    ],
  },
];

function coerceVariants(v: unknown, fallback: string[]): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v;
  return fallback;
}

export function mergeTradeDeviceFromStorage(raw: unknown): TradeInCatalogDevice | null {
  if (!raw || typeof raw !== 'object') return null;
  const dev = raw as Record<string, unknown>;
  const idRaw = typeof dev.id === 'string' ? dev.id : '';
  if (!idRaw) return null;

  const lookupId = LEGACY_ID_TO_CANONICAL[idRaw] ?? idRaw;
  let def = DEFAULT_TRADE_DEVICES.find((x) => x.id === lookupId);
  if (!def && typeof dev.name === 'string') {
    const n = dev.name.trim().toLowerCase();
    def = DEFAULT_TRADE_DEVICES.find((x) => x.name.toLowerCase() === n);
  }

  const name = typeof dev.name === 'string' && dev.name.trim() ? dev.name.trim() : def?.name ?? 'Device';
  const variants = coerceVariants(dev.variants, def?.variants ?? []);

  let deviceType: TradeInCatalogDevice['deviceType'] = def?.deviceType ?? 'smartphone';
  if (dev.deviceType === 'smartphone' || dev.deviceType === 'tablet') {
    deviceType = dev.deviceType;
  } else if (typeof dev.deviceType === 'string' && /ipad|tablet/i.test(dev.deviceType)) {
    deviceType = 'tablet';
  }

  const brand = typeof dev.brand === 'string' && dev.brand.trim() ? dev.brand.trim() : 'Apple';

  const img = typeof dev.img === 'string' && dev.img.trim() ? dev.img.trim() : def?.img ?? '/iphone_modern.png';

  return {
    id: idRaw,
    deviceType,
    brand,
    name,
    img,
    variants,
  };
}

export function mergeTradeDevicesFromStorageArray(parsed: unknown): TradeInCatalogDevice[] {
  if (!Array.isArray(parsed)) return [...DEFAULT_TRADE_DEVICES];
  const merged = parsed
    .map((row) => mergeTradeDeviceFromStorage(row))
    .filter((x): x is TradeInCatalogDevice => x != null);
  return merged.length > 0 ? merged : [...DEFAULT_TRADE_DEVICES];
}
