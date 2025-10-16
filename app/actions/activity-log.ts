/**
 * Server Actions: Activity Log Operations
 *
 * Production-ready server actions for activity logging.
 * Sprint 7: Activity Logging Foundation
 *
 * Key Features:
 * - Non-blocking activity log creation (never throws errors)
 * - RBAC: Admins see all logs, standard users see only their own actions
 * - Pagination and filtering support
 * - CSV export functionality
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type {
  ActivityLogInput,
  ActivityLogFilters,
  ActivityLogListResponse,
  ServerActionResult,
  ActivityLogWithRelations,
} from '@/types/activity-log';
import type { ActivityAction } from '@/docs/SPRINT7_ACTIVITY_ACTIONS';
import {
  getActivityActionLabel,
  ACTIVITY_ACTION,
} from '@/docs/SPRINT7_ACTIVITY_ACTIONS';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 100;

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
 * Check if user is admin or super_admin
 */
function isAdmin(role: string): boolean {
  return role === 'admin' || role === 'super_admin';
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Internal function to create activity log entry
 * Called by other server actions (non-blocking)
 *
 * This function NEVER throws errors to prevent disrupting parent operations.
 * All errors are logged but swallowed.
 *
 * @param data - Activity log input data
 */
export async function createActivityLog(data: ActivityLogInput): Promise<void> {
  try {
    // Validate required fields
    if (!data.invoice_id || !data.action) {
      console.error('[Activity Log] Missing required fields:', {
        invoice_id: data.invoice_id,
        action: data.action,
      });
      return;
    }

    // Create activity log entry
    await db.activityLog.create({
      data: {
        invoice_id: data.invoice_id,
        user_id: data.user_id,
        action: data.action,
        old_data: data.old_data ? JSON.stringify(data.old_data) : null,
        new_data: data.new_data ? JSON.stringify(data.new_data) : null,
        ip_address: data.ip_address || null,
        user_agent: data.user_agent || null,
      },
    });
  } catch (error) {
    // Non-blocking: log error but don't throw
    console.error('[Activity Log] Failed to create log entry:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        invoice_id: data.invoice_id,
        user_id: data.user_id,
        action: data.action,
      },
    });
  }
}

/**
 * Get activity log for an invoice
 * RBAC: Admins see all logs, standard users see only their own actions
 *
 * @param invoiceId - Invoice ID
 * @param filters - Optional filters (pagination, action type, date range)
 * @returns Paginated activity log entries
 */
export async function getActivityLog(
  invoiceId: number,
  filters?: ActivityLogFilters
): Promise<ServerActionResult<ActivityLogListResponse>> {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();

    // 2. Check if invoice exists
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, invoice_number: true, is_hidden: true },
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
        error: 'Cannot access activity log for hidden invoice',
      };
    }

    // 3. Build query filters
    const page = filters?.page || 1;
    const perPage = Math.min(filters?.perPage || DEFAULT_PER_PAGE, MAX_PER_PAGE);
    const skip = (page - 1) * perPage;

    // RBAC: Standard users see only their own actions
    const whereClause: any = {
      invoice_id: invoiceId,
      ...(filters?.action && { action: filters.action }),
      ...(filters?.startDate && {
        created_at: { gte: filters.startDate },
      }),
      ...(filters?.endDate && {
        created_at: { lte: filters.endDate },
      }),
    };

    // Apply user filter based on role
    if (filters?.userId) {
      whereClause.user_id = filters.userId;
    } else if (!isAdmin(user.role)) {
      // Standard users see only their own actions
      whereClause.user_id = user.id;
    }

    // 4. Query activity logs with pagination
    const [entries, total] = await Promise.all([
      db.activityLog.findMany({
        where: whereClause,
        include: {
          invoice: {
            select: {
              id: true,
              invoice_number: true,
            },
          },
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: perPage,
      }),
      db.activityLog.count({ where: whereClause }),
    ]);

    return {
      success: true,
      data: {
        entries: entries as ActivityLogWithRelations[],
        pagination: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
      },
    };
  } catch (error) {
    console.error('[Activity Log] getActivityLog error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity log',
    };
  }
}

/**
 * Export activity log to CSV
 *
 * @param invoiceId - Invoice ID
 * @param filters - Optional filters (action type, date range)
 * @returns CSV data and filename
 */
export async function exportActivityLog(
  invoiceId: number,
  filters?: ActivityLogFilters
): Promise<ServerActionResult<{ csvData: string; filename: string }>> {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();

    // 2. Check if invoice exists
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, invoice_number: true, is_hidden: true },
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
        error: 'Cannot export activity log for hidden invoice',
      };
    }

    // 3. Build query filters (no pagination for export)
    const whereClause: any = {
      invoice_id: invoiceId,
      ...(filters?.action && { action: filters.action }),
      ...(filters?.startDate && {
        created_at: { gte: filters.startDate },
      }),
      ...(filters?.endDate && {
        created_at: { lte: filters.endDate },
      }),
    };

    // RBAC: Standard users export only their own actions
    if (filters?.userId) {
      whereClause.user_id = filters.userId;
    } else if (!isAdmin(user.role)) {
      whereClause.user_id = user.id;
    }

    // 4. Query all matching activity logs
    const entries = await db.activityLog.findMany({
      where: whereClause,
      include: {
        invoice: {
          select: {
            id: true,
            invoice_number: true,
          },
        },
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // 5. Generate CSV
    const headers = ['Timestamp', 'User', 'Action', 'Invoice Number', 'Old Data', 'New Data'];
    const rows = entries.map((entry): string[] => [
      entry.created_at.toISOString(),
      entry.user?.full_name || 'System',
      getActivityActionLabel(entry.action as ActivityAction),
      entry.invoice?.invoice_number ?? '—',
      entry.old_data || '',
      entry.new_data || '',
    ]);

    const csvData = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const filename = `activity-log-${invoice.invoice_number}-${new Date().toISOString().split('T')[0]}.csv`;

    return {
      success: true,
      data: { csvData, filename },
    };
  } catch (error) {
    console.error('[Activity Log] exportActivityLog error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export activity log',
    };
  }
}

/**
 * Get activity log statistics for an invoice
 * Returns summary of actions and recent activity
 *
 * @param invoiceId - Invoice ID
 * @returns Activity statistics
 */
export async function getActivityLogStats(
  invoiceId: number
): Promise<
  ServerActionResult<{
    totalActions: number;
    recentActions: ActivityLogWithRelations[];
    actionCounts: Record<string, number>;
  }>
> {
  try {
    // 1. Authenticate user
    await getCurrentUser();

    // 2. Check if invoice exists
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, is_hidden: true },
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
        error: 'Cannot access activity log for hidden invoice',
      };
    }

    // 3. Get total count
    const totalActions = await db.activityLog.count({
      where: { invoice_id: invoiceId },
    });

    // 4. Get recent actions (last 10)
    const recentActions = await db.activityLog.findMany({
      where: { invoice_id: invoiceId },
      include: {
        invoice: {
          select: {
            id: true,
            invoice_number: true,
          },
        },
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    // 5. Get action counts
    const allActions = await db.activityLog.findMany({
      where: { invoice_id: invoiceId },
      select: { action: true },
    });

    const actionCounts: Record<string, number> = {};
    for (const action of allActions) {
      actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
    }

    return {
      success: true,
      data: {
        totalActions,
        recentActions: recentActions as ActivityLogWithRelations[],
        actionCounts,
      },
    };
  } catch (error) {
    console.error('[Activity Log] getActivityLogStats error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity statistics',
    };
  }
}
