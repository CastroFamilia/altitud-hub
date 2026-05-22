import { createClient } from '@/lib/supabase-server';
import AdminPrintablesClient from './AdminPrintablesClient';

export default async function AdminPrintablesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // You might want to add role checking here in the future
  
  const { data: pages } = await supabase
    .from('printable_pages')
    .select('*')
    .order('order_index', { ascending: true });

  return <AdminPrintablesClient initialPages={pages || []} user={user} />;
}
