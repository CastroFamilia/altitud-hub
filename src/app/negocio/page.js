import { createClient } from '@/lib/supabase-server';
import NegocioClient from './NegocioClient';

export default async function NegocioPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let initialReservations = [];
  let initialContacts = [];
  let initialCommissions = [];
  let initialTiers = [];
  let initialReferrals = [];

  if (user) {
    // Get profile to find profile_id
    let profile = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      profile = data;
    } catch (e) {
      console.error('NegocioPage: Error fetching profile:', e?.message);
    }

    if (profile) {
      // Fetch reservations
      try {
        const { data: reservations } = await supabase
          .from('office_reservations')
          .select('*, due_diligence_items (*)')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false });
        if (reservations) initialReservations = reservations;
      } catch (e) {
        console.error('NegocioPage: Error fetching reservations:', e?.message);
      }

      // Pre-fetch agent commissions (table may not exist yet)
      try {
        const { data: commissions } = await supabase
          .from('agent_commissions')
          .select('*, properties(name, listing_title_es, listing_title_en, unparsed_address)')
          .eq('agent_id', profile.id)
          .order('closing_date', { ascending: false });
        if (commissions) initialCommissions = commissions;
      } catch (e) {
        console.error('NegocioPage: Error fetching commissions:', e?.message);
      }

      // Pre-fetch agent referrals (table may not exist yet)
      try {
        const { data: referrals } = await supabase
          .from('agent_referrals')
          .select('*, referring_profile:profiles!agent_referrals_referring_agent_id_fkey(full_name, avatar_url, office), receiving_profile:profiles!agent_referrals_receiving_agent_id_fkey(full_name, avatar_url, office)')
          .or(`referring_agent_id.eq.${profile.id},receiving_agent_id.eq.${profile.id}`)
          .order('created_at', { ascending: false });
        if (referrals) initialReferrals = referrals;
      } catch (e) {
        console.error('NegocioPage: Error fetching referrals:', e?.message);
      }
    }

    // Fetch contacts
    try {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, type')
        .order('first_name');
      if (contacts) initialContacts = contacts;
    } catch (e) {
      console.error('NegocioPage: Error fetching contacts:', e?.message);
    }

    // Pre-fetch commission tiers (table may not exist yet)
    try {
      const { data: tiers } = await supabase
        .from('commission_tiers')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (tiers) initialTiers = tiers;
    } catch (e) {
      console.error('NegocioPage: Error fetching tiers:', e?.message);
    }
  }

  return (
    <NegocioClient 
      initialReservations={initialReservations} 
      initialContacts={initialContacts}
      initialCommissions={initialCommissions}
      initialTiers={initialTiers}
      initialReferrals={initialReferrals}
    />
  );
}
