/**
 * Server Actions: Dashboard Data Operations
 *
 * Production-ready server actions for dashboard KPIs, charts, and activity feed.
 * Sprint 12, Phase 1: Data Layer & Server Actions (4 SP)
 *
 * RBAC Logic:
 * - Standard users: Only see their own invoices (created_by = currentUserId)
 * - Admins/Super admins: See all invoices
 *
 * Caching: 60-second TTL using Next.js unstable_cache
 */

'use server';

import { unstable_cache } from 'next/cache';
import { auth, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { INVOICE_STATUS } from '@/types/invoice';
import { PAYMENT_STATUS } from '@/types/payment';
import {
  DATE_RANGE,
  ACTIVITY_TYPE,
  type DateRange,
  type DashboardKPIs,
  type StatusBreakdownItem,
  type PaymentTrendItem,
  type VendorSpendingItem,
  type InvoiceVolumeItem,
  type RecentActivityItem,
  type ActionResult,
} from '@/types/dashboard';

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
    role: session.user.role as string,
  };
}

/**
 * Convert date range string to Date object
 * Returns null for 'ALL' (no date filter)
 */
function getDateFromRange(range: DateRange): Date | null {
  const now = new Date();

  switch (range) {
    case DATE_RANGE.ONE_MONTH:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case DATE_RANGE.THREE_MONTHS:
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case DATE_RANGE.SIX_MONTHS:
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case DATE_RANGE.ONE_YEAR:
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case DATE_RANGE.ALL_TIME:
      return null;
    default:
      return null;
  }
}

/**
 * Build base where clause with RBAC filtering
 */
async function buildBaseWhereClause(
  dateRange?: DateRange
): Promise<Prisma.InvoiceWhereInput> {
  const user = await getCurrentUser();
  const isAdminUser = await isAdmin();

  const where: Prisma.InvoiceWhereInput = {
    is_hidden: false, // Always exclude hidden invoices
  };

  // RBAC filtering: Standard users only see their own invoices
  if (!isAdminUser) {
    where.created_by = user.id;
  }

  // Date range filtering on invoice_date
  if (dateRange && dateRange !== DATE_RANGE.ALL_TIME) {
    const startDate = getDateFromRange(dateRange);
    if (startDate) {
      where.invoice_date = {
        gte: startDate,
      };
    }
  }

  return where;
}

// ============================================================================
// KPI OPERATIONS
// ============================================================================

/**
 * Get dashboard KPI metrics
 *
 * @param dateRange - Optional date range filter
 * @returns 6 KPI values with RBAC filtering
 */
export async function getDashboardKPIs(
  dateRange?: DateRange
): Promise<ActionResult<DashboardKPIs>> {
  try {
    const where = await buildBaseWhereClause(dateRange);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get current month start date for paid invoices filter
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Execute all KPI queries in parallel for performance
    const [
      totalInvoices,
      pendingApprovals,
      unpaidInvoices,
      paidCurrentMonth,
      overdueInvoices,
      onHoldInvoices,
    ] = await Promise.all([
      // Total invoices count
      db.invoice.count({ where }),

      // Pending approvals count
      db.invoice.count({
        where: {
          ...where,
          status: INVOICE_STATUS.PENDING_APPROVAL,
        },
      }),

      // Total unpaid amount (unpaid + partial status)
      db.invoice.aggregate({
        where: {
          ...where,
          status: {
            in: [INVOICE_STATUS.UNPAID, INVOICE_STATUS.PARTIAL],
          },
        },
        _sum: {
          invoice_amount: true,
        },
      }),

      // Total paid current month
      db.payment.aggregate({
        where: {
          status: PAYMENT_STATUS.APPROVED,
          payment_date: {
            gte: currentMonthStart,
          },
          // Join filter for RBAC (if standard user, filter by invoice creator)
          invoice: await (async () => {
            const user = await getCurrentUser();
            const isAdminUser = await isAdmin();
            return isAdminUser ? undefined : { created_by: user.id };
          })(),
        },
        _sum: {
          amount_paid: true,
        },
      }),

      // Overdue invoices count (unpaid/partial + past due date)
      db.invoice.count({
        where: {
          ...where,
          status: {
            in: [INVOICE_STATUS.UNPAID, INVOICE_STATUS.PARTIAL],
          },
          due_date: {
            lt: today,
          },
        },
      }),

      // On hold invoices count
      db.invoice.count({
        where: {
          ...where,
          status: INVOICE_STATUS.ON_HOLD,
        },
      }),
    ]);

    const totalUnpaid = unpaidInvoices._sum.invoice_amount ?? 0;
    const totalPaidCurrentMonth = paidCurrentMonth._sum.amount_paid ?? 0;

    return {
      success: true,
      data: {
        totalInvoices,
        pendingApprovals,
        totalUnpaid,
        totalPaidCurrentMonth,
        overdueInvoices,
        onHoldInvoices,
      },
    };
  } catch (error) {
    console.error('getDashboardKPIs error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch dashboard KPIs',
    };
  }
}

// ============================================================================
// CHART DATA OPERATIONS
// ============================================================================

/**
 * Get invoice status breakdown for pie chart
 *
 * @param dateRange - Optional date range filter
 * @returns Status breakdown data (count and total value per status)
 */
export async function getInvoiceStatusBreakdown(
  dateRange?: DateRange
): Promise<ActionResult<StatusBreakdownItem[]>> {
  try {
    const where = await buildBaseWhereClause(dateRange);

    // Group by status and sum amounts
    const breakdown = await db.invoice.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        invoice_amount: true,
      },
    });

    const result: StatusBreakdownItem[] = breakdown.map((item) => ({
      status: item.status,
      count: item._count.id,
      value: item._sum.invoice_amount ?? 0,
    }));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('getInvoiceStatusBreakdown error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch status breakdown',
    };
  }
}

/**
 * Get payment trends over time for line chart
 *
 * @param dateRange - Date range filter (required)
 * @returns Monthly payment amounts and counts
 */
export async function getPaymentTrends(
  dateRange: DateRange
): Promise<ActionResult<PaymentTrendItem[]>> {
  try {
    const user = await getCurrentUser();
    const isAdminUser = await isAdmin();
    const startDate = getDateFromRange(dateRange);

    // Build payment where clause with RBAC
    const paymentWhere: Prisma.PaymentWhereInput = {
      status: PAYMENT_STATUS.APPROVED,
    };

    // Add date filter
    if (startDate) {
      paymentWhere.payment_date = {
        gte: startDate,
      };
    }

    // Add RBAC filter through invoice relation
    if (!isAdminUser) {
      paymentWhere.invoice = {
        created_by: user.id,
        is_hidden: false,
      };
    } else {
      paymentWhere.invoice = {
        is_hidden: false,
      };
    }

    // Fetch payments with date grouping
    const payments = await db.payment.findMany({
      where: paymentWhere,
      select: {
        payment_date: true,
        amount_paid: true,
      },
      orderBy: {
        payment_date: 'asc',
      },
    });

    // Group by month manually (Prisma doesn't support date_trunc in groupBy)
    const monthlyMap = new Map<string, { amount: number; count: number }>();

    payments.forEach((payment) => {
      const monthKey = payment.payment_date.toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyMap.get(monthKey) ?? { amount: 0, count: 0 };
      monthlyMap.set(monthKey, {
        amount: existing.amount + payment.amount_paid,
        count: existing.count + 1,
      });
    });

    // Convert to array and sort by date
    const result: PaymentTrendItem[] = Array.from(monthlyMap.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('getPaymentTrends error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch payment trends',
    };
  }
}

/**
 * Get top vendors by spending for bar chart
 *
 * @param dateRange - Date range filter (required)
 * @returns Top 10 vendors by total spending
 */
export async function getTopVendorsBySpending(
  dateRange: DateRange
): Promise<ActionResult<VendorSpendingItem[]>> {
  try {
    const where = await buildBaseWhereClause(dateRange);

    // Group by vendor and sum amounts
    const vendorSpending = await db.invoice.groupBy({
      by: ['vendor_id'],
      where,
      _sum: {
        invoice_amount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          invoice_amount: 'desc',
        },
      },
      take: 10, // Top 10 vendors
    });

    // Fetch vendor names
    const vendorIds = vendorSpending.map((v) => v.vendor_id);
    const vendors = await db.vendor.findMany({
      where: {
        id: {
          in: vendorIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));

    const result: VendorSpendingItem[] = vendorSpending.map((item) => ({
      vendor_name: vendorMap.get(item.vendor_id) ?? 'Unknown Vendor',
      total_amount: item._sum.invoice_amount ?? 0,
      invoice_count: item._count.id,
    }));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('getTopVendorsBySpending error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch vendor spending',
    };
  }
}

/**
 * Get monthly invoice volume for line chart
 *
 * @param dateRange - Date range filter (required)
 * @returns Monthly invoice counts
 */
export async function getMonthlyInvoiceVolume(
  dateRange: DateRange
): Promise<ActionResult<InvoiceVolumeItem[]>> {
  try {
    const where = await buildBaseWhereClause(dateRange);

    // Fetch invoices with date grouping
    const invoices = await db.invoice.findMany({
      where,
      select: {
        invoice_date: true,
      },
      orderBy: {
        invoice_date: 'asc',
      },
    });

    // Group by month manually
    const monthlyMap = new Map<string, number>();

    invoices.forEach((invoice) => {
      if (invoice.invoice_date) {
        const monthKey = invoice.invoice_date.toISOString().substring(0, 7); // YYYY-MM
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + 1);
      }
    });

    // Convert to array and sort by date
    const result: InvoiceVolumeItem[] = Array.from(monthlyMap.entries())
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('getMonthlyInvoiceVolume error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch invoice volume',
    };
  }
}

// ============================================================================
// ACTIVITY FEED OPERATIONS
// ============================================================================

/**
 * Get recent invoice-related activities
 *
 * @returns Last 10 invoice activities (created, paid, status changes, rejected)
 */
export async function getRecentActivity(): Promise<
  ActionResult<RecentActivityItem[]>
> {
  try {
    const user = await getCurrentUser();
    const isAdminUser = await isAdmin();

    // Build where clause for activity logs
    const activityWhere: Prisma.ActivityLogWhereInput = {
      // Filter by invoice visibility (RBAC)
      invoice: isAdminUser
        ? { is_hidden: false }
        : { created_by: user.id, is_hidden: false },
    };

    // Fetch recent activity logs
    const activities = await db.activityLog.findMany({
      where: activityWhere,
      select: {
        id: true,
        action: true,
        created_at: true,
        invoice_id: true,
        invoice: {
          select: {
            invoice_number: true,
            status: true,
          },
        },
        user: {
          select: {
            full_name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    // Map activity logs to RecentActivityItem
    const result: RecentActivityItem[] = activities
      .map((activity): RecentActivityItem | null => {
        let type: RecentActivityItem['type'];
        let description: string;

        // Map action to activity type
        switch (activity.action) {
          case 'invoice_created':
            type = ACTIVITY_TYPE.CREATED;
            description = `Invoice ${activity.invoice.invoice_number} was created`;
            break;
          case 'payment_approved':
          case 'invoice_paid':
            type = ACTIVITY_TYPE.PAID;
            description = `Invoice ${activity.invoice.invoice_number} was marked as paid`;
            break;
          case 'invoice_rejected':
            type = ACTIVITY_TYPE.REJECTED;
            description = `Invoice ${activity.invoice.invoice_number} was rejected`;
            break;
          case 'invoice_status_changed':
          case 'invoice_approved':
          case 'invoice_hold_placed':
            // Only include status changes that aren't "paid" (those are handled above)
            if (activity.invoice.status !== INVOICE_STATUS.PAID) {
              type = ACTIVITY_TYPE.STATUS_CHANGE;
              description = `Invoice ${activity.invoice.invoice_number} status changed to ${activity.invoice.status}`;
            } else {
              return null; // Skip this activity
            }
            break;
          default:
            return null; // Skip unknown actions
        }

        return {
          id: activity.id,
          type,
          invoice_id: activity.invoice_id,
          invoice_number: activity.invoice.invoice_number,
          description,
          user_name: activity.user?.full_name ?? 'System',
          timestamp: activity.created_at,
        };
      })
      .filter((item): item is RecentActivityItem => item !== null);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('getRecentActivity error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch recent activity',
    };
  }
}

// ============================================================================
// CACHED VERSIONS (60-second TTL)
// ============================================================================

/**
 * Cached version of getDashboardKPIs (60s TTL)
 */
export const getCachedDashboardKPIs = unstable_cache(
  getDashboardKPIs,
  ['dashboard-kpis'],
  {
    revalidate: 60, // 60 seconds
    tags: ['dashboard', 'kpis'],
  }
);

/**
 * Cached version of getInvoiceStatusBreakdown (60s TTL)
 */
export const getCachedInvoiceStatusBreakdown = unstable_cache(
  getInvoiceStatusBreakdown,
  ['dashboard-status-breakdown'],
  {
    revalidate: 60,
    tags: ['dashboard', 'status-breakdown'],
  }
);

/**
 * Cached version of getPaymentTrends (60s TTL)
 */
export const getCachedPaymentTrends = unstable_cache(
  getPaymentTrends,
  ['dashboard-payment-trends'],
  {
    revalidate: 60,
    tags: ['dashboard', 'payment-trends'],
  }
);

/**
 * Cached version of getTopVendorsBySpending (60s TTL)
 */
export const getCachedTopVendorsBySpending = unstable_cache(
  getTopVendorsBySpending,
  ['dashboard-vendor-spending'],
  {
    revalidate: 60,
    tags: ['dashboard', 'vendor-spending'],
  }
);

/**
 * Cached version of getMonthlyInvoiceVolume (60s TTL)
 */
export const getCachedMonthlyInvoiceVolume = unstable_cache(
  getMonthlyInvoiceVolume,
  ['dashboard-invoice-volume'],
  {
    revalidate: 60,
    tags: ['dashboard', 'invoice-volume'],
  }
);

/**
 * Cached version of getRecentActivity (60s TTL)
 */
export const getCachedRecentActivity = unstable_cache(
  getRecentActivity,
  ['dashboard-recent-activity'],
  {
    revalidate: 60,
    tags: ['dashboard', 'activity'],
  }
);

// ============================================================================
// SIDEBAR BADGE OPERATIONS
// ============================================================================

/**
 * Get sidebar badge counts (for navigation menu)
 *
 * @returns Badge counts with RBAC filtering
 * - invoiceCount: Sum of pending approvals + unpaid invoices
 */
export async function getSidebarBadgeCounts(): Promise<
  ActionResult<{ invoiceCount: number }>
> {
  try {
    const where = await buildBaseWhereClause();

    // Execute queries in parallel for performance
    const [pendingApprovals, unpaidInvoices] = await Promise.all([
      // Pending approvals count
      db.invoice.count({
        where: {
          ...where,
          status: INVOICE_STATUS.PENDING_APPROVAL,
        },
      }),

      // Unpaid invoices count (unpaid + partial status)
      db.invoice.count({
        where: {
          ...where,
          status: {
            in: [INVOICE_STATUS.UNPAID, INVOICE_STATUS.PARTIAL],
          },
        },
      }),
    ]);

    const invoiceCount = pendingApprovals + unpaidInvoices;

    return {
      success: true,
      data: { invoiceCount },
    };
  } catch (error) {
    console.error('getSidebarBadgeCounts error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch sidebar badge counts',
    };
  }
}

/**
 * Cached version of getSidebarBadgeCounts (30s TTL)
 * Shorter TTL than dashboard since badges need more frequent updates
 */
export const getCachedSidebarBadgeCounts = unstable_cache(
  getSidebarBadgeCounts,
  ['sidebar-badge-counts'],
  {
    revalidate: 30, // 30 seconds (more time-sensitive than dashboard)
    tags: ['sidebar', 'badges'],
  }
);
