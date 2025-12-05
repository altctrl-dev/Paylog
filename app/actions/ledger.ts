/**
 * Server Actions: Ledger Operations
 *
 * Server actions for fetching ledger data per invoice profile.
 * Provides transaction history with running balances for bookkeeping view.
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PAYMENT_STATUS } from '@/types/payment';
import { calculateTds } from '@/lib/utils/tds';
import type {
  LedgerEntry,
  LedgerSummary,
  LedgerResponse,
  LedgerFilters,
  LedgerProfileOption,
} from '@/types/ledger';

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
// SERVER ACTION RESULT TYPE
// ============================================================================

type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// LEDGER OPERATIONS
// ============================================================================

/**
 * Get all invoice profiles for ledger dropdown
 *
 * Returns profiles with summary info (unpaid count, outstanding balance)
 */
export async function getLedgerProfiles(): Promise<
  ServerActionResult<LedgerProfileOption[]>
> {
  try {
    await getCurrentUser();

    const profiles = await db.invoiceProfile.findMany({
      select: {
        id: true,
        name: true,
        vendor: {
          select: { name: true },
        },
        entity: {
          select: { name: true },
        },
        invoices: {
          where: {
            is_hidden: false,
            is_archived: false,
            status: {
              in: ['unpaid', 'partial', 'overdue'],
            },
          },
          select: {
            id: true,
            invoice_amount: true,
            tds_applicable: true,
            tds_percentage: true,
            payments: {
              where: { status: PAYMENT_STATUS.APPROVED },
              select: { amount_paid: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const options: LedgerProfileOption[] = profiles.map((profile) => {
      let totalOutstanding = 0;
      let unpaidCount = 0;

      profile.invoices.forEach((inv) => {
        const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount_paid, 0);
        const tds = inv.tds_applicable && inv.tds_percentage
          ? calculateTds(inv.invoice_amount, inv.tds_percentage, false)
          : { payableAmount: inv.invoice_amount };
        const remaining = tds.payableAmount - totalPaid;

        if (remaining > 0) {
          totalOutstanding += remaining;
          unpaidCount++;
        }
      });

      return {
        id: profile.id,
        name: profile.name,
        vendorName: profile.vendor.name,
        entityName: profile.entity.name,
        hasUnpaidInvoices: unpaidCount > 0,
        unpaidCount,
        totalOutstanding,
      };
    });

    return { success: true, data: options };
  } catch (error) {
    console.error('getLedgerProfiles error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profiles',
    };
  }
}

/**
 * Get ledger entries for a specific invoice profile
 *
 * Returns chronological list of invoices and payments with running balance
 */
export async function getLedgerByProfile(
  filters: LedgerFilters
): Promise<ServerActionResult<LedgerResponse>> {
  try {
    await getCurrentUser();

    const { profileId, startDate, endDate, entryType, search } = filters;

    // Get profile info
    const profile = await db.invoiceProfile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        name: true,
        vendor: { select: { name: true } },
        entity: { select: { name: true } },
      },
    });

    if (!profile) {
      return { success: false, error: 'Invoice profile not found' };
    }

    // Build invoice where clause
    const invoiceWhere: Record<string, unknown> = {
      profile_id: profileId,
      is_hidden: false,
    };

    if (startDate || endDate) {
      invoiceWhere.invoice_date = {};
      if (startDate) (invoiceWhere.invoice_date as Record<string, Date>).gte = startDate;
      if (endDate) (invoiceWhere.invoice_date as Record<string, Date>).lte = endDate;
    }

    if (search) {
      invoiceWhere.invoice_number = { contains: search, mode: 'insensitive' };
    }

    // Fetch invoices with their payments
    const invoices = await db.invoice.findMany({
      where: invoiceWhere,
      select: {
        id: true,
        invoice_number: true,
        invoice_amount: true,
        invoice_date: true,
        tds_applicable: true,
        tds_percentage: true,
        status: true,
        payments: {
          where: { status: PAYMENT_STATUS.APPROVED },
          select: {
            id: true,
            amount_paid: true,
            payment_date: true,
            payment_method: true,
            payment_reference: true,
            tds_amount_applied: true,
            tds_rounded: true,
          },
          orderBy: { payment_date: 'asc' },
        },
      },
      orderBy: { invoice_date: 'asc' },
    });

    // Build ledger entries
    const entries: LedgerEntry[] = [];
    let runningBalance = 0;

    // Summary accumulators
    let totalInvoiced = 0;
    let totalTdsDeducted = 0;
    let totalPaid = 0;
    let invoiceCount = 0;
    let paymentCount = 0;
    let unpaidInvoiceCount = 0;
    let overdueInvoiceCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a combined list of events sorted by date
    type LedgerEvent = {
      type: 'invoice' | 'payment';
      date: Date;
      invoice: typeof invoices[0];
      payment?: typeof invoices[0]['payments'][0];
    };

    const events: LedgerEvent[] = [];

    invoices.forEach((invoice) => {
      // Add invoice event
      if (invoice.invoice_date) {
        events.push({
          type: 'invoice',
          date: invoice.invoice_date,
          invoice,
        });
      }

      // Add payment events
      invoice.payments.forEach((payment) => {
        events.push({
          type: 'payment',
          date: payment.payment_date,
          invoice,
          payment,
        });
      });
    });

    // Sort by date ascending
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Process events and calculate running balance
    const processedInvoiceIds = new Set<number>();

    events.forEach((event) => {
      const inv = event.invoice;

      if (event.type === 'invoice') {
        // Skip if filtering by payment type only
        if (entryType === 'payment') return;

        // Calculate TDS for this invoice
        const tdsCalc = inv.tds_applicable && inv.tds_percentage
          ? calculateTds(inv.invoice_amount, inv.tds_percentage, false)
          : { tdsAmount: 0, payableAmount: inv.invoice_amount };

        // Add to running balance
        runningBalance += tdsCalc.payableAmount;

        // Update summary
        if (!processedInvoiceIds.has(inv.id)) {
          totalInvoiced += inv.invoice_amount;
          totalTdsDeducted += tdsCalc.tdsAmount;
          invoiceCount++;
          processedInvoiceIds.add(inv.id);

          // Check if unpaid/overdue
          const invTotalPaid = inv.payments.reduce((sum, p) => sum + p.amount_paid, 0);
          if (tdsCalc.payableAmount - invTotalPaid > 0.01) {
            unpaidInvoiceCount++;
          }
        }

        entries.push({
          id: `inv-${inv.id}`,
          type: 'invoice' as const,
          date: event.date,
          description: `Invoice #${inv.invoice_number}`,
          invoiceNumber: inv.invoice_number,
          invoiceId: inv.id,
          invoiceAmount: inv.invoice_amount,
          tdsPercentage: inv.tds_percentage,
          tdsApplicable: inv.tds_applicable,
          payableAmount: tdsCalc.payableAmount,
          paidAmount: null,
          tdsAmountApplied: tdsCalc.tdsAmount,
          tdsRounded: false,
          transactionRef: null,
          paymentMethod: null,
          runningBalance,
        });
      } else if (event.type === 'payment' && event.payment) {
        // Skip if filtering by invoice type only
        if (entryType === 'invoice') return;

        const payment = event.payment;

        // Subtract from running balance
        runningBalance -= payment.amount_paid;

        // Update summary
        totalPaid += payment.amount_paid;
        paymentCount++;

        entries.push({
          id: `pay-${payment.id}`,
          type: 'payment' as const,
          date: event.date,
          description: payment.payment_method
            ? `Payment (${payment.payment_method})`
            : 'Payment',
          invoiceNumber: inv.invoice_number,
          invoiceId: inv.id,
          invoiceAmount: null,
          tdsPercentage: null,
          tdsApplicable: false,
          payableAmount: null,
          paidAmount: payment.amount_paid,
          tdsAmountApplied: payment.tds_amount_applied,
          tdsRounded: payment.tds_rounded,
          transactionRef: payment.payment_reference,
          paymentMethod: payment.payment_method,
          runningBalance,
        });
      }
    });

    // Check for overdue invoices
    invoices.forEach((inv) => {
      if (inv.status === 'overdue') {
        overdueInvoiceCount++;
      }
    });

    const summary: LedgerSummary = {
      profileId,
      profileName: profile.name,
      vendorName: profile.vendor.name,
      entityName: profile.entity.name,
      totalInvoiced,
      totalTdsDeducted,
      totalPayable: totalInvoiced - totalTdsDeducted,
      totalPaid,
      outstandingBalance: totalInvoiced - totalTdsDeducted - totalPaid,
      invoiceCount,
      paymentCount,
      unpaidInvoiceCount,
      overdueInvoiceCount,
    };

    return {
      success: true,
      data: {
        entries,
        summary,
        filters,
      },
    };
  } catch (error) {
    console.error('getLedgerByProfile error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch ledger',
    };
  }
}

/**
 * Get ledger summary only (for quick stats)
 */
export async function getLedgerSummary(
  profileId: number
): Promise<ServerActionResult<LedgerSummary>> {
  try {
    await getCurrentUser();

    // Get profile info
    const profile = await db.invoiceProfile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        name: true,
        vendor: { select: { name: true } },
        entity: { select: { name: true } },
      },
    });

    if (!profile) {
      return { success: false, error: 'Invoice profile not found' };
    }

    // Fetch all invoices for this profile
    const invoices = await db.invoice.findMany({
      where: {
        profile_id: profileId,
        is_hidden: false,
      },
      select: {
        id: true,
        invoice_amount: true,
        tds_applicable: true,
        tds_percentage: true,
        status: true,
        due_date: true,
        payments: {
          where: { status: PAYMENT_STATUS.APPROVED },
          select: { amount_paid: true },
        },
      },
    });

    let totalInvoiced = 0;
    let totalTdsDeducted = 0;
    let totalPaid = 0;
    let unpaidInvoiceCount = 0;
    let overdueInvoiceCount = 0;
    let paymentCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    invoices.forEach((inv) => {
      totalInvoiced += inv.invoice_amount;

      const tdsCalc = inv.tds_applicable && inv.tds_percentage
        ? calculateTds(inv.invoice_amount, inv.tds_percentage, false)
        : { tdsAmount: 0, payableAmount: inv.invoice_amount };

      totalTdsDeducted += tdsCalc.tdsAmount;

      const invTotalPaid = inv.payments.reduce((sum, p) => sum + p.amount_paid, 0);
      totalPaid += invTotalPaid;
      paymentCount += inv.payments.length;

      const remaining = tdsCalc.payableAmount - invTotalPaid;
      if (remaining > 0.01) {
        unpaidInvoiceCount++;
        if (inv.due_date && inv.due_date < today) {
          overdueInvoiceCount++;
        }
      }
    });

    return {
      success: true,
      data: {
        profileId,
        profileName: profile.name,
        vendorName: profile.vendor.name,
        entityName: profile.entity.name,
        totalInvoiced,
        totalTdsDeducted,
        totalPayable: totalInvoiced - totalTdsDeducted,
        totalPaid,
        outstandingBalance: totalInvoiced - totalTdsDeducted - totalPaid,
        invoiceCount: invoices.length,
        paymentCount,
        unpaidInvoiceCount,
        overdueInvoiceCount,
      },
    };
  } catch (error) {
    console.error('getLedgerSummary error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch summary',
    };
  }
}
