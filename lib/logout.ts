'use client';

import { signOut } from 'next-auth/react';

/**
 * Perform a complete logout
 *
 * Known issue: NextAuth v5 / Auth.js on Railway (and other non-Vercel platforms)
 * doesn't properly clear cookies with just signOut().
 * See: https://github.com/nextauthjs/next-auth/discussions/3996
 *
 * Solution: Use signOut with redirect:false, then force a full page navigation
 * to ensure all cookies are cleared and state is reset.
 */
export async function logout() {
  try {
    // First, call signOut without redirect to trigger server-side cookie clearing
    await signOut({ redirect: false });
  } catch (error) {
    console.error('SignOut error (continuing with redirect):', error);
  }

  // Force a full page navigation to /login
  // This ensures:
  // 1. All client-side state is cleared
  // 2. The browser makes a fresh request
  // 3. Any cookie changes from signOut are properly applied
  window.location.href = '/login';
}
