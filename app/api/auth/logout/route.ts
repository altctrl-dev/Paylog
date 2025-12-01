import { NextResponse } from 'next/server';

/**
 * Custom logout endpoint that ensures all auth cookies are cleared
 * This handles edge cases where signOut doesn't properly clear cookies
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear all possible NextAuth cookie variants
  const cookiesToClear = [
    'authjs.session-token',
    '__Secure-authjs.session-token',
    'authjs.callback-url',
    '__Secure-authjs.callback-url',
    'authjs.csrf-token',
    '__Secure-authjs.csrf-token',
    // Legacy next-auth cookie names (in case they exist)
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
    'next-auth.csrf-token',
    '__Secure-next-auth.csrf-token',
  ];

  for (const cookieName of cookiesToClear) {
    // Clear with various path options to ensure complete removal
    response.cookies.set(cookieName, '', {
      expires: new Date(0),
      path: '/',
    });
  }

  return response;
}
