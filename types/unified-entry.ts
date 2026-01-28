/**
 * Unified Entry Type Definitions
 *
 * Supports displaying Invoices, Credit Notes, and Advance Payments
 * in a single table with proper type discrimination.
 */

// Entry type discriminator
export type EntryType = 'invoice' | 'credit_note' | 'advance_payment';

// Base fields common to all entry types
interface BaseEntry {
  id: number;
  entry_type: EntryType;
  // Display fields
  reference_number: string; // invoice_number, credit_note_number, or "ADV-{id}"
  name: string; // invoice_name, reason, or description
  vendor_name: string;
  vendor_id: number;
  amount: number; // Negative for credit notes
  date: Date; // invoice_date, credit_note_date, or payment_date
  status: string;
  // Audit fields
  created_at: Date;
  created_by_name: string | null;
  // Linking
  linked_invoice_id: number | null;
  linked_invoice_number: string | null;
  linked_credit_note_count: number;
}

// Invoice-specific entry
export interface InvoiceEntry extends BaseEntry {
  entry_type: 'invoice';
  invoice_id: number;
  currency_code: string;
  entity_name: string | null;
  category_name: string | null;
  due_date: Date | null;
  is_recurring: boolean;
  invoice_pending: boolean;
  tds_applicable: boolean;
  tds_percentage: number | null;
  // Invoice-specific status values
  status:
    | 'pending_approval'
    | 'approved'
    | 'rejected'
    | 'on_hold'
    | 'paid'
    | 'partially_paid';
}

// Credit Note-specific entry
export interface CreditNoteEntry extends BaseEntry {
  entry_type: 'credit_note';
  credit_note_id: number;
  currency_code: string;
  tds_applicable: boolean;
  tds_amount: number | null;
  reason: string;
  parent_invoice_number: string;
  parent_invoice_id: number;
  // Credit note status values
  status: 'pending_approval' | 'approved' | 'rejected';
  approved_by_name: string | null;
  approved_at: Date | null;
}

// Advance Payment-specific entry
export interface AdvancePaymentEntry extends BaseEntry {
  entry_type: 'advance_payment';
  advance_payment_id: number;
  payment_type_name: string;
  payment_reference: string | null;
  description: string;
  // Advance payment status values
  status: 'pending_approval' | 'approved' | 'rejected';
  approved_by_name: string | null;
  approved_at: Date | null;
}

// Discriminated union
export type UnifiedEntry = InvoiceEntry | CreditNoteEntry | AdvancePaymentEntry;

// Type guards
export function isInvoiceEntry(entry: UnifiedEntry): entry is InvoiceEntry {
  return entry.entry_type === 'invoice';
}

export function isCreditNoteEntry(entry: UnifiedEntry): entry is CreditNoteEntry {
  return entry.entry_type === 'credit_note';
}

export function isAdvancePaymentEntry(
  entry: UnifiedEntry
): entry is AdvancePaymentEntry {
  return entry.entry_type === 'advance_payment';
}

// Pending action statuses for each entry type
export const PENDING_ACTION_STATUSES = {
  invoice: ['pending_approval', 'unpaid', 'partial', 'overdue', 'on_hold'],
  credit_note: ['pending_approval'],
  advance_payment: ['pending_approval'],
} as const;

// Filter options for unified entries
export interface UnifiedEntryFilters {
  entry_types?: EntryType[];
  status?: string[];
  /** When true, filters by pending action statuses (different per entry type) */
  pending_actions?: boolean;
  vendor_id?: number;
  category_id?: number;
  entity_id?: number;
  is_recurring?: boolean;
  tds_applicable?: boolean;
  show_archived?: boolean;
  date_from?: Date;
  date_to?: Date;
  search?: string; // Search in reference_number and name
  page: number;
  per_page: number;
}

// Response type
export interface UnifiedEntryListResponse {
  entries: UnifiedEntry[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  // Counts by type for filter badges
  counts: {
    invoice: number;
    credit_note: number;
    advance_payment: number;
  };
}
