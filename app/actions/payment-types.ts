/**
 * Server Actions: Payment Types CRUD Operations
 *
 * Production-ready server actions with RBAC, validation, and error handling.
 * Follows patterns from app/actions/master-data.ts (Category operations)
 */

'use server';

import type { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  paymentTypeFormSchema,
  paymentTypeFiltersSchema,
} from '@/lib/validations/master-data';
import { revalidatePath } from 'next/cache';

// ============================================================================
// TYPES
// ============================================================================

type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type PaymentTypeWithCount = {
  id: number;
  name: string;
  description: string | null;
  requires_reference: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  invoiceCount: number;
};

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

/**
 * Check if user is admin or super_admin
 */
async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized: You must be logged in');
  }

  const role = session.user.role as string;

  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Admin access required');
  }

  return {
    id: parseInt(session.user.id),
    role,
  };
}

// ============================================================================
// PAYMENT TYPE OPERATIONS
// ============================================================================

/**
 * Get payment types with filters and pagination
 * Accessible to all authenticated users (read-only)
 */
export async function getPaymentTypes(
  filters?: Partial<typeof paymentTypeFiltersSchema._type>
): Promise<
  ServerActionResult<{
    paymentTypes: PaymentTypeWithCount[];
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  }>
> {
  try {
    await getCurrentUser();

    const validated = paymentTypeFiltersSchema.parse({
      page: filters?.page || 1,
      per_page: filters?.per_page || 20,
      ...filters,
    });

    const where: Prisma.PaymentTypeWhereInput = {};

    if (validated.search) {
      where.name = {
        contains: validated.search,
      };
    }

    if (validated.is_active !== undefined) {
      where.is_active = validated.is_active;
    }

    const [paymentTypes, total] = await Promise.all([
      db.paymentType.findMany({
        where,
        include: {
          _count: {
            select: { payments: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (validated.page - 1) * validated.per_page,
        take: validated.per_page,
      }),
      db.paymentType.count({ where }),
    ]);

    const paymentTypesWithCount: PaymentTypeWithCount[] = paymentTypes.map(
      (pt: (typeof paymentTypes)[number]) => ({
        id: pt.id,
        name: pt.name,
        description: pt.description,
        requires_reference: pt.requires_reference,
        is_active: pt.is_active,
        created_at: pt.created_at,
        updated_at: pt.updated_at,
        invoiceCount: pt._count.payments,
      })
    );

    return {
      success: true,
      data: {
        paymentTypes: paymentTypesWithCount,
        pagination: {
          page: validated.page,
          per_page: validated.per_page,
          total,
          total_pages: Math.ceil(total / validated.per_page),
        },
      },
    };
  } catch (error) {
    console.error('getPaymentTypes error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch payment types',
    };
  }
}

/**
 * Search payment types for autocomplete (fast, limited results)
 * Returns only active payment types
 */
export async function searchPaymentTypes(
  query: string
): Promise<ServerActionResult<Array<{ id: number; name: string; requires_reference: boolean }>>> {
  try {
    await getCurrentUser();

    const paymentTypes = await db.paymentType.findMany({
      where: {
        is_active: true,
        name: {
          contains: query,
        },
      },
      select: {
        id: true,
        name: true,
        requires_reference: true,
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    return {
      success: true,
      data: paymentTypes,
    };
  } catch (error) {
    console.error('searchPaymentTypes error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to search payment types',
    };
  }
}

/**
 * Create new payment type (admin only)
 */
export async function createPaymentType(
  data: unknown
): Promise<ServerActionResult<PaymentTypeWithCount>> {
  try {
    await requireAdmin();

    const validated = paymentTypeFormSchema.parse(data);

    // Check case-insensitive duplicate
    const existing = await db.paymentType.findFirst({
      where: {
        name: validated.name,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Payment type "${validated.name}" already exists`,
      };
    }

    const paymentType = await db.paymentType.create({
      data: {
        name: validated.name,
        description: validated.description,
        requires_reference: validated.requires_reference,
        is_active: true,
      },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: paymentType.id,
        name: paymentType.name,
        description: paymentType.description,
        requires_reference: paymentType.requires_reference,
        is_active: paymentType.is_active,
        created_at: paymentType.created_at,
        updated_at: paymentType.updated_at,
        invoiceCount: paymentType._count.payments,
      },
    };
  } catch (error) {
    console.error('createPaymentType error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create payment type',
    };
  }
}

/**
 * Update payment type (admin only)
 */
export async function updatePaymentType(
  id: number,
  data: unknown
): Promise<ServerActionResult<PaymentTypeWithCount>> {
  try {
    await requireAdmin();

    const validated = paymentTypeFormSchema.parse(data);

    const existing = await db.paymentType.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Payment type not found',
      };
    }

    // Check case-insensitive duplicate (exclude current payment type)
    const duplicate = await db.paymentType.findFirst({
      where: {
        name: validated.name,
        id: {
          not: id,
        },
      },
    });

    if (duplicate) {
      return {
        success: false,
        error: `Payment type "${validated.name}" already exists`,
      };
    }

    const paymentType = await db.paymentType.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        requires_reference: validated.requires_reference,
      },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: paymentType.id,
        name: paymentType.name,
        description: paymentType.description,
        requires_reference: paymentType.requires_reference,
        is_active: paymentType.is_active,
        created_at: paymentType.created_at,
        updated_at: paymentType.updated_at,
        invoiceCount: paymentType._count.payments,
      },
    };
  } catch (error) {
    console.error('updatePaymentType error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update payment type',
    };
  }
}

/**
 * Archive payment type (soft delete, admin only)
 * Only allowed if payment type has no invoices
 */
export async function archivePaymentType(
  id: number
): Promise<ServerActionResult<void>> {
  try {
    await requireAdmin();

    const paymentType = await db.paymentType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });

    if (!paymentType) {
      return {
        success: false,
        error: 'Payment type not found',
      };
    }

    if (paymentType._count.payments > 0) {
      return {
        success: false,
        error: `Cannot archive payment type with ${paymentType._count.payments} invoice(s)`,
      };
    }

    await db.paymentType.update({
      where: { id },
      data: {
        is_active: false,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('archivePaymentType error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to archive payment type',
    };
  }
}

/**
 * Restore archived payment type (admin only)
 */
export async function restorePaymentType(
  id: number
): Promise<ServerActionResult<PaymentTypeWithCount>> {
  try {
    await requireAdmin();

    const paymentType = await db.paymentType.findUnique({
      where: { id },
    });

    if (!paymentType) {
      return {
        success: false,
        error: 'Payment type not found',
      };
    }

    if (paymentType.is_active) {
      return {
        success: false,
        error: 'Payment type is already active',
      };
    }

    const updated = await db.paymentType.update({
      where: { id },
      data: {
        is_active: true,
      },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        requires_reference: updated.requires_reference,
        is_active: updated.is_active,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
        invoiceCount: updated._count.payments,
      },
    };
  } catch (error) {
    console.error('restorePaymentType error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to restore payment type',
    };
  }
}
