'use server';

/**
 * User Management Server Actions
 * Sprint 11 Phase 2: Server Actions & API
 */

import { hash } from 'bcryptjs';
import { headers } from 'next/headers';
import { db as prisma } from '@/lib/db';
import { requireSuperAdmin, getCurrentUserId, isLastSuperAdmin } from '@/lib/auth';
import { generateMemorablePassword } from '@/lib/utils/password-generator';
import { logUserAudit, getUserAuditHistory } from '@/lib/utils/audit-logger';
import type {
  UserCreateInput,
  UserUpdateInput,
  UserListParams,
  UserBasic,
  UserWithStats,
  UserDetailed,
  UserListResponse,
  ActionResult,
  RoleChangeValidation,
  UserStatus,
} from '@/lib/types/user-management';

// ============================================================================
// Request Metadata Helper
// ============================================================================

/**
 * Extract request metadata for audit logging
 * Must be called at action boundary BEFORE any caching operations
 * to avoid "headers cannot be accessed inside unstable_cache" errors
 */
async function getRequestMetadata() {
  try {
    const headersList = await headers();
    return {
      ip_address: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null,
      user_agent: headersList.get('user-agent') || null,
    };
  } catch {
    // Headers not available (e.g., in static generation or testing)
    return { ip_address: null, user_agent: null };
  }
}

// ============================================================================
// Create User
// ============================================================================

export async function createUser(
  data: UserCreateInput
): Promise<ActionResult<UserBasic>> {
  try {
    // Extract metadata at action boundary BEFORE any database/caching operations
    const requestMetadata = await getRequestMetadata();

    // Permission check
    await requireSuperAdmin();
    const actorId = await getCurrentUserId();

    // Validate email is unique
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'A user with this email already exists',
        code: 'EMAIL_EXISTS',
      };
    }

    // Generate password if not provided
    const password = data.password || generateMemorablePassword();
    const password_hash = await hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        password_hash,
        is_active: true,
      },
    });

    // Log audit event with request metadata
    await logUserAudit({
      target_user_id: user.id,
      actor_user_id: actorId,
      event_type: 'user_created',
      new_data: {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    }, requestMetadata);

    // TODO: Send welcome email with temporary password (Sprint 5 integration)
    // await sendWelcomeEmail(user.email, user.full_name, password);

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role as 'standard_user' | 'admin' | 'super_admin',
        status: user.status as UserStatus,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      message: `User ${user.full_name} created successfully. Temporary password: ${password}`,
    };
  } catch (error) {
    console.error('Failed to create user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user',
    };
  }
}

// ============================================================================
// Update User
// ============================================================================

export async function updateUser(
  id: number,
  data: UserUpdateInput
): Promise<ActionResult<UserBasic>> {
  try {
    // Extract metadata at action boundary BEFORE any database/caching operations
    const requestMetadata = await getRequestMetadata();

    // Permission check
    await requireSuperAdmin();
    const actorId = await getCurrentUserId();

    // Get existing user (select only needed fields to avoid password_hash issues)
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
      },
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    // Check if email is being changed and is unique
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });

      if (emailExists) {
        return {
          success: false,
          error: 'A user with this email already exists',
          code: 'EMAIL_EXISTS',
        };
      }
    }

    // Check role change protection
    if (data.role && data.role !== existingUser.role) {
      const isLast = await isLastSuperAdmin(id);
      if (isLast && data.role !== 'super_admin') {
        return {
          success: false,
          error: 'Cannot change role of the last super admin',
          code: 'LAST_SUPER_ADMIN',
        };
      }
    }

    // Update user (use select to avoid returning password_hash for OAuth users)
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.full_name && { full_name: data.full_name }),
        ...(data.role && { role: data.role }),
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Log audit events with request metadata
    if (data.email && data.email !== existingUser.email) {
      await logUserAudit({
        target_user_id: id,
        actor_user_id: actorId,
        event_type: 'user_email_changed',
        old_data: { email: existingUser.email },
        new_data: { email: data.email },
      }, requestMetadata);
    }

    if (data.role && data.role !== existingUser.role) {
      await logUserAudit({
        target_user_id: id,
        actor_user_id: actorId,
        event_type: 'user_role_changed',
        old_data: { role: existingUser.role },
        new_data: { role: data.role },
      }, requestMetadata);
    }

    if (data.full_name && data.full_name !== existingUser.full_name) {
      await logUserAudit({
        target_user_id: id,
        actor_user_id: actorId,
        event_type: 'user_updated',
        old_data: { full_name: existingUser.full_name },
        new_data: { full_name: data.full_name },
      }, requestMetadata);
    }

    return {
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        role: updatedUser.role as 'standard_user' | 'admin' | 'super_admin',
        status: updatedUser.status as UserStatus,
        is_active: updatedUser.is_active,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
      },
      message: 'User updated successfully',
    };
  } catch (error) {
    console.error('Failed to update user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    };
  }
}

// ============================================================================
// Deactivate User
// ============================================================================

export async function deactivateUser(id: number): Promise<ActionResult<void>> {
  try {
    // Extract metadata at action boundary BEFORE any database/caching operations
    const requestMetadata = await getRequestMetadata();

    // Permission check
    await requireSuperAdmin();
    const actorId = await getCurrentUserId();

    // Get existing user (select only needed fields)
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        is_active: true,
      },
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    if (existingUser.status === 'deactivated') {
      return {
        success: false,
        error: 'User is already deactivated',
        code: 'ALREADY_DEACTIVATED',
      };
    }

    if (existingUser.status !== 'active') {
      return {
        success: false,
        error: `Cannot deactivate user with status '${existingUser.status}'`,
        code: 'INVALID_STATUS',
      };
    }

    // Check if this is the last super admin
    const isLast = await isLastSuperAdmin(id);
    if (isLast) {
      return {
        success: false,
        error: 'Cannot deactivate the last super admin',
        code: 'LAST_SUPER_ADMIN',
      };
    }

    // Deactivate user
    await prisma.user.update({
      where: { id },
      data: {
        status: 'deactivated',
        is_active: false, // Keep deprecated field in sync
      },
    });

    // Log audit event with request metadata
    await logUserAudit({
      target_user_id: id,
      actor_user_id: actorId,
      event_type: 'user_deactivated',
      old_data: { status: 'active' },
      new_data: { status: 'deactivated' },
    }, requestMetadata);

    return {
      success: true,
      data: undefined,
      message: `User ${existingUser.full_name} deactivated successfully`,
    };
  } catch (error) {
    console.error('Failed to deactivate user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate user',
    };
  }
}

// ============================================================================
// Reactivate User
// ============================================================================

export async function reactivateUser(id: number): Promise<ActionResult<void>> {
  try {
    // Extract metadata at action boundary BEFORE any database/caching operations
    const requestMetadata = await getRequestMetadata();

    // Permission check
    await requireSuperAdmin();
    const actorId = await getCurrentUserId();

    // Get existing user (select only needed fields)
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        is_active: true,
      },
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    if (existingUser.status === 'active') {
      return {
        success: false,
        error: 'User is already active',
        code: 'ALREADY_ACTIVE',
      };
    }

    if (existingUser.status !== 'deactivated') {
      return {
        success: false,
        error: `Cannot reactivate user with status '${existingUser.status}'`,
        code: 'INVALID_STATUS',
      };
    }

    // Reactivate user
    await prisma.user.update({
      where: { id },
      data: {
        status: 'active',
        is_active: true, // Keep deprecated field in sync
      },
    });

    // Log audit event with request metadata
    await logUserAudit({
      target_user_id: id,
      actor_user_id: actorId,
      event_type: 'user_reactivated',
      old_data: { status: 'deactivated' },
      new_data: { status: 'active' },
    }, requestMetadata);

    return {
      success: true,
      data: undefined,
      message: `User ${existingUser.full_name} reactivated successfully`,
    };
  } catch (error) {
    console.error('Failed to reactivate user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reactivate user',
    };
  }
}

// ============================================================================
// List Users
// ============================================================================

export async function listUsers(
  params: UserListParams = {}
): Promise<ActionResult<UserListResponse>> {
  try {
    // Permission check
    await requireSuperAdmin();

    const {
      page = 1,
      pageSize = 20,
      search,
      role,
      status,
      is_active,
      sortBy = 'full_name',
      sortOrder = 'asc',
    } = params;

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where = {
      ...(search && {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(role && { role }),
      // Support status filter (single or array)
      ...(status && {
        status: Array.isArray(status) ? { in: status } : status,
      }),
      // Support legacy is_active filter
      ...(is_active !== undefined && !status && { is_active }),
    };

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with stats
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        invite_token: true,
        invite_expires_at: true,
        invited_by_id: true,
        invited_by: {
          select: { full_name: true },
        },
        _count: {
          select: {
            created_invoices: true,
            audit_history: true,
          },
        },
        audit_history: {
          select: {
            created_at: true,
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    const usersWithStats: UserWithStats[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role as 'standard_user' | 'admin' | 'super_admin',
      status: user.status as UserStatus,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      deleted_at: user.deleted_at,
      invite_token: user.invite_token,
      invite_expires_at: user.invite_expires_at,
      invited_by_id: user.invited_by_id,
      invoice_count: user._count.created_invoices,
      last_activity_at: user.audit_history[0]?.created_at || null,
      audit_event_count: user._count.audit_history,
      invited_by_name: user.invited_by?.full_name || null,
    }));

    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: {
        users: usersWithStats,
        total,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Failed to list users:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list users',
    };
  }
}

// ============================================================================
// Get User By ID
// ============================================================================

export async function getUserById(id: number): Promise<ActionResult<UserDetailed>> {
  try {
    // Permission check
    await requireSuperAdmin();

    // Get user with detailed information
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        invite_token: true,
        invite_expires_at: true,
        invited_by_id: true,
        _count: {
          select: {
            created_invoices: true,
            comments: true,
            uploaded_attachments: true,
            profile_visibilities: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    // Get audit history
    const auditHistory = await getUserAuditHistory(id, { limit: 10 });

    const userDetailed: UserDetailed = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role as 'standard_user' | 'admin' | 'super_admin',
      status: user.status as UserStatus,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      deleted_at: user.deleted_at,
      invite_token: user.invite_token,
      invite_expires_at: user.invite_expires_at,
      invited_by_id: user.invited_by_id,
      created_invoices_count: user._count.created_invoices,
      comments_count: user._count.comments,
      attachments_count: user._count.uploaded_attachments,
      profile_visibilities_count: user._count.profile_visibilities,
      last_login_at: null, // TODO: Track last login in session
      audit_history: auditHistory.map((log) => ({
        id: log.id,
        target_user_id: log.target_user_id,
        actor_user_id: log.actor_user_id,
        event_type: log.event_type as 'user_created' | 'user_updated' | 'user_deactivated' | 'user_reactivated' | 'user_role_changed' | 'user_password_reset' | 'user_email_changed' | 'profile_access_granted' | 'profile_access_revoked',
        old_data: log.old_data,
        new_data: log.new_data,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
        actor: log.actor || undefined,
      })),
    };

    return {
      success: true,
      data: userDetailed,
    };
  } catch (error) {
    console.error('Failed to get user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user',
    };
  }
}

// ============================================================================
// Validate Role Change
// ============================================================================

export async function validateRoleChange(
  userId: number,
  newRole: 'standard_user' | 'admin' | 'super_admin'
): Promise<ActionResult<RoleChangeValidation>> {
  try {
    // Permission check
    await requireSuperAdmin();

    // Get existing user (select only needed fields)
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    // Check if this is the last super admin
    const isLast = await isLastSuperAdmin(userId);

    if (isLast && newRole !== 'super_admin') {
      return {
        success: true,
        data: {
          can_change: false,
          is_last_super_admin: true,
          reason: 'Cannot change role of the last super admin',
        },
      };
    }

    return {
      success: true,
      data: {
        can_change: true,
        is_last_super_admin: false,
      },
    };
  } catch (error) {
    console.error('Failed to validate role change:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate role change',
    };
  }
}

// ============================================================================
// Check if User is Last Super Admin
// ============================================================================

/**
 * Check if a user is the last super admin
 * Used by client components to determine if certain actions should be restricted
 */
export async function checkIsLastSuperAdmin(userId: number): Promise<ActionResult<boolean>> {
  try {
    const isLast = await isLastSuperAdmin(userId);
    return {
      success: true,
      data: isLast,
    };
  } catch (error) {
    console.error('Failed to check if last super admin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check admin status',
    };
  }
}

// ============================================================================
// Check User Activity Count
// ============================================================================

/**
 * Check if a user has any associated activities
 * Used to determine if soft delete or hard delete should be used
 */
export async function checkUserActivityCount(userId: number): Promise<ActionResult<{
  hasActivity: boolean;
  invoiceCount: number;
  commentCount: number;
  attachmentCount: number;
  totalCount: number;
}>> {
  try {
    await requireSuperAdmin();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        _count: {
          select: {
            created_invoices: true,
            comments: true,
            uploaded_attachments: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    const totalCount =
      user._count.created_invoices +
      user._count.comments +
      user._count.uploaded_attachments;

    return {
      success: true,
      data: {
        hasActivity: totalCount > 0,
        invoiceCount: user._count.created_invoices,
        commentCount: user._count.comments,
        attachmentCount: user._count.uploaded_attachments,
        totalCount,
      },
    };
  } catch (error) {
    console.error('Failed to check user activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check user activity',
    };
  }
}

// ============================================================================
// Delete User (Soft or Hard)
// ============================================================================

/**
 * Delete a user - soft delete if they have activities, hard delete otherwise
 * Pending users (invites) are always hard deleted
 */
export async function deleteUser(userId: number): Promise<ActionResult<{
  deleteType: 'soft' | 'hard';
}>> {
  try {
    const requestMetadata = await getRequestMetadata();
    await requireSuperAdmin();
    const actorId = await getCurrentUserId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        _count: {
          select: {
            created_invoices: true,
            comments: true,
            uploaded_attachments: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    // Cannot delete users already deleted
    if (user.status === 'deleted') {
      return {
        success: false,
        error: 'User is already deleted',
        code: 'ALREADY_DELETED',
      };
    }

    // Check if this is the last super admin
    const isLast = await isLastSuperAdmin(userId);
    if (isLast) {
      return {
        success: false,
        error: 'Cannot delete the last super admin',
        code: 'LAST_SUPER_ADMIN',
      };
    }

    const totalActivity =
      user._count.created_invoices +
      user._count.comments +
      user._count.uploaded_attachments;

    // Pending users and users with no activity get hard deleted
    if (user.status === 'pending' || totalActivity === 0) {
      // Hard delete
      await prisma.user.delete({
        where: { id: userId },
      });

      // Note: Can't log audit for hard deleted user

      return {
        success: true,
        data: { deleteType: 'hard' },
        message: `User ${user.full_name} permanently deleted`,
      };
    }

    // Soft delete - user has activity
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'deleted',
        deleted_at: new Date(),
        is_active: false,
      },
    });

    // Log audit event
    await logUserAudit({
      target_user_id: userId,
      actor_user_id: actorId,
      event_type: 'user_soft_deleted',
      old_data: { status: user.status },
      new_data: { status: 'deleted', deleted_at: new Date().toISOString() },
    }, requestMetadata);

    return {
      success: true,
      data: { deleteType: 'soft' },
      message: `User ${user.full_name} soft deleted (can be restored)`,
    };
  } catch (error) {
    console.error('Failed to delete user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
}

// ============================================================================
// Restore Soft-Deleted User
// ============================================================================

/**
 * Restore a soft-deleted user back to active status
 */
export async function restoreUser(userId: number): Promise<ActionResult<void>> {
  try {
    const requestMetadata = await getRequestMetadata();
    await requireSuperAdmin();
    const actorId = await getCurrentUserId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        status: true,
        deleted_at: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    if (user.status !== 'deleted') {
      return {
        success: false,
        error: 'User is not deleted',
        code: 'NOT_DELETED',
      };
    }

    // Restore user to active status
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'active',
        deleted_at: null,
        is_active: true,
      },
    });

    // Log audit event
    await logUserAudit({
      target_user_id: userId,
      actor_user_id: actorId,
      event_type: 'user_restored',
      old_data: { status: 'deleted', deleted_at: user.deleted_at?.toISOString() },
      new_data: { status: 'active', deleted_at: null },
    }, requestMetadata);

    return {
      success: true,
      data: undefined,
      message: `User ${user.full_name} restored successfully`,
    };
  } catch (error) {
    console.error('Failed to restore user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore user',
    };
  }
}
