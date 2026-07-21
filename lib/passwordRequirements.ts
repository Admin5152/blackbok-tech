/**
 * Client-side password rules aligned with BlackBox signup / reset (min 6 chars).
 * Used to show what’s still missing before submit.
 */

export type PasswordRequirementId =
  | 'minLength'
  | 'hasLetter'
  | 'hasNumber'
  | 'match';

export type PasswordRequirement = {
  id: PasswordRequirementId;
  label: string;
  met: boolean;
};

const MIN_LENGTH = 6;

export function evaluatePasswordRequirements(
  password: string,
  confirmPassword?: string,
): PasswordRequirement[] {
  const reqs: PasswordRequirement[] = [
    {
      id: 'minLength',
      label: `At least ${MIN_LENGTH} characters`,
      met: password.length >= MIN_LENGTH,
    },
    {
      id: 'hasLetter',
      label: 'Includes a letter',
      met: /[A-Za-z]/.test(password),
    },
    {
      id: 'hasNumber',
      label: 'Includes a number',
      met: /\d/.test(password),
    },
  ];

  if (typeof confirmPassword === 'string') {
    reqs.push({
      id: 'match',
      label: 'Passwords match',
      met: confirmPassword.length > 0 && password === confirmPassword,
    });
  }

  return reqs;
}

export function passwordRequirementsMet(
  password: string,
  confirmPassword?: string,
): boolean {
  return evaluatePasswordRequirements(password, confirmPassword).every((r) => r.met);
}

/** First unmet rule label, or null if all pass. */
export function firstMissingPasswordRequirement(
  password: string,
  confirmPassword?: string,
): string | null {
  const missing = evaluatePasswordRequirements(password, confirmPassword).find((r) => !r.met);
  return missing ? missing.label : null;
}

export { MIN_LENGTH as PASSWORD_MIN_LENGTH };
