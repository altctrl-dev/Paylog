'use client';

import { signOut } from 'next-auth/react';

/**
 * Perform a complete logout that clears all auth cookies
 * This handles edge cases where standard signOut doesn't properly clear session
 */
export async function logout() {
  try {
    // First, call our custom logout endpoint to clear all cookies
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    // If the custom logout fails, continue with standard signOut
    console.error('Custom logout failed:', error);
  }

  // Then perform the standard signOut
  await signOut({ callbackUrl: '/login' });
}
