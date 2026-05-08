import { createClient } from '@/lib/supabase-server';
import NegocioClient from './NegocioClient';

export default async function NegocioPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let initialReservations = [];
  let initialContacts = [];
  let initialCommissions = [];
  let initialTiers = [];

  if (user) {
    // Get profile to find profile_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profile) {
      const { data: reservations } = await supabase
        .from('office_reservations')
        .select('*, due_diligence_items (*)')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (reservations) initialReservations = reservations;

      // Pre-fetch agent commissions
      const { data: commissions } = await supabase
        .from('agent_commissions')
        .select('*, properties(name, listing_title_es, listing_title_en, unparsed_address)')
        .eq('agent_id', profile.id)
        .order('closing_date', { ascending: false });
      
      if (commissions) initialCommissions = commissions;
    }

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, type')
      .order('first_name');
    
    if (contacts) initialContacts = contacts;

    // Pre-fetch commission tiers
    const { data: tiers } = await supabase
      .from('commission_tiers')
      .select('*')
      .eq('active', true)
      .order('sort_order');
    
    if (tiers) initialTiers = tiers;
  }

  return (
    <NegocioClient 
      initialReservations={initialReservations} 
      initialContacts={initialContacts}
      initialCommissions={initialCommissions}
      initialTiers={initialTiers}
    />
  );
}
