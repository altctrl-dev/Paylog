/**
 * Server Action: Toggle Currency Active Status
 *
 * Admin-only action to activate/deactivate currencies.
 * Enforces at least 1 active currency at all times.
 *
 * Created as part of Sprint 9A Phase 5-8.
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// ============================================================================
// TYPES
// ============================================================================

type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
// CURRENCY OPERATIONS
// ============================================================================

/**
 * Toggle currency active status
 * Enforces at least 1 active currency at all times
 */
export async function toggleCurrency(
  currencyId: number
): Promise<ServerActionResult<{ is_active: boolean }>> {
  try {
    await requireAdmin();

    const currency = await db.currency.findUnique({
      where: { id: currencyId },
    });

    if (!currency) {
      return {
        success: false,
        error: 'Currency not found',
      };
    }

    // If trying to deactivate, check if it's the last active currency
    if (currency.is_active) {
      const activeCount = await db.currency.count({
        where: { is_active: true },
      });

      if (activeCount <= 1) {
        return {
          success: false,
          error: 'Cannot deactivate the last active currency. At least one currency must remain active.',
        };
      }
    }

    // Toggle the status
    const updated = await db.currency.update({
      where: { id: currencyId },
      data: {
        is_active: !currency.is_active,
      },
    });

    revalidatePath('/admin');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        is_active: updated.is_active,
      },
    };
  } catch (error) {
    console.error('toggleCurrency error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle currency status',
    };
  }
}
