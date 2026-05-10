"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

/* ═══════════════════════════════════════════════════════════════
   AUTH CONTEXT — Manages user session, profile, and role
   ═══════════════════════════════════════════════════════════════ */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState(null);         // auth.users row
  const [profile, setProfile] = useState(null);    // profiles row
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the profile from the `profiles` table
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*, teams(id, name)')
      .eq('auth_user_id', authUser.id)
      .single();

    if (err || !data) {
      // User exists in auth.users but not pre-authorized in profiles
      // Try matching by email (for first login after invite)
      const { data: emailMatch, error: emailErr } = await supabase
        .from('profiles')
        .select('*, teams(id, name)')
        .eq('email', authUser.email.toLowerCase())
        .single();

      if (emailErr || !emailMatch) {
        setError('Tu cuenta no está autorizada. Contacta al administrador de la oficina.');
        await supabase.auth.signOut();
        setProfile(null);
        return null;
      }

      // Link the auth user to the profile if not yet linked
      if (!emailMatch.auth_user_id) {
        await supabase
          .from('profiles')
          .update({ 
            auth_user_id: authUser.id, 
            status: 'active',
            last_login: new Date().toISOString(),
            avatar_url: authUser.user_metadata?.avatar_url || emailMatch.avatar_url,
          })
          .eq('id', emailMatch.id);
        emailMatch.auth_user_id = authUser.id;
        emailMatch.status = 'active';
      }

      setProfile(emailMatch);
      setError(null);
      return emailMatch;
    }

    // Update last_login
    supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {});

    setProfile(data);
    setError(null);
    return data;
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user);
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const authUser = session?.user ?? null;
        setUser(authUser);
        if (authUser) {
          await fetchProfile(authUser);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  // Sign in with Google OAuth — restricted to @remax-altitud.cr
  const signIn = useCallback(async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: 'remax-altitud.cr'  // Only show @remax-altitud.cr accounts
        }
      }
    });
    if (err) {
      setError('Error de autenticación: ' + err.message);
    }
  }, [supabase]);

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setError(null);
  }, [supabase]);

  // Derived helpers
  const role = profile?.role || null;
  const isBroker = role === 'broker';
  const isTeamLeader = role === 'team_leader';
  const isAgent = role === 'agent';
  const isOfficeAssistant = role === 'office_assistant';
  const isAuthenticated = !!user && !!profile;

  // Dev bypass for local testing without login
  if (process.env.NODE_ENV === 'development') {
    return (
      <AuthContext.Provider value={{
        supabase,
        user: { id: '00000000-0000-0000-0000-000000000000', email: 'dev@remax-altitud.cr' },
        profile: { id: '00000000-0000-0000-0000-000000000000', full_name: 'Dev Admin', role: 'broker', office: 'altitud', email: 'dev@remax-altitud.cr' },
        role: 'broker',
        loading: false,
        error: null,
        signIn: () => {},
        signOut: () => {},
        isBroker: true,
        isTeamLeader: false,
        isAgent: false,
        isOfficeAssistant: false,
        isAuthenticated: true,
        fetchProfile: () => {},
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{
      supabase,
      user,
      profile,
      role,
      loading,
      error,
      signIn,
      signOut,
      isBroker,
      isTeamLeader,
      isAgent,
      isOfficeAssistant,
      isAuthenticated,
      fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
