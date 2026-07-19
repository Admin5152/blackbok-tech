/**
 * IMEI / serial validation for trade-in Screen 4 (device config).
 *
 * IMEI: 15-digit Luhn check. Serial: length sanity (8–20 alphanumeric).
 * Engineers verify device identity at inspection regardless.
 */

/** Luhn (mod-10) check for 15-digit IMEI */
export function isValidImei(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 15) return false;

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(digits[14 - i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** Serial number sanity — iPads and non-cellular devices */
export function isValidSerial(value: string): boolean {
  const trimmed = value.trim();
  // Apple serials are typically 10–12 chars; allow up to 20 for third-party
  return /^[A-Za-z0-9]{8,20}$/.test(trimmed);
}

/**
 * Accept either a valid IMEI or a valid serial.
 * Returns which type matched so the UI can show appropriate help text.
 */
export function validateImeiOrSerial(value: string): {
  valid: boolean;
  type: 'imei' | 'serial' | null;
} {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, type: null };

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 15 && isValidImei(trimmed)) {
    return { valid: true, type: 'imei' };
  }
  if (isValidSerial(trimmed)) {
    return { valid: true, type: 'serial' };
  }
  return { valid: false, type: null };
}

/** Mask IMEI for public display — last 4 digits only (Ghana Act 843) */
export function maskImeiSerial(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return '****';
  return `…${trimmed.slice(-4)}`;
}
