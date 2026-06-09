"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SessionProvider, useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

const AuthContext = createContext(null);

function AuthProviderInner({ children }) {
  const { data: session, status } = useSession();
  
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedProfile, setImpersonatedProfile] = useState(null);

  const loading = status === "loading";
  const user = session?.user || null;
  const realProfile = session?.profile || null;
  
  // Impersonation logic
  useEffect(() => {
    if (realProfile?.role === 'broker') {
      const impId = localStorage.getItem('impersonated_id');
      if (impId) {
        // We need to fetch the impersonated profile from the API
        fetch(`/api/profile?id=${impId}`)
          .then(res => res.json())
          .then(data => {
            if (data?.profile) {
              setImpersonatedProfile(data.profile);
              setIsImpersonating(true);
            }
          })
          .catch(e => console.error("Error fetching impersonated profile", e));
      } else {
        setIsImpersonating(false);
        setImpersonatedProfile(null);
      }
    } else {
      setIsImpersonating(false);
      setImpersonatedProfile(null);
    }
  }, [realProfile]);

  const profile = isImpersonating ? impersonatedProfile : realProfile;

  const signIn = useCallback(async () => {
    await nextAuthSignIn('google');
  }, []);

  const signOut = useCallback(async () => {
    await nextAuthSignOut();
  }, []);

  const fetchProfile = useCallback(async () => {
    // With NextAuth, profile is fetched on session creation.
    // If we really need to refresh it, we can call a next-auth refresh or API.
    return profile;
  }, [profile]);

  // Derived helpers
  const role = profile?.role || null;
  const realRole = realProfile?.role || null;
  const isBroker = (realRole === 'broker' || realRole === 'admin') && !isImpersonating;
  const isTeamLeader = role === 'team_leader';
  const isAgent = role === 'agent' || role === 'junior';
  const isJunior = role === 'junior';
  const isOfficeAssistant = role === 'office_assistant';
  const isAuthenticated = !!user && !!realProfile;

  return (
    <AuthContext.Provider value={{
      supabase: null, // Removed, will break direct client supabase calls, needs DAL replacement
      user,
      profile,
      realProfile,
      role,
      loading,
      error: null,
      signIn,
      signOut,
      isBroker,
      isTeamLeader,
      isAgent,
      isJunior,
      isOfficeAssistant,
      isAuthenticated,
      fetchProfile,
      isImpersonating,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
