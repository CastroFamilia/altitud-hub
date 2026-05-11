import { createClient } from '@/lib/supabase-server';
import ContactProfileClient from './ContactProfileClient';

export default async function ContactProfilePage({ params }) {
  const { id } = params;
  const supabase = await createClient();

  let initialContact = null;
  let initialProperties = [];
  let initialAcms = [];
  let initialInquiries = [];

  if (id) {
    try {
      // Fetch contact details
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (contactData) initialContact = contactData;

      // Fetch associated ACMs
      const { data: acmData } = await supabase
        .from('acm_reports')
        .select('id, property_address, created_at, suggested_price, status')
        .eq('contact_id', id)
        .order('created_at', { ascending: false });
        
      if (acmData) initialAcms = acmData;

      // Fetch properties
      const { data: propData } = await supabase
        .from('properties')
        .select('*')
        .eq('contact_id', id)
        .order('created_at', { ascending: false });
        
      if (propData) initialProperties = propData;

      // Fetch inquiries
      const { data: inquiryData } = await supabase
        .from('property_inquiries')
        .select('*')
        .eq('contact_id', id)
        .order('inquiry_date', { ascending: false });
        
      if (inquiryData) initialInquiries = inquiryData;

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
    />
  );
}
