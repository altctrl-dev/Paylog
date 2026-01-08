'use server';

/**
 * Security Settings Server Actions
 * Handles password policy and security configuration
 */

import { auth, requireSuperAdmin } from '@/lib/auth';
import {
  getPasswordPolicy,
  savePasswordPolicy,
  getLoginAlertEmail,
  saveLoginAlertEmail,
  validatePassword,
  type PasswordPolicy,
} from '@/lib/password-policy';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/crypto';

// ============================================================================
// Password Policy Actions
// ============================================================================

/**
 * Get current password policy settings
 * Available to super_admin only
 */
export async function getSecuritySettings(): Promise<{
  policy: PasswordPolicy;
  loginAlertEmail: string | null;
}> {
  await requireSuperAdmin();

  const [policy, loginAlertEmail] = await Promise.all([
    getPasswordPolicy(),
    getLoginAlertEmail(),
  ]);

  return { policy, loginAlertEmail };
}

/**
 * Update password policy settings
 */
export async function updatePasswordPolicy(
  policy: Partial<PasswordPolicy>
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();

    const session = await auth();
    const userId = parseInt(session!.user!.id, 10);

    // Validate policy values
    if (policy.minLength !== undefined && (policy.minLength < 8 || policy.minLength > 128)) {
      return { success: false, error: 'Minimum length must be between 8 and 128' };
    }
    if (policy.expiryDays !== undefined && (policy.expiryDays < 0 || policy.expiryDays > 365)) {
      return { success: false, error: 'Expiry days must be between 0 and 365' };
    }

    await savePasswordPolicy(policy, userId);

    return { success: true };
  } catch (error) {
    console.error('[SecuritySettings] Error updating password policy:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update password policy',
    };
  }
}

/**
 * Update login alert email
 */
export async function updateLoginAlertEmail(
  email: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();

    const session = await auth();
    const userId = parseInt(session!.user!.id, 10);

    // Basic email validation if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Invalid email address' };
    }

    await saveLoginAlertEmail(email, userId);

    return { success: true };
  } catch (error) {
    console.error('[SecuritySettings] Error updating login alert email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update login alert email',
    };
  }
}

// ============================================================================
// Password Reset Actions
// ============================================================================

/**
 * Reset emergency admin password
 * Requires the user to be authenticated via Microsoft OAuth first
 */
export async function resetEmergencyPassword(
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();

    const session = await auth();
    const userId = parseInt(session!.user!.id, 10);

    // Verify passwords match
    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    // Validate password against policy
    const validation = await validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('. ') };
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update user's password
    await db.user.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
        last_password_change: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[SecuritySettings] Error resetting password:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset password',
    };
  }
}

/**
 * Check if current user has a password set (for showing reset option)
 */
export async function hasPasswordSet(): Promise<boolean> {
  try {
    await requireSuperAdmin();

    const session = await auth();
    const userId = parseInt(session!.user!.id, 10);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { password_hash: true },
    });

    return !!user?.password_hash;
  } catch {
    return false;
  }
}
