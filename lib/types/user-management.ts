/**
 * User Management Types & Contracts
 * Sprint 11: User Management & RBAC
 */

// ============================================================================
// User Role Enum
// ============================================================================

export type UserRole = 'standard_user' | 'admin' | 'super_admin';

export const USER_ROLES: Record<UserRole, string> = {
  standard_user: 'Standard User',
  admin: 'Admin',
  super_admin: 'Super Admin',
} as const;

// ============================================================================
// User Status Enum (Unified status system)
// ============================================================================

export type UserStatus = 'pending' | 'active' | 'deactivated' | 'deleted';

export const USER_STATUSES: Record<UserStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  deactivated: 'Deactivated',
  deleted: 'Deleted',
} as const;

export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  deactivated: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
} as const;

// ============================================================================
// User CRUD Input Types
// ============================================================================

export interface UserCreateInput {
  email: string;
  full_name: string;
  role: UserRole;
  password?: string; // Optional - will be generated if not provided
}

export interface UserUpdateInput {
  email?: string;
  full_name?: string;
  role?: UserRole;
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus | UserStatus[]; // Filter by one or more statuses
  is_active?: boolean; // DEPRECATED: Use status instead
  sortBy?: 'full_name' | 'email' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// User Response Types
// ============================================================================

export interface UserBasic {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  is_active: boolean; // DEPRECATED: Use status instead
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  // Invite fields (for pending users)
  invite_token?: string | null;
  invite_expires_at?: Date | null;
  invited_by_id?: number | null;
}

export interface UserWithStats extends UserBasic {
  invoice_count: number;
  last_activity_at: Date | null;
  audit_event_count: number;
  // For pending users: show who invited them
  invited_by_name?: string | null;
}

export interface UserDetailed extends UserBasic {
  created_invoices_count: number;
  comments_count: number;
  attachments_count: number;
  profile_visibilities_count: number;
  last_login_at: Date | null;
  audit_history: UserAuditEvent[];
}

export interface UserListResponse {
  users: UserWithStats[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Audit Event Types
// ============================================================================

export type UserAuditEventType =
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'user_reactivated'
  | 'user_role_changed'
  | 'user_password_reset'
  | 'user_email_changed'
  | 'profile_access_granted'
  | 'profile_access_revoked'
  | 'user_invited'
  | 'user_invite_accepted'
  | 'user_invite_resent'
  | 'user_soft_deleted'
  | 'user_restored'
  | 'user_hard_deleted';

export const USER_AUDIT_EVENT_LABELS: Record<UserAuditEventType, string> = {
  user_created: 'User Created',
  user_updated: 'User Updated',
  user_deactivated: 'User Deactivated',
  user_reactivated: 'User Reactivated',
  user_role_changed: 'Role Changed',
  user_password_reset: 'Password Reset',
  user_email_changed: 'Email Changed',
  profile_access_granted: 'Profile Access Granted',
  profile_access_revoked: 'Profile Access Revoked',
  user_invited: 'User Invited',
  user_invite_accepted: 'Invite Accepted',
  user_invite_resent: 'Invite Resent',
  user_soft_deleted: 'User Soft Deleted',
  user_restored: 'User Restored',
  user_hard_deleted: 'User Permanently Deleted',
} as const;

export interface UserAuditEvent {
  id: string;
  target_user_id: number;
  actor_user_id: number | null;
  event_type: UserAuditEventType;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  actor?: {
    id: number;
    full_name: string;
    email: string;
  };
  target_user?: {
    id: number;
    full_name: string;
    email: string;
  };
}

// ============================================================================
// Profile Visibility Types
// ============================================================================

export interface ProfileAccessGrant {
  profile_id: number;
  user_id: number;
  granted_by: number;
}

export interface ProfileAccessRevoke {
  profile_id: number;
  user_id: number;
}

export interface UserProfileAccess {
  id: number;
  user_id: number;
  profile_id: number;
  granted_by: number;
  granted_at: Date;
  user: {
    id: number;
    full_name: string;
    email: string;
    role: UserRole;
  };
  granter: {
    id: number;
    full_name: string;
    email: string;
  };
}

// ============================================================================
// Permission Check Types
// ============================================================================

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface RoleChangeValidation {
  can_change: boolean;
  is_last_super_admin: boolean;
  reason?: string;
}

// ============================================================================
// Server Action Return Types
// ============================================================================

export interface ActionSuccess<T = void> {
  success: true;
  data: T;
  message?: string;
}

export interface ActionError {
  success: false;
  error: string;
  code?: string;
}

export type ActionResult<T = void> = ActionSuccess<T> | ActionError;
