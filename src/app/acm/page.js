import { createClient } from '@/lib/supabase-server';
import ACMClient from './ACMClient';

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: properties } = await supabase
    .from('properties')
    .select('*, contacts(first_name, last_name)')
    .order('created_at', { ascending: false });

  return <ACMClient initialProperties={properties || []} />;
}
