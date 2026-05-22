import { createClient } from '@/lib/supabase-server';
import EquipoClient from './EquipoClient';

export const dynamic = 'force-dynamic';

export default async function EquipoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialProfiles = [];
  let initialTeams = [];
  let initialOkrEntries = [];
  let initialOffboardingLogs = [];
  let initialCommissions = [];
  let initialCommissionTiers = [];

  if (user) {
    try {
      // 1. Fetch current profile to check role
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, role, office')
        .eq('auth_user_id', user.id)
        .single();

      if (currentProfile) {
        // Fetch all relevant data in parallel for optimal load times
        const [
          profilesRes,
          teamsRes,
          okrEntriesRes,
          offboardingLogsRes,
          commissionsRes,
          tiersRes
        ] = await Promise.all([
          supabase.from('profiles').select('*').order('full_name'),
          supabase.from('teams').select('*').order('name'),
          supabase
            .from('agent_daily_okr_entries')
            .select('*')
            .gte('date', `${new Date().getFullYear()}-01-01`)
            .order('date', { ascending: false }),
          supabase.from('agent_offboarding_log').select('*').order('created_at', { ascending: false }),
          supabase
            .from('agent_commissions')
            .select('id, agent_id, gross_commission, agent_amount, office_amount, closing_date, status')
            .order('closing_date', { ascending: false }),
          supabase.from('commission_tiers').select('*').eq('active', true).order('sort_order')
        ]);

        if (profilesRes.data) initialProfiles = profilesRes.data;
        if (teamsRes.data) initialTeams = teamsRes.data;
        if (okrEntriesRes.data) initialOkrEntries = okrEntriesRes.data;
        if (offboardingLogsRes.data) initialOffboardingLogs = offboardingLogsRes.data;
        if (commissionsRes.data) initialCommissions = commissionsRes.data;
        if (tiersRes.data) initialCommissionTiers = tiersRes.data;
      }
    } catch (err) {
      console.error('Error fetching broker team dashboard data on server:', err);
    }
  }

  return (
    <EquipoClient
      initialProfiles={initialProfiles}
      initialTeams={initialTeams}
      initialOkrEntries={initialOkrEntries}
      initialOffboardingLogs={initialOffboardingLogs}
      initialCommissions={initialCommissions}
      initialCommissionTiers={initialCommissionTiers}
    />
  );
}
