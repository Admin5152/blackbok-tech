/**
 * Repair device category + pricing mode — kept in sync with
 * `database/migrations/2026_06_repair_device_pricing_mode.sql` CHECK constraints.
 */

export const REPAIR_DEVICE_TYPES = [
  'smartphone',
  'tablet',
  'laptop',
  'gaming',
  'smartwatch',
  'other',
] as const;

export type DeviceType = (typeof REPAIR_DEVICE_TYPES)[number];

export const REPAIR_PRICING_MODES = ['apple_matrix', 'diagnostic_quote'] as const;

export type PricingMode = (typeof REPAIR_PRICING_MODES)[number];

/** Named constants — use instead of raw pricing_mode strings. */
export const PRICING_MODE = {
  APPLE_MATRIX: REPAIR_PRICING_MODES[0],
  DIAGNOSTIC_QUOTE: REPAIR_PRICING_MODES[1],
} as const;

/** Named constants — use instead of raw device_type strings. */
export const DEVICE_TYPE = {
  SMARTPHONE: REPAIR_DEVICE_TYPES[0],
  TABLET: REPAIR_DEVICE_TYPES[1],
  LAPTOP: REPAIR_DEVICE_TYPES[2],
  GAMING: REPAIR_DEVICE_TYPES[3],
  SMARTWATCH: REPAIR_DEVICE_TYPES[4],
  OTHER: REPAIR_DEVICE_TYPES[5],
} as const;

export const REPAIR_REQUEST_CONSTRAINT_MESSAGE =
  'This repair could not be saved because the device category and pricing type do not match. Please review your device details and try again.';

export type RepairDeviceFieldsInput = {
  deviceType: string;
  brand: string;
  model: string;
  /** Running total from the iPhone component matrix (0 if not shown / not applicable). */
  matrixEstimateAmount: number;
};

export type RepairDeviceFieldsResult =
  | { ok: true; device_type: DeviceType; pricing_mode: PricingMode }
  | { ok: false; message: string };

export function parseDeviceType(value: string): DeviceType | null {
  const normalized = value.trim().toLowerCase();
  return REPAIR_DEVICE_TYPES.includes(normalized as DeviceType)
    ? (normalized as DeviceType)
    : null;
}

export function isPricingMode(value: string): value is PricingMode {
  return REPAIR_PRICING_MODES.includes(value as PricingMode);
}

/** Matches DB backfill: model ILIKE 'iphone%'. */
export function isAppleIphoneModel(model: string): boolean {
  const trimmed = model.trim();
  if (!trimmed) return false;
  return /^iphone/i.test(trimmed);
}

export function resolveRepairPricingMode(input: RepairDeviceFieldsInput): PricingMode {
  const deviceType = parseDeviceType(input.deviceType);
  if (
    deviceType === DEVICE_TYPE.SMARTPHONE &&
    input.brand.trim() === 'Apple' &&
    isAppleIphoneModel(input.model) &&
    input.matrixEstimateAmount > 0
  ) {
    return PRICING_MODE.APPLE_MATRIX;
  }
  return PRICING_MODE.DIAGNOSTIC_QUOTE;
}

/**
 * Derives validated device_type + pricing_mode for insert.
 * Blocks invalid apple_matrix combinations before the request reaches PostgREST.
 */
export function buildRepairDeviceFields(input: RepairDeviceFieldsInput): RepairDeviceFieldsResult {
  const device_type = parseDeviceType(input.deviceType);
  if (!device_type) {
    return { ok: false, message: 'Please select a device category before submitting.' };
  }

  const pricing_mode = resolveRepairPricingMode(input);

  if (pricing_mode === PRICING_MODE.APPLE_MATRIX) {
    if (device_type !== DEVICE_TYPE.SMARTPHONE) {
      return {
        ok: false,
        message:
          'iPhone matrix pricing only applies to smartphones. Change the device category or continue without matrix pricing.',
      };
    }
    if (input.brand.trim() !== 'Apple' || !isAppleIphoneModel(input.model)) {
      return {
        ok: false,
        message:
          'Matrix pricing is only available for Apple iPhone models. Other Apple devices receive a quote after inspection.',
      };
    }
    if (input.matrixEstimateAmount <= 0) {
      return {
        ok: false,
        message:
          'No matrix estimate was calculated for this repair. It will be saved as a diagnostic quote instead.',
      };
    }
  }

  return { ok: true, device_type, pricing_mode };
}

/** Server-side / API guard before insert (mirrors DB CHECK). */
export function assertRepairPricingConstraint(payload: {
  device_type?: string | null;
  pricing_mode?: string | null;
  device_brand?: string | null;
  device_model?: string | null;
}): void {
  const mode = payload.pricing_mode;
  if (!mode) return;

  if (!isPricingMode(mode)) {
    throw new Error(REPAIR_REQUEST_CONSTRAINT_MESSAGE);
  }

  if (mode === PRICING_MODE.APPLE_MATRIX) {
    if (payload.device_type !== DEVICE_TYPE.SMARTPHONE) {
      throw new Error(REPAIR_REQUEST_CONSTRAINT_MESSAGE);
    }
    if (payload.device_brand?.trim() !== 'Apple' || !isAppleIphoneModel(payload.device_model || '')) {
      throw new Error(REPAIR_REQUEST_CONSTRAINT_MESSAGE);
    }
  }
}

export function formatPricingModeLabel(mode: PricingMode | null | undefined): string {
  if (!mode) return 'Unknown';
  if (mode === PRICING_MODE.APPLE_MATRIX) return 'iPhone matrix estimate';
  return 'Diagnostic quote';
}

export function formatDeviceTypeLabel(type: DeviceType | null | undefined): string {
  if (!type) return '—';
  const labels: Record<DeviceType, string> = {
    smartphone: 'Smartphone',
    tablet: 'Tablet',
    laptop: 'Laptop',
    gaming: 'Console',
    smartwatch: 'Watch',
    other: 'Other',
  };
  return labels[type] ?? type;
}
