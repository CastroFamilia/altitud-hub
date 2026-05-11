import { createClient } from '@/lib/supabase-server';
import SoporteClient from './SoporteClient';

export default async function SoportePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialTickets = [];

  if (user) {
    try {
      // Basic check for role, though real security is in RLS
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_user_id', user.id)
        .single();

      if (profile && (profile.role === 'broker' || profile.role === 'team_leader')) {
        const { data } = await supabase
          .from('support_tickets')
          .select(`
            *,
            profiles:agent_id (full_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false });

        if (data) {
          initialTickets = data;
        }
      }
    } catch (err) {
      console.error('SoportePage: Error loading tickets:', err);
    }
  }

  return <SoporteClient initialTickets={initialTickets} />;
}
