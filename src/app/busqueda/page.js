import BusquedaClient from './BusquedaClient';
import { createClient } from '@/lib/supabase-server';

export const metadata = {
  title: 'Búsqueda | ALTITUD HUB',
  description: 'Panel de búsquedas de clientes y matchmaking',
};

export default async function BusquedaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialSearches = [];
  let initialAllSearches = [];

  if (user) {
    const { data: mySearches } = await supabase
      .from('buyer_searches')
      .select('*, profiles!buyer_searches_agent_id_fkey(full_name, avatar_url, phone)')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false });
    
    if (mySearches) initialSearches = mySearches;

    const { data: allSearches } = await supabase
      .from('buyer_searches')
      .select('*, profiles!buyer_searches_agent_id_fkey(full_name, avatar_url, phone)')
      .eq('status', 'activa')
      .order('created_at', { ascending: false });
      
    if (allSearches) initialAllSearches = allSearches;
  }

  return (
    <BusquedaClient 
      initialSearches={initialSearches} 
      initialAllSearches={initialAllSearches} 
    />
  );
}
