import { createClient } from '@/lib/supabase-server';
import DesarrollosClient from './DesarrollosClient';

export default async function DesarrollosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialDevelopments = [];

  if (user) {
    try {
      // Fetch developments with a count of linked properties
      const { data, error } = await supabase
        .from('developments')
        .select('*, properties:properties(id)')
        .eq('agent_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        // Flatten: replace nested properties array with a count
        initialDevelopments = data.map(d => ({
          ...d,
          properties_count: d.properties?.length || 0,
          properties: undefined, // don't send the full array to client
        }));
      }
    } catch (err) {
      console.error('DesarrollosPage: Error loading developments:', err);
    }
  }

  return <DesarrollosClient initialDevelopments={initialDevelopments} />;
}
