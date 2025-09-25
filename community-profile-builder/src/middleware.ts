import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/api/auth/login',
    '/api/auth/register',
    '/api/invitations/validate'
  ];

  // API routes that require authentication
  const protectedApiRoutes = [
    '/api/invitations'
  ];

  // Protected pages
  const protectedPages = [
    '/dashboard'
  ];

  // Check if route is public
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // For API routes that require auth
  if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyJWT(token);

    if (!decoded) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }

    // Add user info to headers for API routes to use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-role', decoded.role);
    requestHeaders.set('x-user-community', decoded.communityId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // For protected pages, check if user has valid token in their local storage
  // This will be handled client-side, so we just pass through for now
  if (protectedPages.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};