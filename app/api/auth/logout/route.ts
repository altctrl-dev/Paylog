import { NextResponse } from 'next/server';

// All possible NextAuth/Auth.js cookie variants to clear
// Auth.js v5 uses different prefixes based on environment:
// - Development (HTTP): authjs.* (no prefix)
// - Production (HTTPS): __Secure-authjs.* or __Host-authjs.*
const COOKIES_TO_CLEAR = [
  // Auth.js v5 - no prefix (development)
  'authjs.session-token',
  'authjs.callback-url',
  'authjs.csrf-token',
  // Auth.js v5 - __Secure- prefix (production HTTPS)
  '__Secure-authjs.session-token',
  '__Secure-authjs.callback-url',
  '__Secure-authjs.csrf-token',
  // Auth.js v5 - __Host- prefix (production HTTPS, stricter)
  '__Host-authjs.session-token',
  '__Host-authjs.callback-url',
  '__Host-authjs.csrf-token',
  // Legacy next-auth v4 cookie names
  'next-auth.session-token',
  'next-auth.callback-url',
  'next-auth.csrf-token',
  '__Secure-next-auth.session-token',
  '__Secure-next-auth.callback-url',
  '__Secure-next-auth.csrf-token',
];

/**
 * Clear all auth cookies on response
 */
function clearAuthCookies(response: NextResponse) {
  const isProduction = process.env.NODE_ENV === 'production';

  for (const cookieName of COOKIES_TO_CLEAR) {
    // __Host- cookies have special requirements: Path=/, Secure, no Domain
    const isHostCookie = cookieName.startsWith('__Host-');

    // Clear with expired date
    response.cookies.set(cookieName, '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: isHostCookie || isProduction, // __Host- cookies MUST be Secure
      sameSite: 'lax',
      // Note: Don't set domain for __Host- cookies
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
