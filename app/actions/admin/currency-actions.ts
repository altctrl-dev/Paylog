/**
 * Server Actions: Currency Management
 *
 * Actions for adding, archiving, and deleting currencies.
 * Admin-only operations.
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getCurrencyByCode, PREDEFINED_CURRENCIES } from '@/lib/constants/currencies';

// ============================================================================
// TYPES
// ============================================================================

type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type Currency = {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_active: boolean;
};

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
 * Add a currency from the predefined list
 */
export async function addCurrency(
  code: string
): Promise<ServerActionResult<Currency>> {
  try {
    await requireAdmin();

    // Validate the currency code exists in predefined list
    const predefinedCurrency = getCurrencyByCode(code);
    if (!predefinedCurrency) {
      return {
        success: false,
        error: `Invalid currency code: ${code}. Please select from the available options.`,
      };
    }

    // Check if currency already exists
    const existing = await db.currency.findUnique({
      where: { code },
    });

    if (existing) {
      return {
        success: false,
        error: `Currency ${code} already exists.`,
      };
    }

    // Create the currency
    const currency = await db.currency.create({
      data: {
        code: predefinedCurrency.code,
        name: predefinedCurrency.name,
        symbol: predefinedCurrency.symbol,
        is_active: true,
      },
    });

    revalidatePath('/admin');
    revalidatePath('/invoices');

    return {
      success: true,
      data: currency,
    };
  } catch (error) {
    console.error('addCurrency error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add currency',
    };
  }
}

/**
 * Archive a currency (set is_active to false)
 */
export async function archiveCurrency(
  currencyId: number
): Promise<ServerActionResult<Currency>> {
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

    if (!currency.is_active) {
      return {
        success: false,
        error: 'Currency is already archived',
      };
    }

    // Check if it's the last active currency
    const activeCount = await db.currency.count({
      where: { is_active: true },
    });

    if (activeCount <= 1) {
      return {
        success: false,
        error: 'Cannot archive the last active currency. At least one currency must remain active.',
      };
    }

    // Check if currency is in use by any invoices
    const invoiceCount = await db.invoice.count({
      where: { currency_id: currencyId },
    });

    if (invoiceCount > 0) {
      // Archive instead of preventing
      const updated = await db.currency.update({
        where: { id: currencyId },
        data: { is_active: false },
      });

      revalidatePath('/admin');
      revalidatePath('/invoices');

      return {
        success: true,
        data: updated,
      };
    }

    // Archive the currency
    const updated = await db.currency.update({
      where: { id: currencyId },
      data: { is_active: false },
    });

    revalidatePath('/admin');
    revalidatePath('/invoices');

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error('archiveCurrency error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive currency',
    };
  }
}

/**
 * Delete a currency (only if not in use)
 */
export async function deleteCurrency(
  currencyId: number
): Promise<ServerActionResult<{ deleted: boolean }>> {
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

    // Check if it's the last active currency
    if (currency.is_active) {
      const activeCount = await db.currency.count({
        where: { is_active: true },
      });

      if (activeCount <= 1) {
        return {
          success: false,
          error: 'Cannot delete the last active currency. At least one currency must remain active.',
        };
      }
    }

    // Check if currency is in use by any invoices
    const invoiceCount = await db.invoice.count({
      where: { currency_id: currencyId },
    });

    if (invoiceCount > 0) {
      return {
        success: false,
        error: `Cannot delete currency. It is used by ${invoiceCount} invoice(s). Archive it instead.`,
      };
    }

    // Check if currency is in use by any invoice profiles
    const profileCount = await db.invoiceProfile.count({
      where: { currency_id: currencyId },
    });

    if (profileCount > 0) {
      return {
        success: false,
        error: `Cannot delete currency. It is used by ${profileCount} invoice profile(s). Archive it instead.`,
      };
    }

    // Delete the currency
    await db.currency.delete({
      where: { id: currencyId },
    });

    revalidatePath('/admin');
    revalidatePath('/invoices');

    return {
      success: true,
      data: { deleted: true },
    };
  } catch (error) {
    console.error('deleteCurrency error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete currency',
    };
  }
}

/**
 * Restore an archived currency (set is_active to true)
 */
export async function restoreCurrency(
  currencyId: number
): Promise<ServerActionResult<Currency>> {
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

    if (currency.is_active) {
      return {
        success: false,
        error: 'Currency is already active',
      };
    }

    // Restore the currency
    const updated = await db.currency.update({
      where: { id: currencyId },
      data: { is_active: true },
    });

    revalidatePath('/admin');
    revalidatePath('/invoices');

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error('restoreCurrency error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore currency',
    };
  }
}

/**
 * Get available currencies (not yet added)
 */
export async function getAvailableCurrencies(): Promise<
  ServerActionResult<{ code: string; name: string; symbol: string }[]>
> {
  try {
    await requireAdmin();

    // Get all existing currency codes
    const existingCurrencies = await db.currency.findMany({
      select: { code: true },
    });

    const existingCodes = new Set(existingCurrencies.map((c) => c.code));

    // Filter predefined currencies to only show ones not yet added
    const available = PREDEFINED_CURRENCIES.filter(
      (c) => !existingCodes.has(c.code)
    );

    return {
      success: true,
      data: available,
    };
  } catch (error) {
    console.error('getAvailableCurrencies error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get available currencies',
    };
  }
}
