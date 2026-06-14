import { NextRequest, NextResponse } from 'next/server';

const protectedPaths = [
  '/',
  '/customers',
  '/invoices',
  '/payments',
  '/users',
  '/tenants',
  '/einvoicing',
  '/audit',
  '/analytics',
  '/settings',
  '/profile',
];

const authPaths = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  // Check if the path is an auth page
  const isAuthPath = authPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  // If trying to access protected route without token, redirect to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (logo.svg, robots.txt, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)',
  ],
};
