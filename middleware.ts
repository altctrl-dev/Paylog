import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Check for session errors (user deleted/deactivated)
  // The session callback sets error when JWT callback detects issues
  const session = req.auth;
  if (session?.error) {
    // Clear the session by redirecting to login with error param
    const url = new URL('/login', req.url);
    url.searchParams.set('error', session.error === 'UserDeactivated' ? 'deactivated' : 'session_expired');

    // Create response that clears auth cookies
    const response = NextResponse.redirect(url);
    response.cookies.delete('authjs.session-token');
    response.cookies.delete('__Secure-authjs.session-token');
    return response;
  }

  // Protect /admin/* routes (admin + super_admin only)
  if (pathname.startsWith('/admin')) {
    const role = req.auth?.user?.role as string;

    // Check if user has admin or super_admin role
    if (!role || (role !== 'admin' && role !== 'super_admin')) {
      // Redirect to forbidden page (Phase 4: Route Protection)
      const url = new URL('/forbidden', req.url);
      return NextResponse.redirect(url);
    }
  }

  // Continue with normal request processing
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
