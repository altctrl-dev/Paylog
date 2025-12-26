/**
 * Server Actions: System Settings
 *
 * CRUD operations for application-wide settings stored in system_settings table.
 * Settings are key-value pairs with string values (parsed by application).
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// ============================================================================
// INTERNAL TYPES & CONSTANTS (not exported - 'use server' files can only export async functions)
// ============================================================================

type ServerActionResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
}

// Known setting keys
const SETTING_KEYS = {
  SOFT_DELETE_RETENTION_DAYS: 'soft_delete_retention_days',
} as const;

type SettingKey = typeof SETTING_KEYS[keyof typeof SETTING_KEYS];

// Default values for settings
const DEFAULT_VALUES: Record<SettingKey, string> = {
  [SETTING_KEYS.SOFT_DELETE_RETENTION_DAYS]: '30',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized: You must be logged in');
  }

  return {
    id: parseInt(session.user.id),
    role: session.user.role as string,
  };
}

function isSuperAdmin(role: string): boolean {
  return role === 'super_admin';
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Get a system setting by key
 * Returns the default value if the setting doesn't exist
 */
export async function getSetting(key: SettingKey): Promise<ServerActionResult<string>> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key },
    });

    if (setting) {
      return { success: true, data: setting.value };
    }

    // Return default value if setting doesn't exist
    const defaultValue = DEFAULT_VALUES[key];
    if (defaultValue !== undefined) {
      return { success: true, data: defaultValue };
    }

    return { success: false, error: `Setting '${key}' not found` };
  } catch (error) {
    console.error('getSetting error:', error);
    return { success: false, error: 'Failed to get setting' };
  }
}

/**
 * Get soft delete retention days setting
 * Convenience function that returns the numeric value
 */
export async function getSoftDeleteRetentionDays(): Promise<ServerActionResult<number>> {
  try {
    const result = await getSetting(SETTING_KEYS.SOFT_DELETE_RETENTION_DAYS);

    if (!result.success) {
      // Return default if setting doesn't exist
      return { success: true, data: 30 };
    }

    const days = parseInt(result.data, 10);
    if (isNaN(days) || days < 1) {
      return { success: true, data: 30 }; // Fallback to default
    }

    return { success: true, data: days };
  } catch (error) {
    console.error('getSoftDeleteRetentionDays error:', error);
    return { success: true, data: 30 }; // Fallback to default
  }
}

/**
 * Update a system setting
 * Only super_admin can update settings
 */
export async function updateSetting(
  key: SettingKey,
  value: string
): Promise<ServerActionResult<{ key: string; value: string }>> {
  try {
    const user = await getCurrentUser();

    if (!isSuperAdmin(user.role)) {
      return { success: false, error: 'Only super admins can update system settings' };
    }

    // Validate the value based on the key
    if (key === SETTING_KEYS.SOFT_DELETE_RETENTION_DAYS) {
      const days = parseInt(value, 10);
      if (isNaN(days) || days < 1 || days > 365) {
        return { success: false, error: 'Retention days must be between 1 and 365' };
      }
    }

    // Upsert the setting
    const setting = await db.systemSetting.upsert({
      where: { key },
      update: {
        value,
        updated_by: user.id,
      },
      create: {
        key,
        value,
        updated_by: user.id,
      },
    });

    revalidatePath('/invoices');

    return {
      success: true,
      data: { key: setting.key, value: setting.value },
    };
  } catch (error) {
    console.error('updateSetting error:', error);
    return { success: false, error: 'Failed to update setting' };
  }
}

/**
 * Update soft delete retention days
 * Convenience function with validation
 */
export async function updateSoftDeleteRetentionDays(
  days: number
): Promise<ServerActionResult<number>> {
  if (days < 1 || days > 365) {
    return { success: false, error: 'Retention days must be between 1 and 365' };
  }

  const result = await updateSetting(
    SETTING_KEYS.SOFT_DELETE_RETENTION_DAYS,
    String(days)
  );

  if (!result.success) {
    return result;
  }

  return { success: true, data: days };
}
