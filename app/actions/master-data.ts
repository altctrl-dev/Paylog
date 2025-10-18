/**
 * Server Actions: Master Data (Vendors & Categories) CRUD Operations
 *
 * Production-ready server actions with RBAC, validation, and error handling.
 * Follows patterns from app/actions/invoices.ts
 */

'use server';

import type { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  vendorFormSchema,
  vendorFiltersSchema,
  categoryFormSchema,
  categoryFiltersSchema,
} from '@/lib/validations/master-data';
import { revalidatePath } from 'next/cache';

// ============================================================================
// TYPES
// ============================================================================

type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type VendorWithCount = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  invoiceCount: number;
};

type CategoryWithCount = {
  id: number;
  name: string;
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
// VENDOR OPERATIONS
// ============================================================================

/**
 * Get vendors with filters and pagination
 * Accessible to all authenticated users (read-only)
 */
export async function getVendors(
  filters?: Partial<typeof vendorFiltersSchema._type>
): Promise<
  ServerActionResult<{
    vendors: VendorWithCount[];
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

    const validated = vendorFiltersSchema.parse({
      page: filters?.page || 1,
      per_page: filters?.per_page || 20,
      ...filters,
    });

    const where: Prisma.VendorWhereInput = {};

    if (validated.search) {
      where.name = {
        contains: validated.search,
      };
    }

    if (validated.is_active !== undefined) {
      where.is_active = validated.is_active;
    }

    const [vendors, total] = await Promise.all([
      db.vendor.findMany({
        where,
        include: {
          _count: {
            select: { invoices: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (validated.page - 1) * validated.per_page,
        take: validated.per_page,
      }),
      db.vendor.count({ where }),
    ]);

    const vendorsWithCount: VendorWithCount[] = vendors.map((v: (typeof vendors)[number]) => ({
      id: v.id,
      name: v.name,
      is_active: v.is_active,
      created_at: v.created_at,
      updated_at: v.updated_at,
      invoiceCount: v._count.invoices,
    }));

    return {
      success: true,
      data: {
        vendors: vendorsWithCount,
        pagination: {
          page: validated.page,
          per_page: validated.per_page,
          total,
          total_pages: Math.ceil(total / validated.per_page),
        },
      },
    };
  } catch (error) {
    console.error('getVendors error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vendors',
    };
  }
}

/**
 * Search vendors for autocomplete (fast, limited results)
 * Returns only active vendors
 */
export async function searchVendors(
  query: string
): Promise<ServerActionResult<Array<{ id: number; name: string }>>> {
  try {
    await getCurrentUser();

    const vendors = await db.vendor.findMany({
      where: {
        is_active: true,
        name: {
          contains: query,
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    return {
      success: true,
      data: vendors,
    };
  } catch (error) {
    console.error('searchVendors error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to search vendors',
    };
  }
}

/**
 * Create new vendor (admin only)
 */
export async function createVendor(
  data: unknown
): Promise<ServerActionResult<VendorWithCount>> {
  try {
    await requireAdmin();

    const validated = vendorFormSchema.parse(data);

    // Check case-insensitive duplicate
    const existing = await db.vendor.findFirst({
      where: {
        name: validated.name,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Vendor "${validated.name}" already exists`,
      };
    }

    const vendor = await db.vendor.create({
      data: {
        name: validated.name,
        is_active: true,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: vendor.id,
        name: vendor.name,
        is_active: vendor.is_active,
        created_at: vendor.created_at,
        updated_at: vendor.updated_at,
        invoiceCount: vendor._count.invoices,
      },
    };
  } catch (error) {
    console.error('createVendor error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create vendor',
    };
  }
}

/**
 * Update vendor (admin only)
 */
export async function updateVendor(
  id: number,
  data: unknown
): Promise<ServerActionResult<VendorWithCount>> {
  try {
    await requireAdmin();

    const validated = vendorFormSchema.parse(data);

    const existing = await db.vendor.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Vendor not found',
      };
    }

    // Check case-insensitive duplicate (exclude current vendor)
    const duplicate = await db.vendor.findFirst({
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
        error: `Vendor "${validated.name}" already exists`,
      };
    }

    const vendor = await db.vendor.update({
      where: { id },
      data: {
        name: validated.name,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: vendor.id,
        name: vendor.name,
        is_active: vendor.is_active,
        created_at: vendor.created_at,
        updated_at: vendor.updated_at,
        invoiceCount: vendor._count.invoices,
      },
    };
  } catch (error) {
    console.error('updateVendor error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update vendor',
    };
  }
}

/**
 * Archive vendor (soft delete, admin only)
 * Only allowed if vendor has no invoices
 */
export async function archiveVendor(
  id: number
): Promise<ServerActionResult<void>> {
  try {
    await requireAdmin();

    const vendor = await db.vendor.findUnique({
      where: { id },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    if (!vendor) {
      return {
        success: false,
        error: 'Vendor not found',
      };
    }

    if (vendor._count.invoices > 0) {
      return {
        success: false,
        error: `Cannot archive vendor with ${vendor._count.invoices} invoice(s)`,
      };
    }

    await db.vendor.update({
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
    console.error('archiveVendor error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive vendor',
    };
  }
}

/**
 * Restore archived vendor (admin only)
 */
export async function restoreVendor(
  id: number
): Promise<ServerActionResult<VendorWithCount>> {
  try {
    await requireAdmin();

    const vendor = await db.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      return {
        success: false,
        error: 'Vendor not found',
      };
    }

    if (vendor.is_active) {
      return {
        success: false,
        error: 'Vendor is already active',
      };
    }

    const updated = await db.vendor.update({
      where: { id },
      data: {
        is_active: true,
      },
      include: {
        _count: {
          select: { invoices: true },
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
        is_active: updated.is_active,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
        invoiceCount: updated._count.invoices,
      },
    };
  } catch (error) {
    console.error('restoreVendor error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore vendor',
    };
  }
}

// ============================================================================
// CATEGORY OPERATIONS
// ============================================================================

/**
 * Get categories with filters and pagination
 * Accessible to all authenticated users (read-only)
 */
export async function getCategories(
  filters?: Partial<typeof categoryFiltersSchema._type>
): Promise<
  ServerActionResult<{
    categories: CategoryWithCount[];
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

    const validated = categoryFiltersSchema.parse({
      page: filters?.page || 1,
      per_page: filters?.per_page || 20,
      ...filters,
    });

    const where: Prisma.CategoryWhereInput = {};

    if (validated.search) {
      where.name = {
        contains: validated.search,
      };
    }

    if (validated.is_active !== undefined) {
      where.is_active = validated.is_active;
    }

    const [categories, total] = await Promise.all([
      db.category.findMany({
        where,
        include: {
          _count: {
            select: { invoices: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (validated.page - 1) * validated.per_page,
        take: validated.per_page,
      }),
      db.category.count({ where }),
    ]);

    const categoriesWithCount: CategoryWithCount[] = categories.map((c: (typeof categories)[number]) => ({
      id: c.id,
      name: c.name,
      is_active: c.is_active,
      created_at: c.created_at,
      updated_at: c.updated_at,
      invoiceCount: c._count.invoices,
    }));

    return {
      success: true,
      data: {
        categories: categoriesWithCount,
        pagination: {
          page: validated.page,
          per_page: validated.per_page,
          total,
          total_pages: Math.ceil(total / validated.per_page),
        },
      },
    };
  } catch (error) {
    console.error('getCategories error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch categories',
    };
  }
}

/**
 * Search categories for autocomplete (fast, limited results)
 * Returns only active categories
 */
export async function searchCategories(
  query: string
): Promise<ServerActionResult<Array<{ id: number; name: string }>>> {
  try {
    await getCurrentUser();

    const categories = await db.category.findMany({
      where: {
        is_active: true,
        name: {
          contains: query,
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    return {
      success: true,
      data: categories,
    };
  } catch (error) {
    console.error('searchCategories error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to search categories',
    };
  }
}

/**
 * Create new category (admin only)
 */
export async function createCategory(
  data: unknown
): Promise<ServerActionResult<CategoryWithCount>> {
  try {
    await requireAdmin();

    const validated = categoryFormSchema.parse(data);

    // Check case-insensitive duplicate
    const existing = await db.category.findFirst({
      where: {
        name: validated.name,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Category "${validated.name}" already exists`,
      };
    }

    const category = await db.category.create({
      data: {
        name: validated.name,
        is_active: true,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: category.id,
        name: category.name,
        is_active: category.is_active,
        created_at: category.created_at,
        updated_at: category.updated_at,
        invoiceCount: category._count.invoices,
      },
    };
  } catch (error) {
    console.error('createCategory error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create category',
    };
  }
}

/**
 * Update category (admin only)
 */
export async function updateCategory(
  id: number,
  data: unknown
): Promise<ServerActionResult<CategoryWithCount>> {
  try {
    await requireAdmin();

    const validated = categoryFormSchema.parse(data);

    const existing = await db.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Category not found',
      };
    }

    // Check case-insensitive duplicate (exclude current category)
    const duplicate = await db.category.findFirst({
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
        error: `Category "${validated.name}" already exists`,
      };
    }

    const category = await db.category.update({
      where: { id },
      data: {
        name: validated.name,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: category.id,
        name: category.name,
        is_active: category.is_active,
        created_at: category.created_at,
        updated_at: category.updated_at,
        invoiceCount: category._count.invoices,
      },
    };
  } catch (error) {
    console.error('updateCategory error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update category',
    };
  }
}

/**
 * Archive category (soft delete, admin only)
 * Only allowed if category has no invoices
 */
export async function archiveCategory(
  id: number
): Promise<ServerActionResult<void>> {
  try {
    await requireAdmin();

    const category = await db.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    if (!category) {
      return {
        success: false,
        error: 'Category not found',
      };
    }

    if (category._count.invoices > 0) {
      return {
        success: false,
        error: `Cannot archive category with ${category._count.invoices} invoice(s)`,
      };
    }

    await db.category.update({
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
    console.error('archiveCategory error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to archive category',
    };
  }
}

/**
 * Restore archived category (admin only)
 */
export async function restoreCategory(
  id: number
): Promise<ServerActionResult<CategoryWithCount>> {
  try {
    await requireAdmin();

    const category = await db.category.findUnique({
      where: { id },
    });

    if (!category) {
      return {
        success: false,
        error: 'Category not found',
      };
    }

    if (category.is_active) {
      return {
        success: false,
        error: 'Category is already active',
      };
    }

    const updated = await db.category.update({
      where: { id },
      data: {
        is_active: true,
      },
      include: {
        _count: {
          select: { invoices: true },
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
        is_active: updated.is_active,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
        invoiceCount: updated._count.invoices,
      },
    };
  } catch (error) {
    console.error('restoreCategory error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to restore category',
    };
  }
}
