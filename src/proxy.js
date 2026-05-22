import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/* ═══════════════════════════════════════════════════════════════
   AUTH MIDDLEWARE — Protects all routes except public ones.
   
   Strategy: Use @supabase/ssr to create a middleware-compatible
   client that reads auth cookies. If no valid session exists,
   redirect to /login for page routes, or return 401 for API routes.
   
   Note: We cannot call cookies() from next/headers here.
   Instead we use request.cookies directly via @supabase/ssr.
   ═══════════════════════════════════════════════════════════════ */

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // ── Public routes that don't require auth ──────────────────
  const publicPaths = [
    '/login',
    '/auth/callback',
    '/d/',             // Public development landing pages
    '/reportes/',      // Public shareable reports
    '/api/public',     // Public property feeds
    '/api/health',     // Health check endpoint
    '/api/invite',     // Invitation acceptance
    '/api/agents-feed', // Public agents feed
  ];

  const isPublic = publicPaths.some(p => pathname.startsWith(p));
  if (isPublic || process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Also allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // ── Create Supabase client with cookie access ──────────────
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Forward cookie changes to the response
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ── Verify session ─────────────────────────────────────────
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    // API routes get 401, page routes get redirected to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autorizado. Inicia sesión para continuar.' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
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
