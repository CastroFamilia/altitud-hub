import { createClient } from '@/lib/supabase-server';
import LiderClient from './LiderClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TeamLeaderPanelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch current logged-in profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*, teams:teams!profiles_team_id_fkey(name)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!currentProfile) {
    redirect('/login');
  }

  // Verify auth: role must be 'team_leader' or 'broker' or 'admin'
  const isAuthorized = ['team_leader', 'broker', 'admin'].includes(currentProfile.role);
  if (!isAuthorized) {
    // We will let LiderClient display the "Unauthorized" page nicely or handle it here.
  }

  // 2. Fetch all profiles, teams, OKR entries, properties, reservations, and commissions in parallel
  // This allows optimal rendering, with calculations shifted to the client-side for maximum interactivity.
  const [
    profilesRes,
    teamsRes,
    okrRes,
    propertiesRes,
    reservationsRes,
    commissionsRes
  ] = await Promise.all([
    supabase.from('profiles').select('*, teams:teams!profiles_team_id_fkey(name)').order('full_name'),
    supabase.from('teams').select('*').order('name'),
    supabase
      .from('agent_daily_okr_entries')
      .select('*')
      .gte('date', `${new Date().getFullYear()}-01-01`)
      .order('date', { ascending: false }),
    supabase
      .from('properties')
      .select(`
        id, name, listing_title_es, listing_title_en, status, property_type, created_at, updated_at,
        list_price, list_price_currency_id, agent_id, unparsed_address,
        property_images(image_url, priority)
      `)
      .order('updated_at', { ascending: false }),
    supabase
      .from('office_reservations')
      .select('*, due_diligence_items (*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('agent_commissions')
      .select('*')
      .order('closing_date', { ascending: false })
  ]);

  // Handle fallback syndication links separately to prevent failure due to empty tables
  let initialSyndications = [];
  try {
    const { data: syndData } = await supabase
      .from('property_syndication')
      .select('property_id, portal_name, portal_listing_url, status');
    if (syndData) initialSyndications = syndData;
  } catch (e) {
    console.error('Failed to pre-fetch optional syndication data:', e.message);
  }

  return (
    <LiderClient
      currentProfile={currentProfile}
      initialProfiles={profilesRes.data || []}
      initialTeams={teamsRes.data || []}
      initialOkrEntries={okrRes.data || []}
      initialProperties={propertiesRes.data || []}
      initialSyndications={initialSyndications}
      initialReservations={reservationsRes.data || []}
      initialCommissions={commissionsRes.data || []}
    />
  );
}
