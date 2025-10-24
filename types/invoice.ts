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
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'info' | 'warning' | 'muted' }
> = {
  [INVOICE_STATUS.PENDING_APPROVAL]: {
    label: 'Pending Approval',
    variant: 'outline',
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
  profile_id: number | null;
  sub_entity_id: number | null;
  invoice_amount: number;
  invoice_date: Date | null;
  period_start: Date | null;
  period_end: Date | null;
  due_date: Date | null;
  tds_applicable: boolean;
  tds_percentage: number | null;
  notes: string | null;
  status: InvoiceStatus;
  hold_reason: string | null;
  hold_by: number | null;
  hold_at: Date | null;
  submission_count: number;
  last_submission_at: Date;
  rejection_reason: string | null;
  rejected_by: number | null;
  rejected_at: Date | null;
  is_hidden: boolean;
  hidden_by: number | null;
  hidden_at: Date | null;
  hidden_reason: string | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Invoice with relations (for detail views)
 */
export interface InvoiceWithRelations extends Invoice {
  vendor: {
    id: number;
    name: string;
  };
  category: {
    id: number;
    name: string;
  } | null;
  profile: {
    id: number;
    name: string;
  } | null;
  sub_entity: {
    id: number;
    name: string;
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
  profile_id: number;
  sub_entity_id: number;
  // NEW: Sprint 9A fields (optional for now, will be required in Sprint 9C)
  entity_id?: number;
  currency_id?: number;
  invoice_amount: number;
  // Date fields: Required (non-null) for form submission
  // PHASE 3.5: period_start and period_end are now optional
  invoice_date: Date;
  period_start: Date | null;
  period_end: Date | null;
  due_date: Date;
  tds_applicable: boolean;
  tds_percentage: number | null;
  notes?: string | null;
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
  profile_id?: number;
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
