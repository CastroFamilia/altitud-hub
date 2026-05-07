import { createClient } from '@/lib/supabase-server';
import NegocioClient from './NegocioClient';

export default async function NegocioPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let initialReservations = [];
  let initialContacts = [];

  if (user) {
    // Get profile to find profile_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profile) {
      const { data: reservations } = await supabase
        .from('office_reservations')
        .select('*, due_diligence_items (*)')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (reservations) initialReservations = reservations;
    }

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, type')
      .order('first_name');
    
    if (contacts) initialContacts = contacts;
  }

  return (
    <NegocioClient 
      initialReservations={initialReservations} 
      initialContacts={initialContacts} 
    />
  );
}
