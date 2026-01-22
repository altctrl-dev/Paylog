/**
 * Server Actions: Credit Note CRUD Operations
 *
 * Production-ready server actions with authentication, validation, and error handling.
 * Credit notes reduce invoice amounts and support TDS reversal.
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  type CreditNoteWithRelations,
  type CreditNoteSummary,
  type CreditNoteActionResult,
  type InvoiceCreditNotesTotal,
} from '@/types/credit-note';
import { revalidatePath } from 'next/cache';
import { createActivityLog } from '@/app/actions/activity-log';
import { ACTIVITY_ACTION } from '@/docs/SPRINT7_ACTIVITY_ACTIONS';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const creditNoteFormSchema = z.object({
  credit_note_number: z.string().min(1, 'Credit note number is required'),
  credit_note_date: z.coerce.date(),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional().nullable(),
  tds_applicable: z.boolean().default(false),
  tds_amount: z.number().optional().nullable(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current authenticated user
 * Throws error if not authenticated
 */
async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized: You must be logged in');
  }

  const role = session.user.role as string;

  return {
    id: parseInt(session.user.id),
    email: session.user.email!,
    role,
    isAdmin: role === 'admin' || role === 'super_admin',
  };
}

/**
 * Include relations for credit note queries
 */
const creditNoteInclude = {
  invoice: {
    select: {
      id: true,
      invoice_number: true,
      invoice_name: true,
      invoice_amount: true,
      vendor: {
        select: {
          id: true,
          name: true,
        },
      },
      entity: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      currency: {
        select: {
          id: true,
          code: true,
          symbol: true,
        },
      },
    },
  },
  created_by: {
    select: {
      id: true,
      full_name: true,
      email: true,
    },
  },
  deleted_by: {
    select: {
      id: true,
      full_name: true,
    },
  },
};

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all credit notes for an invoice
 *
 * @param invoiceId - Invoice ID
 * @returns List of credit notes
 */
export async function getCreditNotesByInvoiceId(
  invoiceId: number
): Promise<CreditNoteActionResult<CreditNoteSummary[]>> {
  try {
    await getCurrentUser();

    const creditNotes = await db.creditNote.findMany({
      where: {
        invoice_id: invoiceId,
        deleted_at: null,
      },
      select: {
        id: true,
        credit_note_number: true,
        credit_note_date: true,
        amount: true,
        reason: true,
        tds_applicable: true,
        tds_amount: true,
        file_name: true,
        created_at: true,
        created_by: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
      orderBy: {
        credit_note_date: 'desc',
      },
    });

    const summaries: CreditNoteSummary[] = creditNotes.map((cn) => ({
      id: cn.id,
      credit_note_number: cn.credit_note_number,
      credit_note_date: cn.credit_note_date,
      amount: cn.amount,
      reason: cn.reason,
      tds_applicable: cn.tds_applicable,
      tds_amount: cn.tds_amount,
      has_file: !!cn.file_name,
      created_at: cn.created_at,
      created_by: cn.created_by,
    }));

    return {
      success: true,
      data: summaries,
    };
  } catch (error) {
    console.error('getCreditNotesByInvoiceId error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch credit notes',
    };
  }
}

/**
 * Get credit note totals for an invoice
 *
 * @param invoiceId - Invoice ID
 * @returns Credit note totals
 */
export async function getCreditNotesTotalForInvoice(
  invoiceId: number
): Promise<CreditNoteActionResult<InvoiceCreditNotesTotal>> {
  try {
    await getCurrentUser();

    const aggregation = await db.creditNote.aggregate({
      where: {
        invoice_id: invoiceId,
        deleted_at: null,
      },
      _sum: {
        amount: true,
        tds_amount: true,
      },
      _count: true,
    });

    return {
      success: true,
      data: {
        totalAmount: aggregation._sum.amount || 0,
        totalTdsReversed: aggregation._sum.tds_amount || 0,
        count: aggregation._count,
      },
    };
  } catch (error) {
    console.error('getCreditNotesTotalForInvoice error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to calculate credit note totals',
    };
  }
}

/**
 * Get single credit note by ID
 *
 * @param id - Credit note ID
 * @returns Credit note with relations
 */
export async function getCreditNoteById(
  id: number
): Promise<CreditNoteActionResult<CreditNoteWithRelations>> {
  try {
    await getCurrentUser();

    const creditNote = await db.creditNote.findUnique({
      where: { id },
      include: creditNoteInclude,
    });

    if (!creditNote) {
      return {
        success: false,
        error: 'Credit note not found',
      };
    }

    return {
      success: true,
      data: creditNote as CreditNoteWithRelations,
    };
  } catch (error) {
    console.error('getCreditNoteById error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch credit note',
    };
  }
}

// ============================================================================
// CREATE OPERATION
// ============================================================================

/**
 * Create a new credit note for an invoice
 *
 * @param invoiceId - Invoice ID
 * @param data - Credit note form data
 * @returns Created credit note
 */
export async function createCreditNote(
  invoiceId: number,
  data: unknown
): Promise<CreditNoteActionResult<CreditNoteWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    // Validate input
    const validated = creditNoteFormSchema.parse(data);

    // Get invoice to validate it exists and get reporting context
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoice_number: true,
        invoice_amount: true,
        is_archived: true,
        status: true,
        tds_applicable: true,
        tds_percentage: true,
        reporting_month: true,
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (invoice.is_archived) {
      return {
        success: false,
        error: 'Cannot add credit note to archived invoice',
      };
    }

    // Warn if credit note amount exceeds invoice amount (but allow it)
    if (validated.amount > invoice.invoice_amount) {
      console.warn(
        `Credit note amount (${validated.amount}) exceeds invoice amount (${invoice.invoice_amount}) for invoice ${invoiceId}`
      );
    }

    // TDS validation: if invoice has TDS, credit note can include TDS reversal
    if (validated.tds_applicable && !invoice.tds_applicable) {
      return {
        success: false,
        error:
          'Cannot apply TDS reversal to credit note when invoice does not have TDS',
      };
    }

    // Create credit note
    const creditNote = await db.creditNote.create({
      data: {
        invoice_id: invoiceId,
        credit_note_number: validated.credit_note_number,
        credit_note_date: validated.credit_note_date,
        amount: validated.amount,
        reason: validated.reason,
        notes: validated.notes || null,
        tds_applicable: validated.tds_applicable,
        tds_amount: validated.tds_applicable ? validated.tds_amount : null,
        reporting_month: invoice.reporting_month,
        created_by_id: currentUser.id,
      },
      include: creditNoteInclude,
    });

    // Log activity
    await createActivityLog({
      invoice_id: invoiceId,
      user_id: currentUser.id,
      action: ACTIVITY_ACTION.CREDIT_NOTE_ADDED || 'credit_note_added',
      new_data: {
        credit_note_id: creditNote.id,
        credit_note_number: validated.credit_note_number,
        amount: validated.amount,
        tds_amount: validated.tds_applicable ? validated.tds_amount : null,
      },
    });

    // Revalidate paths
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);

    return {
      success: true,
      data: creditNote as CreditNoteWithRelations,
    };
  } catch (error) {
    console.error('createCreditNote error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create credit note',
    };
  }
}

// ============================================================================
// DELETE OPERATION
// ============================================================================

/**
 * Soft delete a credit note
 *
 * @param id - Credit note ID
 * @param reason - Deletion reason
 * @returns Deleted credit note
 */
export async function deleteCreditNote(
  id: number,
  reason?: string
): Promise<CreditNoteActionResult<CreditNoteWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    // Only admins can delete credit notes
    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can delete credit notes',
      };
    }

    // Get credit note with invoice for activity log
    const creditNote = await db.creditNote.findUnique({
      where: { id },
      include: {
        invoice: {
          select: {
            id: true,
            invoice_number: true,
          },
        },
      },
    });

    if (!creditNote) {
      return {
        success: false,
        error: 'Credit note not found',
      };
    }

    if (creditNote.deleted_at) {
      return {
        success: false,
        error: 'Credit note is already deleted',
      };
    }

    // Soft delete
    const deletedCreditNote = await db.creditNote.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by_id: currentUser.id,
        deleted_reason: reason || null,
      },
      include: creditNoteInclude,
    });

    // Log activity
    await createActivityLog({
      invoice_id: creditNote.invoice.id,
      user_id: currentUser.id,
      action: ACTIVITY_ACTION.CREDIT_NOTE_DELETED || 'credit_note_deleted',
      old_data: {
        credit_note_id: id,
        credit_note_number: creditNote.credit_note_number,
        amount: creditNote.amount,
      },
      new_data: {
        deleted_reason: reason || null,
      },
    });

    // Revalidate paths
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${creditNote.invoice.id}`);

    return {
      success: true,
      data: deletedCreditNote as CreditNoteWithRelations,
    };
  } catch (error) {
    console.error('deleteCreditNote error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete credit note',
    };
  }
}
