/**
 * Centralized password policy for the app.
 * Keep these rules in sync with Firebase Console → Authentication → Password policy.
 */

export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 20,
  requireUppercase: true,
  requireLowercase: true,
  requireNumeric: true,
  requireSpecial: true,
} as const;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  /** Individual check results for a strength meter UI */
  checks: {
    minLength: boolean;
    maxLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumeric: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Validate a password against the app's password policy.
 * Returns detailed results for UI feedback.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const checks = {
    minLength: password.length >= PASSWORD_POLICY.minLength,
    maxLength: password.length <= PASSWORD_POLICY.maxLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumeric: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const errors: string[] = [];

  if (!checks.minLength) {
    errors.push(`At least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (!checks.maxLength) {
    errors.push(`Maximum ${PASSWORD_POLICY.maxLength} characters`);
  }
  if (PASSWORD_POLICY.requireUppercase && !checks.hasUppercase) {
    errors.push('At least one uppercase letter (A–Z)');
  }
  if (PASSWORD_POLICY.requireLowercase && !checks.hasLowercase) {
    errors.push('At least one lowercase letter (a–z)');
  }
  if (PASSWORD_POLICY.requireNumeric && !checks.hasNumeric) {
    errors.push('At least one number (0–9)');
  }
  if (PASSWORD_POLICY.requireSpecial && !checks.hasSpecial) {
    errors.push('At least one special character (!@#$%^&* etc.)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    checks,
  };
}
