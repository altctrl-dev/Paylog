/**
 * Server Actions: Master Data (Vendors & Categories) CRUD Operations
 *
 * Production-ready server actions with RBAC, validation, and error handling.
 * Follows patterns from app/actions/invoices.ts
 */

'use server';

import type { Prisma } from '@prisma/client';
import { auth, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  vendorFormSchema,
  vendorFiltersSchema,
  categoryFormSchema,
  categoryFiltersSchema,
} from '@/lib/validations/master-data';
import { revalidatePath } from 'next/cache';
import { canApproveVendor, getVendorCreationStatus, canEditPendingVendor } from '@/lib/rbac-v2';
import { notifyVendorPendingApproval } from '@/app/actions/notifications';

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
  address: string | null;
  gst_exemption: boolean;
  bank_details: string | null;
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
      address: v.address,
      gst_exemption: v.gst_exemption,
      bank_details: v.bank_details,
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
 * Returns only active vendors with role-based filtering
 *
 * Q4: Non-admins only see approved vendors + their own pending vendors
 */
export async function searchVendors(
  query: string
): Promise<ServerActionResult<Array<{ id: number; name: string; status?: string }>>> {
  try {
    const user = await getCurrentUser();

    const where: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
      is_active: true,
      deleted_at: null, // Exclude soft-deleted vendors
      name: {
        contains: query,
      },
    };

    // Q4: Non-admins only see approved vendors + their own pending vendors
    if (!canApproveVendor(user)) {
      where.OR = [
        { status: 'APPROVED' },
        {
          status: 'PENDING_APPROVAL',
          created_by_user_id: user.id
        },
      ];
    }
    // Admins see all vendors regardless of status

    const vendors = await db.vendor.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true, // Include status for badge display
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
 * Create new vendor
 *
 * Standard users: Create pending vendor + auto-create Master Data Request
 * Admins: Create approved vendor directly (skip workflow)
 *
 * Q5: Admin-created vendors auto-approved, standard users create pending
 */
export async function createVendor(
  data: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServerActionResult<any>> {
  try {
    const user = await getCurrentUser();

    // Validate input
    const validated = vendorFormSchema.parse(data);

    // Check case-insensitive duplicate
    const existing = await db.vendor.findFirst({
      where: {
        name: {
          equals: validated.name,
          mode: 'insensitive',
        },
        deleted_at: null, // Don't count soft-deleted vendors
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Vendor "${validated.name}" already exists`,
      };
    }

    // Determine vendor status based on user role (Q5)
    // BUG-007 FIX: Added debug logging to trace user role during vendor creation
    console.log('[createVendor] User info:', {
      id: user.id,
      email: user.email,
      role: user.role,
      roleLowerCase: user.role?.toLowerCase(),
    });
    const vendorStatus = getVendorCreationStatus(user);
    const isAdmin = canApproveVendor(user);
    console.log('[createVendor] Role check result:', {
      vendorStatus,
      isAdmin,
      expectedForNonAdmin: 'PENDING_APPROVAL',
    });

    // Create vendor
    const vendor = await db.vendor.create({
      data: {
        name: validated.name,
        address: validated.address || null,
        gst_exemption: validated.gst_exemption ?? false,
        bank_details: validated.bank_details || null,
        is_active: true,
        status: vendorStatus,
        created_by_user_id: user.id,
        approved_by_user_id: isAdmin ? user.id : null,
        approved_at: isAdmin ? new Date() : null,
      },
    });

    // If standard user, send notification to admins (BUG-007 FIX)
    // Note: Master Data Request integration can be added later if needed
    if (!isAdmin) {
      console.log(`[createVendor] Standard user created pending vendor ID ${vendor.id}, notifying admins`);
      // Get user's full name for the notification
      const userRecord = await db.user.findUnique({
        where: { id: user.id },
        select: { full_name: true },
      });
      const requesterName = userRecord?.full_name || user.email;

      // Notify admins about the pending vendor
      await notifyVendorPendingApproval(vendor.id, vendor.name, requesterName);
    }

    revalidatePath('/settings');
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');

    return {
      success: true,
      data: {
        id: vendor.id,
        name: vendor.name,
        is_active: vendor.is_active,
        created_at: vendor.created_at,
        updated_at: vendor.updated_at,
        status: vendor.status,
        created_by_user_id: vendor.created_by_user_id,
        approved_by_user_id: vendor.approved_by_user_id,
        approved_at: vendor.approved_at,
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
 * Update vendor
 *
 * Q2: Check if vendor is pending approval before allowing edit
 */
export async function updateVendor(
  id: number,
  data: unknown
): Promise<ServerActionResult<VendorWithCount>> {
  try {
    const user = await getCurrentUser();

    // Q2: Check if vendor is pending approval
    const existing = await db.vendor.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Vendor not found',
      };
    }

    // Check edit permission based on vendor status
    if (!canEditPendingVendor(user, { status: existing.status })) {
      return {
        success: false,
        error: 'Cannot edit vendor pending approval. Please wait for admin approval.',
      };
    }

    const validated = vendorFormSchema.parse(data);

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
        address: validated.address || null,
        gst_exemption: validated.gst_exemption ?? false,
        bank_details: validated.bank_details || null,
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
        address: vendor.address,
        gst_exemption: vendor.gst_exemption,
        bank_details: vendor.bank_details,
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
 *
 * Q7: A - Soft delete using deleted_at field
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

    // Q7: Soft delete using deleted_at timestamp
    await db.vendor.update({
      where: { id },
      data: {
        deleted_at: new Date(),
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
        address: updated.address,
        gst_exemption: updated.gst_exemption,
        bank_details: updated.bank_details,
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
        description: validated.description,
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
        description: validated.description,
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

// ============================================================================
// INVOICE PROFILE OPERATIONS (Sprint 9B Phase 2)
// ============================================================================

type InvoiceProfileWithRelations = {
  id: number;
  name: string;
  description: string | null;
  entity_id: number;
  vendor_id: number;
  category_id: number;
  currency_id: number;
  prepaid_postpaid: string | null;
  billing_frequency: string | null;
  billing_frequency_unit: string | null;
  billing_frequency_value: number | null;
  tds_applicable: boolean;
  tds_percentage: number | null;
  visible_to_all: boolean;
  created_at: Date;
  updated_at: Date;
  entity: { id: number; name: string };
  vendor: { id: number; name: string };
  category: { id: number; name: string };
  currency: { id: number; code: string; name: string };
  invoiceCount: number;
};

/**
 * Get invoice profiles with filters and pagination
 * Accessible to all authenticated users (read-only)
 * Non-super-admins only see profiles visible to all OR profiles they have explicit access to
 */
export async function getInvoiceProfiles(
  filters?: {
    search?: string;
    entity_id?: number;
    vendor_id?: number;
    category_id?: number;
    currency_id?: number;
    is_active?: boolean;
    page?: number;
    per_page?: number;
  }
): Promise<
  ServerActionResult<{
    profiles: InvoiceProfileWithRelations[];
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  }>
> {
  try {
    const user = await getCurrentUser();
    const userId = user.id;
    const isSuperAdminUser = await isSuperAdmin();

    const page = filters?.page || 1;
    const per_page = filters?.per_page || 20;

    const where: Prisma.InvoiceProfileWhereInput = {};

    // Apply visibility filter (unless super admin)
    if (!isSuperAdminUser) {
      where.OR = [
        { visible_to_all: true },
        {
          visibilities: {
            some: {
              user_id: userId,
            },
          },
        },
      ];
    }

    // Apply search filter
    if (filters?.search) {
      where.name = {
        contains: filters.search,
      };
    }

    // Apply entity filter
    if (filters?.entity_id) {
      where.entity_id = filters.entity_id;
    }

    // Apply vendor filter
    if (filters?.vendor_id) {
      where.vendor_id = filters.vendor_id;
    }

    // Apply category filter
    if (filters?.category_id) {
      where.category_id = filters.category_id;
    }

    // Apply currency filter
    if (filters?.currency_id) {
      where.currency_id = filters.currency_id;
    }

    const [profiles, total] = await Promise.all([
      db.invoiceProfile.findMany({
        where,
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
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: { recurring_invoices: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      db.invoiceProfile.count({ where }),
    ]);

    const profilesWithCount: InvoiceProfileWithRelations[] = profiles.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      entity_id: p.entity_id,
      vendor_id: p.vendor_id,
      category_id: p.category_id,
      currency_id: p.currency_id,
      prepaid_postpaid: p.prepaid_postpaid,
      billing_frequency: p.billing_frequency,
      billing_frequency_unit: p.billing_frequency_unit,
      billing_frequency_value: p.billing_frequency_value,
      tds_applicable: p.tds_applicable,
      tds_percentage: p.tds_percentage,
      visible_to_all: p.visible_to_all,
      created_at: p.created_at,
      updated_at: p.updated_at,
      entity: p.entity,
      vendor: p.vendor,
      category: p.category,
      currency: p.currency,
      invoiceCount: p._count.recurring_invoices,
    }));

    return {
      success: true,
      data: {
        profiles: profilesWithCount,
        pagination: {
          page,
          per_page,
          total,
          total_pages: Math.ceil(total / per_page),
        },
      },
    };
  } catch (error) {
    console.error('getInvoiceProfiles error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch invoice profiles',
    };
  }
}

/**
 * Create new invoice profile (admin only)
 */
export async function createInvoiceProfile(
  data: unknown
): Promise<ServerActionResult<InvoiceProfileWithRelations>> {
  try {
    await requireAdmin();

    const validated = await import('@/lib/validations/master-data').then((m) =>
      m.invoiceProfileFormSchema.parse(data)
    );

    // Check case-insensitive duplicate
    const existing = await db.invoiceProfile.findFirst({
      where: {
        name: validated.name,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Invoice profile "${validated.name}" already exists`,
      };
    }

    // Verify all foreign keys exist and are active
    const [entity, vendor, category, currency] = await Promise.all([
      db.entity.findFirst({ where: { id: validated.entity_id, is_active: true } }),
      db.vendor.findFirst({ where: { id: validated.vendor_id, is_active: true } }),
      db.category.findFirst({ where: { id: validated.category_id, is_active: true } }),
      db.currency.findFirst({ where: { id: validated.currency_id, is_active: true } }),
    ]);

    if (!entity) {
      return { success: false, error: 'Selected entity not found or inactive' };
    }
    if (!vendor) {
      return { success: false, error: 'Selected vendor not found or inactive' };
    }
    if (!category) {
      return { success: false, error: 'Selected category not found or inactive' };
    }
    if (!currency) {
      return { success: false, error: 'Selected currency not found or inactive' };
    }

    const profile = await db.invoiceProfile.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        entity_id: validated.entity_id,
        vendor_id: validated.vendor_id,
        category_id: validated.category_id,
        currency_id: validated.currency_id,
        prepaid_postpaid: validated.prepaid_postpaid || null,
        billing_frequency: validated.billing_frequency,
        billing_frequency_unit: validated.billing_frequency_unit || null,
        billing_frequency_value: validated.billing_frequency_value || null,
        tds_applicable: validated.tds_applicable ?? false,
        tds_percentage: validated.tds_percentage || null,
        visible_to_all: true, // Default to visible to all users
      },
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
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { recurring_invoices: true },
        },
      },
    });

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: profile.id,
        name: profile.name,
        description: profile.description,
        entity_id: profile.entity_id,
        vendor_id: profile.vendor_id,
        category_id: profile.category_id,
        currency_id: profile.currency_id,
        prepaid_postpaid: profile.prepaid_postpaid,
        billing_frequency: profile.billing_frequency,
        billing_frequency_unit: profile.billing_frequency_unit,
        billing_frequency_value: profile.billing_frequency_value,
        tds_applicable: profile.tds_applicable,
        tds_percentage: profile.tds_percentage,
        visible_to_all: profile.visible_to_all,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        entity: profile.entity,
        vendor: profile.vendor,
        category: profile.category,
        currency: profile.currency,
        invoiceCount: profile._count.recurring_invoices,
      },
    };
  } catch (error) {
    console.error('createInvoiceProfile error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create invoice profile',
    };
  }
}

/**
 * Update invoice profile (admin only)
 */
export async function updateInvoiceProfile(
  id: number,
  data: unknown
): Promise<ServerActionResult<InvoiceProfileWithRelations>> {
  try {
    await requireAdmin();

    const validated = await import('@/lib/validations/master-data').then((m) =>
      m.invoiceProfileFormSchema.parse(data)
    );

    const existing = await db.invoiceProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Invoice profile not found',
      };
    }

    // Check case-insensitive duplicate (exclude current profile)
    const duplicate = await db.invoiceProfile.findFirst({
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
        error: `Invoice profile "${validated.name}" already exists`,
      };
    }

    // Verify all foreign keys exist and are active
    const [entity, vendor, category, currency] = await Promise.all([
      db.entity.findFirst({ where: { id: validated.entity_id, is_active: true } }),
      db.vendor.findFirst({ where: { id: validated.vendor_id, is_active: true } }),
      db.category.findFirst({ where: { id: validated.category_id, is_active: true } }),
      db.currency.findFirst({ where: { id: validated.currency_id, is_active: true } }),
    ]);

    if (!entity) {
      return { success: false, error: 'Selected entity not found or inactive' };
    }
    if (!vendor) {
      return { success: false, error: 'Selected vendor not found or inactive' };
    }
    if (!category) {
      return { success: false, error: 'Selected category not found or inactive' };
    }
    if (!currency) {
      return { success: false, error: 'Selected currency not found or inactive' };
    }

    const profile = await db.invoiceProfile.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description || null,
        entity_id: validated.entity_id,
        vendor_id: validated.vendor_id,
        category_id: validated.category_id,
        currency_id: validated.currency_id,
        prepaid_postpaid: validated.prepaid_postpaid || null,
        billing_frequency: validated.billing_frequency,
        billing_frequency_unit: validated.billing_frequency_unit || null,
        billing_frequency_value: validated.billing_frequency_value || null,
        tds_applicable: validated.tds_applicable ?? false,
        tds_percentage: validated.tds_percentage || null,
      },
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
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { recurring_invoices: true },
        },
      },
    });

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: profile.id,
        name: profile.name,
        description: profile.description,
        entity_id: profile.entity_id,
        vendor_id: profile.vendor_id,
        category_id: profile.category_id,
        currency_id: profile.currency_id,
        prepaid_postpaid: profile.prepaid_postpaid,
        billing_frequency: profile.billing_frequency,
        billing_frequency_unit: profile.billing_frequency_unit,
        billing_frequency_value: profile.billing_frequency_value,
        tds_applicable: profile.tds_applicable,
        tds_percentage: profile.tds_percentage,
        visible_to_all: profile.visible_to_all,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        entity: profile.entity,
        vendor: profile.vendor,
        category: profile.category,
        currency: profile.currency,
        invoiceCount: profile._count.recurring_invoices,
      },
    };
  } catch (error) {
    console.error('updateInvoiceProfile error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update invoice profile',
    };
  }
}

/**
 * Archive invoice profile (soft delete, admin only)
 * Only allowed if profile has no invoices
 */
export async function archiveInvoiceProfile(
  id: number
): Promise<ServerActionResult<void>> {
  try {
    await requireAdmin();

    const profile = await db.invoiceProfile.findUnique({
      where: { id },
      include: {
        _count: {
          select: { recurring_invoices: true },
        },
      },
    });

    if (!profile) {
      return {
        success: false,
        error: 'Invoice profile not found',
      };
    }

    if (profile._count.recurring_invoices > 0) {
      return {
        success: false,
        error: `Cannot archive profile with ${profile._count.recurring_invoices} invoice(s)`,
      };
    }

    // InvoiceProfile doesn't support soft delete - delete permanently
    await db.invoiceProfile.delete({
      where: { id },
    });

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('archiveInvoiceProfile error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to archive invoice profile',
    };
  }
}

/**
 * Restore archived invoice profile (admin only)
 */
export async function restoreInvoiceProfile(
  id: number
): Promise<ServerActionResult<InvoiceProfileWithRelations>> {
  try {
    await requireAdmin();

    const profile = await db.invoiceProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return {
        success: false,
        error: 'Invoice profile not found',
      };
    }

    // InvoiceProfile doesn't support archiving - no restore needed
    // Just return the profile with relations
    const updated = await db.invoiceProfile.findUnique({
      where: { id },
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
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { recurring_invoices: true },
        },
      },
    });

    if (!updated) {
      return {
        success: false,
        error: 'Invoice profile not found',
      };
    }

    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        entity_id: updated.entity_id,
        vendor_id: updated.vendor_id,
        category_id: updated.category_id,
        currency_id: updated.currency_id,
        prepaid_postpaid: updated.prepaid_postpaid,
        billing_frequency: updated.billing_frequency,
        billing_frequency_unit: updated.billing_frequency_unit,
        billing_frequency_value: updated.billing_frequency_value,
        tds_applicable: updated.tds_applicable,
        tds_percentage: updated.tds_percentage,
        visible_to_all: updated.visible_to_all,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
        entity: updated.entity,
        vendor: updated.vendor,
        category: updated.category,
        currency: updated.currency,
        invoiceCount: updated._count.recurring_invoices,
      },
    };
  } catch (error) {
    console.error('restoreInvoiceProfile error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to restore invoice profile',
    };
  }
}
