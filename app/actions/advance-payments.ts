/**
 * Server Actions: Advance Payments
 *
 * CRUD operations for advance payments (payments made before invoice exists).
 * Supports:
 * - Creating advance payment entries
 * - Linking advance payments to invoices when they arrive
 * - Listing and filtering advance payments
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import {
  type ServerActionResult,
  type AdvancePaymentWithRelations,
  type AdvancePaymentFormData,
  type AdvancePaymentListResponse,
  type AdvancePaymentFilters,
} from '@/types/monthly-report';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current authenticated user
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
 * Include relations for advance payment queries
 */
const advancePaymentInclude = {
  vendor: {
    select: { id: true, name: true },
  },
  payment_type: {
    select: { id: true, name: true, requires_reference: true },
  },
  linked_invoice: {
    select: { id: true, invoice_number: true, invoice_amount: true },
  },
  created_by: {
    select: { id: true, full_name: true },
  },
};

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create a new advance payment
 *
 * @param data - Advance payment form data
 */
export async function createAdvancePayment(
  data: AdvancePaymentFormData
): Promise<ServerActionResult<AdvancePaymentWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    // Validate vendor exists
    const vendor = await db.vendor.findUnique({
      where: { id: data.vendor_id },
    });

    if (!vendor) {
      return {
        success: false,
        error: 'Vendor not found',
      };
    }

    // Validate payment type exists
    const paymentType = await db.paymentType.findUnique({
      where: { id: data.payment_type_id },
    });

    if (!paymentType) {
      return {
        success: false,
        error: 'Payment type not found',
      };
    }

    // Validate amount is positive
    if (data.amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0',
      };
    }

    // Ensure reporting_month is first of month
    const reportingMonth = new Date(data.reporting_month);
    reportingMonth.setDate(1);
    reportingMonth.setHours(0, 0, 0, 0);

    const advancePayment = await db.advancePayment.create({
      data: {
        vendor_id: data.vendor_id,
        description: data.description,
        amount: data.amount,
        payment_type_id: data.payment_type_id,
        payment_date: data.payment_date,
        payment_reference: data.payment_reference || null,
        reporting_month: reportingMonth,
        notes: data.notes || null,
        created_by_id: currentUser.id,
      },
      include: advancePaymentInclude,
    });

    revalidatePath('/reports');

    return {
      success: true,
      data: advancePayment as AdvancePaymentWithRelations,
    };
  } catch (error) {
    console.error('createAdvancePayment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create advance payment',
    };
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get advance payment by ID
 *
 * @param id - Advance payment ID
 */
export async function getAdvancePaymentById(
  id: number
): Promise<ServerActionResult<AdvancePaymentWithRelations>> {
  try {
    await getCurrentUser();

    const advancePayment = await db.advancePayment.findUnique({
      where: { id },
      include: advancePaymentInclude,
    });

    if (!advancePayment) {
      return {
        success: false,
        error: 'Advance payment not found',
      };
    }

    return {
      success: true,
      data: advancePayment as AdvancePaymentWithRelations,
    };
  } catch (error) {
    console.error('getAdvancePaymentById error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get advance payment',
    };
  }
}

/**
 * Get list of advance payments with filters
 *
 * @param filters - Filter options
 */
export async function getAdvancePayments(
  filters: AdvancePaymentFilters
): Promise<ServerActionResult<AdvancePaymentListResponse>> {
  try {
    await getCurrentUser();

    const where: {
      vendor_id?: number;
      payment_type_id?: number;
      reporting_month?: { gte: Date; lte: Date };
      linked_invoice_id?: number | null;
    } = {};

    if (filters.vendor_id) {
      where.vendor_id = filters.vendor_id;
    }

    if (filters.payment_type_id) {
      where.payment_type_id = filters.payment_type_id;
    }

    if (filters.reporting_month) {
      const monthStart = new Date(filters.reporting_month);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);

      where.reporting_month = {
        gte: monthStart,
        lte: monthEnd,
      };
    }

    if (filters.linked !== undefined) {
      where.linked_invoice_id = filters.linked ? { not: null } as unknown as number : null;
    }

    const total = await db.advancePayment.count({ where });

    const advancePayments = await db.advancePayment.findMany({
      where,
      include: advancePaymentInclude,
      orderBy: { payment_date: 'desc' },
      skip: (filters.page - 1) * filters.per_page,
      take: filters.per_page,
    });

    return {
      success: true,
      data: {
        advance_payments: advancePayments as AdvancePaymentWithRelations[],
        total,
        page: filters.page,
        per_page: filters.per_page,
        total_pages: Math.ceil(total / filters.per_page),
      },
    };
  } catch (error) {
    console.error('getAdvancePayments error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get advance payments',
    };
  }
}

/**
 * Get unlinked advance payments for a vendor
 *
 * Useful for showing available advance payments when creating an invoice.
 *
 * @param vendorId - Vendor ID
 */
export async function getUnlinkedAdvancePayments(
  vendorId: number
): Promise<ServerActionResult<AdvancePaymentWithRelations[]>> {
  try {
    await getCurrentUser();

    const advancePayments = await db.advancePayment.findMany({
      where: {
        vendor_id: vendorId,
        linked_invoice_id: null,
      },
      include: advancePaymentInclude,
      orderBy: { payment_date: 'desc' },
    });

    return {
      success: true,
      data: advancePayments as AdvancePaymentWithRelations[],
    };
  } catch (error) {
    console.error('getUnlinkedAdvancePayments error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get unlinked advance payments',
    };
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update an advance payment
 *
 * @param id - Advance payment ID
 * @param data - Updated data
 */
export async function updateAdvancePayment(
  id: number,
  data: Partial<AdvancePaymentFormData>
): Promise<ServerActionResult<AdvancePaymentWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can update advance payments',
      };
    }

    const existing = await db.advancePayment.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Advance payment not found',
      };
    }

    // If linked to an invoice, only allow limited updates
    if (existing.linked_invoice_id) {
      return {
        success: false,
        error: 'Cannot update advance payment that is linked to an invoice',
      };
    }

    const updateData: Record<string, unknown> = {};

    if (data.vendor_id !== undefined) updateData.vendor_id = data.vendor_id;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.payment_type_id !== undefined) updateData.payment_type_id = data.payment_type_id;
    if (data.payment_date !== undefined) updateData.payment_date = data.payment_date;
    if (data.payment_reference !== undefined) updateData.payment_reference = data.payment_reference;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.reporting_month !== undefined) {
      const reportingMonth = new Date(data.reporting_month);
      reportingMonth.setDate(1);
      reportingMonth.setHours(0, 0, 0, 0);
      updateData.reporting_month = reportingMonth;
    }

    const advancePayment = await db.advancePayment.update({
      where: { id },
      data: updateData,
      include: advancePaymentInclude,
    });

    revalidatePath('/reports');

    return {
      success: true,
      data: advancePayment as AdvancePaymentWithRelations,
    };
  } catch (error) {
    console.error('updateAdvancePayment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update advance payment',
    };
  }
}

/**
 * Link an advance payment to an invoice
 *
 * @param advancePaymentId - Advance payment ID
 * @param invoiceId - Invoice ID to link
 */
export async function linkAdvancePaymentToInvoice(
  advancePaymentId: number,
  invoiceId: number
): Promise<ServerActionResult<AdvancePaymentWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can link advance payments',
      };
    }

    // Get advance payment
    const advancePayment = await db.advancePayment.findUnique({
      where: { id: advancePaymentId },
    });

    if (!advancePayment) {
      return {
        success: false,
        error: 'Advance payment not found',
      };
    }

    if (advancePayment.linked_invoice_id) {
      return {
        success: false,
        error: 'Advance payment is already linked to an invoice',
      };
    }

    // Validate invoice exists and belongs to same vendor
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (invoice.vendor_id !== advancePayment.vendor_id) {
      return {
        success: false,
        error: 'Invoice vendor must match advance payment vendor',
      };
    }

    // Check if invoice already has a linked advance payment
    const existingLink = await db.advancePayment.findUnique({
      where: { linked_invoice_id: invoiceId },
    });

    if (existingLink) {
      return {
        success: false,
        error: 'Invoice already has a linked advance payment',
      };
    }

    const updated = await db.advancePayment.update({
      where: { id: advancePaymentId },
      data: {
        linked_invoice_id: invoiceId,
        linked_at: new Date(),
      },
      include: advancePaymentInclude,
    });

    revalidatePath('/reports');
    revalidatePath('/invoices');

    return {
      success: true,
      data: updated as AdvancePaymentWithRelations,
    };
  } catch (error) {
    console.error('linkAdvancePaymentToInvoice error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link advance payment',
    };
  }
}

/**
 * Unlink an advance payment from an invoice
 *
 * @param advancePaymentId - Advance payment ID
 */
export async function unlinkAdvancePayment(
  advancePaymentId: number
): Promise<ServerActionResult<AdvancePaymentWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can unlink advance payments',
      };
    }

    const advancePayment = await db.advancePayment.findUnique({
      where: { id: advancePaymentId },
    });

    if (!advancePayment) {
      return {
        success: false,
        error: 'Advance payment not found',
      };
    }

    if (!advancePayment.linked_invoice_id) {
      return {
        success: false,
        error: 'Advance payment is not linked to any invoice',
      };
    }

    const updated = await db.advancePayment.update({
      where: { id: advancePaymentId },
      data: {
        linked_invoice_id: null,
        linked_at: null,
      },
      include: advancePaymentInclude,
    });

    revalidatePath('/reports');
    revalidatePath('/invoices');

    return {
      success: true,
      data: updated as AdvancePaymentWithRelations,
    };
  } catch (error) {
    console.error('unlinkAdvancePayment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlink advance payment',
    };
  }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete an advance payment
 *
 * Admin only. Cannot delete if linked to an invoice.
 *
 * @param id - Advance payment ID
 */
export async function deleteAdvancePayment(
  id: number
): Promise<ServerActionResult<{ id: number }>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can delete advance payments',
      };
    }

    const advancePayment = await db.advancePayment.findUnique({
      where: { id },
    });

    if (!advancePayment) {
      return {
        success: false,
        error: 'Advance payment not found',
      };
    }

    if (advancePayment.linked_invoice_id) {
      return {
        success: false,
        error: 'Cannot delete advance payment that is linked to an invoice. Unlink it first.',
      };
    }

    await db.advancePayment.delete({
      where: { id },
    });

    revalidatePath('/reports');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('deleteAdvancePayment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete advance payment',
    };
  }
}
