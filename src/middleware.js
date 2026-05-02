import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-browser';

// Note: We cannot use @supabase/ssr createServerClient in middleware 
// because cookies() from next/headers is not available in middleware.
// Instead, we check for the presence of Supabase auth cookies.

export function middleware(request) {
  // Auth temporarily disabled — allow all requests
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
