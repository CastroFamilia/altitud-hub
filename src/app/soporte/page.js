import { createClient } from '@/lib/supabase-server';
import SoporteClient from './SoporteClient';

export default async function SoportePage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let initialTickets = [];
  if (user) {
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) initialTickets = data;
  }

  return <SoporteClient initialTickets={initialTickets} />;
}
