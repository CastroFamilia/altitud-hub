"use client";

import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoginClient from '@/app/login/LoginClient';

/**
 * AuthGate — Shows the login page when not authenticated,
 * or renders children (sidebar + main) when authenticated.
 * 
 * Public routes (/d/, /reportes/) bypass the gate entirely.
 * The /login route is handled specially: shows LoginClient without
 * the sidebar, and redirects to / if already authenticated.
 */
export default function AuthGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = pathname?.startsWith('/d/') || pathname?.startsWith('/reportes/');
  const isLoginRoute = pathname === '/login';

  const { loading, isAuthenticated, error } = useAuth();

  // If already authenticated and on login page, redirect to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated && isLoginRoute) {
      router.push('/');
    }
  }, [loading, isAuthenticated, isLoginRoute, router]);

  // Public routes bypass auth entirely (no sidebar)
  if (isPublicRoute) return <>{children}</>;

  // Login route: render LoginClient without the sidebar wrapper
  if (isLoginRoute) {
    if (loading) {
      return (
        <div className="flex-1 w-full min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      );
    }
    // Already authenticated → redirect handled by useEffect above, show spinner
    if (isAuthenticated) {
      return (
        <div className="flex-1 w-full min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      );
    }
    return <LoginClient />;
  }

  // Protected routes: show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="flex-1 w-full min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-xs text-slate-400 font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginClient />;
  }

  // Authenticated — render the app with sidebar
  return <>{children}</>;
}
