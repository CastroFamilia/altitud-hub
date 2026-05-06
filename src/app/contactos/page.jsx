import { createClient } from '@/lib/supabase-server';
import ContactosClient from './ContactosClient';

export default async function ContactosPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let initialContacts = [];
  if (user) {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) initialContacts = data;
  }

  return <ContactosClient initialContacts={initialContacts} />;
}
