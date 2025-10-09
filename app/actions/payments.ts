/**
 * Server Actions: Payment CRUD Operations
 *
 * Production-ready server actions with authentication, validation, and error handling.
 * All actions use NextAuth session for user context.
 * Uses Prisma transactions for atomic payment + invoice status updates.
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  PAYMENT_STATUS,
  type PaymentWithRelations,
  type PaymentSummary,
  type ServerActionResult,
} from '@/types/payment';
import { INVOICE_STATUS } from '@/types/invoice';
import { paymentFormSchema } from '@/lib/validations/payment';
import { revalidatePath } from 'next/cache';

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

  return {
    id: parseInt(session.user.id),
    email: session.user.email!,
    role: session.user.role as string,
  };
}

/**
 * Include relations for payment queries
 */
const paymentInclude = {
  invoice: {
    select: {
      id: true,
      invoice_number: true,
      invoice_amount: true,
    },
  },
  payment_type: {
    select: {
      id: true,
      name: true,
      requires_reference: true,
    },
  },
};

// ============================================================================
// PAYMENT SUMMARY CALCULATIONS
// ============================================================================

/**
 * Calculate payment summary for an invoice
 *
 * @param invoiceId - Invoice ID
 * @returns Payment summary with totals and status
 */
export async function getPaymentSummary(
  invoiceId: number
): Promise<ServerActionResult<PaymentSummary>> {
  try {
    await getCurrentUser();

    // Get invoice
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoice_amount: true,
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    // Sum all approved payments
    const paymentsSum = await db.payment.aggregate({
      where: {
        invoice_id: invoiceId,
        status: PAYMENT_STATUS.APPROVED,
      },
      _sum: {
        amount_paid: true,
      },
      _count: true,
    });

    const totalPaid = paymentsSum._sum.amount_paid || 0;
    const paymentCount = paymentsSum._count;
    const remainingBalance = invoice.invoice_amount - totalPaid;
    const isFullyPaid = remainingBalance <= 0;
    const isPartiallyPaid = totalPaid > 0 && !isFullyPaid;

    return {
      success: true,
      data: {
        invoice_id: invoiceId,
        invoice_amount: invoice.invoice_amount,
        total_paid: totalPaid,
        remaining_balance: Math.max(0, remainingBalance),
        payment_count: paymentCount,
        is_fully_paid: isFullyPaid,
        is_partially_paid: isPartiallyPaid,
      },
    };
  } catch (error) {
    console.error('getPaymentSummary error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to calculate payment summary',
    };
  }
}

/**
 * Calculate appropriate invoice status based on payments
 *
 * @param invoiceId - Invoice ID
 * @returns Calculated invoice status
 */
async function calculateInvoiceStatus(invoiceId: number): Promise<string> {
  const summaryResult = await getPaymentSummary(invoiceId);

  if (!summaryResult.success) {
    // If summary fails, preserve current status
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true },
    });
    return invoice?.status || INVOICE_STATUS.UNPAID;
  }

  const summary = summaryResult.data;

  if (summary.is_fully_paid) {
    return INVOICE_STATUS.PAID;
  } else if (summary.is_partially_paid) {
    return INVOICE_STATUS.PARTIAL;
  } else {
    return INVOICE_STATUS.UNPAID;
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all payments for an invoice
 *
 * @param invoiceId - Invoice ID
 * @returns List of payments with relations
 */
export async function getPaymentsByInvoiceId(
  invoiceId: number
): Promise<ServerActionResult<PaymentWithRelations[]>> {
  try {
    await getCurrentUser();

    const payments = await db.payment.findMany({
      where: {
        invoice_id: invoiceId,
      },
      include: paymentInclude,
      orderBy: {
        payment_date: 'desc',
      },
    });

    return {
      success: true,
      data: payments as PaymentWithRelations[],
    };
  } catch (error) {
    console.error('getPaymentsByInvoiceId error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch payments',
    };
  }
}

/**
 * Get single payment by ID
 *
 * @param id - Payment ID
 * @returns Payment with relations
 */
export async function getPaymentById(
  id: number
): Promise<ServerActionResult<PaymentWithRelations>> {
  try {
    await getCurrentUser();

    const payment = await db.payment.findUnique({
      where: { id },
      include: paymentInclude,
    });

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    return {
      success: true,
      data: payment as PaymentWithRelations,
    };
  } catch (error) {
    console.error('getPaymentById error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payment',
    };
  }
}

// ============================================================================
// CREATE OPERATION
// ============================================================================

/**
 * Create new payment for an invoice
 *
 * This operation uses a Prisma transaction to:
 * 1. Create the payment record
 * 2. Update the invoice status based on payment totals
 *
 * @param invoiceId - Invoice ID
 * @param data - Payment form data (validated)
 * @returns Created payment with relations
 */
export async function createPayment(
  invoiceId: number,
  data: unknown
): Promise<ServerActionResult<PaymentWithRelations>> {
  try {
    await getCurrentUser();

    // Validate input
    const validated = paymentFormSchema.parse(data);

    // Get invoice to validate amount
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoice_amount: true,
        status: true,
        is_hidden: true,
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (invoice.is_hidden) {
      return {
        success: false,
        error: 'Cannot add payment to hidden invoice',
      };
    }

    // Calculate current payment summary
    const summaryResult = await getPaymentSummary(invoiceId);
    if (!summaryResult.success) {
      return {
        success: false,
        error: summaryResult.error,
      };
    }

    const summary = summaryResult.data;

    // Validate payment amount doesn't exceed remaining balance
    if (validated.amount_paid > summary.remaining_balance) {
      return {
        success: false,
        error: `Payment amount ($${validated.amount_paid.toFixed(2)}) exceeds remaining balance ($${summary.remaining_balance.toFixed(2)})`,
      };
    }

    // Use transaction to create payment and update invoice status atomically
    const result = await db.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          invoice_id: invoiceId,
          amount_paid: validated.amount_paid,
          payment_date: validated.payment_date,
          payment_method: validated.payment_method,
          status: PAYMENT_STATUS.APPROVED, // Auto-approve for now
        },
        include: paymentInclude,
      });

      // Calculate new invoice status within transaction context
      // This ensures we read the committed payment data
      const paymentsSum = await tx.payment.aggregate({
        where: {
          invoice_id: invoiceId,
          status: PAYMENT_STATUS.APPROVED,
        },
        _sum: {
          amount_paid: true,
        },
      });

      const totalPaid = paymentsSum._sum.amount_paid || 0;
      const remainingBalance = invoice.invoice_amount - totalPaid;

      let newStatus: string = INVOICE_STATUS.UNPAID;
      if (remainingBalance <= 0) {
        newStatus = INVOICE_STATUS.PAID;
      } else if (totalPaid > 0) {
        newStatus = INVOICE_STATUS.PARTIAL;
      }

      // Update invoice status
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
        },
      });

      return payment;
    });

    // Revalidate paths
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);

    return {
      success: true,
      data: result as PaymentWithRelations,
    };
  } catch (error) {
    console.error('createPayment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment',
    };
  }
}
