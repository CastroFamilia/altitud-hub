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

  return (
    <OficinaClient 
      initialProfiles={profiles || []} 
      initialTeams={teams || []} 
      initialMilestones={milestones || []} 
    />
  );
}
