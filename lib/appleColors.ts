/**
 * Apple device colour maps for trade-in Screen 4 (configuration).
 *
 * Role in flow: colour chips are identification-only (Decision Sheet D3) —
 * they never affect base_value or deductions. Options come from this static
 * map (or a future per-model DB list); pricing rows are not colour-keyed.
 */
export interface AppleColorOption {
  name: string;
  /** CSS hex for the chip swatch */
  hex: string;
}

/**
 * Per-model colour lists. Keys match trade_devices.model exactly where possible;
 * fallbacks resolve via longest prefix match in getAppleColorsForModel().
 */
const MODEL_COLORS: Record<string, AppleColorOption[]> = {
  // ── iPhone 17 family ──
  'iPhone 17': [
    { name: 'Black', hex: '#1C1C1E' },
    { name: 'White', hex: '#F5F5F7' },
    { name: 'Sage', hex: '#A8B5A0' },
    { name: 'Lavender', hex: '#C5B8D9' },
    { name: 'Mist Blue', hex: '#A8C5D4' },
  ],
  'iPhone 17 Air': [
    { name: 'Space Black', hex: '#1C1C1E' },
    { name: 'Cloud White', hex: '#F5F5F7' },
    { name: 'Light Gold', hex: '#E8D5B5' },
    { name: 'Sky Blue', hex: '#A8C5D4' },
  ],
  'iPhone 17 Pro': [
    { name: 'Cosmic Orange', hex: '#E07A3D' },
    { name: 'Deep Blue', hex: '#1E3A5F' },
    { name: 'Silver', hex: '#E3E4E5' },
  ],
  'iPhone 17 Pro Max': [
    { name: 'Cosmic Orange', hex: '#E07A3D' },
    { name: 'Deep Blue', hex: '#1E3A5F' },
    { name: 'Silver', hex: '#E3E4E5' },
  ],

  // ── iPhone 16 family ──
  'iPhone 16': [
    { name: 'Black', hex: '#1C1C1E' },
    { name: 'White', hex: '#F5F5F7' },
    { name: 'Pink', hex: '#F2ADDA' },
    { name: 'Teal', hex: '#B0D4C8' },
    { name: 'Ultramarine', hex: '#3B5CDE' },
  ],
  'iPhone 16 Plus': [
    { name: 'Black', hex: '#1C1C1E' },
    { name: 'White', hex: '#F5F5F7' },
    { name: 'Pink', hex: '#F2ADDA' },
    { name: 'Teal', hex: '#B0D4C8' },
    { name: 'Ultramarine', hex: '#3B5CDE' },
  ],
  'iPhone 16 Pro': [
    { name: 'Black Titanium', hex: '#3C3C3C' },
    { name: 'White Titanium', hex: '#F0EDE8' },
    { name: 'Natural Titanium', hex: '#C4B8A8' },
    { name: 'Desert Titanium', hex: '#C9A882' },
  ],
  'iPhone 16 Pro Max': [
    { name: 'Black Titanium', hex: '#3C3C3C' },
    { name: 'White Titanium', hex: '#F0EDE8' },
    { name: 'Natural Titanium', hex: '#C4B8A8' },
    { name: 'Desert Titanium', hex: '#C9A882' },
  ],

  // ── iPhone 15 family ──
  'iPhone 15': [
    { name: 'Black', hex: '#1C1C1E' },
    { name: 'Blue', hex: '#A8C5D4' },
    { name: 'Green', hex: '#A8B5A0' },
    { name: 'Yellow', hex: '#F5E6A3' },
    { name: 'Pink', hex: '#F2ADDA' },
  ],
  'iPhone 15 Plus': [
    { name: 'Black', hex: '#1C1C1E' },
    { name: 'Blue', hex: '#A8C5D4' },
    { name: 'Green', hex: '#A8B5A0' },
    { name: 'Yellow', hex: '#F5E6A3' },
    { name: 'Pink', hex: '#F2ADDA' },
  ],
  'iPhone 15 Pro': [
    { name: 'Black Titanium', hex: '#3C3C3C' },
    { name: 'White Titanium', hex: '#F0EDE8' },
    { name: 'Blue Titanium', hex: '#3D4F5F' },
    { name: 'Natural Titanium', hex: '#C4B8A8' },
  ],
  'iPhone 15 Pro Max': [
    { name: 'Black Titanium', hex: '#3C3C3C' },
    { name: 'White Titanium', hex: '#F0EDE8' },
    { name: 'Blue Titanium', hex: '#3D4F5F' },
    { name: 'Natural Titanium', hex: '#C4B8A8' },
  ],

  // ── iPhone 14 family ──
  'iPhone 14': [
    { name: 'Midnight', hex: '#1C1C1E' },
    { name: 'Starlight', hex: '#F5F2EB' },
    { name: 'Blue', hex: '#A8C5D4' },
    { name: 'Purple', hex: '#B8A0C8' },
    { name: 'Yellow', hex: '#F5E6A3' },
    { name: 'Red', hex: '#BF0013' },
  ],
  'iPhone 14 Plus': [
    { name: 'Midnight', hex: '#1C1C1E' },
    { name: 'Starlight', hex: '#F5F2EB' },
    { name: 'Blue', hex: '#A8C5D4' },
    { name: 'Purple', hex: '#B8A0C8' },
    { name: 'Yellow', hex: '#F5E6A3' },
    { name: 'Red', hex: '#BF0013' },
  ],
  'iPhone 14 Pro': [
    { name: 'Deep Purple', hex: '#594F63' },
    { name: 'Gold', hex: '#F4E8CE' },
    { name: 'Silver', hex: '#F1F2ED' },
    { name: 'Space Black', hex: '#1C1C1E' },
  ],
  'iPhone 14 Pro Max': [
    { name: 'Deep Purple', hex: '#594F63' },
    { name: 'Gold', hex: '#F4E8CE' },
    { name: 'Silver', hex: '#F1F2ED' },
    { name: 'Space Black', hex: '#1C1C1E' },
  ],

  // ── iPhone 13 family ──
  'iPhone 13': [
    { name: 'Midnight', hex: '#1C1C1E' },
    { name: 'Starlight', hex: '#F5F2EB' },
    { name: 'Blue', hex: '#A8C5D4' },
    { name: 'Pink', hex: '#F2ADDA' },
    { name: 'Green', hex: '#A8B5A0' },
    { name: 'Red', hex: '#BF0013' },
  ],
  'iPhone 13 Pro': [
    { name: 'Graphite', hex: '#54524F' },
    { name: 'Gold', hex: '#F4E8CE' },
    { name: 'Silver', hex: '#F1F2ED' },
    { name: 'Sierra Blue', hex: '#A7C1D9' },
    { name: 'Alpine Green', hex: '#576856' },
  ],
  'iPhone 13 Pro Max': [
    { name: 'Graphite', hex: '#54524F' },
    { name: 'Gold', hex: '#F4E8CE' },
    { name: 'Silver', hex: '#F1F2ED' },
    { name: 'Sierra Blue', hex: '#A7C1D9' },
    { name: 'Alpine Green', hex: '#576856' },
  ],

  // ── iPhone 12 family ──
  'iPhone 12': [
    { name: 'Black', hex: '#1C1C1E' },
    { name: 'White', hex: '#F5F5F7' },
    { name: 'Blue', hex: '#A8C5D4' },
    { name: 'Green', hex: '#A8B5A0' },
    { name: 'Purple', hex: '#B8A0C8' },
    { name: 'Red', hex: '#BF0013' },
  ],
  'iPhone 12 Pro': [
    { name: 'Graphite', hex: '#54524F' },
    { name: 'Silver', hex: '#F1F2ED' },
    { name: 'Gold', hex: '#F4E8CE' },
    { name: 'Pacific Blue', hex: '#2D4A5E' },
  ],
  'iPhone 12 Pro Max': [
    { name: 'Graphite', hex: '#54524F' },
    { name: 'Silver', hex: '#F1F2ED' },
    { name: 'Gold', hex: '#F4E8CE' },
    { name: 'Pacific Blue', hex: '#2D4A5E' },
  ],

  // ── iPhone 11 family ──
  'iPhone 11': [
    { name: 'Black', hex: '#1C1C1E' },
    { name: 'White', hex: '#F5F5F7' },
    { name: 'Green', hex: '#A8B5A0' },
    { name: 'Yellow', hex: '#F5E6A3' },
    { name: 'Purple', hex: '#B8A0C8' },
    { name: 'Red', hex: '#BF0013' },
  ],
  'iPhone 11 Pro': [
    { name: 'Space Gray', hex: '#535353' },
    { name: 'Silver', hex: '#E3E4E5' },
    { name: 'Gold', hex: '#FAD7BD' },
    { name: 'Midnight Green', hex: '#4E5851' },
  ],
  'iPhone 11 Pro Max': [
    { name: 'Space Gray', hex: '#535353' },
    { name: 'Silver', hex: '#E3E4E5' },
    { name: 'Gold', hex: '#FAD7BD' },
    { name: 'Midnight Green', hex: '#4E5851' },
  ],

  'iPhone XR': [
    { name: 'Black', hex: '#1C1C1E' },
    { name: 'White', hex: '#F5F5F7' },
    { name: 'Blue', hex: '#48A5D0' },
    { name: 'Yellow', hex: '#F9D548' },
    { name: 'Coral', hex: '#FF6E5A' },
    { name: 'Red', hex: '#BF0013' },
  ],

  // ── iPad defaults (inactive until priced; ready when they activate) ──
  'iPad Pro': [
    { name: 'Space Black', hex: '#1C1C1E' },
    { name: 'Silver', hex: '#E3E4E5' },
  ],
  'iPad Air': [
    { name: 'Space Gray', hex: '#535353' },
    { name: 'Starlight', hex: '#F5F2EB' },
    { name: 'Blue', hex: '#A8C5D4' },
    { name: 'Purple', hex: '#B8A0C8' },
  ],
  'iPad mini': [
    { name: 'Space Gray', hex: '#535353' },
    { name: 'Starlight', hex: '#F5F2EB' },
    { name: 'Pink', hex: '#F2ADDA' },
    { name: 'Purple', hex: '#B8A0C8' },
  ],
  'iPad': [
    { name: 'Silver', hex: '#E3E4E5' },
    { name: 'Blue', hex: '#A8C5D4' },
    { name: 'Pink', hex: '#F2ADDA' },
    { name: 'Yellow', hex: '#F5E6A3' },
  ],
};

const GENERIC_FALLBACK: AppleColorOption[] = [
  { name: 'Black', hex: '#1C1C1E' },
  { name: 'White', hex: '#F5F5F7' },
  { name: 'Silver', hex: '#E3E4E5' },
  { name: 'Gold', hex: '#F4E8CE' },
];

/**
 * Resolve colour chips for a trade model.
 * Exact key first, then longest prefix match, then generic fallback.
 *
 * @param model - trade_devices.model string (e.g. "iPhone 14 Pro")
 * @returns colour options — identification only, no price effect
 */
export function getAppleColorsForModel(model: string): AppleColorOption[] {
  const trimmed = model.trim();
  if (!trimmed) return GENERIC_FALLBACK;

  if (MODEL_COLORS[trimmed]) return MODEL_COLORS[trimmed];

  // Longest prefix match so "iPhone 14 Pro Max" hits Pro Max before Pro
  let bestKey = '';
  for (const key of Object.keys(MODEL_COLORS)) {
    if (trimmed.startsWith(key) && key.length > bestKey.length) {
      bestKey = key;
    }
  }
  if (bestKey) return MODEL_COLORS[bestKey];

  // iPad line fallbacks by substring
  const lower = trimmed.toLowerCase();
  if (lower.includes('ipad pro')) return MODEL_COLORS['iPad Pro'];
  if (lower.includes('ipad air')) return MODEL_COLORS['iPad Air'];
  if (lower.includes('ipad mini')) return MODEL_COLORS['iPad mini'];
  if (lower.includes('ipad')) return MODEL_COLORS['iPad'];

  return GENERIC_FALLBACK;
}
