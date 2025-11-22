/**
 * Vendor Type Definitions
 *
 * Type-safe contracts for vendor operations with approval workflow.
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Vendor status values
 */
export const VENDOR_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type VendorStatus = (typeof VENDOR_STATUS)[keyof typeof VENDOR_STATUS];

/**
 * Status display configuration for badges
 */
export const VENDOR_STATUS_CONFIG: Record<
  VendorStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  [VENDOR_STATUS.PENDING_APPROVAL]: {
    label: 'Pending Approval',
    variant: 'outline',
  },
  [VENDOR_STATUS.APPROVED]: {
    label: 'Approved',
    variant: 'default',
  },
  [VENDOR_STATUS.REJECTED]: {
    label: 'Rejected',
    variant: 'destructive',
  },
};

// ============================================================================
// DATABASE MODEL TYPES
// ============================================================================

/**
 * Base vendor type (from Prisma schema)
 */
export interface Vendor {
  id: number;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  address: string | null;
  gst_exemption: boolean;
  bank_details: string | null;
  // Approval workflow fields
  status: VendorStatus;
  created_by_user_id: number | null;
  approved_by_user_id: number | null;
  approved_at: Date | null;
  rejected_reason: string | null;
  deleted_at: Date | null;
}

/**
 * Vendor with relations (for detail views)
 */
export interface VendorWithRelations extends Vendor {
  created_by: {
    id: number;
    full_name: string;
    email: string;
  } | null;
  approved_by: {
    id: number;
    full_name: string;
    email: string;
  } | null;
  invoiceCount?: number;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Vendor form data type (matches Zod schema)
 */
export interface VendorFormData {
  name: string;
  address?: string;
  gst_exemption: boolean;
  bank_details?: string;
}

/**
 * Vendor approval data type
 */
export interface VendorApprovalData {
  vendor_id: number;
  approved_by_user_id: number;
  admin_notes?: string;
}

/**
 * Vendor rejection data type
 */
export interface VendorRejectionData {
  vendor_id: number;
  rejected_reason: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Server action result type
 */
export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
