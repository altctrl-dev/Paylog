/**
 * Server Actions: User Settings
 *
 * Server actions for updating user profile settings.
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// ============================================================================
// TYPES
// ============================================================================

type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  display_name: z.string().max(50).nullable().optional(),
  initials: z.string().max(3).nullable().optional(),
});

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
    email: session.user.email!,
    role: session.user.role as string,
  };
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Update user profile information
 */
export async function updateUserProfile(
  data: z.infer<typeof updateProfileSchema>
): Promise<ServerActionResult<{ updated: boolean }>> {
  try {
    const user = await getCurrentUser();

    // Validate input
    const validated = updateProfileSchema.parse(data);

    // Update user in database
    await db.user.update({
      where: { id: user.id },
      data: {
        full_name: validated.full_name,
        display_name: validated.display_name,
        initials: validated.initials,
        updated_at: new Date(),
      },
    });

    // Revalidate settings page
    revalidatePath('/settings');

    return {
      success: true,
      data: { updated: true },
    };
  } catch (error) {
    console.error('[User Settings] updateUserProfile error:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile',
    };
  }
}

/**
 * Get current user's profile
 */
export async function getUserProfile(): Promise<
  ServerActionResult<{
    id: number;
    email: string;
    full_name: string;
    display_name: string | null;
    initials: string | null;
    role: string;
    created_at: Date;
  }>
> {
  try {
    const currentUser = await getCurrentUser();

    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        display_name: true,
        initials: true,
        role: true,
        created_at: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('[User Settings] getUserProfile error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profile',
    };
  }
}
