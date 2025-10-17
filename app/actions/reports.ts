/**
 * Server Actions: Reports
 *
 * Data aggregation and reporting for invoices, payments, and vendors.
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { INVOICE_STATUS } from '@/types/invoice';
import { PAYMENT_STATUS } from '@/types/payment';

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

  return {
    id: parseInt(session.user.id),
    email: session.user.email!,
    role: session.user.role as string,
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface ReportDateRange {
  start_date: Date;
  end_date: Date;
}

export interface InvoiceSummaryReport {
  dateRange: ReportDateRange;
  totalInvoices: number;
  totalAmount: number;
  byStatus: {
    [key: string]: {
      count: number;
      amount: number;
    };
  };
  topVendors: Array<{
    vendor_id: number;
    vendor_name: string;
    invoice_count: number;
    total_amount: number;
  }>;
}

export interface VendorSpendingReport {
  dateRange: ReportDateRange;
  vendors: Array<{
    vendor_id: number;
    vendor_name: string;
    invoice_count: number;
    total_amount: number;
    paid_amount: number;
    unpaid_amount: number;
    average_invoice_amount: number;
  }>;
}

export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// INVOICE SUMMARY REPORT
// ============================================================================

/**
 * Generate invoice summary report for a date range
 */
export async function getInvoiceSummaryReport(
  dateRange: ReportDateRange
): Promise<ServerActionResult<InvoiceSummaryReport>> {
  try {
    await getCurrentUser();

    const { start_date, end_date } = dateRange;

    // Get all invoices in date range
    const invoices = await db.invoice.findMany({
      where: {
        is_hidden: false,
        invoice_date: {
          gte: start_date,
          lte: end_date,
        },
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate totals
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce(
      (sum: number, inv: (typeof invoices)[number]) => sum + inv.invoice_amount,
      0
    );

    // Group by status
    const byStatus: Record<string, { count: number; amount: number }> = {};

    Object.values(INVOICE_STATUS).forEach((status) => {
      const statusInvoices = invoices.filter(
        (inv: (typeof invoices)[number]) => inv.status === status
      );
      byStatus[status] = {
        count: statusInvoices.length,
        amount: statusInvoices.reduce(
          (sum: number, inv: (typeof statusInvoices)[number]) =>
            sum + inv.invoice_amount,
          0
        ),
      };
    });

    // Calculate top vendors
    const vendorMap = new Map<
      number,
      { name: string; count: number; amount: number }
    >();

    invoices.forEach((invoice: (typeof invoices)[number]) => {
      const existing = vendorMap.get(invoice.vendor_id);
      if (existing) {
        existing.count += 1;
        existing.amount += invoice.invoice_amount;
      } else {
        vendorMap.set(invoice.vendor_id, {
          name: invoice.vendor.name,
          count: 1,
          amount: invoice.invoice_amount,
        });
      }
    });

    const topVendors = Array.from(vendorMap.entries())
      .map(([vendor_id, data]) => ({
        vendor_id,
        vendor_name: data.name,
        invoice_count: data.count,
        total_amount: data.amount,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 10); // Top 10 vendors

    return {
      success: true,
      data: {
        dateRange,
        totalInvoices,
        totalAmount,
        byStatus,
        topVendors,
      },
    };
  } catch (error) {
    console.error('getInvoiceSummaryReport error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate invoice summary report',
    };
  }
}

// ============================================================================
// VENDOR SPENDING REPORT
// ============================================================================

/**
 * Generate vendor spending report for a date range
 */
export async function getVendorSpendingReport(
  dateRange: ReportDateRange
): Promise<ServerActionResult<VendorSpendingReport>> {
  try {
    await getCurrentUser();

    const { start_date, end_date } = dateRange;

    // Get all invoices in date range with payments
    const invoices = await db.invoice.findMany({
      where: {
        is_hidden: false,
        invoice_date: {
          gte: start_date,
          lte: end_date,
        },
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get payment totals for these invoices
    const invoiceIds = invoices.map((inv) => inv.id);
    const paymentAggregates = await db.payment.groupBy({
      by: ['invoice_id'],
      where: {
        invoice_id: {
          in: invoiceIds,
        },
        status: PAYMENT_STATUS.APPROVED,
      },
      _sum: {
        amount_paid: true,
      },
    });

    const paymentsByInvoice = new Map(
      paymentAggregates.map((agg) => [
        agg.invoice_id,
        agg._sum.amount_paid ?? 0,
      ])
    );

    // Group by vendor
    const vendorMap = new Map<
      number,
      {
        name: string;
        invoice_count: number;
        total_amount: number;
        paid_amount: number;
      }
    >();

    invoices.forEach((invoice) => {
      const paidAmount = paymentsByInvoice.get(invoice.id) ?? 0;
      const existing = vendorMap.get(invoice.vendor_id);

      if (existing) {
        existing.invoice_count += 1;
        existing.total_amount += invoice.invoice_amount;
        existing.paid_amount += paidAmount;
      } else {
        vendorMap.set(invoice.vendor_id, {
          name: invoice.vendor.name,
          invoice_count: 1,
          total_amount: invoice.invoice_amount,
          paid_amount: paidAmount,
        });
      }
    });

    const vendors = Array.from(vendorMap.entries())
      .map(([vendor_id, data]) => ({
        vendor_id,
        vendor_name: data.name,
        invoice_count: data.invoice_count,
        total_amount: data.total_amount,
        paid_amount: data.paid_amount,
        unpaid_amount: data.total_amount - data.paid_amount,
        average_invoice_amount: data.total_amount / data.invoice_count,
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    return {
      success: true,
      data: {
        dateRange,
        vendors,
      },
    };
  } catch (error) {
    console.error('getVendorSpendingReport error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate vendor spending report',
    };
  }
}
