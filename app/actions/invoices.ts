/**
 * Server Actions: Invoice CRUD Operations
 *
 * Production-ready server actions with authentication, validation, and error handling.
 * All actions use NextAuth session for user context.
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  INVOICE_STATUS,
  type InvoiceWithRelations,
  type InvoiceListResponse,
  type ServerActionResult,
} from '@/types/invoice';
import {
  invoiceFormSchema,
  holdInvoiceSchema,
  rejectInvoiceSchema,
  invoiceFiltersSchema,
} from '@/lib/validations/invoice';
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
 * Include relations for invoice queries
 */
const invoiceInclude = {
  vendor: {
    select: {
      id: true,
      name: true,
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
};

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
    const where: any = {
      is_hidden: false, // Always exclude hidden invoices by default
    };

    if (validated.search) {
      where.OR = [
        {
          invoice_number: {
            contains: validated.search,
            mode: 'insensitive' as const,
          },
        },
        {
          vendor: {
            name: {
              contains: validated.search,
              mode: 'insensitive' as const,
            },
          },
        },
      ];
    }

    if (validated.status) {
      where.status = validated.status;
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

    // Get total count
    const total = await db.invoice.count({ where });

    // Get paginated results
    const invoices = await db.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: {
        created_at: 'desc',
      },
      skip: (validated.page - 1) * validated.per_page,
      take: validated.per_page,
    });

    return {
      success: true,
      data: {
        invoices: invoices as InvoiceWithRelations[],
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

    return {
      success: true,
      data: invoice as InvoiceWithRelations,
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

    // Create invoice
    const invoice = await db.invoice.create({
      data: {
        ...validated,
        status: INVOICE_STATUS.PENDING_APPROVAL,
        created_by: user.id,
      },
      include: invoiceInclude,
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
    await getCurrentUser();

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

    // Update invoice
    const invoice = await db.invoice.update({
      where: { id },
      data: validated,
      include: invoiceInclude,
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
 * Get dropdown data for forms (vendors, categories, profiles, sub entities)
 *
 * @returns Form dropdown options
 */
export async function getInvoiceFormOptions(): Promise<
  ServerActionResult<{
    vendors: Array<{ id: number; name: string }>;
    categories: Array<{ id: number; name: string }>;
    profiles: Array<{ id: number; name: string }>;
    subEntities: Array<{ id: number; name: string }>;
  }>
> {
  try {
    await getCurrentUser();

    const [vendors, categories, profiles, subEntities] = await Promise.all([
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
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      db.subEntity.findMany({
        where: { is_active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      success: true,
      data: {
        vendors,
        categories,
        profiles,
        subEntities,
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
