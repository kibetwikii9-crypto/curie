import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if maintenance mode is enabled via environment variable
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  
  // Always allow access to maintenance page itself
  if (request.nextUrl.pathname.startsWith('/maintenance')) {
    return NextResponse.next();
  }
  
  // If maintenance mode is enabled, redirect all other requests to maintenance page
  if (maintenanceMode) {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

