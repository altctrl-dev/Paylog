/**
 * Server Actions: Profile Visibility Management (Sprint 11 Phase 5)
 *
 * Manages UserProfileVisibility table for granular profile access control.
 * Super admins can grant/revoke access to restricted profiles (visible_to_all = false).
 */

'use server';

import { requireSuperAdmin, getCurrentUserId, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// ============================================================================
// TYPES
// ============================================================================

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type ProfileAccessGrant = {
  id: number;
  user_id: number;
  profile_id: number;
  granted_by: number;
  granted_at: Date;
  user: {
    id: number;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
  };
  granter: {
    id: number;
    full_name: string;
  };
  profile: {
    id: number;
    name: string;
  };
};

type UserProfileAccess = {
  id: number;
  user_id: number;
  profile_id: number;
  granted_by: number;
  granted_at: Date;
  profile: {
    id: number;
    name: string;
    description: string | null;
    entity: { id: number; name: string };
    vendor: { id: number; name: string };
    category: { id: number; name: string };
  };
  granter: {
    id: number;
    full_name: string;
  };
};

// ============================================================================
// GRANT/REVOKE ACCESS
// ============================================================================

/**
 * Grant user access to a restricted profile
 * Super admin only
 * @param profileId - Invoice profile ID
 * @param userId - User ID to grant access to
 */
export async function grantProfileAccess(
  profileId: number,
  userId: number
): Promise<ActionResult<ProfileAccessGrant>> {
  try {
    await requireSuperAdmin();
    const grantedBy = await getCurrentUserId();

    if (!grantedBy) {
      return { success: false, error: 'Failed to get current user ID' };
    }

    // Validate profile exists and is restricted
    const profile = await db.invoiceProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    if (profile.visible_to_all) {
      return {
        success: false,
        error: 'Profile is already visible to all users',
      };
    }

    // Validate user exists and is active
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.is_active) {
      return {
        success: false,
        error: 'Cannot grant access to inactive user',
      };
    }

    // Check for duplicate grant
    const existing = await db.userProfileVisibility.findUnique({
      where: {
        unique_user_profile: {
          user_id: userId,
          profile_id: profileId,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: 'User already has access to this profile',
      };
    }

    // Create grant
    const grant = await db.userProfileVisibility.create({
      data: {
        user_id: userId,
        profile_id: profileId,
        granted_by: grantedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            role: true,
            is_active: true,
          },
        },
        granter: {
          select: { id: true, full_name: true },
        },
        profile: {
          select: { id: true, name: true },
        },
      },
    });

    revalidatePath('/master-data');
    revalidatePath('/invoices');

    return { success: true, data: grant };
  } catch (error) {
    console.error('grantProfileAccess error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grant access',
    };
  }
}

/**
 * Revoke user access from a restricted profile
 * Super admin only
 * @param profileId - Invoice profile ID
 * @param userId - User ID to revoke access from
 */
export async function revokeProfileAccess(
  profileId: number,
  userId: number
): Promise<ActionResult<void>> {
  try {
    await requireSuperAdmin();

    // Verify grant exists
    const existing = await db.userProfileVisibility.findUnique({
      where: {
        unique_user_profile: {
          user_id: userId,
          profile_id: profileId,
        },
      },
    });

    if (!existing) {
      return {
        success: false,
        error: 'User does not have access to this profile',
      };
    }

    // Delete grant
    await db.userProfileVisibility.delete({
      where: {
        unique_user_profile: {
          user_id: userId,
          profile_id: profileId,
        },
      },
    });

    revalidatePath('/master-data');
    revalidatePath('/invoices');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('revokeProfileAccess error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke access',
    };
  }
}

// ============================================================================
// QUERY ACCESS
// ============================================================================

/**
 * List all users with access to a specific profile
 * Super admin only
 * @param profileId - Invoice profile ID
 */
export async function listProfileAccess(
  profileId: number
): Promise<ActionResult<ProfileAccessGrant[]>> {
  try {
    await requireSuperAdmin();

    const grants = await db.userProfileVisibility.findMany({
      where: {
        profile_id: profileId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            role: true,
            is_active: true,
          },
        },
        granter: {
          select: { id: true, full_name: true },
        },
        profile: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        granted_at: 'desc',
      },
    });

    return { success: true, data: grants };
  } catch (error) {
    console.error('listProfileAccess error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to list profile access',
    };
  }
}

/**
 * List all profiles a user can access
 * Users can query their own access, super admins can query anyone's
 * @param userId - User ID to query access for
 */
export async function listUserProfileAccess(
  userId: number
): Promise<ActionResult<UserProfileAccess[]>> {
  try {
    const currentUserId = await getCurrentUserId();
    const isSuperAdminUser = await isSuperAdmin();

    if (!currentUserId) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Users can only query their own access, unless they're super admin
    if (userId !== currentUserId && !isSuperAdminUser) {
      return {
        success: false,
        error: 'Unauthorized: You can only view your own profile access',
      };
    }

    const grants = await db.userProfileVisibility.findMany({
      where: {
        user_id: userId,
      },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            description: true,
            entity: {
              select: { id: true, name: true },
            },
            vendor: {
              select: { id: true, name: true },
            },
            category: {
              select: { id: true, name: true },
            },
          },
        },
        granter: {
          select: { id: true, full_name: true },
        },
      },
      orderBy: {
        granted_at: 'desc',
      },
    });

    return { success: true, data: grants };
  } catch (error) {
    console.error('listUserProfileAccess error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to list user profile access',
    };
  }
}
