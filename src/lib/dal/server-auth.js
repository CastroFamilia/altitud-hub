import { createClient } from '@/lib/supabase-server';

export async function getServerAuth() {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    const profile = {
      id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
      email: 'agente@remax-altitud.cr',
      full_name: 'Mock Agent',
      role: 'broker',
      office: 'altitud',
      status: 'active',
      auth_user_id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc'
    };
    return {
      id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
      email: 'agente@remax-altitud.cr',
      user_metadata: { full_name: 'Mock Agent', avatar_url: '' },
      profile,
      isBroker: true,
      isTeamLeader: false,
      isAgent: false,
      isJunior: false,
      isOfficeAssistant: false,
    };
  }

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
