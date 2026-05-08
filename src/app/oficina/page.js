import { createClient } from '@/lib/supabase-server';
import OficinaClient from './OficinaClient';

export default async function OficinaPage() {
  const supabase = await createClient();

  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, teams(name)')
    .order('full_name');

  // Fetch teams
  const { data: teams } = await supabase
    .from('teams')
    .select('*');

  // Fetch listing milestones for velocity analytics
  const { data: milestones } = await supabase
    .from('listing_milestones')
    .select('*');

  // Fetch leads (property inquiries) with linked property info
  const { data: inquiries } = await supabase
    .from('property_inquiries')
    .select('*, properties(name, listing_title_es, listing_title_en)')
    .order('created_at', { ascending: false });

  // Fetch configurable lead sources
  const { data: leadSources } = await supabase
    .from('lead_sources')
    .select('*')
    .eq('active', true)
    .order('sort_order');

  return (
    <OficinaClient 
      initialProfiles={profiles || []} 
      initialTeams={teams || []} 
      initialMilestones={milestones || []} 
      initialInquiries={inquiries || []}
      initialLeadSources={leadSources || []}
    />
  );
}
