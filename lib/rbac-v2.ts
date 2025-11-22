/**
 * RBAC Helpers for Invoice V2 System (Sprint 13)
 *
 * Role-Based Access Control utilities for invoice creation and management.
 * Handles permission checks and status determination.
 */

import { INVOICE_STATUS } from '@/types/invoice';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User object (minimal interface for RBAC)
 */
export interface User {
  id: number;
  email: string;
  role: string;
  is_active?: boolean;
}

/**
 * Invoice profile with visibility data
 */
export interface InvoiceProfile {
  id: number;
  name: string;
  visible_to_all: boolean;
  visibilities?: Array<{
    user_id: number;
  }>;
}

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

/**
 * Check if user can create invoices
 *
 * All active users (STANDARD, ADMIN, SUPER_ADMIN) can create invoices.
 *
 * @param user - User object
 * @returns true if user can create invoices
 */
export function canCreateInvoice(user: User): boolean {
  // Check if user is active
  if (user.is_active === false) {
    return false;
  }

  // All active users can create invoices
  const allowedRoles = ['standard_user', 'admin', 'super_admin'];
  return allowedRoles.includes(user.role.toLowerCase());
}

/**
 * Check if user can approve invoices
 *
 * Only ADMIN and SUPER_ADMIN can approve invoices.
 *
 * @param user - User object
 * @returns true if user can approve invoices
 */
export function canApproveInvoice(user: User): boolean {
  const role = user.role.toLowerCase();
  return role === 'admin' || role === 'super_admin';
}

/**
 * Check if user can edit invoices
 *
 * Users can edit invoices if:
 * - They are the creator (for pending_approval status)
 * - They are an admin (for any status except paid/rejected)
 *
 * @param user - User object
 * @param invoice - Invoice object with creator info
 * @returns true if user can edit invoice
 */
export function canEditInvoice(
  user: User,
  invoice: { created_by: number; status: string }
): boolean {
  // Check if user is active
  if (user.is_active === false) {
    return false;
  }

  // Cannot edit paid or rejected invoices
  if (invoice.status === INVOICE_STATUS.PAID || invoice.status === INVOICE_STATUS.REJECTED) {
    return false;
  }

  // Admins can edit any non-final invoice
  if (canApproveInvoice(user)) {
    return true;
  }

  // Creators can edit their own pending_approval invoices
  if (
    invoice.created_by === user.id &&
    invoice.status === INVOICE_STATUS.PENDING_APPROVAL
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user can delete invoices
 *
 * Users can delete invoices if:
 * - They are the creator (for pending_approval status)
 * - They are an admin (for any status except paid)
 *
 * @param user - User object
 * @param invoice - Invoice object with creator info
 * @returns true if user can delete invoice
 */
export function canDeleteInvoice(
  user: User,
  invoice: { created_by: number; status: string }
): boolean {
  // Check if user is active
  if (user.is_active === false) {
    return false;
  }

  // Cannot delete paid invoices (use soft delete/hide instead)
  if (invoice.status === INVOICE_STATUS.PAID) {
    return false;
  }

  // Admins can delete any non-paid invoice
  if (canApproveInvoice(user)) {
    return true;
  }

  // Creators can delete their own pending_approval invoices
  if (
    invoice.created_by === user.id &&
    invoice.status === INVOICE_STATUS.PENDING_APPROVAL
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user has access to invoice profile
 *
 * Users have access if:
 * - They are an admin (access to all profiles)
 * - Profile is visible to all
 * - They have explicit visibility grant
 *
 * @param user - User object
 * @param profile - Invoice profile with visibility data
 * @returns true if user has access to profile
 */
export function hasProfileAccess(user: User, profile: InvoiceProfile): boolean {
  // Admins have access to all profiles
  if (canApproveInvoice(user)) {
    return true;
  }

  // Check if profile is visible to all
  if (profile.visible_to_all) {
    return true;
  }

  // Check if user has explicit visibility grant
  if (profile.visibilities) {
    return profile.visibilities.some((v) => v.user_id === user.id);
  }

  return false;
}

// ============================================================================
// STATUS DETERMINATION
// ============================================================================

/**
 * Get initial invoice status based on user role
 *
 * Standard users: pending_approval (requires admin approval)
 * Admins: unpaid (skip approval workflow)
 *
 * @param user - User object
 * @returns Initial invoice status
 */
export function getInvoiceCreationStatus(user: User): string {
  if (canApproveInvoice(user)) {
    // Admins skip approval workflow
    return INVOICE_STATUS.UNPAID;
  }

  // Standard users need approval
  return INVOICE_STATUS.PENDING_APPROVAL;
}

/**
 * Get next status after invoice edit
 *
 * Standard users editing approved invoices → re-approval required
 * Admins editing invoices → keep existing status
 *
 * @param user - User object
 * @param currentStatus - Current invoice status
 * @returns Next invoice status
 */
export function getInvoiceEditStatus(user: User, currentStatus: string): string {
  // Admins keep existing status
  if (canApproveInvoice(user)) {
    return currentStatus;
  }

  // Standard users editing approved invoices → re-approval
  if (currentStatus !== INVOICE_STATUS.PENDING_APPROVAL) {
    return INVOICE_STATUS.PENDING_APPROVAL;
  }

  // Keep pending_approval status
  return currentStatus;
}

// ============================================================================
// FILTER HELPERS
// ============================================================================

/**
 * Filter invoice profiles by user permission
 *
 * Returns only profiles the user has access to.
 *
 * @param profiles - List of invoice profiles
 * @param user - User object
 * @returns Filtered list of profiles
 */
export function filterInvoiceProfilesByPermission(
  profiles: InvoiceProfile[],
  user: User
): InvoiceProfile[] {
  // Admins see all profiles
  if (canApproveInvoice(user)) {
    return profiles;
  }

  // Filter profiles by visibility
  return profiles.filter((profile) => hasProfileAccess(user, profile));
}

// ============================================================================
// PERMISSION MESSAGES
// ============================================================================

/**
 * Get permission denied message for invoice creation
 *
 * @param user - User object
 * @returns Error message or null if allowed
 */
export function getInvoiceCreationDeniedMessage(user: User): string | null {
  if (!canCreateInvoice(user)) {
    if (user.is_active === false) {
      return 'Your account is inactive. Please contact an administrator.';
    }
    return 'You do not have permission to create invoices.';
  }
  return null;
}

/**
 * Get permission denied message for invoice approval
 *
 * @param user - User object
 * @returns Error message or null if allowed
 */
export function getInvoiceApprovalDeniedMessage(user: User): string | null {
  if (!canApproveInvoice(user)) {
    return 'Only administrators can approve invoices.';
  }
  return null;
}

/**
 * Get permission denied message for invoice edit
 *
 * @param user - User object
 * @param invoice - Invoice object
 * @returns Error message or null if allowed
 */
export function getInvoiceEditDeniedMessage(
  user: User,
  invoice: { created_by: number; status: string }
): string | null {
  if (!canEditInvoice(user, invoice)) {
    if (invoice.status === INVOICE_STATUS.PAID) {
      return 'Cannot edit paid invoices.';
    }
    if (invoice.status === INVOICE_STATUS.REJECTED) {
      return 'Cannot edit rejected invoices.';
    }
    if (invoice.created_by !== user.id) {
      return 'You can only edit invoices you created.';
    }
    return 'You do not have permission to edit this invoice.';
  }
  return null;
}

// ============================================================================
// ROLE CHECKS
// ============================================================================

/**
 * Check if role is admin or super admin
 *
 * @param role - User role string
 * @returns true if admin or super admin
 */
export function isAdminRole(role: string): boolean {
  const normalized = role.toLowerCase();
  return normalized === 'admin' || normalized === 'super_admin';
}

/**
 * Check if role is standard user
 *
 * @param role - User role string
 * @returns true if standard user
 */
export function isStandardUserRole(role: string): boolean {
  return role.toLowerCase() === 'standard_user';
}

/**
 * Check if role is super admin
 *
 * @param role - User role string
 * @returns true if super admin
 */
export function isSuperAdminRole(role: string): boolean {
  return role.toLowerCase() === 'super_admin';
}

// ============================================================================
// VENDOR RBAC FUNCTIONS
// ============================================================================

/**
 * Check if user can create vendors
 *
 * After vendor approval workflow: ALL authenticated users can create vendors.
 * Standard users create pending vendors, admins create approved vendors.
 *
 * @param user - User object
 * @returns true if user can create vendors
 */
export function canCreateVendor(user: User): boolean {
  // All authenticated active users can create vendors
  if (user.is_active === false) {
    return false;
  }

  const allowedRoles = ['standard_user', 'admin', 'super_admin'];
  return allowedRoles.includes(user.role.toLowerCase());
}

/**
 * Check if user can approve vendors
 *
 * Only admins can approve pending vendors.
 *
 * @param user - User object
 * @returns true if user can approve vendors
 */
export function canApproveVendor(user: User): boolean {
  const role = user.role.toLowerCase();
  return role === 'admin' || role === 'super_admin';
}

/**
 * Check if user can reject vendors
 *
 * Only admins can reject pending vendors.
 *
 * @param user - User object
 * @returns true if user can reject vendors
 */
export function canRejectVendor(user: User): boolean {
  const role = user.role.toLowerCase();
  return role === 'admin' || role === 'super_admin';
}

/**
 * Check if user can edit a pending vendor
 *
 * Q2: B - Block edits on pending vendors until approved.
 *
 * @param user - User object
 * @param vendor - Vendor object with status
 * @returns true if user can edit vendor
 */
export function canEditPendingVendor(user: User, vendor: { status: string }): boolean {
  // Admins can always edit
  if (canApproveVendor(user)) {
    return true;
  }

  // Standard users cannot edit pending vendors
  return vendor.status !== 'PENDING_APPROVAL';
}

/**
 * Check if user can delete vendor
 *
 * Only admins can delete vendors (soft delete).
 * Q7: A - Soft delete using deleted_at field.
 *
 * @param user - User object
 * @returns true if user can delete vendor
 */
export function canDeleteVendor(user: User): boolean {
  return canApproveVendor(user);
}

/**
 * Get vendor creation status based on user role
 *
 * Q5: Admin-created vendors auto-approved, standard users create pending.
 *
 * @param user - User object
 * @returns Initial vendor status
 */
export function getVendorCreationStatus(user: User): 'APPROVED' | 'PENDING_APPROVAL' {
  if (canApproveVendor(user)) {
    // Admins create approved vendors
    return 'APPROVED';
  }

  // Standard users create pending vendors
  return 'PENDING_APPROVAL';
}
