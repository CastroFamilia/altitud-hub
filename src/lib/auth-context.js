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
  const [isImpersonating, setIsImpersonating] = useState(false);

  const fetchProfile = useCallback(async (authUser, retryCount = 0) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }
    try {
      // IMPORTANT: No JOIN on teams here — avoids RLS cross-table recursion freeze
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, office, status, avatar_url, auth_user_id, team_id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (err || !data) {
        // Transient lock error — retry with backoff (do NOT sign out)
        if ((err?.message?.includes('lock') || err?.message?.includes('Lock')) && retryCount < 3) {
          console.warn(`[fetchProfile] Lock conflict, retrying (${retryCount + 1}/3)...`);
          await new Promise(r => setTimeout(r, 600 * (retryCount + 1)));
          return fetchProfile(authUser, retryCount + 1);
        }

        // Fallback: look up by email to link new Google auth users to existing profiles
        const { data: emailMatch, error: emailErr } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, office, status, avatar_url, auth_user_id, team_id')
          .eq('email', authUser.email?.toLowerCase())
          .maybeSingle();

        if (emailErr || !emailMatch) {
          // Also retry email lookup on lock errors
          if ((emailErr?.message?.includes('lock') || emailErr?.message?.includes('Lock')) && retryCount < 3) {
            console.warn(`[fetchProfile] Lock conflict on email lookup, retrying (${retryCount + 1}/3)...`);
            await new Promise(r => setTimeout(r, 600 * (retryCount + 1)));
            return fetchProfile(authUser, retryCount + 1);
          }
          setError('Tu cuenta no está autorizada. Contacta al administrador de la oficina.');
          await supabase.auth.signOut();
          setProfile(null);
          return null;
        }

        // Link the Google auth_user_id to the existing profile row
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

        setRealProfile(emailMatch);
        setProfile(emailMatch);
        setError(null);
        return emailMatch;
      }

      // Update last_login timestamp (fire-and-forget)
      supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id)
        .then(() => {});

      setRealProfile(data);
      setProfile(data);
      setError(null);
      return data;
    } catch (e) {
      console.error('fetchProfile error:', e);
      return null;
    }
  }, [supabase]);

  // Initialize auth state — rely ONLY on onAuthStateChange.
  // It fires with INITIAL_SESSION on mount, making a separate
  // initAuth() call redundant AND dangerous (they race for the auth lock).
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
      const mockUser = {
        id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
        email: 'agente@remax-altitud.cr',
        user_metadata: { full_name: 'Mock Agent', avatar_url: '' }
      };
      const mockProfile = {
        id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
        email: 'agente@remax-altitud.cr',
        full_name: 'Mock Agent',
        role: 'broker',
        office: 'altitud',
        status: 'active',
        auth_user_id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc'
      };
      setUser(mockUser);
      setProfile(mockProfile);
      setRealProfile(mockProfile);
      setLoading(false);
      return;
    }

    const applyImpersonation = async (realP) => {
      if (realP?.role === 'broker') {
        const impId = localStorage.getItem('impersonated_id');
        if (impId) {
          const { data: impP } = await supabase.from('profiles').select('*, teams:teams!profiles_team_id_fkey(id, name)').eq('id', impId).single();
          if (impP) {
            setProfile(impP);
            setIsImpersonating(true);
            return;
          }
        }
      }
      setProfile(realP);
      setIsImpersonating(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const authUser = session?.user ?? null;
          setUser(authUser);
          if (authUser) {
            const realP = await fetchProfile(authUser);
            await applyImpersonation(realP);
          } else {
            setRealProfile(null);
            setProfile(null);
            setIsImpersonating(false);
          }
        } catch (e) {
          console.error('Error on auth state change:', e);
        } finally {
          setLoading(false);
        }
      }
    );

    // Fallback: if onAuthStateChange never fires (edge case), stop loading after 6s
    const timeoutId = setTimeout(() => setLoading(false), 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [supabase, fetchProfile]);

  // Sign in with Google OAuth — restricted to @remax-altitud.cr
  const signIn = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
      setUser({
        id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
        email: 'agente@remax-altitud.cr',
        user_metadata: { full_name: 'Mock Agent', avatar_url: '' }
      });
      const mockProfile = {
        id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
        email: 'agente@remax-altitud.cr',
        full_name: 'Mock Agent',
        role: 'broker',
        office: 'altitud',
        status: 'active',
        auth_user_id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc'
      };
      setProfile(mockProfile);
      setRealProfile(mockProfile);
      setLoading(false);
      return;
    }

    try {
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
        console.error('Supabase auth error:', err);
        setError('Error de autenticación: ' + err.message);
      }
    } catch (e) {
      console.error('JavaScript Error in signIn:', e);
      setError('Error inesperado: ' + e.message);
    }
  }, [supabase]);

  // Sign out
  const signOut = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
      setUser(null);
      setProfile(null);
      setRealProfile(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setError(null);
  }, [supabase]);

  // Derived helpers
  const role = profile?.role || null;
  const realRole = realProfile?.role || null;
  const isBroker = (realRole === 'broker' || realRole === 'admin') && !isImpersonating; // broker OR admin (administrativa), but false if impersonating
  const isTeamLeader = role === 'team_leader';
  const isAgent = role === 'agent' || role === 'junior';
  const isJunior = role === 'junior';
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
