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
  const [realProfile, setRealProfile] = useState(null); // real profile for broker
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

    setRealProfile(data);
    setProfile(data);
    setError(null);
    return data;
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    const applyImpersonation = async (realP) => {
      if (realP?.role === 'broker') {
        const impId = localStorage.getItem('impersonated_id');
        if (impId) {
          const { data: impP } = await supabase.from('profiles').select('*, teams(id, name)').eq('id', impId).single();
          if (impP) {
            setProfile(impP);
            return;
          }
        }
      }
      setProfile(realP);
    };

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const realP = await fetchProfile(session.user);
          await applyImpersonation(realP);
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
          const realP = await fetchProfile(authUser);
          await applyImpersonation(realP);
        } else {
          setRealProfile(null);
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
  const realRole = realProfile?.role || null;
  const isBroker = realRole === 'broker'; // Always true if real user is broker
  const isTeamLeader = role === 'team_leader';
  const isAgent = role === 'agent';
  const isOfficeAssistant = role === 'office_assistant';
  const isAuthenticated = !!user && !!realProfile;



  return (
    <AuthContext.Provider value={{
      supabase,
      user,
      profile,
      realProfile,
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
