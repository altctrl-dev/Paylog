/**
 * Server Actions: Payment CRUD Operations
 *
 * Production-ready server actions with authentication, validation, and error handling.
 * All actions use NextAuth session for user context.
 * Uses Prisma transactions for atomic payment + invoice status updates.
 */

'use server';

import type { Prisma } from '@prisma/client';
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
import { createActivityLog } from '@/app/actions/activity-log';
import { ACTIVITY_ACTION } from '@/docs/SPRINT7_ACTIVITY_ACTIONS';
import {
  notifyPaymentPendingApproval,
  notifyPaymentApproved,
  notifyPaymentRejected,
} from '@/app/actions/notifications';

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

    // Check for any pending payments
    const pendingPaymentCount = await db.payment.count({
      where: {
        invoice_id: invoiceId,
        status: PAYMENT_STATUS.PENDING,
      },
    });

    const totalPaid = paymentsSum._sum.amount_paid || 0;
    const paymentCount = paymentsSum._count;
    const remainingBalance = invoice.invoice_amount - totalPaid;
    const isFullyPaid = remainingBalance <= 0;
    const isPartiallyPaid = totalPaid > 0 && !isFullyPaid;
    const hasPendingPayment = pendingPaymentCount > 0;

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
        has_pending_payment: hasPendingPayment,
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _calculateInvoiceStatus(invoiceId: number): Promise<string> {
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
 * Get payments with optional status filter (Admin only)
 *
 * @param options - Filter options
 * @returns List of payments with relations
 */
export async function getPayments(options?: {
  status?: string;
}): Promise<ServerActionResult<PaymentWithRelations[]>> {
  try {
    const currentUser = await getCurrentUser();

    // Only admins can view all payments
    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can view all payments',
      };
    }

    const where: Prisma.PaymentWhereInput = {};

    if (options?.status) {
      where.status = options.status;
    }

    const payments = await db.payment.findMany({
      where,
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
    console.error('getPayments error:', error);
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
    const currentUser = await getCurrentUser();

    // Validate input
    const validated = paymentFormSchema.parse(data);

    // Get invoice to validate amount
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoice_number: true,
        invoice_amount: true,
        status: true,
        is_archived: true,
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
        error: 'Cannot add payment to archived invoice',
      };
    }

    // Block payments for invoices pending approval
    if (invoice.status === INVOICE_STATUS.PENDING_APPROVAL) {
      return {
        success: false,
        error: 'Cannot add payment to invoice pending approval. Please wait for admin approval first.',
      };
    }

    // Block payments for rejected invoices
    if (invoice.status === INVOICE_STATUS.REJECTED) {
      return {
        success: false,
        error: 'Cannot add payment to rejected invoice.',
      };
    }

    // Block payments for invoices on hold
    if (invoice.status === INVOICE_STATUS.ON_HOLD) {
      return {
        success: false,
        error: 'Cannot add payment to invoice on hold.',
      };
    }

    // BUG-001: Block payments when there's already a pending payment awaiting approval
    const pendingPaymentCount = await db.payment.count({
      where: {
        invoice_id: invoiceId,
        status: PAYMENT_STATUS.PENDING,
      },
    });

    if (pendingPaymentCount > 0) {
      return {
        success: false,
        error: 'Cannot add payment while another payment is pending approval. Please wait for the pending payment to be approved or rejected.',
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

    // Extract optional TDS fields from validated data
    const tdsAmountApplied = (validated as { tds_amount_applied?: number | null }).tds_amount_applied ?? null;
    const tdsRounded = (validated as { tds_rounded?: boolean }).tds_rounded ?? false;
    const paymentReference = (validated as { payment_reference?: string | null }).payment_reference ?? null;

    // Determine payment status based on user role
    // Admin/Super Admin: Payment is auto-approved
    // Standard User: Payment goes to pending approval
    const paymentStatus = currentUser.isAdmin
      ? PAYMENT_STATUS.APPROVED
      : PAYMENT_STATUS.PENDING;

    // Use transaction to create payment and update invoice status atomically
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          invoice_id: invoiceId,
          amount_paid: validated.amount_paid,
          payment_date: validated.payment_date,
          payment_type_id: validated.payment_type_id,
          payment_reference: paymentReference,
          tds_amount_applied: tdsAmountApplied,
          tds_rounded: tdsRounded,
          status: paymentStatus,
          created_by_user_id: currentUser.id,
          // If admin creates payment, auto-approve
          approved_by_user_id: currentUser.isAdmin ? currentUser.id : null,
          approved_at: currentUser.isAdmin ? new Date() : null,
        },
        include: paymentInclude,
      });

      // Only update invoice status if payment is approved (admin created)
      // Pending payments don't affect invoice status until approved
      if (paymentStatus === PAYMENT_STATUS.APPROVED) {
        // Calculate new invoice status within transaction context
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
      }

      return payment;
    });

    // Log activity (non-blocking)
    await createActivityLog({
      invoice_id: invoiceId,
      user_id: currentUser.id,
      action: ACTIVITY_ACTION.PAYMENT_ADDED,
      new_data: {
        payment_id: result.id,
        amount_paid: validated.amount_paid,
        payment_date: validated.payment_date,
        payment_type_id: validated.payment_type_id,
        payment_status: paymentStatus,
        tds_amount_applied: tdsAmountApplied,
      },
    });

    // Notify admins if payment is pending approval (non-admin user created it)
    if (paymentStatus === PAYMENT_STATUS.PENDING) {
      // Get user's name for notification
      const user = await db.user.findUnique({
        where: { id: currentUser.id },
        select: { full_name: true },
      });
      const requesterName = user?.full_name || currentUser.email;

      // Non-blocking notification
      notifyPaymentPendingApproval(
        result.id,
        invoice.invoice_number,
        validated.amount_paid,
        requesterName
      ).catch((err) => console.error('Failed to notify payment pending:', err));
    }

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

// ============================================================================
// PAYMENT APPROVAL OPERATIONS (Admin Only)
// ============================================================================

/**
 * Approve a pending payment
 *
 * This operation uses a Prisma transaction to:
 * 1. Update the payment status to approved
 * 2. Update the invoice status based on payment totals
 *
 * @param paymentId - Payment ID
 * @returns Updated payment with relations
 */
export async function approvePayment(
  paymentId: number
): Promise<ServerActionResult<PaymentWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    // Only admins can approve payments
    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can approve payments',
      };
    }

    // Get the payment
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          select: {
            id: true,
            invoice_number: true,
            invoice_amount: true,
          },
        },
      },
    });

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (payment.status !== PAYMENT_STATUS.PENDING) {
      return {
        success: false,
        error: `Payment cannot be approved. Current status: ${payment.status}`,
      };
    }

    // Use transaction to approve payment and update invoice status atomically
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update payment status to approved
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PAYMENT_STATUS.APPROVED,
          approved_by_user_id: currentUser.id,
          approved_at: new Date(),
        },
        include: paymentInclude,
      });

      // Calculate new invoice status
      const paymentsSum = await tx.payment.aggregate({
        where: {
          invoice_id: payment.invoice.id,
          status: PAYMENT_STATUS.APPROVED,
        },
        _sum: {
          amount_paid: true,
        },
      });

      const totalPaid = paymentsSum._sum.amount_paid || 0;
      const remainingBalance = payment.invoice.invoice_amount - totalPaid;

      let newStatus: string = INVOICE_STATUS.UNPAID;
      if (remainingBalance <= 0) {
        newStatus = INVOICE_STATUS.PAID;
      } else if (totalPaid > 0) {
        newStatus = INVOICE_STATUS.PARTIAL;
      }

      // Update invoice status
      await tx.invoice.update({
        where: { id: payment.invoice.id },
        data: {
          status: newStatus,
        },
      });

      return updatedPayment;
    });

    // Log activity (non-blocking)
    await createActivityLog({
      invoice_id: payment.invoice.id,
      user_id: currentUser.id,
      action: ACTIVITY_ACTION.PAYMENT_APPROVED,
      old_data: {
        payment_id: paymentId,
        status: PAYMENT_STATUS.PENDING,
      },
      new_data: {
        payment_id: paymentId,
        status: PAYMENT_STATUS.APPROVED,
        amount_paid: payment.amount_paid,
      },
    });

    // Notify the payment creator (if different from current user)
    if (payment.created_by_user_id && payment.created_by_user_id !== currentUser.id) {
      notifyPaymentApproved(
        payment.created_by_user_id,
        paymentId,
        payment.invoice.invoice_number,
        payment.amount_paid
      ).catch((err) => console.error('Failed to notify payment approved:', err));
    }

    // Revalidate paths
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${payment.invoice.id}`);
    revalidatePath('/admin');

    return {
      success: true,
      data: result as PaymentWithRelations,
    };
  } catch (error) {
    console.error('approvePayment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve payment',
    };
  }
}

/**
 * Reject a pending payment
 *
 * @param paymentId - Payment ID
 * @param reason - Optional rejection reason
 * @returns Updated payment with relations
 */
export async function rejectPayment(
  paymentId: number,
  reason?: string
): Promise<ServerActionResult<PaymentWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    // Only admins can reject payments
    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can reject payments',
      };
    }

    // Get the payment with invoice details
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        ...paymentInclude,
        invoice: {
          select: {
            id: true,
            invoice_number: true,
            invoice_amount: true,
          },
        },
      },
    });

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (payment.status !== PAYMENT_STATUS.PENDING) {
      return {
        success: false,
        error: `Payment cannot be rejected. Current status: ${payment.status}`,
      };
    }

    // Update payment status to rejected with reason
    const updatedPayment = await db.payment.update({
      where: { id: paymentId },
      data: {
        status: PAYMENT_STATUS.REJECTED,
        rejection_reason: reason || null,
      },
      include: paymentInclude,
    });

    // Log activity (non-blocking)
    await createActivityLog({
      invoice_id: payment.invoice.id,
      user_id: currentUser.id,
      action: ACTIVITY_ACTION.PAYMENT_REJECTED,
      old_data: {
        payment_id: paymentId,
        status: PAYMENT_STATUS.PENDING,
      },
      new_data: {
        payment_id: paymentId,
        status: PAYMENT_STATUS.REJECTED,
        amount_paid: payment.amount_paid,
        rejection_reason: reason || null,
      },
    });

    // Notify the payment creator (if different from current user)
    if (payment.created_by_user_id && payment.created_by_user_id !== currentUser.id) {
      notifyPaymentRejected(
        payment.created_by_user_id,
        paymentId,
        payment.invoice.invoice_number,
        payment.amount_paid,
        reason
      ).catch((err) => console.error('Failed to notify payment rejected:', err));
    }

    // Revalidate paths
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${payment.invoice.id}`);
    revalidatePath('/admin');

    return {
      success: true,
      data: updatedPayment as PaymentWithRelations,
    };
  } catch (error) {
    console.error('rejectPayment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject payment',
    };
  }
}

/**
 * Get all pending payments (Admin only)
 *
 * @returns List of pending payments with relations
 */
export async function getPendingPayments(): Promise<
  ServerActionResult<PaymentWithRelations[]>
> {
  try {
    const currentUser = await getCurrentUser();

    // Only admins can view pending payments list
    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can view pending payments',
      };
    }

    const payments = await db.payment.findMany({
      where: {
        status: PAYMENT_STATUS.PENDING,
      },
      include: paymentInclude,
      orderBy: {
        payment_date: 'asc',
      },
    });

    return {
      success: true,
      data: payments as PaymentWithRelations[],
    };
  } catch (error) {
    console.error('getPendingPayments error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch pending payments',
    };
  }
}
