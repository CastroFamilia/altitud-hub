import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-browser';

// Note: We cannot use @supabase/ssr createServerClient in middleware 
// because cookies() from next/headers is not available in middleware.
// Instead, we check for the presence of Supabase auth cookies.

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow these paths without auth
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check for Supabase auth cookies
  // Supabase stores session in cookies named like: sb-<project-ref>-auth-token
  const hasAuthCookie = request.cookies.getAll().some(
    cookie => cookie.name.includes('auth-token') || cookie.name.includes('sb-')
  );

  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|assets/).*)',
  ],
};
