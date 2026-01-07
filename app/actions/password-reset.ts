'use server';

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hash } from 'bcryptjs';
import { cookies } from 'next/headers';

interface PasswordResetResult {
  success: boolean;
  error?: string;
}

/**
 * Start the password reset flow
 * Sets a cookie to indicate password reset is in progress
 * Must be called before Microsoft OAuth redirect
 */
export async function startPasswordReset(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.set('password_reset_flow', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });
  return { success: true };
}

/**
 * Clear the password reset flow cookie
 */
export async function clearPasswordResetFlow(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('password_reset_flow');
}

/**
 * Check if password reset flow is active
 */
export async function isPasswordResetFlowActive(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('password_reset_flow')?.value === 'true';
}

/**
 * Set or reset password for super_admin user
 * Requires active session and super_admin role
 */
export async function setEmergencyPassword(
  newPassword: string,
  confirmPassword: string
): Promise<PasswordResetResult> {
  try {
    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify super_admin role
    if (user.role !== 'super_admin') {
      return { success: false, error: 'Emergency password is only available for super administrators' };
    }

    // Validate passwords
    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    if (newPassword.length < 12) {
      return { success: false, error: 'Password must be at least 12 characters long' };
    }

    // Check password complexity
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return {
        success: false,
        error: 'Password must contain uppercase, lowercase, number, and special character',
      };
    }

    // Hash and save password
    const password_hash = await hash(newPassword, 12);

    await db.user.update({
      where: { id: user.id },
      data: {
        password_hash,
        last_password_change: new Date(),
      },
    });

    // Clear the password reset flow cookie
    await clearPasswordResetFlow();

    console.log(`[Auth] Emergency password set for user: ${user.email}`);

    return { success: true };
  } catch (error) {
    console.error('[PasswordReset] Error setting password:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set password',
    };
  }
}
