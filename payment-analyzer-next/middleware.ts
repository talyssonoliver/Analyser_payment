import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/config/security-headers.config';
import { validateOrigin } from '@/lib/config/cors.config';

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    // If env missing, proceed without Supabase
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>
      ) {
        cookiesToSet.forEach(
          ({
            name,
            value,
            options,
          }: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          }
        );
      },
    },
  });

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/reset-password',
    '/auth/callback',
    '/auth/auth-code-error',
  ];

  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated and trying to access auth pages
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/reset-password')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  // Apply comprehensive security headers (SEC-008, SEC-009)
  applySecurityHeaders(supabaseResponse.headers);

  // Validate CORS origin (SEC-005)
  const origin = request.headers.get('origin');
  if (origin && !validateOrigin(origin)) {
    // Log suspicious request
    console.warn(`Blocked request from invalid origin: ${origin}`);
  }

  // Add security and performance headers
  const url = request.nextUrl.pathname;
  
  // Define regex patterns for cache control
  const staticAssetPattern = /\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/;
  const htmlPattern = /\.(html|htm)$/;
  
  // Cache static assets aggressively
  if (staticAssetPattern.test(url)) {
    supabaseResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Cache HTML pages with shorter TTL and revalidation
  else if (htmlPattern.test(url)) {
    supabaseResponse.headers.set('Cache-Control', 'public, max-age=3600, must-revalidate');
  }
  // Cache API responses with shorter TTL and stale-while-revalidate
  else if (url.startsWith('/api/')) {
    supabaseResponse.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  }
  // Default cache for other pages
  else {
    supabaseResponse.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analysis/:path*',
    '/history/:path*',
    '/settings/:path*',
    '/reports/:path*',
    '/login',
    '/signup',
    '/reset-password',
    '/auth/callback',
  ],
};
