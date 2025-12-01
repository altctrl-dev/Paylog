'use server';

import { signOut } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Server Action to perform logout
 *
 * This uses the SERVER-SIDE signOut from Auth.js (not the client-side one)
 * and manually clears all auth cookies to ensure complete logout.
 */
export async function logoutAction() {
  const cookieStore = await cookies();

  // List of all possible Auth.js cookie names
  const authCookies = [
    'authjs.session-token',
    'authjs.callback-url',
    'authjs.csrf-token',
    '__Secure-authjs.session-token',
    '__Secure-authjs.callback-url',
    '__Secure-authjs.csrf-token',
    '__Host-authjs.session-token',
    '__Host-authjs.callback-url',
    '__Host-authjs.csrf-token',
  ];

  // Delete all auth cookies
  for (const cookieName of authCookies) {
    try {
      cookieStore.delete(cookieName);
    } catch {
      // Cookie might not exist, that's fine
    }
  }

  // Call server-side signOut
  try {
    await signOut({ redirect: false });
  } catch {
    // signOut might throw, continue anyway
  }

  // Redirect to login
  redirect('/login');
}
