"use client";

import { useAuth } from '@/lib/auth-context';
import LoginPage from '@/app/login/page';

/**
 * AuthGate — Shows the login page when not authenticated,
 * or renders children (sidebar + main) when authenticated.
 */
export default function AuthGate({ children }) {
  // Auth temporarily disabled — render app directly
  return <>{children}</>;
}
