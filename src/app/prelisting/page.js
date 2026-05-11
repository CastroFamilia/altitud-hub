import { createClient } from '@/lib/supabase-server';
import PrelistingClient from './PrelistingClient';

export default async function PrelistingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialProperties = [];
  let initialInterviews = [];

  if (user) {
    // We could filter properties by agent_id = user.id if necessary, 
    // but the previous code didn't filter them.
    try {
      const { data: propData } = await supabase
        .from('properties')
        .select('*, contacts(first_name, last_name, phone, email)')
        .order('created_at', { ascending: false });
        
      if (propData) initialProperties = propData;

      // The previous code didn't fetch acm_reports for the dashboard list,
      // but let's fetch them so the table isn't empty if data exists.
      const { data: acmData } = await supabase
        .from('acm_reports')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (acmData) initialInterviews = acmData;
    } catch (e) {
      console.error('Error fetching prelisting data:', e);
    }
  }

  return (
    <PrelistingClient 
      initialProperties={initialProperties} 
      initialInterviews={initialInterviews} 
    />
  );
}
