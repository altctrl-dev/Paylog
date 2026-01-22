/**
 * Credit Note Type Definitions
 *
 * Type-safe contracts for credit note CRUD operations.
 * Credit notes are issued by vendors to reduce invoice amounts.
 */

// ============================================================================
// DATABASE MODEL TYPES
// ============================================================================

/**
 * Base credit note type (from Prisma schema)
 */
export interface CreditNote {
  id: number;
  invoice_id: number;
  credit_note_number: string;
  credit_note_date: Date;
  amount: number;
  reason: string;
  notes: string | null;
  // TDS reversal
  tds_applicable: boolean;
  tds_amount: number | null;
  // File attachment
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  file_mime_type: string | null;
  // Reporting
  reporting_month: Date | null;
  // Audit
  created_by_id: number;
  created_at: Date;
  updated_at: Date;
  // Soft delete
  deleted_at: Date | null;
  deleted_by_id: number | null;
  deleted_reason: string | null;
}

/**
 * Credit note with relations (for display)
 */
export interface CreditNoteWithRelations extends CreditNote {
  invoice: {
    id: number;
    invoice_number: string;
    invoice_name: string | null;
    invoice_amount: number;
    vendor: {
      id: number;
      name: string;
    };
    entity: {
      id: number;
      name: string;
    } | null;
    category: {
      id: number;
      name: string;
    } | null;
    currency: {
      id: number;
      code: string;
      symbol: string;
    } | null;
  };
  created_by: {
    id: number;
    full_name: string;
    email: string;
  };
  deleted_by?: {
    id: number;
    full_name: string;
  } | null;
}

/**
 * Credit note summary for invoice detail views
 */
export interface CreditNoteSummary {
  id: number;
  credit_note_number: string;
  credit_note_date: Date;
  amount: number;
  reason: string;
  tds_applicable: boolean;
  tds_amount: number | null;
  has_file: boolean;
  created_at: Date;
  created_by: {
    id: number;
    full_name: string;
  };
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Credit note form data type
 * Used for create operations
 */
export interface CreditNoteFormData {
  invoice_id: number;
  credit_note_number: string;
  credit_note_date: Date;
  amount: number;
  reason: string;
  notes?: string | null;
  tds_applicable: boolean;
  tds_amount?: number | null;
}

/**
 * Credit note create input (with file)
 */
export interface CreateCreditNoteInput extends CreditNoteFormData {
  file?: File | null;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Credit note list response
 */
export interface CreditNoteListResponse {
  creditNotes: CreditNoteWithRelations[];
  total: number;
}

/**
 * Credit notes total for an invoice
 */
export interface InvoiceCreditNotesTotal {
  totalAmount: number;
  totalTdsReversed: number;
  count: number;
}

/**
 * Server action result type
 */
export type CreditNoteActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
