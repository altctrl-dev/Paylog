/**
 * Password Policy Validation
 * Configurable password strength requirements for admin emergency access
 */

import { db } from '@/lib/db';

/**
 * Password policy settings structure
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
  expiryDays: number; // 0 = never expires
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Default password policy values
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: true,
  expiryDays: 90,
};

/**
 * System setting keys for password policy
 */
const POLICY_KEYS = {
  minLength: 'password_min_length',
  requireUppercase: 'password_require_uppercase',
  requireNumber: 'password_require_number',
  requireSpecial: 'password_require_special',
  expiryDays: 'password_expiry_days',
  loginAlertEmail: 'login_alert_email',
} as const;

/**
 * Fetch password policy from system settings
 * Falls back to defaults if settings don't exist
 */
export async function getPasswordPolicy(): Promise<PasswordPolicy> {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: Object.values(POLICY_KEYS).filter((k) => k !== 'login_alert_email'),
        },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    return {
      minLength: parseInt(
        settingsMap.get(POLICY_KEYS.minLength) ||
          String(DEFAULT_PASSWORD_POLICY.minLength),
        10
      ),
      requireUppercase:
        settingsMap.get(POLICY_KEYS.requireUppercase) !== 'false',
      requireNumber: settingsMap.get(POLICY_KEYS.requireNumber) !== 'false',
      requireSpecial: settingsMap.get(POLICY_KEYS.requireSpecial) !== 'false',
      expiryDays: parseInt(
        settingsMap.get(POLICY_KEYS.expiryDays) ||
          String(DEFAULT_PASSWORD_POLICY.expiryDays),
        10
      ),
    };
  } catch (error) {
    console.error('[PasswordPolicy] Error fetching policy:', error);
    return DEFAULT_PASSWORD_POLICY;
  }
}

/**
 * Validate a password against the current policy
 */
export async function validatePassword(
  password: string
): Promise<PasswordValidationResult> {
  const policy = await getPasswordPolicy();
  return validatePasswordWithPolicy(password, policy);
}

/**
 * Validate a password against a specific policy (sync version)
 * Useful when you already have the policy loaded
 */
export function validatePasswordWithPolicy(
  password: string,
  policy: PasswordPolicy
): PasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  }

  // Check uppercase requirement
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check number requirement
  if (policy.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check special character requirement
  if (policy.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a user's password has expired
 * @param lastPasswordChange - Date when password was last changed
 * @returns true if password has expired
 */
export async function isPasswordExpired(
  lastPasswordChange: Date | null
): Promise<boolean> {
  if (!lastPasswordChange) {
    // No password change recorded - consider it expired for safety
    return true;
  }

  const policy = await getPasswordPolicy();

  // 0 means password never expires
  if (policy.expiryDays === 0) {
    return false;
  }

  const expiryDate = new Date(lastPasswordChange);
  expiryDate.setDate(expiryDate.getDate() + policy.expiryDays);

  return new Date() > expiryDate;
}

/**
 * Get the number of days until password expires
 * @returns number of days (negative if already expired), or null if never expires
 */
export async function getDaysUntilPasswordExpiry(
  lastPasswordChange: Date | null
): Promise<number | null> {
  if (!lastPasswordChange) {
    return -1; // Expired
  }

  const policy = await getPasswordPolicy();

  if (policy.expiryDays === 0) {
    return null; // Never expires
  }

  const expiryDate = new Date(lastPasswordChange);
  expiryDate.setDate(expiryDate.getDate() + policy.expiryDays);

  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Save password policy settings
 */
export async function savePasswordPolicy(
  policy: Partial<PasswordPolicy>,
  updatedBy: number
): Promise<void> {
  const updates: { key: string; value: string }[] = [];

  if (policy.minLength !== undefined) {
    updates.push({
      key: POLICY_KEYS.minLength,
      value: String(policy.minLength),
    });
  }
  if (policy.requireUppercase !== undefined) {
    updates.push({
      key: POLICY_KEYS.requireUppercase,
      value: String(policy.requireUppercase),
    });
  }
  if (policy.requireNumber !== undefined) {
    updates.push({
      key: POLICY_KEYS.requireNumber,
      value: String(policy.requireNumber),
    });
  }
  if (policy.requireSpecial !== undefined) {
    updates.push({
      key: POLICY_KEYS.requireSpecial,
      value: String(policy.requireSpecial),
    });
  }
  if (policy.expiryDays !== undefined) {
    updates.push({
      key: POLICY_KEYS.expiryDays,
      value: String(policy.expiryDays),
    });
  }

  // Upsert each setting
  for (const update of updates) {
    await db.systemSetting.upsert({
      where: { key: update.key },
      update: { value: update.value, updated_by: updatedBy },
      create: { key: update.key, value: update.value, updated_by: updatedBy },
    });
  }
}

/**
 * Get the login alert email from system settings
 */
export async function getLoginAlertEmail(): Promise<string | null> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: POLICY_KEYS.loginAlertEmail },
    });
    return setting?.value || null;
  } catch (error) {
    console.error('[PasswordPolicy] Error fetching login alert email:', error);
    return null;
  }
}

/**
 * Save the login alert email
 */
export async function saveLoginAlertEmail(
  email: string | null,
  updatedBy: number
): Promise<void> {
  if (email) {
    await db.systemSetting.upsert({
      where: { key: POLICY_KEYS.loginAlertEmail },
      update: { value: email, updated_by: updatedBy },
      create: { key: POLICY_KEYS.loginAlertEmail, value: email, updated_by: updatedBy },
    });
  } else {
    // Delete the setting if email is null/empty
    await db.systemSetting.delete({
      where: { key: POLICY_KEYS.loginAlertEmail },
    }).catch(() => {
      // Ignore if setting doesn't exist
    });
  }
}
