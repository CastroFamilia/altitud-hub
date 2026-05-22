import { createClient } from '@/lib/supabase-server';
import ContactProfileClient from './ContactProfileClient';
import { getContactDetails } from '@/lib/dal/contacts';
import { getPropertiesByContactId, getInquiriesByContactId } from '@/lib/dal/properties';
import { getAcmsByContactId } from '@/lib/dal/acm';

export default async function ContactProfilePage({ params }) {
  const { id } = params;
  const supabase = await createClient();

  let initialContact = null;
  let initialProperties = [];
  let initialAcms = [];
  let initialInquiries = [];
  let initialReservations = [];

  if (id) {
    try {
      // Fetch contact details
      initialContact = await getContactDetails(id, supabase);

      // Fetch associated ACMs
      initialAcms = await getAcmsByContactId(id, supabase);

      // Fetch properties
      initialProperties = await getPropertiesByContactId(id, supabase);

      // Fetch inquiries
      initialInquiries = await getInquiriesByContactId(id, supabase);

      // Fetch associated office reservations (deals)
      const { data: reservations } = await supabase
        .from('office_reservations')
        .select('*, due_diligence_items (*)')
        .or(`buyer_contact_id.eq.${id},seller_contact_id.eq.${id}`)
        .order('created_at', { ascending: false });
      if (reservations) initialReservations = reservations;

    } catch (err) {
      console.error("ContactProfilePage: Error fetching contact data:", err);
    }
  }

  return (
    <ContactProfileClient 
      initialContact={initialContact}
      initialProperties={initialProperties}
      initialAcms={initialAcms}
      initialInquiries={initialInquiries}
      initialReservations={initialReservations}
    />
  );
}
