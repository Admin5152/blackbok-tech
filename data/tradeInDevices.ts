/**
 * Canonical trade-in device catalog (admin + customer trade flow).
 * Admin edits are stored in localStorage under TRADE_DEVICES_KEY; this module
 * merges stored rows back onto defaults so deviceType/brand/img never go missing.
 */

export type TradeInCatalogDevice = {
  id: string;
  deviceType: 'smartphone' | 'laptop' | 'tablet' | 'gaming' | 'watch' | 'other';
  brand: string;
  name: string;
  img: string;
  variants: string[];
};

/** Legacy admin panel ids (older AdminTrades defaults) → canonical ids */
const LEGACY_ID_TO_CANONICAL: Record<string, string> = {
  samsung: 'galaxy',
  other: 'other_dev',
  watch: 'awatch',
  gaming: 'ps',
  laptop: 'lenovo',
};

export const TRADE_DEVICE_TYPE_OPTIONS: { id: TradeInCatalogDevice['deviceType']; label: string }[] = [
  { id: 'smartphone', label: 'Smartphone' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'gaming', label: 'Console' },
  { id: 'watch', label: 'Watch' },
  { id: 'other', label: 'Other' },
];

export const TRADE_BRAND_OPTIONS = [
  'Apple',
  'Samsung',
  'Google',
  'Sony',
  'Microsoft',
  'Nintendo',
  'Dell',
  'HP',
  'Lenovo',
  'Other',
] as const;

export const DEFAULT_TRADE_DEVICES: TradeInCatalogDevice[] = [
  { id: 'iphone', deviceType: 'smartphone', brand: 'Apple', name: 'iPhone', img: '/iphone_modern.png', variants: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16', 'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13', 'iPhone 12', 'iPhone 11', 'iPhone X', 'iPhone SE', 'Other iPhone'] },
  { id: 'galaxy', deviceType: 'smartphone', brand: 'Samsung', name: 'Galaxy Phone', img: '/galaxy_s24.png', variants: ['Galaxy S25 Ultra', 'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S23 Ultra', 'Galaxy S23', 'Galaxy Z Fold 6', 'Galaxy Z Flip 6', 'Galaxy A55', 'Galaxy A35', 'Other Samsung'] },
  { id: 'pixel', deviceType: 'smartphone', brand: 'Google', name: 'Google Pixel', img: '/pixel_phone.png', variants: ['Pixel 9 Pro XL', 'Pixel 9 Pro', 'Pixel 9', 'Pixel 8 Pro', 'Pixel 8', 'Pixel 7 Pro', 'Pixel 7', 'Pixel 6', 'Other Pixel'] },
  { id: 'xperia', deviceType: 'smartphone', brand: 'Sony', name: 'Xperia', img: '/sony_phone.png', variants: ['Xperia 1 VI', 'Xperia 5 VI', 'Xperia 10 VI', 'Other Xperia'] },
  { id: 'phone_other', deviceType: 'smartphone', brand: 'Other', name: 'Other Phone', img: '/other_device.png', variants: ['Other Smartphone'] },
  { id: 'macbook', deviceType: 'laptop', brand: 'Apple', name: 'MacBook', img: '/iphone_modern.png', variants: ['MacBook Pro M4', 'MacBook Pro M3', 'MacBook Air M3', 'MacBook Air M2', 'MacBook Air M1', 'MacBook Pro M1', 'Older MacBook'] },
  { id: 'surface', deviceType: 'laptop', brand: 'Microsoft', name: 'Surface', img: '/surface.png', variants: ['Surface Pro 11', 'Surface Pro 10', 'Surface Laptop 6', 'Surface Laptop 5', 'Surface Book', 'Other Surface'] },
  { id: 'dell_lap', deviceType: 'laptop', brand: 'Dell', name: 'Dell Laptop', img: '/dell_laptop.png', variants: ['XPS 15', 'XPS 13', 'Inspiron 15', 'Inspiron 13', 'Latitude', 'Other Dell'] },
  { id: 'hp_lap', deviceType: 'laptop', brand: 'HP', name: 'HP Laptop', img: '/hp_laptop.png', variants: ['Spectre x360', 'Envy', 'Pavilion', 'EliteBook', 'ProBook', 'Other HP'] },
  { id: 'lenovo', deviceType: 'laptop', brand: 'Lenovo', name: 'Lenovo Laptop', img: '/lenovo_laptop.png', variants: ['ThinkPad X1', 'ThinkPad E Series', 'IdeaPad', 'Legion', 'Yoga', 'Other Lenovo'] },
  { id: 'lap_other', deviceType: 'laptop', brand: 'Other', name: 'Other Laptop', img: '/other_device.png', variants: ['Other Laptop'] },
  { id: 'ipad', deviceType: 'tablet', brand: 'Apple', name: 'iPad', img: '/iphone_modern.png', variants: ['iPad Pro M4', 'iPad Pro M2', 'iPad Air M2', 'iPad Air M1', 'iPad (10th gen)', 'iPad mini', 'Older iPad'] },
  { id: 'galaxy_tab', deviceType: 'tablet', brand: 'Samsung', name: 'Galaxy Tab', img: '/galaxy_s24.png', variants: ['Galaxy Tab S10 Ultra', 'Galaxy Tab S9', 'Galaxy Tab S8', 'Galaxy Tab A9', 'Other Galaxy Tab'] },
  { id: 'tab_other', deviceType: 'tablet', brand: 'Other', name: 'Other Tablet', img: '/other_device.png', variants: ['Other Tablet'] },
  { id: 'ps', deviceType: 'gaming', brand: 'Sony', name: 'PlayStation', img: '/sony_phone.png', variants: ['PS5 Disc Edition', 'PS5 Digital Edition', 'PS4 Pro', 'PS4 Slim', 'PS4', 'PS VR2', 'Other PlayStation'] },
  { id: 'xbox', deviceType: 'gaming', brand: 'Microsoft', name: 'Xbox', img: '/surface.png', variants: ['Xbox Series X', 'Xbox Series S', 'Xbox One X', 'Xbox One S', 'Xbox One', 'Other Xbox'] },
  { id: 'switch', deviceType: 'gaming', brand: 'Nintendo', name: 'Nintendo Switch', img: '/nintendo_switch.png', variants: ['Switch OLED', 'Switch V2', 'Switch Lite', 'Original Switch'] },
  { id: 'game_other', deviceType: 'gaming', brand: 'Other', name: 'Other Console', img: '/other_device.png', variants: ['Other Console / Handheld'] },
  { id: 'awatch', deviceType: 'watch', brand: 'Apple', name: 'Apple Watch', img: '/iphone_modern.png', variants: ['Apple Watch Series 10', 'Apple Watch Ultra 2', 'Apple Watch Series 9', 'Apple Watch SE', 'Older Apple Watch'] },
  { id: 'watch_other', deviceType: 'watch', brand: 'Other', name: 'Other Watch', img: '/other_device.png', variants: ['Other Smartwatch'] },
  { id: 'gwatch', deviceType: 'watch', brand: 'Samsung', name: 'Galaxy Watch', img: '/galaxy_s24.png', variants: ['Galaxy Watch 7', 'Galaxy Watch Ultra', 'Galaxy Watch 6', 'Galaxy Watch 5', 'Other Galaxy Watch'] },
  { id: 'other_dev', deviceType: 'other', brand: 'Other', name: 'Other Device', img: '/other_device.png', variants: ['Headphones / Earbuds', 'Smart Speaker', 'Camera', 'Drone', 'Other'] },
];

function coerceVariants(v: unknown, fallback: string[]): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v;
  return fallback;
}

/**
 * Merge a row from localStorage onto the canonical catalog so the trade-in
 * wizard always receives deviceType, brand, and img.
 */
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

  const deviceType =
    (dev.deviceType as TradeInCatalogDevice['deviceType']) &&
    ['smartphone', 'laptop', 'tablet', 'gaming', 'watch', 'other'].includes(dev.deviceType as string)
      ? (dev.deviceType as TradeInCatalogDevice['deviceType'])
      : def?.deviceType ?? 'other';

  const brand =
    typeof dev.brand === 'string' && dev.brand.trim() ? dev.brand.trim() : def?.brand ?? 'Other';

  const img = typeof dev.img === 'string' && dev.img.trim() ? dev.img.trim() : def?.img ?? '/other_device.png';

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
