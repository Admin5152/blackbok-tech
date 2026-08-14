import type { Product } from '../types';

export type AccessoryDeviceOption = {
  value: string;
  label: string;
  description: string;
};

const DEVICE_OPTIONS: Readonly<Record<string, readonly AccessoryDeviceOption[]>> = {
  'Chargers|Apple': [
    { value: 'MacBook', label: 'MacBook', description: 'Original and clone MacBook chargers' },
    { value: 'iPhone', label: 'iPhone', description: 'Original and clone iPhone chargers' },
    { value: 'AppleWatch', label: 'Apple Watch', description: 'Original and clone Watch chargers' },
  ],
  'ScreenProtectors|iPhone': [
    { value: '16-17 Pro Max', label: '16-17 Pro Max', description: 'Glass and ceramic · clear or privacy' },
    { value: 'XR-15 Pro Max', label: 'XR-15 Pro Max', description: 'Glass and ceramic · clear or privacy' },
  ],
  'ScreenProtectors|iPad': [
    { value: '10.9/11', label: 'All 10.9″/11″', description: 'Glass clear and privacy' },
    { value: '12.9/13', label: 'All 12.9″/13″', description: 'Glass clear and privacy' },
    { value: '8.3', label: 'All 8.3″', description: 'Glass clear' },
  ],
  'Covers|iPhone': [
    { value: '17 Series', label: '17 Series', description: 'Silicon, MagSafe and Beats' },
    { value: 'XR-16 Pro Max', label: 'XR-16 Pro Max', description: 'Silicon, MagSafe and Beats' },
  ],
  'Covers|iPad': [
    { value: '10.9/11', label: '10.9″/11″', description: 'Leather book covers' },
    { value: '12.9/13', label: '12.9″/13″', description: 'Leather book covers' },
    { value: '8.3', label: '8.3″', description: 'Leather book covers' },
  ],
  'Covers|MacBook': [
    { value: 'Pro M1-M5 16', label: 'MacBook Pro M1-M5 16″', description: 'Hard shell cases' },
    { value: 'Pro M1-M5 14', label: 'MacBook Pro M1-M5 14″', description: 'Hard shell cases' },
    { value: 'Air M1-M5 15', label: 'MacBook Air M1-M5 15″', description: 'Hard shell cases' },
    { value: 'Air M1-M5 13', label: 'MacBook Air M1-M5 13″', description: 'Hard shell cases' },
    { value: 'Pro 2017-2020 16', label: 'MacBook Pro 2017-2020 16″', description: 'Hard shell cases' },
    { value: 'Pro 2017-2020 13', label: 'MacBook Pro 2017-2020 13″', description: 'Hard shell cases' },
    { value: 'Air 2017-2020 13', label: 'MacBook Air 2017-2020 13″', description: 'Hard shell cases' },
  ],
  'AppleWatchAccessories|Straps': [
    { value: 'Rubber Sports Straps', label: 'Rubber Sports Straps', description: 'Choose the available size' },
    { value: 'Leather Straps', label: 'Leather Straps', description: 'Choose the available size' },
  ],
};

const TYPE_LABELS: Readonly<Record<string, string>> = {
  Chargers: 'Chargers',
  ScreenProtectors: 'Screen Protectors',
  Covers: 'Covers',
  AirTags: 'AirTags',
  AppleWatchAccessories: 'Apple Watch Accessories',
  MagicKeyboard: 'Magic Keyboard',
  ApplePencil: 'Apple Pencil',
  PowerBanks: 'Power Banks',
  Keyboards: 'Keyboards',
  Mouse: 'Mouse',
  FlashDrives: 'Flashdrives',
};

export function accessoryTypeLabel(value: string | null | undefined): string {
  const key = String(value ?? '').trim();
  return TYPE_LABELS[key] ?? key;
}

export function getAccessoryDeviceOptions(
  accessoryType: string | null | undefined,
  series: string | null | undefined,
): AccessoryDeviceOption[] {
  return [...(DEVICE_OPTIONS[`${String(accessoryType ?? '')}|${String(series ?? '')}`] ?? [])];
}

export function accessoryDeviceLabel(
  accessoryType: string | null | undefined,
  series: string | null | undefined,
  device: string | null | undefined,
): string {
  const raw = String(device ?? '').trim();
  return getAccessoryDeviceOptions(accessoryType, series).find((o) => o.value === raw)?.label ?? raw;
}

export function productAccessoryType(product: Product): string {
  const specs =
    product.specifications && typeof product.specifications === 'object'
      ? (product.specifications as Record<string, unknown>)
      : {};
  return String(specs.accessory_type ?? '').trim();
}

export function productAccessoryDevice(product: Product): string {
  const specs =
    product.specifications && typeof product.specifications === 'object'
      ? (product.specifications as Record<string, unknown>)
      : {};
  return String(specs.device_line ?? specs.device ?? '').trim();
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”″"]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function productMatchesAccessoryDevice(
  product: Product,
  device: string | null | undefined,
): boolean {
  const wanted = String(device ?? '').trim();
  if (!wanted) return true;
  return normalize(productAccessoryDevice(product)) === normalize(wanted);
}

/** Leaf cards show only the purchasable variant; the breadcrumb owns context. */
export function accessoryLeafProductName(product: Product): string {
  const specs =
    product.specifications && typeof product.specifications === 'object'
      ? (product.specifications as Record<string, unknown>)
      : {};
  const type = String(specs.accessory_type ?? '').trim();
  const material = String(specs.material ?? '').trim();
  const transparency = String(specs.transparency ?? '').trim();
  const series = String(specs.series ?? '').trim();
  const device = String(specs.device_line ?? '').trim();

  if (type === 'ScreenProtectors') {
    return [material, transparency].filter(Boolean).join(' ') || product.name;
  }
  if (type === 'Covers') return material || product.name;
  if (type === 'AirTags') return device === 'Pack of 4' ? 'Pack of 4' : 'Single Pack';
  if (type === 'ApplePencil') {
    const pencil: Record<string, string> = {
      Pro: 'Pencil Pro',
      Gen2: 'Gen 2',
      Gen1: 'Gen 1',
      USBC: 'Type C',
    };
    return pencil[series] ?? device ?? product.name;
  }
  if (type === 'MagicKeyboard') return device ? `${device.replace('13 M5/M4', '13″ M5/M4')}` : product.name;
  return String(specs.variant_name ?? '').trim() || product.name;
}
