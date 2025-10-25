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
  is_active?: boolean;
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
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithStats extends UserBasic {
  invoice_count: number;
  last_activity_at: Date | null;
  audit_event_count: number;
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
  | 'profile_access_revoked';

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
// Password Reset Types
// ============================================================================

export interface PasswordResetResult {
  success: boolean;
  temporary_password?: string;
  email_sent: boolean;
  error?: string;
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
