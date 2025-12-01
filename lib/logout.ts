'use client';

import { signOut } from 'next-auth/react';

/**
 * Perform a complete logout
 * Uses NextAuth's signOut which handles cookie clearing server-side
 */
export async function logout() {
  try {
    // Use NextAuth's signOut - it POSTs to /api/auth/signout which clears cookies
    await signOut({
      callbackUrl: '/login',
      redirect: true
    });
  } catch (error) {
    // If signOut fails, force redirect to login
    console.error('SignOut failed:', error);
    window.location.href = '/login';
  }
}
