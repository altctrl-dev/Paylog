'use client';

import { logoutAction } from '@/app/actions/auth';

/**
 * Perform a complete logout using a Server Action
 *
 * This calls a server action that:
 * 1. Manually deletes all auth cookies using Next.js cookies() API
 * 2. Calls server-side signOut from Auth.js
 * 3. Redirects to /login
 */
export async function logout() {
  await logoutAction();
}
