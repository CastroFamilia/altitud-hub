-- =============================================
-- Migration to allow team leaders to view their team's OKR entries
-- =============================================

DROP POLICY IF EXISTS "Team leaders can view team okrs" ON public.agent_daily_okr_entries;

CREATE POLICY "Team leaders can view team okrs"
    ON public.agent_daily_okr_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles agent_profile
            WHERE agent_profile.id = public.agent_daily_okr_entries.profile_id
              AND public.is_team_leader_of(agent_profile.team_id)
        )
    );
