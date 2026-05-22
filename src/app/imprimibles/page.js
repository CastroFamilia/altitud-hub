import { createClient } from '@/lib/supabase-server';
import PrintablesClient from './PrintablesClient';

export default async function PrintablesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let savedPresentations = [];
  if (user) {
    const { data } = await supabase
      .from('saved_presentations')
      .select('*')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) savedPresentations = data;
  }

  return <PrintablesClient savedPresentations={savedPresentations} />;
}
