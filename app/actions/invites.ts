'use server';

/**
 * User Invite Actions (Unified System)
 *
 * Sprint 11 Phase 3: Unified User Status System
 *
 * Invites are now stored directly in the User table with status='pending'.
 * The UserInvite table is deprecated and will be removed.
 */

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { logUserAudit } from '@/lib/utils/audit-logger';
import { headers } from 'next/headers';
import type { UserRole } from '@/lib/types/user-management';

// Get Resend client lazily to ensure env vars are loaded
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Invites] RESEND_API_KEY not found in environment');
    return null;
  }
  return new Resend(apiKey);
}

// Types
export interface InviteResult {
  success: boolean;
  inviteUrl?: string;
  userId?: number;
  error?: string;
}

export interface ValidateInviteResult {
  valid: boolean;
  email?: string;
  role?: string;
  fullName?: string;
  error?: string;
}

export interface AcceptInviteResult {
  success: boolean;
  error?: string;
}

// Helper to get request metadata for audit logging
async function getRequestMetadata() {
  try {
    const headersList = await headers();
    return {
      ip_address: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null,
      user_agent: headersList.get('user-agent') || null,
    };
  } catch {
    return { ip_address: null, user_agent: null };
  }
}

// Helper to get current user and verify super_admin
async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  if (session.user.role !== 'super_admin') {
    throw new Error('Permission denied: super_admin required');
  }
  return parseInt(session.user.id);
}

// Generate secure random token
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Generate invite URL
function getInviteUrl(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/invite/${token}`;
}

/**
 * Create a new user invite
 * - Creates a User with status='pending'
 * - Generates unique token with 48hr expiry
 * - Sends email with invite link
 * - Returns invite URL for manual sharing
 */
export async function createInvite(
  email: string,
  role: UserRole
): Promise<InviteResult> {
  try {
    const requestMetadata = await getRequestMetadata();
    const invitedBy = await requireSuperAdmin();

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists with any status
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true },
    });

    if (existingUser) {
      if (existingUser.status === 'pending') {
        return {
          success: false,
          error: 'An active invite already exists for this email',
        };
      }
      return {
        success: false,
        error: 'A user with this email already exists',
      };
    }

    // Generate token and expiry (48 hours)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Create user with pending status
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        full_name: normalizedEmail.split('@')[0], // Temporary name from email
        role,
        status: 'pending',
        is_active: false,
        invite_token: token,
        invite_expires_at: expiresAt,
        invited_by_id: invitedBy,
      },
    });

    // Log audit event
    await logUserAudit({
      target_user_id: user.id,
      actor_user_id: invitedBy,
      event_type: 'user_invited',
      new_data: {
        email: normalizedEmail,
        role,
        invite_expires_at: expiresAt.toISOString(),
      },
    }, requestMetadata);

    const inviteUrl = getInviteUrl(token);

    // Send invite email (fire-and-forget, don't fail invite creation)
    const resendClient = getResendClient();
    if (resendClient) {
      const fromEmail = process.env.EMAIL_FROM || 'PayLog <noreply@servesys.co>';
      console.log('[Invites] Attempting to send email to:', normalizedEmail, 'from:', fromEmail);
      console.log('[Invites] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
      try {
        const emailResult = await resendClient.emails.send({
          from: fromEmail,
          to: normalizedEmail,
          subject: "You're invited to PayLog",
          html: generateInviteEmailHtml(inviteUrl, role),
        });

        // Check for error in response (Resend returns { data, error })
        if (emailResult.error) {
          console.error('[Invites] Resend API error:', emailResult.error);
        } else {
          console.log('[Invites] Email sent successfully, ID:', emailResult.data?.id);
        }
      } catch (emailError) {
        console.error('[Invites] Failed to send email (exception):', emailError);
        // Don't fail the invite creation, just log the error
      }
    } else {
      console.warn('[Invites] Resend not configured - RESEND_API_KEY missing or invalid');
      console.log('[Invites] RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    }

    revalidatePath('/admin');
    revalidatePath('/settings');

    return {
      success: true,
      inviteUrl,
      userId: user.id,
    };
  } catch (error) {
    console.error('[Invites] Error creating invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invite',
    };
  }
}

/**
 * Validate an invite token
 * - Checks if user exists with pending status
 * - Checks if token not expired
 * - Returns invite details if valid
 */
export async function validateInvite(token: string): Promise<ValidateInviteResult> {
  try {
    const user = await db.user.findFirst({
      where: {
        invite_token: token,
        status: 'pending',
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        invite_expires_at: true,
      },
    });

    if (!user) {
      return { valid: false, error: 'Invalid invite link' };
    }

    if (!user.invite_expires_at || user.invite_expires_at < new Date()) {
      return { valid: false, error: 'This invite has expired' };
    }

    return {
      valid: true,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    };
  } catch (error) {
    console.error('[Invites] Error validating invite:', error);
    return {
      valid: false,
      error: 'Failed to validate invite',
    };
  }
}

/**
 * Accept an invite and activate user
 * - Called after Microsoft OAuth verification
 * - Updates user to active status
 * - Clears invite token
 */
export async function acceptInvite(
  token: string,
  fullName: string,
  oauthEmail: string
): Promise<AcceptInviteResult> {
  try {
    const requestMetadata = await getRequestMetadata();

    // Find the pending user
    const user = await db.user.findFirst({
      where: {
        invite_token: token,
        status: 'pending',
      },
    });

    if (!user) {
      return { success: false, error: 'Invalid invite link' };
    }

    if (!user.invite_expires_at || user.invite_expires_at < new Date()) {
      return { success: false, error: 'This invite has expired' };
    }

    // Verify OAuth email matches invite email
    if (oauthEmail.toLowerCase() !== user.email.toLowerCase()) {
      return {
        success: false,
        error: `Please sign in with ${user.email} to accept this invite`,
      };
    }

    // Update user to active status
    await db.user.update({
      where: { id: user.id },
      data: {
        full_name: fullName.trim(),
        status: 'active',
        is_active: true,
        invite_token: null,
        invite_expires_at: null,
      },
    });

    // Log audit event
    await logUserAudit({
      target_user_id: user.id,
      actor_user_id: user.id, // User accepted their own invite
      event_type: 'user_invite_accepted',
      old_data: { status: 'pending' },
      new_data: { status: 'active', full_name: fullName.trim() },
    }, requestMetadata);

    return { success: true };
  } catch (error) {
    console.error('[Invites] Error accepting invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept invite',
    };
  }
}

/**
 * Get all pending users (invites)
 * Returns users with status='pending'
 */
export async function getPendingInvites() {
  try {
    await requireSuperAdmin();

    const pendingUsers = await db.user.findMany({
      where: {
        status: 'pending',
      },
      include: {
        invited_by: {
          select: { full_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return pendingUsers.map((user) => ({
      id: user.id.toString(),
      email: user.email,
      role: user.role,
      expires_at: user.invite_expires_at,
      created_at: user.created_at,
      invited_by: user.invited_by?.full_name || 'Unknown',
      is_expired: user.invite_expires_at ? user.invite_expires_at < new Date() : true,
    }));
  } catch (error) {
    console.error('[Invites] Error fetching invites:', error);
    return [];
  }
}

/**
 * Revoke/cancel a pending invite (hard delete pending user)
 */
export async function revokeInvite(userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.status !== 'pending') {
      return { success: false, error: 'Can only revoke pending invites' };
    }

    // Hard delete the pending user
    await db.user.delete({
      where: { id: userId },
    });

    // Note: Can't log audit for a deleted user, so we skip it

    revalidatePath('/admin');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('[Invites] Error revoking invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke invite',
    };
  }
}

/**
 * Resend an invite email
 * - Regenerates token and extends expiry
 */
export async function resendInvite(userId: number): Promise<InviteResult> {
  try {
    const requestMetadata = await getRequestMetadata();
    const actorId = await requireSuperAdmin();

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.status !== 'pending') {
      return { success: false, error: 'Can only resend invites for pending users' };
    }

    // Generate new token and expiry (48 hours)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Update user with new token
    await db.user.update({
      where: { id: userId },
      data: {
        invite_token: token,
        invite_expires_at: expiresAt,
      },
    });

    const inviteUrl = getInviteUrl(token);

    // Log audit event
    await logUserAudit({
      target_user_id: userId,
      actor_user_id: actorId,
      event_type: 'user_invite_resent',
      new_data: {
        invite_expires_at: expiresAt.toISOString(),
      },
    }, requestMetadata);

    // Send invite email
    const resendClient = getResendClient();
    if (resendClient) {
      const fromEmail = process.env.EMAIL_FROM || 'PayLog <noreply@servesys.co>';
      console.log('[Invites] Resending invite email to:', user.email, 'from:', fromEmail);
      console.log('[Invites] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
      try {
        const emailResult = await resendClient.emails.send({
          from: fromEmail,
          to: user.email,
          subject: "Reminder: You're invited to PayLog",
          html: generateInviteEmailHtml(inviteUrl, user.role as UserRole),
        });

        // Check for error in response
        if (emailResult.error) {
          console.error('[Invites] Resend API error:', emailResult.error);
          return { success: false, error: `Email failed: ${emailResult.error.message}` };
        }

        console.log('[Invites] Resend email sent successfully, ID:', emailResult.data?.id);
      } catch (emailError) {
        console.error('[Invites] Failed to send email (exception):', emailError);
        return { success: false, error: 'Failed to send email. Check server logs for details.' };
      }
    } else {
      console.error('[Invites] Resend not configured - RESEND_API_KEY missing or invalid');
      console.log('[Invites] RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
      return { success: false, error: 'Email service not configured (RESEND_API_KEY missing)' };
    }

    revalidatePath('/admin');

    return { success: true, inviteUrl };
  } catch (error) {
    console.error('[Invites] Error resending invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend invite',
    };
  }
}

/**
 * Generate invite email HTML
 */
function generateInviteEmailHtml(inviteUrl: string, role: UserRole): string {
  const roleName = role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Standard User';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 24px;">You're invited to PayLog</h1>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 16px;">
        You've been invited to join PayLog as a <strong>${roleName}</strong>.
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
        Click the button below to accept your invitation and set up your account. You'll need to sign in with your Microsoft account.
      </p>

      <a href="${inviteUrl}" style="display: inline-block; background-color: #e97a24; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
        Accept Invitation
      </a>

      <p style="color: #888; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
        This invitation will expire in 48 hours. If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="color: #666; font-size: 14px; word-break: break-all; margin: 8px 0 0;">
        ${inviteUrl}
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

      <p style="color: #888; font-size: 12px; margin: 0;">
        PayLog - Invoice Management System
      </p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Start invite acceptance flow
 * - Validates the invite
 * - Sets a cookie with the invite data for the OAuth callback
 * - Returns success so client can redirect to OAuth
 */
export async function startInviteAcceptance(
  token: string,
  fullName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate the invite first
    const user = await db.user.findFirst({
      where: {
        invite_token: token,
        status: 'pending',
      },
      select: {
        id: true,
        email: true,
        invite_expires_at: true,
      },
    });

    if (!user) {
      return { success: false, error: 'Invalid invite link' };
    }

    if (!user.invite_expires_at || user.invite_expires_at < new Date()) {
      return { success: false, error: 'This invite has expired' };
    }

    // Set cookie with invite data for the OAuth callback
    // Cookie expires in 10 minutes (enough time for OAuth flow)
    const cookieStore = await cookies();
    cookieStore.set('pending_invite', JSON.stringify({
      token,
      fullName: fullName.trim(),
      email: user.email,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    return { success: true };
  } catch (error) {
    console.error('[Invites] Error starting invite acceptance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start invite acceptance',
    };
  }
}

/**
 * Clear pending invite cookie
 * Called after successful invite acceptance or on error
 */
export async function clearPendingInvite(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('pending_invite');
}

/**
 * Get pending invite data from cookie
 * Used by auth.ts to check for pending invites during OAuth callback
 */
export async function getPendingInviteData(): Promise<{
  token: string;
  fullName: string;
  email: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get('pending_invite');
    if (!cookie?.value) return null;
    return JSON.parse(cookie.value);
  } catch {
    return null;
  }
}
