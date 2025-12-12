/**
 * Payment Type Definitions
 *
 * Type-safe contracts for payment CRUD operations.
 *
 * NOTE: Validation schemas (Zod) in lib/validations/payment.ts
 * This file contains only TypeScript types and constants.
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Payment status values
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/**
 * Status display configuration for badges
 */
export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  [PAYMENT_STATUS.PENDING]: {
    label: 'Pending',
    variant: 'outline',
  },
  [PAYMENT_STATUS.APPROVED]: {
    label: 'Approved',
    variant: 'default',
  },
  [PAYMENT_STATUS.REJECTED]: {
    label: 'Rejected',
    variant: 'destructive',
  },
};

// ============================================================================
// DATABASE MODEL TYPES
// ============================================================================

/**
 * Base payment type (from Prisma schema)
 */
export interface Payment {
  id: number;
  invoice_id: number;
  payment_type_id: number | null;
  amount_paid: number;
  payment_date: Date;
  payment_reference: string | null;
  status: PaymentStatus;
  tds_amount_applied: number | null;
  tds_rounded: boolean;
  created_at: Date;
  updated_at: Date;
  // Payment approval workflow fields
  created_by_user_id: number | null;
  approved_by_user_id: number | null;
  approved_at: Date | null;
  rejection_reason: string | null;
}

/**
 * Payment with relations (for detail views)
 */
export interface PaymentWithRelations extends Payment {
  invoice: {
    id: number;
    invoice_number: string;
    invoice_amount: number;
  };
  payment_type: {
    id: number;
    name: string;
    requires_reference: boolean;
  } | null;
  created_by?: {
    id: number;
    full_name: string;
  } | null;
  approved_by?: {
    id: number;
    full_name: string;
  } | null;
}

/**
 * Payment type reference
 */
export interface PaymentType {
  id: number;
  name: string;
  description: string | null;
  requires_reference: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Payment form data type
 * Used for create operations
 *
 * NOTE: Zod validation schemas in lib/validations/payment.ts
 * This type must match the Zod schema inference
 */
export interface PaymentFormData {
  amount_paid: number;
  payment_date: Date; // Required (non-null) for form submission
  payment_type_id: number; // FK to PaymentType master data
  payment_reference?: string | null;
  tds_amount_applied?: number | null;
  tds_rounded?: boolean;
}

/**
 * Payment filters type
 */
export interface PaymentFilters {
  invoice_id?: number;
  status?: PaymentStatus;
  payment_type_id?: number;
  date_from?: Date;
  date_to?: Date;
  page: number;
  per_page: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Payment list response (for a single invoice)
 */
export interface PaymentListResponse {
  payments: PaymentWithRelations[];
  summary: PaymentSummary;
}

/**
 * Payment summary for an invoice
 */
export interface PaymentSummary {
  invoice_id: number;
  invoice_amount: number;
  total_paid: number;
  remaining_balance: number;
  payment_count: number;
  is_fully_paid: boolean;
  is_partially_paid: boolean;
  /** Whether there's a pending payment awaiting approval */
  has_pending_payment: boolean;
}

/**
 * Server action result type
 */
export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
