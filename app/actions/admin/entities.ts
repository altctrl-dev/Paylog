/**
 * Server Actions: Entity CRUD Operations
 *
 * Production-ready server actions for entity management with RBAC and validation.
 * Follows patterns from app/actions/master-data.ts
 *
 * Created as part of Sprint 9A Phase 5-8.
 */

'use server';

import type { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  entityFormSchema,
  entityFiltersSchema,
  type EntityFilters,
} from '@/lib/validations/master-data';
import { revalidatePath } from 'next/cache';

// ============================================================================
// TYPES
// ============================================================================

type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type EntityWithCount = {
  id: number;
  name: string;
  description: string | null;
  address: string;
  country: string;
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
// ENTITY OPERATIONS
// ============================================================================

/**
 * Get entities with filters and pagination
 * Accessible to all authenticated users (read-only)
 */
export async function getEntities(
  filters?: Partial<EntityFilters>
): Promise<
  ServerActionResult<{
    entities: EntityWithCount[];
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

    const validated = entityFiltersSchema.parse({
      page: filters?.page || 1,
      per_page: filters?.per_page || 20,
      ...filters,
    });

    const where: Prisma.EntityWhereInput = {};

    if (validated.search) {
      where.OR = [
        { name: { contains: validated.search, mode: 'insensitive' } },
        { address: { contains: validated.search, mode: 'insensitive' } },
      ];
    }

    if (validated.is_active !== undefined) {
      where.is_active = validated.is_active;
    }

    if (validated.country) {
      where.country = validated.country.toUpperCase();
    }

    const [entities, total] = await Promise.all([
      db.entity.findMany({
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
      db.entity.count({ where }),
    ]);

    const entitiesWithCount: EntityWithCount[] = entities.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      address: e.address,
      country: e.country,
      is_active: e.is_active,
      created_at: e.created_at,
      updated_at: e.updated_at,
      invoiceCount: e._count.invoices,
    }));

    return {
      success: true,
      data: {
        entities: entitiesWithCount,
        pagination: {
          page: validated.page,
          per_page: validated.per_page,
          total,
          total_pages: Math.ceil(total / validated.per_page),
        },
      },
    };
  } catch (error) {
    console.error('getEntities error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch entities',
    };
  }
}

/**
 * Create new entity (admin only)
 */
export async function createEntity(
  data: unknown
): Promise<ServerActionResult<EntityWithCount>> {
  try {
    await requireAdmin();

    const validated = entityFormSchema.parse(data);

    // Check case-insensitive duplicate name
    const existing = await db.entity.findFirst({
      where: {
        name: {
          equals: validated.name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Entity "${validated.name}" already exists`,
      };
    }

    const entity = await db.entity.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        address: validated.address,
        country: validated.country.toUpperCase(),
        is_active: validated.is_active ?? true,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    revalidatePath('/admin');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: entity.id,
        name: entity.name,
        description: entity.description,
        address: entity.address,
        country: entity.country,
        is_active: entity.is_active,
        created_at: entity.created_at,
        updated_at: entity.updated_at,
        invoiceCount: entity._count.invoices,
      },
    };
  } catch (error) {
    console.error('createEntity error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create entity',
    };
  }
}

/**
 * Update entity (admin only)
 */
export async function updateEntity(
  id: number,
  data: unknown
): Promise<ServerActionResult<EntityWithCount>> {
  try {
    await requireAdmin();

    const validated = entityFormSchema.parse(data);

    const existing = await db.entity.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Entity not found',
      };
    }

    // Check case-insensitive duplicate (exclude current entity)
    const duplicate = await db.entity.findFirst({
      where: {
        name: {
          equals: validated.name,
          mode: 'insensitive',
        },
        id: {
          not: id,
        },
      },
    });

    if (duplicate) {
      return {
        success: false,
        error: `Entity "${validated.name}" already exists`,
      };
    }

    const entity = await db.entity.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description || null,
        address: validated.address,
        country: validated.country.toUpperCase(),
        is_active: validated.is_active ?? existing.is_active,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    revalidatePath('/admin');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: entity.id,
        name: entity.name,
        description: entity.description,
        address: entity.address,
        country: entity.country,
        is_active: entity.is_active,
        created_at: entity.created_at,
        updated_at: entity.updated_at,
        invoiceCount: entity._count.invoices,
      },
    };
  } catch (error) {
    console.error('updateEntity error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update entity',
    };
  }
}

/**
 * Toggle entity active status (archive/restore)
 * Admin only
 */
export async function toggleEntityStatus(
  id: number
): Promise<ServerActionResult<EntityWithCount>> {
  try {
    await requireAdmin();

    const entity = await db.entity.findUnique({
      where: { id },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    if (!entity) {
      return {
        success: false,
        error: 'Entity not found',
      };
    }

    // If deactivating, check if entity has invoices
    if (entity.is_active && entity._count.invoices > 0) {
      return {
        success: false,
        error: `Cannot archive entity with ${entity._count.invoices} invoice(s)`,
      };
    }

    const updated = await db.entity.update({
      where: { id },
      data: {
        is_active: !entity.is_active,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    revalidatePath('/admin');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        address: updated.address,
        country: updated.country,
        is_active: updated.is_active,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
        invoiceCount: updated._count.invoices,
      },
    };
  } catch (error) {
    console.error('toggleEntityStatus error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle entity status',
    };
  }
}
