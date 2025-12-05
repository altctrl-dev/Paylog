/**
 * Ledger Types
 *
 * Type definitions for the Invoice Profile Ledger feature.
 * Used to display transaction history per invoice profile.
 */

// ============================================================================
// LEDGER ENTRY TYPES
// ============================================================================

/**
 * Type of ledger entry
 */
export const LEDGER_ENTRY_TYPE = {
  INVOICE: 'invoice',
  PAYMENT: 'payment',
} as const;

export type LedgerEntryType =
  (typeof LEDGER_ENTRY_TYPE)[keyof typeof LEDGER_ENTRY_TYPE];

/**
 * Single ledger entry (either an invoice or a payment)
 */
export interface LedgerEntry {
  /** Unique identifier (invoice_id or payment_id with prefix) */
  id: string;
  /** Type of entry */
  type: LedgerEntryType;
  /** Date of the transaction */
  date: Date;
  /** Description (invoice number or payment method) */
  description: string;
  /** Related invoice number */
  invoiceNumber: string;
  /** Related invoice ID */
  invoiceId: number;

  // Invoice-specific fields (null for payment entries)
  /** Original invoice amount */
  invoiceAmount: number | null;
  /** TDS percentage applied */
  tdsPercentage: number | null;
  /** Whether TDS is applicable */
  tdsApplicable: boolean;
  /** Payable amount (invoice amount - TDS) */
  payableAmount: number | null;

  // Payment-specific fields (null for invoice entries)
  /** Amount paid in this payment */
  paidAmount: number | null;
  /** TDS amount deducted at payment time */
  tdsAmountApplied: number | null;
  /** Whether TDS was rounded (ceiling) */
  tdsRounded: boolean;
  /** Payment reference / transaction number */
  transactionRef: string | null;
  /** Payment method */
  paymentMethod: string | null;

  /** Running balance after this entry */
  runningBalance: number;
}

// ============================================================================
// LEDGER SUMMARY TYPES
// ============================================================================

/**
 * Summary statistics for a profile's ledger
 */
export interface LedgerSummary {
  /** Invoice profile ID */
  profileId: number;
  /** Profile name */
  profileName: string;
  /** Vendor name */
  vendorName: string;
  /** Entity name */
  entityName: string;

  // Totals
  /** Total invoice amount (sum of all invoices) */
  totalInvoiced: number;
  /** Total TDS deducted (sum of tds_amount_applied from payments) */
  totalTdsDeducted: number;
  /** Total payable (total invoiced - total TDS) */
  totalPayable: number;
  /** Total paid (sum of all payments) */
  totalPaid: number;
  /** Outstanding balance (total payable - total paid) */
  outstandingBalance: number;

  // Counts
  /** Number of invoices */
  invoiceCount: number;
  /** Number of payments */
  paymentCount: number;
  /** Number of unpaid invoices */
  unpaidInvoiceCount: number;
  /** Number of overdue invoices */
  overdueInvoiceCount: number;
}

// ============================================================================
// LEDGER VIEW TYPES
// ============================================================================

/**
 * View mode for the ledger
 */
export const LEDGER_VIEW_MODE = {
  TABLE: 'table',
  TIMELINE: 'timeline',
} as const;

export type LedgerViewMode =
  (typeof LEDGER_VIEW_MODE)[keyof typeof LEDGER_VIEW_MODE];

/**
 * Ledger filter options
 */
export interface LedgerFilters {
  /** Invoice profile ID to filter by */
  profileId: number;
  /** Start date for filtering entries */
  startDate?: Date;
  /** End date for filtering entries */
  endDate?: Date;
  /** Show only entries of this type */
  entryType?: LedgerEntryType;
  /** Search term for invoice number or transaction ref */
  search?: string;
}

// ============================================================================
// LEDGER RESPONSE TYPES
// ============================================================================

/**
 * Response from getLedgerByProfile
 */
export interface LedgerResponse {
  /** List of ledger entries, sorted by date ascending */
  entries: LedgerEntry[];
  /** Summary statistics */
  summary: LedgerSummary;
  /** Applied filters */
  filters: LedgerFilters;
}

/**
 * Profile option for dropdown
 */
export interface LedgerProfileOption {
  id: number;
  name: string;
  vendorName: string;
  entityName: string;
  hasUnpaidInvoices: boolean;
  unpaidCount: number;
  totalOutstanding: number;
}
