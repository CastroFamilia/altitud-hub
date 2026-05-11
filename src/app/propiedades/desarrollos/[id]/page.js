import { createClient } from '@/lib/supabase-server';
import DesarrolloDetailClient from './DesarrolloDetailClient';

export default async function DesarrolloDetailPage({ params }) {
  const { id } = params;
  const supabase = await createClient();

  let initialDevelopment = null;

  if (id) {
    try {
      const { data } = await supabase
        .from('developments')
        .select('*')
        .eq('id', id)
        .single();
        
      if (data) {
        initialDevelopment = data;
      }
    } catch (err) {
      console.error('DesarrolloDetailPage: Error loading development:', err);
    }
  }

  return <DesarrolloDetailClient initialDevelopment={initialDevelopment} />;
}
