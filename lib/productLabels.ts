/**
 * Plain-English labels for product option keys shown to customers and staff.
 * Keeps cart / receipt / admin chips readable (no raw "SKU" / "variant" jargon).
 */

const OPTION_KEY_LABELS: Record<string, string> = {
  color: 'Color',
  colours: 'Color',
  colors: 'Color',
  storage: 'Storage',
  ram: 'RAM',
  sim: 'SIM',
  sim_type: 'SIM',
  'sim type': 'SIM',
  variant: 'Item code',
  sku: 'Item code',
  configuration: 'Configuration',
};

/** Map internal option keys (e.g. variant, sku) to customer-friendly labels. */
export function formatProductOptionLabel(key: string): string {
  const raw = String(key || '').trim();
  if (!raw) return '';
  const hit = OPTION_KEY_LABELS[raw.toLowerCase()];
  if (hit) return hit;
  // Title-case unknown keys lightly (keep RAM / SIM already covered)
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Friendly SIM code labels for admin chips / dropdowns. */
export function formatSimTypeLabel(code: string): string {
  const c = String(code || '').trim().toLowerCase();
  switch (c) {
    case 'ps':
    case 'physical':
      return 'Physical SIM';
    case 'es':
    case 'esim':
      return 'eSIM';
    case 'single':
      return 'Standard';
    case 'wifi':
    case 'wi-fi':
      return 'Wi‑Fi only';
    case 'dual':
      return 'Dual SIM';
    default:
      return code;
  }
}
