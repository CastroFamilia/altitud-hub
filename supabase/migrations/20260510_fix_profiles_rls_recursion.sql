-- =============================================
-- FIX: Infinite recursion in profiles RLS policies
-- =============================================

-- 1. Create a SECURITY DEFINER function to get the current user's role securely
-- This bypasses RLS on the profiles table and prevents infinite recursion.
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 2. Create a SECURITY DEFINER function to check if the current user is a team leader
CREATE OR REPLACE FUNCTION public.is_team_leader_of(target_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.profiles p ON p.id = t.leader_id
    WHERE t.id = target_team_id AND p.auth_user_id = auth.uid()
  );
$$;

-- 3. Drop the old recursive policies on `profiles`
DROP POLICY IF EXISTS "Broker reads all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Broker inserts profiles" ON public.profiles;
DROP POLICY IF EXISTS "Broker updates profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team leader reads team" ON public.profiles;

-- 4. Recreate the policies using the new SECURITY DEFINER functions
CREATE POLICY "Broker reads all profiles" ON public.profiles FOR SELECT
    USING ( public.get_auth_user_role() = 'broker' );

CREATE POLICY "Broker inserts profiles" ON public.profiles FOR INSERT
    WITH CHECK ( public.get_auth_user_role() = 'broker' );

CREATE POLICY "Broker updates profiles" ON public.profiles FOR UPDATE
    USING ( public.get_auth_user_role() = 'broker' );

CREATE POLICY "Team leader reads team" ON public.profiles FOR SELECT
    USING ( public.is_team_leader_of(team_id) );
