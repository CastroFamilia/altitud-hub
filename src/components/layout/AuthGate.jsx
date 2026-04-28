"use client";

import { useAuth } from '@/lib/auth-context';
import LoginPage from '@/app/login/page';

/**
 * AuthGate — Shows the login page when not authenticated,
 * or renders children (sidebar + main) when authenticated.
 */
export default function AuthGate({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // Show loading spinner during initial auth check
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-dark-bg w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — show login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Authenticated — render app
  return <>{children}</>;
}
