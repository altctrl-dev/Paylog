/**
 * Invoice Type Definitions
 *
 * Type-safe contracts for invoice CRUD operations.
 *
 * NOTE: Validation schemas (Zod) moved to lib/validations/invoice.ts
 * This file now contains only TypeScript types and constants.
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Invoice status values
 */
export const INVOICE_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  ON_HOLD: 'on_hold',
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  REJECTED: 'rejected',
} as const;

export type InvoiceStatus =
  (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

/**
 * Status display configuration for badges
 */
export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'info' | 'warning' | 'muted' | 'purple' }
> = {
  [INVOICE_STATUS.PENDING_APPROVAL]: {
    label: 'Pending Approval',
    variant: 'warning',
  },
  [INVOICE_STATUS.ON_HOLD]: {
    label: 'On Hold',
    variant: 'secondary',
  },
  [INVOICE_STATUS.UNPAID]: {
    label: 'Unpaid',
    variant: 'destructive',
  },
  [INVOICE_STATUS.PARTIAL]: {
    label: 'Partially Paid',
    variant: 'info',
  },
  [INVOICE_STATUS.PAID]: {
    label: 'Paid',
    variant: 'success',
  },
  [INVOICE_STATUS.OVERDUE]: {
    label: 'Overdue',
    variant: 'destructive',
  },
  [INVOICE_STATUS.REJECTED]: {
    label: 'Rejected',
    variant: 'destructive',
  },
};

// ============================================================================
// DATABASE MODEL TYPES
// ============================================================================

/**
 * Base invoice type (from Prisma schema)
 */
export interface Invoice {
  id: number;
  invoice_number: string;
  vendor_id: number;
  category_id: number | null;
  invoice_amount: number;
  invoice_date: Date | null;
  invoice_received_date: Date | null;
  period_start: Date | null;
  period_end: Date | null;
  due_date: Date | null;
  tds_applicable: boolean;
  tds_percentage: number | null;
  tds_rounded: boolean;
  notes: string | null;
  description: string | null;
  invoice_name: string | null;
  status: InvoiceStatus;
  hold_reason: string | null;
  hold_by: number | null;
  hold_at: Date | null;
  submission_count: number;
  last_submission_at: Date;
  rejection_reason: string | null;
  rejected_by: number | null;
  rejected_at: Date | null;
  // Archive fields
  is_archived: boolean;
  archived_by: number | null;
  archived_at: Date | null;
  archived_reason: string | null;
  // Type fields
  is_recurring: boolean;
  invoice_profile_id: number | null;
  entity_id: number | null;
  currency_id: number | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  // Pending payment data (stored during invoice creation, processed on approval)
  pending_payment_data: {
    paid_date: string;
    paid_amount: number;
    paid_currency: string | null;
    payment_type_id: number;
    payment_reference: string | null;
  } | null;
}

/**
 * Invoice with relations (for detail views)
 */
export interface InvoiceWithRelations extends Invoice {
  vendor: {
    id: number;
    name: string;
    status: string; // "PENDING_APPROVAL" | "APPROVED" | "REJECTED"
  };
  category: {
    id: number;
    name: string;
  } | null;
  entity: {
    id: number;
    name: string;
  } | null;
  currency: {
    id: number;
    code: string;
    symbol: string;
  } | null;
  invoice_profile: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  creator: {
    id: number;
    full_name: string;
    email: string;
  };
  holder?: {
    id: number;
    full_name: string;
  } | null;
  rejector?: {
    id: number;
    full_name: string;
  } | null;
  archiver?: {
    id: number;
    full_name: string;
  } | null;
  /**
   * Computed fields provided by server actions (optional)
   */
  totalPaid?: number;
  remainingBalance?: number;
  isOverdue?: boolean;
  dueLabel?: string | null;
  daysOverdue?: number;
  daysUntilDue?: number;
  isDueSoon?: boolean;
  priorityRank?: number;
  dueStatusVariant?: 'destructive' | 'warning' | 'muted';
  /** BUG-002: Whether invoice has a pending payment awaiting approval */
  has_pending_payment?: boolean;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Invoice form data type
 * Used for create and update operations
 *
 * NOTE: Zod validation schemas moved to lib/validations/invoice.ts
 * This type must match the Zod schema inference
 */
export interface InvoiceFormData {
  invoice_number: string;
  vendor_id: number;
  category_id: number;
  entity_id: number;
  currency_id: number;
  invoice_amount: number;
  invoice_date: Date;
  invoice_received_date?: Date | null;
  period_start?: Date | null;
  period_end?: Date | null;
  due_date: Date;
  tds_applicable: boolean;
  tds_percentage: number | null;
  tds_rounded?: boolean;
  description?: string | null;
  notes?: string | null;
  is_recurring?: boolean;
  invoice_profile_id?: number | null;
}

/**
 * Hold invoice data type
 *
 * NOTE: Zod validation schema moved to lib/validations/invoice.ts
 */
export interface HoldInvoiceData {
  hold_reason: string;
}

/**
 * Reject invoice data type
 *
 * NOTE: Zod validation schema moved to lib/validations/invoice.ts
 */
export interface RejectInvoiceData {
  rejection_reason: string;
}

/**
 * Invoice list filters type
 *
 * NOTE: Zod validation schema moved to lib/validations/invoice.ts
 */
export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus;
  vendor_id?: number;
  category_id?: number;
  entity_id?: number;
  is_recurring?: boolean;
  tds_applicable?: boolean;
  invoice_profile_id?: number;
  /** Filter invoices by payment type (invoices with at least one approved payment of this type) */
  payment_type_id?: number;
  // Archive filter - when true, shows only archived invoices
  show_archived?: boolean;
  start_date?: Date;
  end_date?: Date;
  sort_by?: 'invoice_date' | 'due_date' | 'invoice_amount' | 'status' | 'created_at' | 'remaining_balance';
  sort_order?: 'asc' | 'desc';
  page: number;
  per_page: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Paginated invoice list response
 */
export interface InvoiceListResponse {
  invoices: InvoiceWithRelations[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Server action result type
 */
export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// INVOICE V2 TYPES (Sprint 13)
// ============================================================================

/**
 * Invoice V2 with all relations (for detail views)
 * Extends Prisma's Invoice model with full relation data
 */
export interface InvoiceV2WithRelations {
  id: number;
  invoice_number: string;
  vendor_id: number;
  category_id: number | null;
  invoice_amount: number;
  invoice_date: Date | null;
  invoice_received_date: Date | null;
  due_date: Date | null;
  period_start: Date | null;
  period_end: Date | null;
  tds_applicable: boolean;
  tds_percentage: number | null;
  tds_rounded: boolean;
  description: string | null;
  invoice_name: string | null;
  notes: string | null;
  status: InvoiceStatus;

  // Entity/Currency fields
  entity_id: number | null;
  currency_id: number | null;
  is_recurring: boolean;
  invoice_profile_id: number | null;

  // Archive fields
  is_archived: boolean;
  archived_by: number | null;
  archived_at: Date | null;
  archived_reason: string | null;

  // Metadata
  created_by: number;
  created_at: Date;
  updated_at: Date;

  // Relations
  vendor: {
    id: number;
    name: string;
    status: string; // "PENDING_APPROVAL" | "APPROVED" | "REJECTED"
  };
  category: {
    id: number;
    name: string;
  } | null;
  entity: {
    id: number;
    name: string;
  } | null;
  currency: {
    id: number;
    code: string;
    symbol: string;
  } | null;
  invoice_profile: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  creator: {
    id: number;
    full_name: string;
    email: string;
  };
  archiver?: {
    id: number;
    full_name: string;
  } | null;
  attachments: Array<{
    id: string;
    file_name: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    uploaded_at: Date;
  }>;
  payments: Array<{
    id: number;
    amount_paid: number;
    payment_date: Date;
    status: string;
    payment_type: {
      id: number;
      name: string;
    } | null;
  }>;
}
