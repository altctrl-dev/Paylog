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
  const isProduction = process.env.NODE_ENV === 'production';

  // List of all possible Auth.js and legacy NextAuth cookie names
  const authCookies = [
    // Auth.js v5
    'authjs.session-token',
    'authjs.callback-url',
    'authjs.csrf-token',
    '__Secure-authjs.session-token',
    '__Secure-authjs.callback-url',
    '__Secure-authjs.csrf-token',
    '__Host-authjs.session-token',
    '__Host-authjs.callback-url',
    '__Host-authjs.csrf-token',
    // Legacy NextAuth v4
    'next-auth.session-token',
    'next-auth.callback-url',
    'next-auth.csrf-token',
    '__Secure-next-auth.session-token',
    '__Secure-next-auth.callback-url',
    '__Secure-next-auth.csrf-token',
  ];

  // Explicitly expire all variants with matching attributes (path + secure)
  for (const cookieName of authCookies) {
    const isHostCookie = cookieName.startsWith('__Host-');
    const isSecureCookie =
      isHostCookie || cookieName.startsWith('__Secure-') || isProduction;

    cookieStore.set(cookieName, '', {
      expires: new Date(0),
      path: '/', // match the issued path
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'lax',
      // Note: do not set domain so __Host- cookies remain valid for clearing
    });
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
