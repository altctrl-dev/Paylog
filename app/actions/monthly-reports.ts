/**
 * Server Actions: Monthly Report System
 *
 * Production-ready server actions for the payment-centric monthly report system.
 * Supports:
 * - Generating reports grouped by payment type
 * - Report finalization with frozen snapshot
 * - Two views: Live (current) and Submitted (historical)
 * - Invoice-date view for pure date-based filtering
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { calculateTds } from '@/lib/utils/tds';
import { PAYMENT_STATUS } from '@/types/payment';
import { INVOICE_STATUS } from '@/types/invoice';
import {
  type ServerActionResult,
  type MonthlyReportResponse,
  type ConsolidatedReportResponse,
  type MonthlyReportData,
  type ReportSection,
  type ReportEntryStatus,
  type ReportSnapshot,
  type ReportPeriodWithRelations,
  REPORT_STATUS,
  formatReportPeriod,
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
    name: session.user.name || session.user.email!,
    role,
    isAdmin: role === 'admin' || role === 'super_admin',
  };
}

/**
 * Get first day of a month
 */
function getMonthStart(month: number, year: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * Get last day of a month
 */
function getMonthEnd(month: number, year: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

/**
 * Calculate payment status for a report entry
 */
function calculatePaymentStatus(
  invoiceAmount: number,
  tdsApplicable: boolean,
  tdsPercentage: number | null,
  tdsRounded: boolean,
  totalPaidBefore: number,
  thisPaymentAmount: number
): { status: ReportEntryStatus; percentage: number | null } {
  // Calculate net payable after TDS
  const { payableAmount } = tdsApplicable && tdsPercentage
    ? calculateTds(invoiceAmount, tdsPercentage, tdsRounded)
    : { payableAmount: invoiceAmount };

  const totalPaidAfter = totalPaidBefore + thisPaymentAmount;
  const thisPaymentPercentage = Math.round((thisPaymentAmount / payableAmount) * 100);

  // Check if this payment completes the invoice
  const isFullyPaid = totalPaidAfter >= payableAmount - 0.01; // Small epsilon for float comparison

  if (isFullyPaid) {
    // This payment completed the invoice
    if (thisPaymentPercentage >= 100) {
      return { status: 'PAID', percentage: null };
    } else {
      return { status: 'PAID_PARTIAL', percentage: thisPaymentPercentage };
    }
  } else {
    // Invoice still has balance
    return { status: 'PARTIALLY_PAID', percentage: thisPaymentPercentage };
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate monthly report data (live view)
 *
 * Groups invoices and payments by payment type for a specific month.
 */
async function generateLiveReport(month: number, year: number): Promise<MonthlyReportData> {
  const monthStart = getMonthStart(month, year);
  const monthEnd = getMonthEnd(month, year);

  // Get all payment types for section headers
  const paymentTypes = await db.paymentType.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
  });

  // Initialize sections with payment types
  const sectionsMap = new Map<number | null, ReportSection>();

  for (const pt of paymentTypes) {
    sectionsMap.set(pt.id, {
      payment_type_id: pt.id,
      payment_type_name: pt.name,
      entries: [],
      subtotal: 0,
      entry_count: 0,
    });
  }

  // Add Unpaid section (payment_type_id = null)
  sectionsMap.set(null, {
    payment_type_id: null,
    payment_type_name: 'Unpaid',
    entries: [],
    subtotal: 0,
    entry_count: 0,
  });

  // Get invoices with reporting_month in this period OR invoice_date in this period (for backwards compatibility)
  const invoices = await db.invoice.findMany({
    where: {
      OR: [
        {
          reporting_month: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        {
          AND: [
            { reporting_month: null },
            {
              invoice_received_date: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          ],
        },
        {
          AND: [
            { reporting_month: null },
            { invoice_received_date: null },
            {
              invoice_date: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          ],
        },
      ],
      deleted_at: null,
      is_archived: false,
      status: {
        notIn: [INVOICE_STATUS.PENDING_APPROVAL, INVOICE_STATUS.REJECTED],
      },
    },
    include: {
      vendor: { select: { id: true, name: true } },
      currency: { select: { code: true } },
      invoice_profile: { select: { name: true } },
      payments: {
        where: {
          status: PAYMENT_STATUS.APPROVED,
          payment_date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        include: {
          payment_type: { select: { id: true, name: true } },
        },
        orderBy: { payment_date: 'asc' },
      },
    },
    orderBy: { invoice_date: 'asc' },
  });

  // Process each invoice
  for (const invoice of invoices) {
    const invoiceName = invoice.is_recurring
      ? invoice.invoice_profile?.name || 'Unknown Profile'
      : invoice.invoice_name || invoice.description || invoice.notes || 'Unnamed Invoice';

    const currencyCode = invoice.currency?.code || 'INR';

    // Determine entry type based on dates
    let entryType: 'standard' | 'late_invoice' | 'advance_payment' = 'standard';
    if (invoice.invoice_date) {
      const invoiceMonth = invoice.invoice_date.getMonth() + 1;
      const invoiceYear = invoice.invoice_date.getFullYear();
      if (invoiceMonth !== month || invoiceYear !== year) {
        entryType = 'late_invoice';
      }
    }

    // Check if this is a pending invoice (advance payment)
    // Pending invoices are payments recorded before the invoice was received
    const isPendingInvoice = invoice.invoice_pending === true;
    if (isPendingInvoice) {
      entryType = 'advance_payment';
    }

    if (invoice.payments.length === 0) {
      // No payments THIS MONTH - check if invoice is actually paid (in another month)
      const allPaymentsForInvoice = await db.payment.findMany({
        where: {
          invoice_id: invoice.id,
          status: PAYMENT_STATUS.APPROVED,
        },
      });

      const totalPaid = allPaymentsForInvoice.reduce((sum, p) => sum + p.amount_paid, 0);

      // Calculate net payable after TDS
      const { payableAmount } = invoice.tds_applicable && invoice.tds_percentage
        ? calculateTds(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false)
        : { payableAmount: invoice.invoice_amount };

      const isFullyPaid = totalPaid >= payableAmount - 0.01;

      if (isFullyPaid) {
        // Invoice is fully paid (in a different month) - skip it
        // It will appear in the report for the month it was paid
        continue;
      }

      // Invoice is truly unpaid or partially paid - add to Unpaid section
      const section = sectionsMap.get(null)!;
      const status: ReportEntryStatus = totalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
      const statusPercentage = totalPaid > 0 ? Math.round((totalPaid / payableAmount) * 100) : null;

      section.entries.push({
        serial: section.entries.length + 1,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_name: invoiceName,
        vendor_name: invoice.vendor.name,
        invoice_date: invoice.invoice_date?.toISOString() || null,
        invoice_amount: invoice.invoice_amount,
        payment_amount: null,
        payment_date: null,
        payment_reference: null,
        status,
        status_percentage: statusPercentage,
        currency_code: currencyCode,
        is_advance_payment: false,
        advance_payment_id: null,
        entry_type: entryType,
      });
      section.subtotal += invoice.invoice_amount;
      section.entry_count++;
    } else {
      // Has payments - calculate cumulative paid for status
      let totalPaidBefore = 0;

      // Get all approved payments for this invoice (for calculating cumulative)
      const allPayments = await db.payment.findMany({
        where: {
          invoice_id: invoice.id,
          status: PAYMENT_STATUS.APPROVED,
        },
        orderBy: { payment_date: 'asc' },
      });

      // Find cumulative paid before each payment in this month
      for (const payment of invoice.payments) {
        // Calculate total paid before this payment
        totalPaidBefore = allPayments
          .filter(p => p.payment_date < payment.payment_date)
          .reduce((sum, p) => sum + p.amount_paid, 0);

        const { status, percentage } = calculatePaymentStatus(
          invoice.invoice_amount,
          invoice.tds_applicable,
          invoice.tds_percentage,
          invoice.tds_rounded ?? false,
          totalPaidBefore,
          payment.amount_paid
        );

        const section = sectionsMap.get(payment.payment_type_id || null);
        if (section) {
          // For pending invoices (advance payments), use ADVANCE status
          const entryStatus = isPendingInvoice ? 'ADVANCE' as ReportEntryStatus : status;
          const entryPercentage = isPendingInvoice ? null : percentage;

          section.entries.push({
            serial: section.entries.length + 1,
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            invoice_name: invoiceName,
            vendor_name: invoice.vendor.name,
            invoice_date: invoice.invoice_date?.toISOString() || null,
            invoice_amount: invoice.invoice_amount,
            payment_amount: payment.amount_paid,
            payment_date: payment.payment_date.toISOString(),
            payment_reference: payment.payment_reference,
            status: entryStatus,
            status_percentage: entryPercentage,
            currency_code: currencyCode,
            is_advance_payment: isPendingInvoice,
            advance_payment_id: null,
            entry_type: entryType,
          });
          section.subtotal += payment.amount_paid;
          section.entry_count++;
        }
      }
    }
  }

  // Get advance payments for this month
  const advancePayments = await db.advancePayment.findMany({
    where: {
      reporting_month: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    include: {
      vendor: { select: { id: true, name: true } },
      payment_type: { select: { id: true, name: true } },
    },
    orderBy: { payment_date: 'asc' },
  });

  // Add advance payments to their respective sections
  for (const ap of advancePayments) {
    const section = sectionsMap.get(ap.payment_type_id);
    if (section) {
      section.entries.push({
        serial: section.entries.length + 1,
        invoice_id: ap.linked_invoice_id,
        invoice_number: ap.linked_invoice_id ? `Linked` : null,
        invoice_name: ap.description,
        vendor_name: ap.vendor.name,
        invoice_date: null,
        invoice_amount: ap.amount,
        payment_amount: ap.amount,
        payment_date: ap.payment_date.toISOString(),
        payment_reference: ap.payment_reference,
        status: 'ADVANCE',
        status_percentage: null,
        currency_code: 'INR', // Default for advance payments
        is_advance_payment: true,
        advance_payment_id: ap.id,
        entry_type: 'advance_payment',
      });
      section.subtotal += ap.amount;
      section.entry_count++;
    }
  }

  // Convert map to array and filter out empty sections
  const sections = Array.from(sectionsMap.values())
    .filter(section => section.entries.length > 0);

  // Renumber serials within each section
  for (const section of sections) {
    section.entries.forEach((entry, index) => {
      entry.serial = index + 1;
    });
  }

  // Calculate grand total
  const grandTotal = sections.reduce((sum, s) => sum + s.subtotal, 0);
  const totalEntries = sections.reduce((sum, s) => sum + s.entry_count, 0);

  return {
    month,
    year,
    label: formatReportPeriod(month, year),
    sections,
    grand_total: grandTotal,
    total_entries: totalEntries,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate invoice-date based report
 * Shows invoices strictly by their invoice_date, ignoring reporting_month
 */
async function generateInvoiceDateReport(month: number, year: number): Promise<MonthlyReportData> {
  const monthStart = getMonthStart(month, year);
  const monthEnd = getMonthEnd(month, year);

  // Get all payment types for section headers
  const paymentTypes = await db.paymentType.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
  });

  // Initialize sections with payment types
  const sectionsMap = new Map<number | null, ReportSection>();

  for (const pt of paymentTypes) {
    sectionsMap.set(pt.id, {
      payment_type_id: pt.id,
      payment_type_name: pt.name,
      entries: [],
      subtotal: 0,
      entry_count: 0,
    });
  }

  sectionsMap.set(null, {
    payment_type_id: null,
    payment_type_name: 'Unpaid',
    entries: [],
    subtotal: 0,
    entry_count: 0,
  });

  // Get invoices with invoice_date in this period
  const invoices = await db.invoice.findMany({
    where: {
      invoice_date: {
        gte: monthStart,
        lte: monthEnd,
      },
      deleted_at: null,
      is_archived: false,
      status: {
        notIn: [INVOICE_STATUS.PENDING_APPROVAL, INVOICE_STATUS.REJECTED],
      },
    },
    include: {
      vendor: { select: { id: true, name: true } },
      currency: { select: { code: true } },
      invoice_profile: { select: { name: true } },
      payments: {
        where: { status: PAYMENT_STATUS.APPROVED },
        include: {
          payment_type: { select: { id: true, name: true } },
        },
        orderBy: { payment_date: 'asc' },
      },
    },
    orderBy: { invoice_date: 'asc' },
  });

  // Process each invoice (similar to live report but all payments, not just this month)
  for (const invoice of invoices) {
    const invoiceName = invoice.is_recurring
      ? invoice.invoice_profile?.name || 'Unknown Profile'
      : invoice.invoice_name || invoice.description || invoice.notes || 'Unnamed Invoice';

    const currencyCode = invoice.currency?.code || 'INR';

    // Check if this is a pending invoice (advance payment)
    const isPendingInvoice = invoice.invoice_pending === true;
    const entryType = isPendingInvoice ? 'advance_payment' : 'standard';

    if (invoice.payments.length === 0) {
      const section = sectionsMap.get(null)!;
      section.entries.push({
        serial: section.entries.length + 1,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_name: invoiceName,
        vendor_name: invoice.vendor.name,
        invoice_date: invoice.invoice_date?.toISOString() || null,
        invoice_amount: invoice.invoice_amount,
        payment_amount: null,
        payment_date: null,
        payment_reference: null,
        status: 'UNPAID',
        status_percentage: null,
        currency_code: currencyCode,
        is_advance_payment: isPendingInvoice,
        advance_payment_id: null,
        entry_type: entryType,
      });
      section.subtotal += invoice.invoice_amount;
      section.entry_count++;
    } else {
      let totalPaidBefore = 0;

      for (const payment of invoice.payments) {
        const { status, percentage } = calculatePaymentStatus(
          invoice.invoice_amount,
          invoice.tds_applicable,
          invoice.tds_percentage,
          invoice.tds_rounded ?? false,
          totalPaidBefore,
          payment.amount_paid
        );

        totalPaidBefore += payment.amount_paid;

        const section = sectionsMap.get(payment.payment_type_id || null);
        if (section) {
          // For pending invoices (advance payments), use ADVANCE status
          const entryStatus = isPendingInvoice ? 'ADVANCE' as ReportEntryStatus : status;
          const entryPercentage = isPendingInvoice ? null : percentage;

          section.entries.push({
            serial: section.entries.length + 1,
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            invoice_name: invoiceName,
            vendor_name: invoice.vendor.name,
            invoice_date: invoice.invoice_date?.toISOString() || null,
            invoice_amount: invoice.invoice_amount,
            payment_amount: payment.amount_paid,
            payment_date: payment.payment_date.toISOString(),
            payment_reference: payment.payment_reference,
            status: entryStatus,
            status_percentage: entryPercentage,
            currency_code: currencyCode,
            is_advance_payment: isPendingInvoice,
            advance_payment_id: null,
            entry_type: entryType,
          });
          section.subtotal += payment.amount_paid;
          section.entry_count++;
        }
      }
    }
  }

  // Convert and filter
  const sections = Array.from(sectionsMap.values())
    .filter(section => section.entries.length > 0);

  for (const section of sections) {
    section.entries.forEach((entry, index) => {
      entry.serial = index + 1;
    });
  }

  const grandTotal = sections.reduce((sum, s) => sum + s.subtotal, 0);
  const totalEntries = sections.reduce((sum, s) => sum + s.entry_count, 0);

  return {
    month,
    year,
    label: formatReportPeriod(month, year),
    sections,
    grand_total: grandTotal,
    total_entries: totalEntries,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate combined report (EXPERIMENTAL)
 *
 * Shows:
 * 1. All invoices FROM this month (by invoice_date) with current payment status
 * 2. All payments MADE in this month for invoices from OTHER months
 *
 * This gives a complete picture of the month's activity.
 */
async function generateCombinedReport(month: number, year: number): Promise<MonthlyReportData> {
  const monthStart = getMonthStart(month, year);
  const monthEnd = getMonthEnd(month, year);

  // Get all payment types for section headers
  const paymentTypes = await db.paymentType.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
  });

  // Initialize sections with payment types
  const sectionsMap = new Map<number | null, ReportSection>();

  for (const pt of paymentTypes) {
    sectionsMap.set(pt.id, {
      payment_type_id: pt.id,
      payment_type_name: pt.name,
      entries: [],
      subtotal: 0,
      entry_count: 0,
    });
  }

  sectionsMap.set(null, {
    payment_type_id: null,
    payment_type_name: 'Unpaid',
    entries: [],
    subtotal: 0,
    entry_count: 0,
  });

  // Track which invoice+payment combinations we've already added to avoid duplicates
  const addedEntries = new Set<string>();

  // ========================================
  // PART 1: All invoices FROM this month
  // ========================================
  const invoicesFromThisMonth = await db.invoice.findMany({
    where: {
      invoice_date: {
        gte: monthStart,
        lte: monthEnd,
      },
      deleted_at: null,
      is_archived: false,
      status: {
        notIn: [INVOICE_STATUS.PENDING_APPROVAL, INVOICE_STATUS.REJECTED],
      },
    },
    include: {
      vendor: { select: { id: true, name: true } },
      currency: { select: { code: true } },
      invoice_profile: { select: { name: true } },
      payments: {
        where: { status: PAYMENT_STATUS.APPROVED },
        include: {
          payment_type: { select: { id: true, name: true } },
        },
        orderBy: { payment_date: 'asc' },
      },
    },
    orderBy: { invoice_date: 'asc' },
  });

  // Process invoices from this month
  for (const invoice of invoicesFromThisMonth) {
    const invoiceName = invoice.is_recurring
      ? invoice.invoice_profile?.name || 'Unknown Profile'
      : invoice.invoice_name || invoice.description || invoice.notes || 'Unnamed Invoice';

    const currencyCode = invoice.currency?.code || 'INR';

    // Check if this is a pending invoice (advance payment)
    const isPendingInvoice = invoice.invoice_pending === true;

    if (invoice.payments.length === 0) {
      // Unpaid invoice from this month
      const section = sectionsMap.get(null)!;
      section.entries.push({
        serial: 0,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_name: invoiceName,
        vendor_name: invoice.vendor.name,
        invoice_date: invoice.invoice_date?.toISOString() || null,
        invoice_amount: invoice.invoice_amount,
        payment_amount: null,
        payment_date: null,
        payment_reference: null,
        status: 'UNPAID',
        status_percentage: null,
        currency_code: currencyCode,
        is_advance_payment: isPendingInvoice,
        advance_payment_id: null,
        entry_type: isPendingInvoice ? 'advance_payment' : 'standard',
      });
      section.subtotal += invoice.invoice_amount;
      section.entry_count++;
      addedEntries.add(`inv-${invoice.id}-unpaid`);
    } else {
      // Invoice has payments - add each payment
      let totalPaidBefore = 0;

      for (const payment of invoice.payments) {
        const { status, percentage } = calculatePaymentStatus(
          invoice.invoice_amount,
          invoice.tds_applicable,
          invoice.tds_percentage,
          invoice.tds_rounded ?? false,
          totalPaidBefore,
          payment.amount_paid
        );

        totalPaidBefore += payment.amount_paid;

        const section = sectionsMap.get(payment.payment_type_id || null);
        if (section) {
          // Check if payment was made in a different month
          const paymentMonth = payment.payment_date.getMonth() + 1;
          const paymentYear = payment.payment_date.getFullYear();
          const isPaidInDifferentMonth = paymentMonth !== month || paymentYear !== year;

          // Determine entry type
          let entryType: 'standard' | 'late_payment' | 'advance_payment' = 'standard';
          if (isPendingInvoice) {
            entryType = 'advance_payment';
          } else if (isPaidInDifferentMonth) {
            entryType = 'late_payment';
          }

          // For pending invoices (advance payments), use ADVANCE status
          const entryStatus = isPendingInvoice ? 'ADVANCE' as ReportEntryStatus : status;
          const entryPercentage = isPendingInvoice ? null : percentage;

          section.entries.push({
            serial: 0,
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            invoice_name: invoiceName,
            vendor_name: invoice.vendor.name,
            invoice_date: invoice.invoice_date?.toISOString() || null,
            invoice_amount: invoice.invoice_amount,
            payment_amount: payment.amount_paid,
            payment_date: payment.payment_date.toISOString(),
            payment_reference: payment.payment_reference,
            status: entryStatus,
            status_percentage: entryPercentage,
            currency_code: currencyCode,
            is_advance_payment: isPendingInvoice,
            advance_payment_id: null,
            entry_type: entryType,
          });
          section.subtotal += payment.amount_paid;
          section.entry_count++;
          addedEntries.add(`payment-${payment.id}`);
        }
      }
    }
  }

  // ========================================
  // PART 2: Payments MADE in this month for invoices from OTHER months
  // ========================================
  const paymentsThisMonth = await db.payment.findMany({
    where: {
      payment_date: {
        gte: monthStart,
        lte: monthEnd,
      },
      status: PAYMENT_STATUS.APPROVED,
      invoice: {
        // Exclude invoices from this month (already processed above)
        OR: [
          { invoice_date: { lt: monthStart } },
          { invoice_date: { gt: monthEnd } },
          { invoice_date: null },
        ],
        deleted_at: null,
        is_archived: false,
      },
    },
    include: {
      invoice: {
        include: {
          vendor: { select: { id: true, name: true } },
          currency: { select: { code: true } },
          invoice_profile: { select: { name: true } },
        },
      },
      payment_type: { select: { id: true, name: true } },
    },
    orderBy: { payment_date: 'asc' },
  });

  // Process payments from other months' invoices
  for (const payment of paymentsThisMonth) {
    // Skip if already added
    if (addedEntries.has(`payment-${payment.id}`)) continue;

    const invoice = payment.invoice;
    const invoiceName = invoice.is_recurring
      ? invoice.invoice_profile?.name || 'Unknown Profile'
      : invoice.invoice_name || invoice.description || invoice.notes || 'Unnamed Invoice';

    const currencyCode = invoice.currency?.code || 'INR';

    // Check if this is a pending invoice (advance payment)
    const isPendingInvoice = invoice.invoice_pending === true;

    // Get all payments for this invoice to calculate status
    const allPayments = await db.payment.findMany({
      where: {
        invoice_id: invoice.id,
        status: PAYMENT_STATUS.APPROVED,
      },
      orderBy: { payment_date: 'asc' },
    });

    const totalPaidBefore = allPayments
      .filter(p => p.payment_date < payment.payment_date)
      .reduce((sum, p) => sum + p.amount_paid, 0);

    const { status, percentage } = calculatePaymentStatus(
      invoice.invoice_amount,
      invoice.tds_applicable,
      invoice.tds_percentage,
      invoice.tds_rounded ?? false,
      totalPaidBefore,
      payment.amount_paid
    );

    const section = sectionsMap.get(payment.payment_type_id || null);
    if (section) {
      // For pending invoices (advance payments), use ADVANCE status
      const entryStatus = isPendingInvoice ? 'ADVANCE' as ReportEntryStatus : status;
      const entryPercentage = isPendingInvoice ? null : percentage;

      section.entries.push({
        serial: 0,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_name: invoiceName,
        vendor_name: invoice.vendor.name,
        invoice_date: invoice.invoice_date?.toISOString() || null,
        invoice_amount: invoice.invoice_amount,
        payment_amount: payment.amount_paid,
        payment_date: payment.payment_date.toISOString(),
        payment_reference: payment.payment_reference,
        status: entryStatus,
        status_percentage: entryPercentage,
        currency_code: currencyCode,
        is_advance_payment: isPendingInvoice,
        advance_payment_id: null,
        entry_type: isPendingInvoice ? 'advance_payment' : 'late_invoice', // Invoice from different month
      });
      section.subtotal += payment.amount_paid;
      section.entry_count++;
      addedEntries.add(`payment-${payment.id}`);
    }
  }

  // ========================================
  // PART 3: Advance payments for this month
  // ========================================
  const advancePayments = await db.advancePayment.findMany({
    where: {
      reporting_month: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    include: {
      vendor: { select: { id: true, name: true } },
      payment_type: { select: { id: true, name: true } },
    },
    orderBy: { payment_date: 'asc' },
  });

  for (const ap of advancePayments) {
    const section = sectionsMap.get(ap.payment_type_id);
    if (section) {
      section.entries.push({
        serial: 0,
        invoice_id: ap.linked_invoice_id,
        invoice_number: ap.linked_invoice_id ? 'Linked' : null,
        invoice_name: ap.description,
        vendor_name: ap.vendor.name,
        invoice_date: null,
        invoice_amount: ap.amount,
        payment_amount: ap.amount,
        payment_date: ap.payment_date.toISOString(),
        payment_reference: ap.payment_reference,
        status: 'ADVANCE',
        status_percentage: null,
        currency_code: 'INR',
        is_advance_payment: true,
        advance_payment_id: ap.id,
        entry_type: 'advance_payment',
      });
      section.subtotal += ap.amount;
      section.entry_count++;
    }
  }

  // Convert map to array and filter out empty sections
  const sections = Array.from(sectionsMap.values())
    .filter(section => section.entries.length > 0);

  // Renumber serials within each section
  for (const section of sections) {
    section.entries.forEach((entry, index) => {
      entry.serial = index + 1;
    });
  }

  // Calculate grand total
  const grandTotal = sections.reduce((sum, s) => sum + s.subtotal, 0);
  const totalEntries = sections.reduce((sum, s) => sum + s.entry_count, 0);

  return {
    month,
    year,
    label: formatReportPeriod(month, year),
    sections,
    grand_total: grandTotal,
    total_entries: totalEntries,
    generated_at: new Date().toISOString(),
  };
}

// ============================================================================
// PUBLIC SERVER ACTIONS
// ============================================================================

/**
 * Get monthly report
 *
 * @param month - Month (1-12)
 * @param year - Year (e.g., 2026)
 * @param view - 'live' | 'submitted' | 'invoice_date'
 */
export async function getMonthlyReport(
  month: number,
  year: number,
  view: 'live' | 'submitted' | 'invoice_date' = 'live'
): Promise<ServerActionResult<MonthlyReportResponse>> {
  try {
    await getCurrentUser();

    // Get report period status
    const reportPeriod = await db.reportPeriod.findUnique({
      where: {
        unique_report_period: { month, year },
      },
      include: {
        finalized_by: {
          select: { id: true, full_name: true },
        },
      },
    });

    let reportData: MonthlyReportData;

    if (view === 'submitted' && reportPeriod?.snapshot_data) {
      // Return frozen snapshot
      const snapshot = reportPeriod.snapshot_data as unknown as ReportSnapshot;
      reportData = snapshot.report_data;
    } else if (view === 'invoice_date') {
      // Generate invoice-date based report
      reportData = await generateInvoiceDateReport(month, year);
    } else {
      // Generate live report
      reportData = await generateLiveReport(month, year);
    }

    return {
      success: true,
      data: {
        report_period: reportPeriod as ReportPeriodWithRelations | null,
        report_data: reportData,
        view,
      },
    };
  } catch (error) {
    console.error('getMonthlyReport error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get monthly report',
    };
  }
}

/**
 * Get consolidated report (EXPERIMENTAL)
 *
 * Uses combined view: invoices FROM this month + payments MADE in this month
 *
 * @param month - Month (1-12)
 * @param year - Year (e.g., 2026)
 * @param view - 'live' | 'reported'
 */
export async function getConsolidatedReport(
  month: number,
  year: number,
  view: 'live' | 'reported' = 'live'
): Promise<ServerActionResult<ConsolidatedReportResponse>> {
  try {
    await getCurrentUser();

    // Get report period status
    const reportPeriod = await db.reportPeriod.findUnique({
      where: {
        unique_report_period: { month, year },
      },
      include: {
        finalized_by: {
          select: { id: true, full_name: true },
        },
      },
    });

    let reportData: MonthlyReportData;

    if (view === 'reported' && reportPeriod?.snapshot_data) {
      // Return frozen snapshot
      const snapshot = reportPeriod.snapshot_data as unknown as ReportSnapshot;
      reportData = snapshot.report_data;
    } else {
      // Generate combined live report
      reportData = await generateCombinedReport(month, year);
    }

    return {
      success: true,
      data: {
        report_period: reportPeriod as ReportPeriodWithRelations | null,
        report_data: reportData,
        view,
      },
    };
  } catch (error) {
    console.error('getConsolidatedReport error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get consolidated report',
    };
  }
}

/**
 * Finalize consolidated report (EXPERIMENTAL)
 *
 * Creates a frozen snapshot using the combined report data.
 */
export async function finalizeConsolidatedReport(
  month: number,
  year: number,
  notes?: string
): Promise<ServerActionResult<ReportPeriodWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can finalize reports',
      };
    }

    // Check if already finalized
    const existing = await db.reportPeriod.findUnique({
      where: {
        unique_report_period: { month, year },
      },
    });

    if (existing?.status === REPORT_STATUS.FINALIZED || existing?.status === REPORT_STATUS.SUBMITTED) {
      return {
        success: false,
        error: 'Report is already finalized or submitted',
      };
    }

    // Generate COMBINED report data for snapshot
    const reportData = await generateCombinedReport(month, year);

    const snapshot: ReportSnapshot = {
      version: 1,
      report_data: reportData,
      finalized_at: new Date().toISOString(),
      finalized_by_name: currentUser.name,
    };

    // Upsert report period
    const reportPeriod = await db.reportPeriod.upsert({
      where: {
        unique_report_period: { month, year },
      },
      create: {
        month,
        year,
        status: REPORT_STATUS.FINALIZED,
        finalized_at: new Date(),
        finalized_by_id: currentUser.id,
        snapshot_data: snapshot as unknown as object,
        notes,
      },
      update: {
        status: REPORT_STATUS.FINALIZED,
        finalized_at: new Date(),
        finalized_by_id: currentUser.id,
        snapshot_data: snapshot as unknown as object,
        notes,
      },
      include: {
        finalized_by: {
          select: { id: true, full_name: true },
        },
      },
    });

    revalidatePath('/reports');

    return {
      success: true,
      data: reportPeriod as ReportPeriodWithRelations,
    };
  } catch (error) {
    console.error('finalizeConsolidatedReport error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to finalize report',
    };
  }
}

/**
 * Get report period status
 *
 * @param month - Month (1-12)
 * @param year - Year
 */
export async function getReportPeriod(
  month: number,
  year: number
): Promise<ServerActionResult<ReportPeriodWithRelations | null>> {
  try {
    await getCurrentUser();

    const reportPeriod = await db.reportPeriod.findUnique({
      where: {
        unique_report_period: { month, year },
      },
      include: {
        finalized_by: {
          select: { id: true, full_name: true },
        },
      },
    });

    return {
      success: true,
      data: reportPeriod as ReportPeriodWithRelations | null,
    };
  } catch (error) {
    console.error('getReportPeriod error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get report period',
    };
  }
}

/**
 * Finalize a monthly report
 *
 * Creates a frozen snapshot of the current report state.
 * Admin only.
 *
 * @param month - Month (1-12)
 * @param year - Year
 * @param notes - Optional notes
 */
export async function finalizeReport(
  month: number,
  year: number,
  notes?: string
): Promise<ServerActionResult<ReportPeriodWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can finalize reports',
      };
    }

    // Check if already finalized
    const existing = await db.reportPeriod.findUnique({
      where: {
        unique_report_period: { month, year },
      },
    });

    if (existing?.status === REPORT_STATUS.FINALIZED || existing?.status === REPORT_STATUS.SUBMITTED) {
      return {
        success: false,
        error: 'Report is already finalized or submitted',
      };
    }

    // Generate current report data for snapshot
    const reportData = await generateLiveReport(month, year);

    const snapshot: ReportSnapshot = {
      version: 1,
      report_data: reportData,
      finalized_at: new Date().toISOString(),
      finalized_by_name: currentUser.name,
    };

    // Upsert report period
    const reportPeriod = await db.reportPeriod.upsert({
      where: {
        unique_report_period: { month, year },
      },
      create: {
        month,
        year,
        status: REPORT_STATUS.FINALIZED,
        finalized_at: new Date(),
        finalized_by_id: currentUser.id,
        snapshot_data: snapshot as unknown as object,
        notes,
      },
      update: {
        status: REPORT_STATUS.FINALIZED,
        finalized_at: new Date(),
        finalized_by_id: currentUser.id,
        snapshot_data: snapshot as unknown as object,
        notes,
      },
      include: {
        finalized_by: {
          select: { id: true, full_name: true },
        },
      },
    });

    revalidatePath('/reports');

    return {
      success: true,
      data: reportPeriod as ReportPeriodWithRelations,
    };
  } catch (error) {
    console.error('finalizeReport error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to finalize report',
    };
  }
}

/**
 * Mark report as submitted
 *
 * Updates status to submitted with recipient info.
 * Admin only.
 *
 * @param month - Month (1-12)
 * @param year - Year
 * @param submittedTo - Email or name of accountant
 */
export async function submitReport(
  month: number,
  year: number,
  submittedTo: string
): Promise<ServerActionResult<ReportPeriodWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can submit reports',
      };
    }

    // Check if finalized
    const existing = await db.reportPeriod.findUnique({
      where: {
        unique_report_period: { month, year },
      },
    });

    if (!existing || existing.status === REPORT_STATUS.DRAFT) {
      return {
        success: false,
        error: 'Report must be finalized before submitting',
      };
    }

    if (existing.status === REPORT_STATUS.SUBMITTED) {
      return {
        success: false,
        error: 'Report is already submitted',
      };
    }

    const reportPeriod = await db.reportPeriod.update({
      where: {
        unique_report_period: { month, year },
      },
      data: {
        status: REPORT_STATUS.SUBMITTED,
        submitted_at: new Date(),
        submitted_to: submittedTo,
      },
      include: {
        finalized_by: {
          select: { id: true, full_name: true },
        },
      },
    });

    revalidatePath('/reports');

    return {
      success: true,
      data: reportPeriod as ReportPeriodWithRelations,
    };
  } catch (error) {
    console.error('submitReport error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit report',
    };
  }
}

/**
 * Unfinalize a report (revert to draft)
 *
 * Removes snapshot and reverts status to draft.
 * Super admin only.
 *
 * @param month - Month (1-12)
 * @param year - Year
 */
export async function unfinalizeReport(
  month: number,
  year: number
): Promise<ServerActionResult<ReportPeriodWithRelations>> {
  try {
    const currentUser = await getCurrentUser();

    if (currentUser.role !== 'super_admin') {
      return {
        success: false,
        error: 'Unauthorized: Only super administrators can unfinalize reports',
      };
    }

    const existing = await db.reportPeriod.findUnique({
      where: {
        unique_report_period: { month, year },
      },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Report period not found',
      };
    }

    const reportPeriod = await db.reportPeriod.update({
      where: {
        unique_report_period: { month, year },
      },
      data: {
        status: REPORT_STATUS.DRAFT,
        finalized_at: null,
        finalized_by_id: null,
        submitted_at: null,
        submitted_to: null,
        snapshot_data: Prisma.DbNull,
      },
      include: {
        finalized_by: {
          select: { id: true, full_name: true },
        },
      },
    });

    revalidatePath('/reports');

    return {
      success: true,
      data: reportPeriod as ReportPeriodWithRelations,
    };
  } catch (error) {
    console.error('unfinalizeReport error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unfinalize report',
    };
  }
}

/**
 * Get list of report periods with status
 *
 * @param year - Optional year filter
 */
export async function getReportPeriods(
  year?: number
): Promise<ServerActionResult<ReportPeriodWithRelations[]>> {
  try {
    await getCurrentUser();

    const reportPeriods = await db.reportPeriod.findMany({
      where: year ? { year } : undefined,
      include: {
        finalized_by: {
          select: { id: true, full_name: true },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    return {
      success: true,
      data: reportPeriods as ReportPeriodWithRelations[],
    };
  } catch (error) {
    console.error('getReportPeriods error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get report periods',
    };
  }
}

/**
 * Set reporting month for an invoice
 *
 * Used to assign late invoices to a specific month's report.
 *
 * @param invoiceId - Invoice ID
 * @param month - Month (1-12)
 * @param year - Year
 */
export async function setInvoiceReportingMonth(
  invoiceId: number,
  month: number,
  year: number
): Promise<ServerActionResult<{ invoiceId: number; reportingMonth: Date }>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can change reporting month',
      };
    }

    const reportingMonth = getMonthStart(month, year);

    await db.invoice.update({
      where: { id: invoiceId },
      data: { reporting_month: reportingMonth },
    });

    revalidatePath('/reports');
    revalidatePath('/invoices');

    return {
      success: true,
      data: { invoiceId, reportingMonth },
    };
  } catch (error) {
    console.error('setInvoiceReportingMonth error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set reporting month',
    };
  }
}
