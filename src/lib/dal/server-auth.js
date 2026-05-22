import { createClient } from '@/lib/supabase-server';

export async function getServerAuth() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, office, status, avatar_url, auth_user_id, team_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    ...user,
    profile,
    isBroker: profile.role === 'broker',
    isTeamLeader: profile.role === 'team_leader',
    isAgent: profile.role === 'agent' || profile.role === 'junior',
    isJunior: profile.role === 'junior',
    isOfficeAssistant: profile.role === 'office_assistant',
  };
}
