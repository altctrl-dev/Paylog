/**
 * Server Actions: Invoice CRUD Operations
 *
 * Production-ready server actions with authentication, validation, and error handling.
 * All actions use NextAuth session for user context.
 */

'use server';

import type { Prisma } from '@prisma/client';
import { auth, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  INVOICE_STATUS,
  type InvoiceWithRelations,
  type InvoiceListResponse,
  type ServerActionResult,
} from '@/types/invoice';
import { PAYMENT_STATUS } from '@/types/payment';
import {
  invoiceFormSchema,
  holdInvoiceSchema,
  rejectInvoiceSchema,
  invoiceFiltersSchema,
} from '@/lib/validations/invoice';
import { revalidatePath } from 'next/cache';
import { createActivityLog } from '@/app/actions/activity-log';
import { ACTIVITY_ACTION } from '@/docs/SPRINT7_ACTIVITY_ACTIONS';

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
 * Include relations for invoice queries
 */
const invoiceInclude = {
  vendor: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  profile: {
    select: {
      id: true,
      name: true,
    },
  },
  sub_entity: {
    select: {
      id: true,
      name: true,
    },
  },
  creator: {
    select: {
      id: true,
      full_name: true,
      email: true,
    },
  },
  holder: {
    select: {
      id: true,
      full_name: true,
    },
  },
  rejector: {
    select: {
      id: true,
      full_name: true,
    },
  },
  currency: {
    select: {
      id: true,
      code: true,
      symbol: true,
    },
  },
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DUE_SOON_THRESHOLD_DAYS = 3;

function formatDays(count: number): string {
  return `${count} day${count === 1 ? '' : 's'}`;
}

type DueState = {
  dueLabel: string | null;
  daysOverdue: number;
  daysUntilDue: number;
  isDueSoon: boolean;
  variant: 'destructive' | 'warning' | 'muted' | null;
};

function computeDueState(options: {
  status: string;
  dueDate: Date | null;
  remainingBalance: number;
  today: Date;
}): DueState {
  const { status, dueDate, remainingBalance, today } = options;
  const result: DueState = {
    dueLabel: null,
    daysOverdue: 0,
    daysUntilDue: 0,
    isDueSoon: false,
    variant: null,
  };

  const isOutstandingStatus =
    status === INVOICE_STATUS.UNPAID || status === INVOICE_STATUS.PARTIAL;

  if (!isOutstandingStatus || remainingBalance <= 0 || !dueDate) {
    return result;
  }

  const normalizedDueDate = new Date(dueDate);
  normalizedDueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (normalizedDueDate.getTime() - today.getTime()) / MS_PER_DAY
  );

  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    result.daysOverdue = daysOverdue;
    result.dueLabel = `Overdue by ${formatDays(daysOverdue)}`;
    result.variant = 'destructive';
    return result;
  }

  if (diffDays === 0) {
    result.dueLabel = 'Due today';
    result.variant = 'warning';
    return result;
  }

  result.daysUntilDue = diffDays;
  result.dueLabel = `Due in ${formatDays(diffDays)}`;
  result.isDueSoon = diffDays <= DUE_SOON_THRESHOLD_DAYS;
  result.variant = result.isDueSoon ? 'warning' : 'muted';
  return result;
}

function computePriorityRank(status: string, dueState: DueState): number {
  switch (status) {
    case INVOICE_STATUS.PENDING_APPROVAL:
      return 0;
    case INVOICE_STATUS.UNPAID:
    case INVOICE_STATUS.PARTIAL: {
      if (dueState.daysOverdue > 0) {
        return 1;
      }
      if (dueState.isDueSoon) {
        return 2;
      }
      return 3;
    }
    case INVOICE_STATUS.ON_HOLD:
      return 4;
    case INVOICE_STATUS.PAID:
      return 5;
    default:
      return 6;
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get paginated list of invoices with filters
 *
 * @param filters - Search, status, pagination parameters
 * @returns Paginated invoice list with relations
 */
export async function getInvoices(
  filters?: Partial<typeof invoiceFiltersSchema._type>
): Promise<ServerActionResult<InvoiceListResponse>> {
  try {
    await getCurrentUser();

    // Validate and set defaults
    const validated = invoiceFiltersSchema.parse({
      page: filters?.page || 1,
      per_page: filters?.per_page || 20,
      ...filters,
    });

    // Build where clause
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Prisma.InvoiceWhereInput = {
      is_hidden: false, // Always exclude hidden invoices by default
    };

    if (validated.search) {
      where.OR = [
        {
          invoice_number: {
            contains: validated.search,
          },
        },
        {
          vendor: {
            name: {
              contains: validated.search,
            },
          },
        },
      ];
    }

    if (validated.status) {
      if (validated.status === INVOICE_STATUS.OVERDUE) {
        where.status = {
          in: [
            INVOICE_STATUS.UNPAID,
            INVOICE_STATUS.PARTIAL,
            INVOICE_STATUS.OVERDUE,
          ],
        };
        where.due_date = {
          lt: today,
        };
      } else {
        where.status = validated.status;
      }
    }

    if (validated.vendor_id) {
      where.vendor_id = validated.vendor_id;
    }

    if (validated.category_id) {
      where.category_id = validated.category_id;
    }

    if (validated.profile_id) {
      where.profile_id = validated.profile_id;
    }

    // Date range filter for invoice_date
    if (validated.start_date || validated.end_date) {
      where.invoice_date = {};

      if (validated.start_date) {
        // Set start of day for start_date
        const startDate = new Date(validated.start_date);
        startDate.setHours(0, 0, 0, 0);
        where.invoice_date.gte = startDate;
      }

      if (validated.end_date) {
        // Set end of day for end_date
        const endDate = new Date(validated.end_date);
        endDate.setHours(23, 59, 59, 999);
        where.invoice_date.lte = endDate;
      }
    }

    // Determine ordering strategy
    // If explicit sort requested, use database ordering and skip priority sort
    // Otherwise, fetch all and apply priority sorting in-memory
    let orderBy: Prisma.InvoiceOrderByWithRelationInput | undefined;
    const useExplicitSort = Boolean(validated.sort_by);

    if (useExplicitSort) {
      // Map sort_by to database field
      orderBy = {
        [validated.sort_by!]: validated.sort_order,
      };
    } else {
      // Default ordering for priority sort (will be re-sorted after enrichment)
      orderBy = {
        created_at: 'desc',
      };
    }

    // Get matching invoices
    const invoices = await db.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy,
    });

    // Compute payment aggregates for invoices in the current page
    const invoiceIds = invoices.map((invoice: (typeof invoices)[number]) => invoice.id);
    let paymentsByInvoice = new Map<number, number>();

    if (invoiceIds.length > 0) {
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

      paymentsByInvoice = new Map(
        paymentAggregates.map((aggregate: (typeof paymentAggregates)[number]) => [
          aggregate.invoice_id,
          aggregate._sum.amount_paid ?? 0,
        ])
      );
    }

    const enrichedInvoices = invoices.map((invoice: (typeof invoices)[number]) => {
      const totalPaid = paymentsByInvoice.get(invoice.id) ?? 0;
      const remainingBalance = Math.max(
        0,
        invoice.invoice_amount - totalPaid
      );
      const dueState = computeDueState({
        status: invoice.status,
        dueDate: invoice.due_date,
        remainingBalance,
        today,
      });

      const priorityRank = computePriorityRank(invoice.status, dueState);

      return {
        ...invoice,
        totalPaid,
        remainingBalance,
        isOverdue: dueState.daysOverdue > 0,
        dueLabel: dueState.dueLabel,
        daysOverdue: dueState.daysOverdue,
        daysUntilDue: dueState.daysUntilDue,
        isDueSoon: dueState.isDueSoon,
        priorityRank,
        dueStatusVariant: dueState.variant,
      };
    }) as InvoiceWithRelations[];

    // Apply priority sorting only if no explicit sort was requested
    // Otherwise, database ordering (already applied) takes precedence
    let finalInvoices: InvoiceWithRelations[];

    if (useExplicitSort) {
      // Use database ordering (already sorted)
      finalInvoices = enrichedInvoices;
    } else {
      // Apply priority-based sorting in-memory
      finalInvoices = enrichedInvoices.sort((a, b) => {
        const rankDiff = (a.priorityRank ?? 99) - (b.priorityRank ?? 99);
        if (rankDiff !== 0) {
          return rankDiff;
        }

        const rank = a.priorityRank ?? 99;

        if (rank === 1) {
          return (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0);
        }

        if (rank === 2) {
          return (a.daysUntilDue ?? Number.MAX_SAFE_INTEGER) -
            (b.daysUntilDue ?? Number.MAX_SAFE_INTEGER);
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    const total = finalInvoices.length;
    const startIndex = (validated.page - 1) * validated.per_page;
    const paginatedInvoices = finalInvoices.slice(
      startIndex,
      startIndex + validated.per_page
    );

    return {
      success: true,
      data: {
        invoices: paginatedInvoices,
        pagination: {
          page: validated.page,
          per_page: validated.per_page,
          total,
          total_pages: Math.ceil(total / validated.per_page),
        },
      },
    };
  } catch (error) {
    console.error('getInvoices error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch invoices',
    };
  }
}

/**
 * Get single invoice by ID with relations
 *
 * @param id - Invoice ID
 * @returns Invoice with full relations
 */
export async function getInvoiceById(
  id: number
): Promise<ServerActionResult<InvoiceWithRelations>> {
  try {
    await getCurrentUser();

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: invoiceInclude,
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
        error: 'Invoice is hidden and cannot be accessed',
      };
    }

    const paymentAggregate = await db.payment.aggregate({
      where: {
        invoice_id: id,
        status: PAYMENT_STATUS.APPROVED,
      },
      _sum: {
        amount_paid: true,
      },
    });

    const totalPaid = paymentAggregate._sum.amount_paid ?? 0;
    const remainingBalance = Math.max(0, invoice.invoice_amount - totalPaid);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueState = computeDueState({
      status: invoice.status,
      dueDate: invoice.due_date,
      remainingBalance,
      today,
    });

    const priorityRank = computePriorityRank(invoice.status, dueState);

    return {
      success: true,
      data: {
        ...invoice,
        totalPaid,
        remainingBalance,
        isOverdue: dueState.daysOverdue > 0,
        dueLabel: dueState.dueLabel,
        daysOverdue: dueState.daysOverdue,
        daysUntilDue: dueState.daysUntilDue,
        isDueSoon: dueState.isDueSoon,
        priorityRank,
        dueStatusVariant: dueState.variant,
      } as InvoiceWithRelations,
    };
  } catch (error) {
    console.error('getInvoiceById error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoice',
    };
  }
}

// ============================================================================
// CREATE OPERATION
// ============================================================================

/**
 * Create new invoice
 *
 * @param data - Invoice form data (validated)
 * @returns Created invoice with relations
 */
export async function createInvoice(
  data: unknown
): Promise<ServerActionResult<InvoiceWithRelations>> {
  try {
    const user = await getCurrentUser();

    // Validate input
    const validated = invoiceFormSchema.parse(data);

    // Check for duplicate invoice number
    const existing = await db.invoice.findUnique({
      where: { invoice_number: validated.invoice_number },
    });

    if (existing) {
      return {
        success: false,
        error: `Invoice number "${validated.invoice_number}" already exists`,
      };
    }

    // Validate vendor exists (required field)
    const vendor = await db.vendor.findUnique({
      where: { id: validated.vendor_id },
    });
    if (!vendor || !vendor.is_active) {
      return {
        success: false,
        error: 'Selected vendor does not exist or is inactive',
      };
    }

    // Validate category exists
    if (validated.category_id) {
      const category = await db.category.findUnique({
        where: { id: validated.category_id },
      });
      if (!category || !category.is_active) {
        return {
          success: false,
          error: 'Selected category does not exist or is inactive',
        };
      }
    }

    // Validate profile exists
    if (validated.profile_id) {
      const profile = await db.invoiceProfile.findUnique({
        where: { id: validated.profile_id },
      });
      if (!profile) {
        return {
          success: false,
          error: 'Selected profile does not exist',
        };
      }
    }

    // Validate sub entity exists
    if (validated.sub_entity_id) {
      const subEntity = await db.subEntity.findUnique({
        where: { id: validated.sub_entity_id },
      });
      if (!subEntity || !subEntity.is_active) {
        return {
          success: false,
          error: 'Selected sub entity does not exist or is inactive',
        };
      }
    }

    // Determine initial status based on user role (PHASE 3.5 Change 5)
    const initialStatus =
      user.role === 'admin' || user.role === 'super_admin'
        ? INVOICE_STATUS.UNPAID // Admins skip approval
        : INVOICE_STATUS.PENDING_APPROVAL; // Standard users need approval

    // Create invoice
    const invoice = await db.invoice.create({
      data: {
        ...validated,
        status: initialStatus,
        created_by: user.id,
      },
      include: invoiceInclude,
    });

    // Log activity (non-blocking)
    await createActivityLog({
      invoice_id: invoice.id,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_CREATED,
      new_data: {
        invoice_number: invoice.invoice_number,
        vendor_id: invoice.vendor_id,
        invoice_amount: invoice.invoice_amount,
        status: invoice.status,
      },
    });

    revalidatePath('/invoices');

    return {
      success: true,
      data: invoice as InvoiceWithRelations,
    };
  } catch (error) {
    console.error('createInvoice error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invoice',
    };
  }
}

// ============================================================================
// UPDATE OPERATION
// ============================================================================

/**
 * Update existing invoice
 *
 * @param id - Invoice ID
 * @param data - Invoice form data (validated)
 * @returns Updated invoice with relations
 */
export async function updateInvoice(
  id: number,
  data: unknown
): Promise<ServerActionResult<InvoiceWithRelations>> {
  try {
    const user = await getCurrentUser();

    // Validate input
    const validated = invoiceFormSchema.parse(data);

    // Check invoice exists
    const existing = await db.invoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (existing.is_hidden) {
      return {
        success: false,
        error: 'Cannot update hidden invoice',
      };
    }

    // Check for duplicate invoice number (if changed)
    if (validated.invoice_number !== existing.invoice_number) {
      const duplicate = await db.invoice.findUnique({
        where: { invoice_number: validated.invoice_number },
      });

      if (duplicate) {
        return {
          success: false,
          error: `Invoice number "${validated.invoice_number}" already exists`,
        };
      }
    }

    // Validate vendor exists (required field)
    const vendor = await db.vendor.findUnique({
      where: { id: validated.vendor_id },
    });
    if (!vendor || !vendor.is_active) {
      return {
        success: false,
        error: 'Selected vendor does not exist or is inactive',
      };
    }

    // Validate category exists (if provided)
    if (validated.category_id) {
      const category = await db.category.findUnique({
        where: { id: validated.category_id },
      });
      if (!category || !category.is_active) {
        return {
          success: false,
          error: 'Selected category does not exist or is inactive',
        };
      }
    }

    // Validate profile exists (if provided)
    if (validated.profile_id) {
      const profile = await db.invoiceProfile.findUnique({
        where: { id: validated.profile_id },
      });
      if (!profile) {
        return {
          success: false,
          error: 'Selected profile does not exist',
        };
      }
    }

    // Validate sub entity exists (if provided)
    if (validated.sub_entity_id) {
      const subEntity = await db.subEntity.findUnique({
        where: { id: validated.sub_entity_id },
      });
      if (!subEntity || !subEntity.is_active) {
        return {
          success: false,
          error: 'Selected sub entity does not exist or is inactive',
        };
      }
    }

    // Determine new status based on user role and current status (PHASE 3.5 Change 5)
    let newStatus = existing.status;

    if (user.role === 'standard_user') {
      // Standard users editing approved/unpaid invoices → re-approval
      if (existing.status !== INVOICE_STATUS.PENDING_APPROVAL) {
        newStatus = INVOICE_STATUS.PENDING_APPROVAL;
      }
    }
    // Admins/Super Admins → keep existing status (no forced re-approval)

    // Update invoice
    const invoice = await db.invoice.update({
      where: { id },
      data: {
        ...validated,
        status: newStatus,
      },
      include: invoiceInclude,
    });

    // Log activity with old and new data (non-blocking)
    await createActivityLog({
      invoice_id: id,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_UPDATED,
      old_data: {
        invoice_number: existing.invoice_number,
        vendor_id: existing.vendor_id,
        invoice_amount: existing.invoice_amount,
        invoice_date: existing.invoice_date,
        due_date: existing.due_date,
      },
      new_data: {
        invoice_number: validated.invoice_number,
        vendor_id: validated.vendor_id,
        invoice_amount: validated.invoice_amount,
        invoice_date: validated.invoice_date,
        due_date: validated.due_date,
      },
    });

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);

    return {
      success: true,
      data: invoice as InvoiceWithRelations,
    };
  } catch (error) {
    console.error('updateInvoice error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update invoice',
    };
  }
}

// ============================================================================
// DELETE OPERATION (SOFT DELETE)
// ============================================================================

/**
 * Soft delete invoice (set is_hidden = true)
 *
 * @param id - Invoice ID
 * @returns Success result
 */
export async function deleteInvoice(
  id: number
): Promise<ServerActionResult<void>> {
  try {
    const user = await getCurrentUser();

    const existing = await db.invoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (existing.is_hidden) {
      return {
        success: false,
        error: 'Invoice is already hidden',
      };
    }

    // Soft delete (set hidden fields)
    await db.invoice.update({
      where: { id },
      data: {
        is_hidden: true,
        hidden_by: user.id,
        hidden_at: new Date(),
        hidden_reason: 'Deleted by user',
      },
    });

    // Log activity (non-blocking)
    await createActivityLog({
      invoice_id: id,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_HIDDEN,
      old_data: {
        invoice_number: existing.invoice_number,
        status: existing.status,
      },
    });

    revalidatePath('/invoices');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('deleteInvoice error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete invoice',
    };
  }
}

// ============================================================================
// SPECIAL OPERATIONS
// ============================================================================

/**
 * Put invoice on hold
 *
 * @param id - Invoice ID
 * @param holdReason - Reason for hold (validated)
 * @returns Updated invoice
 */
export async function putInvoiceOnHold(
  id: number,
  holdReason: string
): Promise<ServerActionResult<InvoiceWithRelations>> {
  try {
    const user = await getCurrentUser();

    // Validate hold reason
    const validated = holdInvoiceSchema.parse({ hold_reason: holdReason });

    const existing = await db.invoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (existing.is_hidden) {
      return {
        success: false,
        error: 'Cannot put hidden invoice on hold',
      };
    }

    if (existing.status === INVOICE_STATUS.ON_HOLD) {
      return {
        success: false,
        error: 'Invoice is already on hold',
      };
    }

    // Update invoice to on_hold status
    const invoice = await db.invoice.update({
      where: { id },
      data: {
        status: INVOICE_STATUS.ON_HOLD,
        hold_reason: validated.hold_reason,
        hold_by: user.id,
        hold_at: new Date(),
      },
      include: invoiceInclude,
    });

    // Log activity (non-blocking)
    await createActivityLog({
      invoice_id: id,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_HOLD_PLACED,
      old_data: {
        status: existing.status,
      },
      new_data: {
        status: INVOICE_STATUS.ON_HOLD,
        hold_reason: validated.hold_reason,
      },
    });

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);

    return {
      success: true,
      data: invoice as InvoiceWithRelations,
    };
  } catch (error) {
    console.error('putInvoiceOnHold error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to put invoice on hold',
    };
  }
}

/**
 * Approve invoice (admin/super_admin only)
 *
 * @param id - Invoice ID
 * @returns Updated invoice with unpaid status
 */
export async function approveInvoice(
  id: number
): Promise<ServerActionResult<InvoiceWithRelations>> {
  try {
    const user = await getCurrentUser();

    // Check user role (admin or super_admin only)
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return {
        success: false,
        error: 'You must be an admin to approve invoices',
      };
    }

    const existing = await db.invoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (existing.is_hidden) {
      return {
        success: false,
        error: 'Cannot approve hidden invoice',
      };
    }

    if (existing.status !== INVOICE_STATUS.PENDING_APPROVAL) {
      return {
        success: false,
        error: 'Invoice is not pending approval',
      };
    }

    // Update invoice to unpaid status
    const invoice = await db.invoice.update({
      where: { id },
      data: {
        status: INVOICE_STATUS.UNPAID,
      },
      include: invoiceInclude,
    });

    // Log activity (non-blocking)
    await createActivityLog({
      invoice_id: id,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_APPROVED,
      old_data: {
        status: existing.status,
      },
      new_data: {
        status: INVOICE_STATUS.UNPAID,
      },
    });

    revalidatePath('/invoices');
    revalidatePath('/invoices/pending');
    revalidatePath(`/invoices/${id}`);

    return {
      success: true,
      data: invoice as InvoiceWithRelations,
    };
  } catch (error) {
    console.error('approveInvoice error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve invoice',
    };
  }
}

/**
 * Reject invoice with reason (admin/super_admin only)
 *
 * @param id - Invoice ID
 * @param rejectionReason - Reason for rejection (validated)
 * @returns Updated invoice with rejected status
 */
export async function rejectInvoice(
  id: number,
  rejectionReason: string
): Promise<ServerActionResult<InvoiceWithRelations>> {
  try {
    const user = await getCurrentUser();

    // Check user role (admin or super_admin only)
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return {
        success: false,
        error: 'You must be an admin to reject invoices',
      };
    }

    // Validate rejection reason
    const validated = rejectInvoiceSchema.parse({ rejection_reason: rejectionReason });

    const existing = await db.invoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (existing.is_hidden) {
      return {
        success: false,
        error: 'Cannot reject hidden invoice',
      };
    }

    if (existing.status !== INVOICE_STATUS.PENDING_APPROVAL) {
      return {
        success: false,
        error: 'Invoice is not pending approval',
      };
    }

    // Update invoice to rejected status
    const invoice = await db.invoice.update({
      where: { id },
      data: {
        status: INVOICE_STATUS.REJECTED,
        rejection_reason: validated.rejection_reason,
        rejected_by: user.id,
        rejected_at: new Date(),
      },
      include: invoiceInclude,
    });

    // Log activity (non-blocking)
    await createActivityLog({
      invoice_id: id,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_REJECTED,
      old_data: {
        status: existing.status,
      },
      new_data: {
        status: INVOICE_STATUS.REJECTED,
        rejection_reason: validated.rejection_reason,
      },
    });

    revalidatePath('/invoices');
    revalidatePath('/invoices/pending');
    revalidatePath(`/invoices/${id}`);

    return {
      success: true,
      data: invoice as InvoiceWithRelations,
    };
  } catch (error) {
    console.error('rejectInvoice error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject invoice',
    };
  }
}

/**
 * Get single invoice profile by ID with relations (for form pre-filling)
 *
 * @param profileId - Invoice Profile ID
 * @returns Invoice profile with entity, vendor, category, currency relations
 */
export async function getInvoiceProfileById(
  profileId: number
): Promise<
  ServerActionResult<{
    id: number;
    name: string;
    entity_id: number;
    vendor_id: number;
    category_id: number;
    currency_id: number;
    tds_applicable: boolean;
    tds_percentage: number | null;
    entity: { id: number; name: string };
    vendor: { id: number; name: string };
    category: { id: number; name: string };
    currency: { id: number; code: string; name: string; symbol: string };
  }>
> {
  try {
    await getCurrentUser();

    const profile = await db.invoiceProfile.findUnique({
      where: { id: profileId },
      include: {
        entity: {
          select: { id: true, name: true },
        },
        vendor: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true },
        },
        currency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
      },
    });

    if (!profile) {
      return {
        success: false,
        error: 'Invoice profile not found',
      };
    }

    return {
      success: true,
      data: profile,
    };
  } catch (error) {
    console.error('getInvoiceProfileById error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch invoice profile',
    };
  }
}

/**
 * Get dropdown data for forms (vendors, categories, profiles, sub entities, entities, currencies)
 *
 * @returns Form dropdown options
 */
export async function getInvoiceFormOptions(): Promise<
  ServerActionResult<{
    vendors: Array<{ id: number; name: string }>;
    categories: Array<{ id: number; name: string }>;
    profiles: Array<{ id: number; name: string }>;
    subEntities: Array<{ id: number; name: string }>;
    entities: Array<{ id: number; name: string }>;
    currencies: Array<{ id: number; code: string; name: string; symbol: string }>;
  }>
> {
  try {
    const user = await getCurrentUser();
    const currentUserId = user.id;
    const isSuperAdminUser = await isSuperAdmin();

    // Build where clause for invoice profiles with visibility filtering
    const profileWhere: Prisma.InvoiceProfileWhereInput = {};

    // Apply visibility filter (unless super admin)
    if (!isSuperAdminUser) {
      profileWhere.OR = [
        { visible_to_all: true },
        {
          visibilities: {
            some: {
              user_id: currentUserId,
            },
          },
        },
      ];
    }

    const [vendors, categories, profiles, subEntities, entities, currencies] =
      await Promise.all([
        db.vendor.findMany({
          where: { is_active: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        db.category.findMany({
          where: { is_active: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        db.invoiceProfile.findMany({
          where: profileWhere,
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        db.subEntity.findMany({
          where: { is_active: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        db.entity.findMany({
          where: { is_active: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        db.currency.findMany({
          where: { is_active: true },
          select: { id: true, code: true, name: true, symbol: true },
          orderBy: { code: 'asc' },
        }),
      ]);

    return {
      success: true,
      data: {
        vendors,
        categories,
        profiles,
        subEntities,
        entities,
        currencies,
      },
    };
  } catch (error) {
    console.error('getInvoiceFormOptions error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch form options',
    };
  }
}

// ============================================================================
// VENDOR APPROVAL WORKFLOW (PHASE 5)
// ============================================================================

/**
 * Check if invoice has pending vendor
 *
 * Used by invoice approval UI to determine if combined approval is needed.
 */
export async function checkInvoiceVendorStatus(
  invoiceId: number
): Promise<ServerActionResult<{
  hasPendingVendor: boolean;
  vendor: {
    id: number;
    name: string;
    status: string;
    address: string | null;
    gst_exemption: boolean;
    bank_details: string | null;
    created_by_user_id: number | null;
    created_at: Date;
  } | null;
}>> {
  try {
    const user = await getCurrentUser();

    // Check admin permission (only admins can approve invoices)
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return {
        success: false,
        error: 'You must be an admin to check vendor approval status',
      };
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            status: true,
            address: true,
            gst_exemption: true,
            bank_details: true,
            created_by_user_id: true,
            created_at: true,
          },
        },
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    return {
      success: true,
      data: {
        hasPendingVendor: invoice.vendor.status === 'PENDING_APPROVAL',
        vendor: invoice.vendor.status === 'PENDING_APPROVAL' ? invoice.vendor : null,
      },
    };
  } catch (error) {
    console.error('checkInvoiceVendorStatus error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check vendor status',
    };
  }
}

/**
 * Approve invoice and vendor together
 *
 * Combined approval: approve both vendor and invoice in single transaction.
 * Option B from requirements: Streamlined workflow.
 */
export async function approveInvoiceAndVendor(
  invoiceId: number
): Promise<ServerActionResult<{
  invoice: { id: number; status: string; invoice_number: string };
  vendor: { id: number; name: string }
}>> {
  try {
    const user = await getCurrentUser();

    // Check admin permission (only admins can approve invoices)
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return {
        success: false,
        error: 'You must be an admin to approve invoices and vendors',
      };
    }

    // Use transaction for atomicity
    const result = await db.$transaction(async (tx) => {
      // 1. Get invoice with vendor
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          vendor: true,
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status !== 'pending_approval') {
        throw new Error('Invoice is not pending approval');
      }

      if (invoice.vendor.status !== 'PENDING_APPROVAL') {
        throw new Error('Vendor is not pending approval');
      }

      // 2. Approve vendor
      await tx.vendor.update({
        where: { id: invoice.vendor_id },
        data: {
          status: 'APPROVED',
          approved_by_user_id: user.id,
          approved_at: new Date(),
        },
      });

      // 3. Approve invoice
      const approvedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: INVOICE_STATUS.UNPAID,
        },
        include: invoiceInclude,
      });

      return {
        invoice: approvedInvoice,
        vendor: {
          id: invoice.vendor_id,
          name: invoice.vendor.name,
        },
      };
    });

    // Log activities for both approvals (non-blocking)
    await Promise.all([
      createActivityLog({
        invoice_id: invoiceId,
        user_id: user.id,
        action: ACTIVITY_ACTION.INVOICE_APPROVED,
        old_data: {
          status: INVOICE_STATUS.PENDING_APPROVAL,
          vendor_status: 'PENDING_APPROVAL',
        },
        new_data: {
          status: INVOICE_STATUS.UNPAID,
          vendor_status: 'APPROVED',
        },
      }),
    ]);

    revalidatePath('/invoices');
    revalidatePath('/settings');
    revalidatePath('/admin');

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('approveInvoiceAndVendor error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve invoice and vendor',
    };
  }
}
