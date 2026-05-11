"use client";

import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import LoginClient from '@/app/login/LoginClient';

/**
 * AuthGate — Shows the login page when not authenticated,
 * or renders children (sidebar + main) when authenticated.
 * 
 * Public routes (/d/, /reportes/, /login) bypass the gate entirely.
 */
export default function AuthGate({ children }) {
  const pathname = usePathname();
  const isPublicRoute = pathname?.startsWith('/d/') || pathname?.startsWith('/reportes/') || pathname === '/login';

  const { loading, isAuthenticated, error } = useAuth();

  // Public routes bypass auth entirely
  if (isPublicRoute) return <>{children}</>;


  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
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

  // Authenticated — render the app
  return <>{children}</>;
}
