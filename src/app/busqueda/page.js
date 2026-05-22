import BusquedaClient from './BusquedaClient';
import TopNav from '@/components/layout/TopNav';
import { createClient } from '@/lib/supabase-server';
import { getSearchesByAgentId, getActiveSearches } from '@/lib/dal/searches';

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
    try {
      const mySearches = await getSearchesByAgentId(user.id, supabase);
      if (mySearches) initialSearches = mySearches;

      const allSearches = await getActiveSearches(supabase);
      if (allSearches) initialAllSearches = allSearches;
    } catch (err) {
      console.error('BusquedaPage: Error loading searches:', err?.message || err?.code || err);
    }
  }

  return (
    <>
      <TopNav title="Centro de Búsqueda" subtitle="Gestión inteligente de requerimientos y matching" />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-dark-bg w-full">
        <div className="max-w-7xl mx-auto space-y-8">
          <BusquedaClient 
            initialSearches={initialSearches} 
            initialAllSearches={initialAllSearches} 
          />
        </div>
      </div>
    </>
  );
}
