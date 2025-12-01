'use client';

/**
 * Perform a complete logout that clears all auth cookies
 * This handles edge cases where standard signOut doesn't properly clear session
 *
 * Instead of using signOut() which may not clear cookies properly,
 * we redirect to a server-side logout page that handles everything
 */
export function logout() {
  // Redirect to server-side logout that properly clears cookies
  window.location.href = '/api/auth/logout';
}
