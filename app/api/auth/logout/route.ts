import { NextResponse } from 'next/server';

// All possible NextAuth cookie variants to clear
const COOKIES_TO_CLEAR = [
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

/**
 * Clear all auth cookies on response
 */
function clearAuthCookies(response: NextResponse) {
  for (const cookieName of COOKIES_TO_CLEAR) {
    // Clear with path=/ and expired date
    response.cookies.set(cookieName, '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }
  return response;
}

/**
 * GET handler - Redirect-based logout (used by client-side logout)
 * Clears all cookies and redirects to login page
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const loginUrl = new URL('/login', url.origin);
  const response = NextResponse.redirect(loginUrl);
  return clearAuthCookies(response);
}

/**
 * POST handler - API-based logout (for programmatic use)
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearAuthCookies(response);
}
