/**
 * Server Actions: Bulk Operations
 *
 * Production-ready bulk operations for invoices.
 * Sprint 7 Phase 8: Bulk Operations Implementation
 *
 * Key Features:
 * - Pre-validation: Check all invoices before executing (fail early)
 * - RBAC: Admin-only for approve/reject, all users for export
 * - Activity logging: One log entry per bulk operation
 * - CSV export: User-selectable columns
 * - Error handling: Clear feedback on failures
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { INVOICE_STATUS } from '@/types/invoice';
import { bulkRejectSchema, bulkExportSchema } from '@/lib/validations/bulk-operations';
import { EXPORT_COLUMNS, type BulkOperationResult } from '@/types/bulk-operations';
import { createActivityLog } from '@/app/actions/activity-log';
import { ACTIVITY_ACTION } from '@/docs/SPRINT7_ACTIVITY_ACTIONS';
import type { ServerActionResult } from '@/types/bulk-operations';

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

/**
 * Format value for CSV export
 */
function formatCsvValue(value: unknown, columnId: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Date formatting
  if (columnId.includes('date') || columnId.includes('_at')) {
    if (value instanceof Date) {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(value);
    }
    return '';
  }

  // Currency formatting
  if (columnId.includes('amount') || columnId.includes('paid') || columnId.includes('balance')) {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (!isNaN(num)) {
      return `$${num.toFixed(2)}`;
    }
    return '';
  }

  // Boolean formatting
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Default: convert to string
  return String(value);
}

/**
 * Escape CSV value (handle quotes and commas)
 */
function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Bulk approve invoices (admin only)
 * Pre-validates all invoices before executing
 *
 * @param invoiceIds - Array of invoice IDs to approve
 * @returns Result with success count and failed IDs
 */
export async function bulkApproveInvoices(
  invoiceIds: number[]
): Promise<ServerActionResult<BulkOperationResult>> {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();

    // 2. RBAC check
    if (!isAdmin(user.role)) {
      return {
        success: false,
        error: 'Permission denied: Only admins can approve invoices',
      };
    }

    // 3. Validate input
    if (!invoiceIds || invoiceIds.length === 0) {
      return {
        success: false,
        error: 'No invoices selected',
      };
    }

    // 4. Pre-validation: Check all invoices
    const invoices = await db.invoice.findMany({
      where: { id: { in: invoiceIds } },
      select: {
        id: true,
        invoice_number: true,
        status: true,
        is_hidden: true,
      },
    });

    const errors: Record<number, string> = {};

    for (const id of invoiceIds) {
      const invoice = invoices.find((inv: (typeof invoices)[number]) => inv.id === id);

      if (!invoice) {
        errors[id] = 'Invoice not found';
      } else if (invoice.is_hidden) {
        errors[id] = 'Invoice is hidden';
      } else if (invoice.status !== INVOICE_STATUS.PENDING_APPROVAL) {
        errors[id] = `Cannot approve invoice with status: ${invoice.status}`;
      }
    }

    // 5. If ANY errors, return early (fail fast)
    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        error: `Pre-validation failed. ${Object.keys(errors).length} invoice(s) cannot be approved. Details: ${Object.entries(errors).map(([id, msg]) => `Invoice ${id}: ${msg}`).join('; ')}`,
      };
    }

    // 6. All valid - execute bulk approve
    await db.invoice.updateMany({
      where: {
        id: { in: invoiceIds },
        status: INVOICE_STATUS.PENDING_APPROVAL,
        is_hidden: false,
      },
      data: {
        status: INVOICE_STATUS.UNPAID,
        updated_at: new Date(),
      },
    });

    // 7. Create activity log (non-blocking)
    await createActivityLog({
      invoice_id: invoiceIds[0], // Use first invoice as reference
      user_id: user.id,
      action: ACTIVITY_ACTION.BULK_APPROVE,
      new_data: {
        invoiceIds,
        count: invoiceIds.length,
        status: INVOICE_STATUS.UNPAID,
      },
    });

    // 8. Revalidate cache
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        successCount: invoiceIds.length,
        failedIds: [],
        errors: {},
      },
    };
  } catch (error) {
    console.error('[Bulk Operations] bulkApproveInvoices error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve invoices',
    };
  }
}

/**
 * Bulk reject invoices with reason (admin only)
 * Pre-validates all invoices before executing
 *
 * @param invoiceIds - Array of invoice IDs to reject
 * @param rejectionReason - Reason for rejection (10-500 chars)
 * @returns Result with success count and failed IDs
 */
export async function bulkRejectInvoices(
  invoiceIds: number[],
  rejectionReason: string
): Promise<ServerActionResult<BulkOperationResult>> {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();

    // 2. RBAC check
    if (!isAdmin(user.role)) {
      return {
        success: false,
        error: 'Permission denied: Only admins can reject invoices',
      };
    }

    // 3. Validate input with Zod schema
    const validation = bulkRejectSchema.safeParse({
      invoiceIds,
      rejectionReason,
    });

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Validation failed',
      };
    }

    // 4. Pre-validation: Check all invoices
    const invoices = await db.invoice.findMany({
      where: { id: { in: invoiceIds } },
      select: {
        id: true,
        invoice_number: true,
        status: true,
        is_hidden: true,
      },
    });

    const errors: Record<number, string> = {};

    for (const id of invoiceIds) {
      const invoice = invoices.find((inv: (typeof invoices)[number]) => inv.id === id);

      if (!invoice) {
        errors[id] = 'Invoice not found';
      } else if (invoice.is_hidden) {
        errors[id] = 'Invoice is hidden';
      } else if (invoice.status !== INVOICE_STATUS.PENDING_APPROVAL) {
        errors[id] = `Cannot reject invoice with status: ${invoice.status}`;
      }
    }

    // 5. If ANY errors, return early (fail fast)
    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        error: `Pre-validation failed. ${Object.keys(errors).length} invoice(s) cannot be rejected. Details: ${Object.entries(errors).map(([id, msg]) => `Invoice ${id}: ${msg}`).join('; ')}`,
      };
    }

    // 6. All valid - execute bulk reject
    await db.invoice.updateMany({
      where: {
        id: { in: invoiceIds },
        status: INVOICE_STATUS.PENDING_APPROVAL,
        is_hidden: false,
      },
      data: {
        status: INVOICE_STATUS.REJECTED,
        rejection_reason: rejectionReason,
        rejected_by: user.id,
        rejected_at: new Date(),
        updated_at: new Date(),
      },
    });

    // 7. Create activity log (non-blocking)
    await createActivityLog({
      invoice_id: invoiceIds[0], // Use first invoice as reference
      user_id: user.id,
      action: ACTIVITY_ACTION.BULK_REJECT,
      new_data: {
        invoiceIds,
        count: invoiceIds.length,
        status: INVOICE_STATUS.REJECTED,
        rejectionReason,
      },
    });

    // 8. Revalidate cache
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        successCount: invoiceIds.length,
        failedIds: [],
        errors: {},
      },
    };
  } catch (error) {
    console.error('[Bulk Operations] bulkRejectInvoices error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject invoices',
    };
  }
}

/**
 * Bulk export invoices to CSV
 * User selects which columns to export
 *
 * @param invoiceIds - Array of invoice IDs to export
 * @param columnIds - Array of column IDs to include in export
 * @returns CSV content string ready for download
 */
export async function bulkExportInvoices(
  invoiceIds: number[],
  columnIds: string[]
): Promise<ServerActionResult<{ csvContent: string }>> {
  try {
    // 1. Authenticate user (all authenticated users can export)
    const user = await getCurrentUser();

    // 2. Validate input with Zod schema
    const validation = bulkExportSchema.safeParse({
      invoiceIds,
      selectedColumns: columnIds,
      format: 'csv',
    });

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Validation failed',
      };
    }

    // 3. Validate column IDs
    const validColumnIds = EXPORT_COLUMNS.map((col) => col.id);
    const invalidColumns = columnIds.filter((id) => !validColumnIds.includes(id));

    if (invalidColumns.length > 0) {
      return {
        success: false,
        error: `Invalid column IDs: ${invalidColumns.join(', ')}`,
      };
    }

    // 4. Fetch invoices with relations
    const invoices = await db.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        is_hidden: false, // Only export non-hidden invoices
      },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true },
        },
        profile: {
          select: { id: true, name: true },
        },
        sub_entity: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, full_name: true, email: true },
        },
      },
      orderBy: { invoice_date: 'desc' },
    });

    if (invoices.length === 0) {
      return {
        success: false,
        error: 'No invoices found to export',
      };
    }

    // 5. Calculate computed fields (totalPaid, remainingBalance)
    const invoicesWithTotals = await Promise.all(
      invoices.map(async (invoice: (typeof invoices)[number]) => {
        const payments = await db.payment.findMany({
          where: { invoice_id: invoice.id },
          select: { amount_paid: true },
        });

        const totalPaid = payments.reduce((sum: number, p: { amount_paid: number }) => sum + p.amount_paid, 0);
        const remainingBalance = invoice.invoice_amount - totalPaid;

        return {
          ...invoice,
          totalPaid,
          remainingBalance,
        };
      })
    );

    // 6. Build CSV header row
    const headers = columnIds
      .map((id) => {
        const column = EXPORT_COLUMNS.find((col) => col.id === id);
        return column ? column.label : id;
      })
      .join(',');

    // 7. Build CSV data rows
    const rows = invoicesWithTotals.map((invoice) => {
      const rowData = columnIds.map((columnId) => {
        let value: unknown;

        switch (columnId) {
          case 'invoice_number':
            value = invoice.invoice_number;
            break;
          case 'vendor_name':
            value = invoice.vendor?.name || '';
            break;
          case 'category_name':
            value = invoice.category?.name || '';
            break;
          case 'invoice_amount':
            value = invoice.invoice_amount;
            break;
          case 'invoice_date':
            value = invoice.invoice_date;
            break;
          case 'due_date':
            value = invoice.due_date;
            break;
          case 'status':
            value = invoice.status;
            break;
          case 'total_paid':
            value = invoice.totalPaid;
            break;
          case 'remaining_balance':
            value = invoice.remainingBalance;
            break;
          case 'created_at':
            value = invoice.created_at;
            break;
          case 'created_by':
            value = invoice.creator?.full_name || invoice.creator?.email || '';
            break;
          case 'profile_name':
            value = invoice.profile?.name || '';
            break;
          case 'sub_entity_name':
            value = invoice.sub_entity?.name || '';
            break;
          case 'notes':
            value = invoice.notes || '';
            break;
          default:
            value = '';
        }

        const formatted = formatCsvValue(value, columnId);
        return escapeCsvValue(formatted);
      });

      return rowData.join(',');
    });

    // 8. Combine header and rows
    const csvContent = [headers, ...rows].join('\n');

    // 9. Create activity log (non-blocking)
    await createActivityLog({
      invoice_id: invoiceIds[0], // Use first invoice as reference
      user_id: user.id,
      action: ACTIVITY_ACTION.BULK_EXPORT,
      new_data: {
        invoiceIds,
        count: invoiceIds.length,
        columns: columnIds,
        format: 'csv',
      },
    });

    return {
      success: true,
      data: { csvContent },
    };
  } catch (error) {
    console.error('[Bulk Operations] bulkExportInvoices error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export invoices',
    };
  }
}
