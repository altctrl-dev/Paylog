'use server';

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Types
export interface InviteResult {
  success: boolean;
  inviteUrl?: string;
  error?: string;
}

export interface ValidateInviteResult {
  valid: boolean;
  email?: string;
  role?: string;
  error?: string;
}

export interface AcceptInviteResult {
  success: boolean;
  error?: string;
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
 * - Generates unique token with 48hr expiry
 * - Sends email with invite link
 * - Returns invite URL for manual sharing
 */
export async function createInvite(
  email: string,
  role: 'standard_user' | 'admin' | 'super_admin'
): Promise<InviteResult> {
  try {
    const invitedBy = await requireSuperAdmin();

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'A user with this email already exists',
      };
    }

    // Check for existing pending invite
    const existingInvite = await db.userInvite.findFirst({
      where: {
        email: normalizedEmail,
        used_at: null,
        expires_at: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return {
        success: false,
        error: 'An active invite already exists for this email',
      };
    }

    // Generate token and expiry (48 hours)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Create invite
    await db.userInvite.create({
      data: {
        token,
        email: normalizedEmail,
        role,
        expires_at: expiresAt,
        invited_by: invitedBy,
      },
    });

    const inviteUrl = getInviteUrl(token);

    // Send invite email (fire-and-forget, don't fail invite creation)
    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'PayLog <noreply@paylog.app>',
          to: normalizedEmail,
          subject: "You're invited to PayLog",
          html: generateInviteEmailHtml(inviteUrl, role),
        });
      } catch (emailError) {
        console.error('[Invites] Failed to send email:', emailError);
        // Don't fail the invite creation, just log the error
      }
    }

    revalidatePath('/settings');

    return {
      success: true,
      inviteUrl,
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
 * - Checks if token exists, not expired, not used
 * - Returns invite details if valid
 */
export async function validateInvite(token: string): Promise<ValidateInviteResult> {
  try {
    const invite = await db.userInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return { valid: false, error: 'Invalid invite link' };
    }

    if (invite.used_at) {
      return { valid: false, error: 'This invite has already been used' };
    }

    if (invite.expires_at < new Date()) {
      return { valid: false, error: 'This invite has expired' };
    }

    // Check if user was created by another means
    const existingUser = await db.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });

    if (existingUser) {
      return { valid: false, error: 'An account with this email already exists' };
    }

    return {
      valid: true,
      email: invite.email,
      role: invite.role,
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
 * Accept an invite and create user
 * - Called after Microsoft OAuth verification
 * - Creates user with invited email and role
 * - Marks invite as used
 */
export async function acceptInvite(
  token: string,
  fullName: string,
  oauthEmail: string
): Promise<AcceptInviteResult> {
  try {
    // Validate the invite
    const invite = await db.userInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return { success: false, error: 'Invalid invite link' };
    }

    if (invite.used_at) {
      return { success: false, error: 'This invite has already been used' };
    }

    if (invite.expires_at < new Date()) {
      return { success: false, error: 'This invite has expired' };
    }

    // Verify OAuth email matches invite email
    if (oauthEmail.toLowerCase() !== invite.email.toLowerCase()) {
      return {
        success: false,
        error: `Please sign in with ${invite.email} to accept this invite`,
      };
    }

    // Create user and mark invite as used in a transaction
    await db.$transaction(async (tx) => {
      // Create the user
      await tx.user.create({
        data: {
          email: invite.email,
          full_name: fullName.trim(),
          role: invite.role,
          is_active: true,
          // password_hash is null for OAuth users
        },
      });

      // Mark invite as used
      await tx.userInvite.update({
        where: { id: invite.id },
        data: { used_at: new Date() },
      });
    });

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
 * Get all pending invites (for admin view)
 */
export async function getPendingInvites() {
  try {
    await requireSuperAdmin();

    const invites = await db.userInvite.findMany({
      where: {
        used_at: null,
        expires_at: { gt: new Date() },
      },
      include: {
        inviter: {
          select: { full_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
      invited_by: invite.inviter.full_name,
    }));
  } catch (error) {
    console.error('[Invites] Error fetching invites:', error);
    return [];
  }
}

/**
 * Revoke/cancel a pending invite
 */
export async function revokeInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();

    const invite = await db.userInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return { success: false, error: 'Invite not found' };
    }

    if (invite.used_at) {
      return { success: false, error: 'Cannot revoke an already used invite' };
    }

    // Delete the invite
    await db.userInvite.delete({
      where: { id: inviteId },
    });

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
 */
export async function resendInvite(inviteId: string): Promise<InviteResult> {
  try {
    await requireSuperAdmin();

    const invite = await db.userInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return { success: false, error: 'Invite not found' };
    }

    if (invite.used_at) {
      return { success: false, error: 'Cannot resend an already used invite' };
    }

    if (invite.expires_at < new Date()) {
      return { success: false, error: 'Invite has expired. Please create a new invite.' };
    }

    const inviteUrl = getInviteUrl(invite.token);

    // Send invite email
    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'PayLog <noreply@paylog.app>',
          to: invite.email,
          subject: "Reminder: You're invited to PayLog",
          html: generateInviteEmailHtml(inviteUrl, invite.role),
        });
      } catch (emailError) {
        console.error('[Invites] Failed to send email:', emailError);
        return { success: false, error: 'Failed to send email' };
      }
    } else {
      return { success: false, error: 'Email service not configured' };
    }

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
function generateInviteEmailHtml(inviteUrl: string, role: string): string {
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
    const invite = await db.userInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return { success: false, error: 'Invalid invite link' };
    }

    if (invite.used_at) {
      return { success: false, error: 'This invite has already been used' };
    }

    if (invite.expires_at < new Date()) {
      return { success: false, error: 'This invite has expired' };
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });

    if (existingUser) {
      return { success: false, error: 'An account with this email already exists' };
    }

    // Set cookie with invite data for the OAuth callback
    // Cookie expires in 10 minutes (enough time for OAuth flow)
    const cookieStore = await cookies();
    cookieStore.set('pending_invite', JSON.stringify({
      token,
      fullName: fullName.trim(),
      email: invite.email,
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
