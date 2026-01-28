/**
 * Monthly Report Type Definitions
 *
 * Type-safe contracts for the Monthly Report System.
 * Supports payment-centric report generation with:
 * - Grouping by payment type (Cash, Bank Transfer, Credit Card, Unpaid)
 * - Advance payments (payments before invoice exists)
 * - Report finalization with snapshot for audit trail
 * - Two views: Submitted (frozen) vs Invoice-Date (live)
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Report period status values
 */
export const REPORT_STATUS = {
  DRAFT: 'draft',
  FINALIZED: 'finalized',
  SUBMITTED: 'submitted',
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

/**
 * Status display configuration for badges
 */
export const REPORT_STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  [REPORT_STATUS.DRAFT]: {
    label: 'Draft',
    variant: 'outline',
  },
  [REPORT_STATUS.FINALIZED]: {
    label: 'Finalized',
    variant: 'secondary',
  },
  [REPORT_STATUS.SUBMITTED]: {
    label: 'Submitted',
    variant: 'default',
  },
};

// ============================================================================
// DATABASE MODEL TYPES
// ============================================================================

/**
 * Report Period (from Prisma schema)
 */
export interface ReportPeriod {
  id: number;
  month: number; // 1-12
  year: number;
  status: ReportStatus;
  finalized_at: Date | null;
  finalized_by_id: number | null;
  submitted_at: Date | null;
  submitted_to: string | null;
  snapshot_data: ReportSnapshot | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Report Period with relations
 */
export interface ReportPeriodWithRelations extends ReportPeriod {
  finalized_by?: {
    id: number;
    full_name: string;
  } | null;
}

/**
 * Advance Payment (from Prisma schema)
 */
export interface AdvancePayment {
  id: number;
  vendor_id: number;
  description: string;
  amount: number;
  payment_type_id: number;
  payment_date: Date;
  payment_reference: string | null;
  reporting_month: Date;
  linked_invoice_id: number | null;
  linked_at: Date | null;
  notes: string | null;
  created_by_id: number | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Advance Payment with relations
 */
export interface AdvancePaymentWithRelations extends AdvancePayment {
  vendor: {
    id: number;
    name: string;
  };
  payment_type: {
    id: number;
    name: string;
    requires_reference: boolean;
  };
  linked_invoice?: {
    id: number;
    invoice_number: string;
    invoice_amount: number;
  } | null;
  created_by?: {
    id: number;
    full_name: string;
  } | null;
}

// ============================================================================
// REPORT SNAPSHOT TYPES
// ============================================================================

/**
 * Entry in a payment type section
 */
export interface ReportEntry {
  serial: number;
  invoice_id: number | null; // null for advance payments
  invoice_number: string | null;
  invoice_name: string;
  vendor_name: string;
  invoice_date: string | null; // ISO date string
  invoice_amount: number; // Negative for credit notes
  payment_amount: number | null;
  payment_date: string | null; // ISO date string
  payment_reference: string | null;
  status: ReportEntryStatus;
  status_percentage: number | null; // e.g., 40 for "PAID (40%)"
  currency_code: string;
  is_advance_payment: boolean;
  advance_payment_id: number | null;
  entry_type: ReportEntryType;
  // Credit note fields
  is_credit_note: boolean;
  credit_note_id: number | null;
  credit_note_number: string | null;
  credit_note_date: string | null; // ISO date string
  /** TDS reversal amount (positive value, represents reduction in TDS liability) */
  tds_reversal_amount: number | null;
  /** For credit notes: the parent invoice number this credit note is against */
  parent_invoice_number: string | null;
  /** For invoices: count of linked credit notes (for showing link icon) */
  linked_credit_note_count: number;
}

/**
 * Entry status for display
 */
export type ReportEntryStatus =
  | 'PAID'
  | 'PAID_PARTIAL' // Shows as "PAID (40%)" - this payment completed the invoice
  | 'PARTIALLY_PAID' // Shows as "PARTIALLY PAID (30%)" - invoice still has balance
  | 'UNPAID'
  | 'ADVANCE'
  | 'CREDIT_NOTE'; // Credit note entry (negative amount)

/**
 * Entry type for categorization
 */
export type ReportEntryType =
  | 'standard' // Normal invoice/payment in its expected month
  | 'late_invoice' // Invoice dated in previous month, received this month
  | 'late_payment' // Payment made after report was finalized
  | 'advance_payment' // Payment without invoice
  | 'credit_note'; // Credit note against an invoice (negative amount)

/**
 * Section in the report (grouped by payment type)
 */
export interface ReportSection {
  payment_type_id: number | null; // null = Unpaid section
  payment_type_name: string;
  entries: ReportEntry[];
  subtotal: number;
  entry_count: number;
}

/**
 * Monthly report data structure
 */
export interface MonthlyReportData {
  month: number;
  year: number;
  label: string; // e.g., "January-2026"
  sections: ReportSection[];
  grand_total: number;
  total_entries: number;
  generated_at: string; // ISO date string
}

/**
 * Frozen snapshot stored in ReportPeriod.snapshot_data
 */
export interface ReportSnapshot {
  version: number; // Schema version for future migrations
  report_data: MonthlyReportData;
  finalized_at: string; // ISO date string
  finalized_by_name: string;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Advance payment form data
 */
export interface AdvancePaymentFormData {
  vendor_id: number;
  description: string;
  amount: number;
  payment_type_id: number;
  payment_date: Date;
  payment_reference?: string | null;
  reporting_month: Date;
  notes?: string | null;
}

/**
 * Link advance payment to invoice form data
 */
export interface LinkAdvancePaymentFormData {
  advance_payment_id: number;
  invoice_id: number;
}

/**
 * Finalize report form data
 */
export interface FinalizeReportFormData {
  month: number;
  year: number;
  notes?: string | null;
}

/**
 * Submit report form data
 */
export interface SubmitReportFormData {
  month: number;
  year: number;
  submitted_to: string; // Email or name of accountant
}

// ============================================================================
// QUERY TYPES
// ============================================================================

/**
 * Monthly report query options
 */
export interface MonthlyReportQuery {
  month: number;
  year: number;
  view: 'live' | 'submitted' | 'invoice_date';
}

/**
 * Advance payments filter
 */
export interface AdvancePaymentFilters {
  vendor_id?: number;
  payment_type_id?: number;
  reporting_month?: Date;
  linked?: boolean; // true = linked, false = unlinked, undefined = all
  page: number;
  per_page: number;
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

/**
 * Monthly report response
 */
export interface MonthlyReportResponse {
  report_period: ReportPeriodWithRelations | null;
  report_data: MonthlyReportData;
  view: 'live' | 'submitted' | 'invoice_date';
}

/**
 * Consolidated report response (experimental)
 * Uses simplified 2-view system: live vs reported
 */
export interface ConsolidatedReportResponse {
  report_period: ReportPeriodWithRelations | null;
  report_data: MonthlyReportData;
  view: 'live' | 'reported';
}

/**
 * Advance payment list response
 */
export interface AdvancePaymentListResponse {
  advance_payments: AdvancePaymentWithRelations[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Get first day of month from month/year
 */
export function getReportingMonth(month: number, year: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * Format month/year for display
 */
export function formatReportPeriod(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Parse reporting month from Date
 */
export function parseReportingMonth(date: Date): { month: number; year: number } {
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

/**
 * Type guard for credit note entries
 */
export function isCreditNoteEntry(entry: ReportEntry): boolean {
  return entry.entry_type === 'credit_note' || entry.is_credit_note === true;
}

/**
 * Type guard for advance payment entries
 */
export function isAdvancePaymentEntry(entry: ReportEntry): boolean {
  return entry.entry_type === 'advance_payment' || entry.is_advance_payment === true;
}
