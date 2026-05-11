import { createClient } from '@/lib/supabase-server';
import DesarrollosClient from './DesarrollosClient';

export default async function DesarrollosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialDevelopments = [];

  if (user) {
    try {
      const { data } = await supabase
        .from('developments')
        .select('*')
        .eq('agent_id', user.id)
        .order('updated_at', { ascending: false });

      if (data) {
        initialDevelopments = data;
      }
    } catch (err) {
      console.error('DesarrollosPage: Error loading developments:', err);
    }
  }

  return <DesarrollosClient initialDevelopments={initialDevelopments} />;
}
