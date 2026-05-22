import { createClient } from '@/lib/supabase-server';
import NegocioClient from './NegocioClient';
import { getAllContactsMinimal } from '@/lib/dal/contacts';

export default async function NegocioPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let initialReservations = [];
  let initialContacts = [];
  let initialCommissions = [];
  let initialTiers = [];
  let initialReferrals = [];
  let initialEvents = [];
  let initialAttendance = [];

  if (user) {
    // Get profile to find profile_id
    let profile = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, role, team_id')
        .eq('auth_user_id', user.id)
        .single();
      profile = data;
    } catch (e) {
      console.error('NegocioPage: Error fetching profile:', e?.message);
    }

    if (profile) {
      let teamProfileIds = [profile.id];
      if (profile.role === 'team_leader' && profile.team_id) {
        const { data: teamMembers } = await supabase
          .from('profiles')
          .select('id')
          .eq('team_id', profile.team_id);
        if (teamMembers) {
          teamProfileIds = [...teamProfileIds, ...teamMembers.map(m => m.id)];
        }
      }

      // Fetch reservations
      try {
        const { data: reservations } = await supabase
          .from('office_reservations')
          .select('*, due_diligence_items (*)')
          .in('profile_id', teamProfileIds)
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
          .in('agent_id', teamProfileIds)
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
          .or(teamProfileIds.map(id => `referring_agent_id.eq.${id},receiving_agent_id.eq.${id}`).join(','))
          .order('created_at', { ascending: false });
        if (referrals) initialReferrals = referrals;
      } catch (e) {
        console.error('NegocioPage: Error fetching referrals:', e?.message);
      }

      // Pre-fetch events and attendance
      try {
        const { data: events } = await supabase.from('office_events').select('*').order('event_date', { ascending: false });
        if (events) initialEvents = events;
        
        const { data: attendance } = await supabase.from('event_attendance').select('*').eq('profile_id', profile.id);
        if (attendance) initialAttendance = attendance;
      } catch (e) {
        console.error('NegocioPage: Error fetching events/attendance:', e?.message);
      }
    }

    // Fetch contacts
    try {
      initialContacts = await getAllContactsMinimal(supabase);
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
    <div className="flex-1 overflow-y-auto min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-8">
        <NegocioClient 
          initialReservations={initialReservations} 
          initialContacts={initialContacts}
          initialCommissions={initialCommissions}
          initialTiers={initialTiers}
          initialReferrals={initialReferrals}
          initialEvents={initialEvents}
          initialAttendance={initialAttendance}
        />
      </div>
    </div>
  );
}
