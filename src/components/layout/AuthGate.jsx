"use client";

import { useAuth } from '@/lib/auth-context';
import LoginPage from '@/app/login/page';

/**
 * AuthGate — Shows the login page when not authenticated,
 * or renders children (sidebar + main) when authenticated.
 * 
 * This is the client-side complement to the middleware.
 * The middleware handles server-side redirects and API protection.
 * AuthGate handles the client-side UI gating (e.g., initial load, SPA navigation).
 */
export default function AuthGate({ children }) {
  const { loading, isAuthenticated, error } = useAuth();

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
    return <LoginPage />;
  }

  // Authenticated — render the app
  return <>{children}</>;
}
