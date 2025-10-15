/**
 * Bulk Operations Type Definitions
 *
 * Type-safe contracts for bulk invoice operations.
 * Sprint 7: Bulk Operations (Approve, Reject, Export, Delete)
 */

// ============================================================================
// OPERATION TYPES
// ============================================================================

/**
 * Supported bulk operation types
 */
export type BulkOperationType = 'approve' | 'reject' | 'export' | 'delete';

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Bulk operation result
 * Tracks successes and failures
 */
export type BulkOperationResult = {
  successCount: number;
  failedIds: number[];
  errors?: Record<number, string>;
};

/**
 * Validation result for bulk operations
 * Pre-flight check before execution
 */
export type ValidationResult = {
  valid: boolean;
  errors: Array<{
    invoiceId: number;
    invoiceNumber: string;
    reason: string;
  }>;
};

// ============================================================================
// EXPORT CONFIGURATION
// ============================================================================

/**
 * Export column configuration
 */
export type ExportColumn = {
  id: string;
  label: string;
  description: string;
};

/**
 * Available export columns
 */
export const EXPORT_COLUMNS: ExportColumn[] = [
  {
    id: 'invoice_number',
    label: 'Invoice Number',
    description: 'Unique identifier',
  },
  {
    id: 'vendor_name',
    label: 'Vendor Name',
    description: 'Vendor name',
  },
  {
    id: 'category_name',
    label: 'Category',
    description: 'Category name',
  },
  {
    id: 'invoice_amount',
    label: 'Invoice Amount',
    description: 'Total amount',
  },
  {
    id: 'invoice_date',
    label: 'Invoice Date',
    description: 'Invoice date',
  },
  {
    id: 'due_date',
    label: 'Due Date',
    description: 'Payment due date',
  },
  {
    id: 'status',
    label: 'Status',
    description: 'Current status',
  },
  {
    id: 'total_paid',
    label: 'Total Paid',
    description: 'Total amount paid',
  },
  {
    id: 'remaining_balance',
    label: 'Remaining Balance',
    description: 'Amount remaining',
  },
  {
    id: 'created_at',
    label: 'Created Date',
    description: 'Creation date',
  },
  {
    id: 'created_by',
    label: 'Created By',
    description: 'User who created',
  },
  {
    id: 'profile_name',
    label: 'Invoice Profile',
    description: 'Invoice profile name',
  },
  {
    id: 'sub_entity_name',
    label: 'Sub Entity',
    description: 'Division/Department/Branch',
  },
  {
    id: 'notes',
    label: 'Notes',
    description: 'Internal notes',
  },
];

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

/**
 * Export request payload
 */
export type ExportRequest = {
  invoiceIds: number[];
  selectedColumns: string[];
  format?: ExportFormat;
};

// ============================================================================
// SERVER ACTION RESULT
// ============================================================================

/**
 * Server action result type
 */
export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
