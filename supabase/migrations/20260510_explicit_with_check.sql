-- =============================================
-- FIX: Explicit WITH CHECK for UPDATE policies
-- =============================================

-- Sometimes Postgres requires an explicit WITH CHECK on UPDATE policies
-- to prevent "new row violates row-level security policy" when multiple policies exist.

DROP POLICY IF EXISTS "Brokers can update all properties" ON public.properties;

CREATE POLICY "Brokers can update all properties"
    ON public.properties FOR UPDATE
    USING ( public.get_auth_user_role() = 'broker' )
    WITH CHECK ( public.get_auth_user_role() = 'broker' );

DROP POLICY IF EXISTS "Agents can update their own properties" ON public.properties;

CREATE POLICY "Agents can update their own properties"
    ON public.properties FOR UPDATE
    USING (auth.uid() = agent_id)
    WITH CHECK (auth.uid() = agent_id);
