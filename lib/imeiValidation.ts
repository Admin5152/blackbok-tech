/**
 * IMEI / serial validation for trade-in Screen 4 (device config).
 *
 * IMEI: exactly 15 digits + Luhn check when provided.
 * Serial: 8–20 alphanumeric when provided.
 * All fields are optional — empty is always OK; partial entries get live hints.
 */

export const IMEI_DIGIT_COUNT = 15;
export const SERIAL_MIN_LENGTH = 8;
export const SERIAL_MAX_LENGTH = 20;

/** Digits only (IMEI input sanitizer). */
export function imeiDigitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

/** Luhn (mod-10) check for a 15-digit IMEI string (digits only or mixed). */
export function isValidImei(value: string): boolean {
  const digits = imeiDigitsOnly(value);
  if (digits.length !== IMEI_DIGIT_COUNT) return false;

  let sum = 0;
  for (let i = 0; i < IMEI_DIGIT_COUNT; i++) {
    let digit = parseInt(digits[IMEI_DIGIT_COUNT - 1 - i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** Serial number sanity — Apple serials are typically 10–12 chars. */
export function isValidSerial(value: string): boolean {
  const trimmed = value.trim();
  return new RegExp(
    `^[A-Za-z0-9]{${SERIAL_MIN_LENGTH},${SERIAL_MAX_LENGTH}}$`,
  ).test(trimmed);
}

export type FieldHintTone = 'muted' | 'ok' | 'error';

export type IdentityFieldHint = {
  /** Empty field — optional, no error */
  ok: boolean;
  /** Live / error line under the input */
  message: string;
  tone: FieldHintTone;
  digitsEntered?: number;
  remaining?: number;
};

/**
 * Live IMEI feedback while typing.
 * Empty = optional OK. Partial = how many left. Full = Luhn check.
 */
export function imeiFieldHint(value: string, label = 'IMEI'): IdentityFieldHint {
  const digits = imeiDigitsOnly(value);
  if (!digits) {
    return {
      ok: true,
      tone: 'muted',
      message: `Optional · ${IMEI_DIGIT_COUNT} digits (Settings → General → About, or dial *#06#)`,
      digitsEntered: 0,
      remaining: IMEI_DIGIT_COUNT,
    };
  }

  if (digits.length < IMEI_DIGIT_COUNT) {
    const remaining = IMEI_DIGIT_COUNT - digits.length;
    return {
      ok: false,
      tone: 'error',
      message: `${digits.length} of ${IMEI_DIGIT_COUNT} digits — ${remaining} more needed`,
      digitsEntered: digits.length,
      remaining,
    };
  }

  if (digits.length > IMEI_DIGIT_COUNT) {
    return {
      ok: false,
      tone: 'error',
      message: `Too many digits — ${label} must be exactly ${IMEI_DIGIT_COUNT}`,
      digitsEntered: digits.length,
      remaining: 0,
    };
  }

  if (!isValidImei(digits)) {
    return {
      ok: false,
      tone: 'error',
      message: `${label} has 15 digits but is not a valid IMEI. Check About / *#06#, or clear the field to skip.`,
      digitsEntered: IMEI_DIGIT_COUNT,
      remaining: 0,
    };
  }

  return {
    ok: true,
    tone: 'ok',
    message: `${label} looks complete (15 digits)`,
    digitsEntered: IMEI_DIGIT_COUNT,
    remaining: 0,
  };
}

/**
 * Live serial feedback while typing.
 * Empty = optional OK. Under 8 = how many left. Over 20 / bad chars = error.
 */
export function serialFieldHint(value: string): IdentityFieldHint {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      ok: true,
      tone: 'muted',
      message: `Optional · ${SERIAL_MIN_LENGTH}–${SERIAL_MAX_LENGTH} letters or numbers (Settings → General → About)`,
      digitsEntered: 0,
      remaining: SERIAL_MIN_LENGTH,
    };
  }

  if (/[^A-Za-z0-9]/.test(trimmed)) {
    return {
      ok: false,
      tone: 'error',
      message: 'Serial can only use letters and numbers — no spaces or symbols',
      digitsEntered: trimmed.length,
      remaining: Math.max(0, SERIAL_MIN_LENGTH - trimmed.length),
    };
  }

  if (trimmed.length < SERIAL_MIN_LENGTH) {
    const remaining = SERIAL_MIN_LENGTH - trimmed.length;
    return {
      ok: false,
      tone: 'error',
      message: `${trimmed.length} of ${SERIAL_MIN_LENGTH} minimum characters — ${remaining} more needed`,
      digitsEntered: trimmed.length,
      remaining,
    };
  }

  if (trimmed.length > SERIAL_MAX_LENGTH) {
    return {
      ok: false,
      tone: 'error',
      message: `Too long — serial can be at most ${SERIAL_MAX_LENGTH} characters`,
      digitsEntered: trimmed.length,
      remaining: 0,
    };
  }

  return {
    ok: true,
    tone: 'ok',
    message: 'Serial looks complete',
    digitsEntered: trimmed.length,
    remaining: 0,
  };
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

  const digitsOnly = imeiDigitsOnly(trimmed);
  if (digitsOnly.length === IMEI_DIGIT_COUNT && isValidImei(trimmed)) {
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
