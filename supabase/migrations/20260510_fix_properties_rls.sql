-- =============================================
-- FIX: Infinite recursion when approving properties
-- =============================================

-- 1. Ensure the SECURITY DEFINER function exists (this safely bypasses RLS recursion)
-- Using STABLE ensures Postgres caches the result per statement
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 2. Ensure the Team Leader function exists
CREATE OR REPLACE FUNCTION public.is_team_leader_of(target_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.profiles p ON p.id = t.leader_id
    WHERE t.id = target_team_id AND p.auth_user_id = auth.uid()
  );
$$;

-- 3. Drop the old recursive policies on properties
DROP POLICY IF EXISTS "Brokers can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Brokers can update all properties" ON public.properties;
DROP POLICY IF EXISTS "Team leaders can view team properties" ON public.properties;

-- 4. Recreate the policies using the new SECURITY DEFINER functions
CREATE POLICY "Brokers can view all properties"
    ON public.properties FOR SELECT
    USING ( public.get_auth_user_role() = 'broker' );

CREATE POLICY "Brokers can update all properties"
    ON public.properties FOR UPDATE
    USING ( public.get_auth_user_role() = 'broker' );

-- Note: The team leader policy was causing recursion because it queried profiles
CREATE POLICY "Team leaders can view team properties"
    ON public.properties FOR SELECT
    USING ( 
        EXISTS (
            SELECT 1 FROM public.profiles agent_profile 
            WHERE agent_profile.auth_user_id = public.properties.agent_id 
              AND public.is_team_leader_of(agent_profile.team_id)
        )
    );
