import { createClient } from '@/lib/supabase-server';
import EquipoClient from './EquipoClient';

export default async function EquipoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialTeam = null;
  let initialMembers = [];
  let initialOkrLogs = [];

  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (profile) {
        // 1. Fetch my team (where I am the leader)
        const { data: myTeam } = await supabase
          .from('teams')
          .select('*')
          .eq('leader_id', profile.id)
          .single();

        if (myTeam) {
          initialTeam = myTeam;

          // 2. Fetch team members (juniors/agents)
          const { data: teamMembers } = await supabase
            .from('profiles')
            .select('*')
            .eq('team_id', myTeam.id)
            .neq('id', profile.id); // Exclude myself from the juniors list

          if (teamMembers) {
            initialMembers = teamMembers;

            // 3. Fetch recent OKRs for the team
            if (teamMembers.length > 0) {
              const memberIds = teamMembers.map(m => m.id);
              const { data: logs } = await supabase
                .from('okr_daily_logs')
                .select('*, profiles(full_name, avatar_url)')
                .in('profile_id', memberIds)
                .order('log_date', { ascending: false })
                .limit(50);

              if (logs) initialOkrLogs = logs;
            }
          }
        } else {
           // MOCK DATA FOR PREVIEW
           initialTeam = { id: 'mock-team', name: 'Equipo Alpha (Vista Previa)' };
           initialMembers = [
             { id: '1', full_name: 'Agente Prueba 1', email: 'prueba1@remax.cr', avatar_url: '' },
             { id: '2', full_name: 'Agente Prueba 2', email: 'prueba2@remax.cr', avatar_url: '' }
           ];
           initialOkrLogs = [
             { id: 'l1', log_date: new Date().toISOString(), activities: { llamadas: 10, reuniones: 2 }, profiles: { full_name: 'Agente Prueba 1' } },
             { id: 'l2', log_date: new Date().toISOString(), activities: { llamadas: 5, visitas: 1 }, profiles: { full_name: 'Agente Prueba 2' } }
           ];
        }
      }
    } catch (err) {
      console.error('Error fetching team data on server:', err);
    }
  }

  return (
    <EquipoClient 
      initialTeam={initialTeam} 
      initialMembers={initialMembers} 
      initialOkrLogs={initialOkrLogs} 
    />
  );
}
