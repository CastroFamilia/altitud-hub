import { createClient } from '@/lib/supabase-server';
import EstadoCuentaClient from './EstadoCuentaClient';

export default async function EstadoCuentaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialTransactions = [];

  if (user) {
    try {
      // Find profile_id for user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (profile) {
        // Pre-fetch transactions
        const { data: allData } = await supabase
          .from('account_transactions')
          .select('*')
          .eq('profile_id', profile.id)
          .order('date', { ascending: false });

        if (allData) initialTransactions = allData;
      }
    } catch (e) {
      console.error('EstadoCuentaPage: Error fetching transactions:', e);
    }
  }

  return <EstadoCuentaClient initialTransactions={initialTransactions} />;
}
