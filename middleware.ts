import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

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
