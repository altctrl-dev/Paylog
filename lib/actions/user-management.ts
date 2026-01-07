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
  PasswordResetResult,
  RoleChangeValidation,
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

    if (!existingUser.is_active) {
      return {
        success: false,
        error: 'User is already deactivated',
        code: 'ALREADY_DEACTIVATED',
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
      data: { is_active: false },
    });

    // Log audit event with request metadata
    await logUserAudit({
      target_user_id: id,
      actor_user_id: actorId,
      event_type: 'user_deactivated',
      old_data: { is_active: true },
      new_data: { is_active: false },
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

    if (existingUser.is_active) {
      return {
        success: false,
        error: 'User is already active',
        code: 'ALREADY_ACTIVE',
      };
    }

    // Reactivate user
    await prisma.user.update({
      where: { id },
      data: { is_active: true },
    });

    // Log audit event with request metadata
    await logUserAudit({
      target_user_id: id,
      actor_user_id: actorId,
      event_type: 'user_reactivated',
      old_data: { is_active: false },
      new_data: { is_active: true },
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
// Reset User Password
// ============================================================================

export async function resetUserPassword(id: number): Promise<ActionResult<PasswordResetResult>> {
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
      },
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    // Generate new password
    const temporaryPassword = generateMemorablePassword();
    const password_hash = await hash(temporaryPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { password_hash },
    });

    // Log audit event with request metadata
    await logUserAudit({
      target_user_id: id,
      actor_user_id: actorId,
      event_type: 'user_password_reset',
      new_data: { reset_by: actorId },
    }, requestMetadata);

    // TODO: Send password reset email (Sprint 5 integration)
    // await sendPasswordResetEmail(existingUser.email, existingUser.full_name, temporaryPassword);

    return {
      success: true,
      data: {
        success: true,
        temporary_password: temporaryPassword,
        email_sent: false, // Will be true when email integration is complete
      },
      message: `Password reset for ${existingUser.full_name}. Temporary password: ${temporaryPassword}`,
    };
  } catch (error) {
    console.error('Failed to reset password:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset password',
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
      ...(is_active !== undefined && { is_active }),
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
        is_active: true,
        created_at: true,
        updated_at: true,
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
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      invoice_count: user._count.created_invoices,
      last_activity_at: user.audit_history[0]?.created_at || null,
      audit_event_count: user._count.audit_history,
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
        is_active: true,
        created_at: true,
        updated_at: true,
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
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
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
