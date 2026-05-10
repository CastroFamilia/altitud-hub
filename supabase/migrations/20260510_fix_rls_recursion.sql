-- =============================================
-- FIX: Infinite recursion in profiles and properties policies
-- =============================================

-- 1. Create SECURITY DEFINER functions to securely get user roles without triggering RLS
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

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

-- 2. Fix PROFILES table policies
DROP POLICY IF EXISTS "Broker reads all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Broker inserts profiles" ON public.profiles;
DROP POLICY IF EXISTS "Broker updates profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team leader reads team" ON public.profiles;

CREATE POLICY "Broker reads all profiles" ON public.profiles FOR SELECT
    USING ( public.get_auth_user_role() = 'broker' );

CREATE POLICY "Broker inserts profiles" ON public.profiles FOR INSERT
    WITH CHECK ( public.get_auth_user_role() = 'broker' );

CREATE POLICY "Broker updates profiles" ON public.profiles FOR UPDATE
    USING ( public.get_auth_user_role() = 'broker' );

CREATE POLICY "Team leader reads team" ON public.profiles FOR SELECT
    USING ( public.is_team_leader_of(team_id) );

-- 3. Fix PROPERTIES table policies
DROP POLICY IF EXISTS "Brokers can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Brokers can update all properties" ON public.properties;
DROP POLICY IF EXISTS "Team leaders can view team properties" ON public.properties;

CREATE POLICY "Brokers can view all properties"
    ON public.properties FOR SELECT
    USING ( public.get_auth_user_role() = 'broker' );

CREATE POLICY "Brokers can update all properties"
    ON public.properties FOR UPDATE
    USING ( public.get_auth_user_role() = 'broker' );

CREATE POLICY "Team leaders can view team properties"
    ON public.properties FOR SELECT
    USING ( 
        EXISTS (
            SELECT 1 FROM public.profiles agent_profile 
            WHERE agent_profile.auth_user_id = public.properties.agent_id 
              AND public.is_team_leader_of(agent_profile.team_id)
        )
    );
