import { supabase } from '@/lib/supabase';

// Helper to use either client or server supabase instance
const getClient = (client) => client || supabase;

export async function getContacts(userId, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getContactDetails(id, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function insertContact(contactData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('contacts')
    .insert([contactData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateContact(id, updates, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function insertMultipleContacts(contactsData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('contacts')
    .insert(contactsData)
    .select();

  if (error) throw error;
  return data;
}

export async function getAllContactsMinimal(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('contacts')
    .select('id, first_name, last_name, type')
    .order('first_name');

  if (error) throw error;
  return data;
}

export async function getNewsletterSubscribers(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('contacts')
    .select('first_name, last_name, email, phone, type, primary_language')
    .eq('newsletter_opt_in', true)
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getContactsForAlerts(userId, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('contacts')
    .select('id, first_name, last_name, birth_date, move_in_date')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw error;
  return data;
}

// --- Property Inquiries ---

export async function getAgentActiveInquiries(agentId, client = null) {
  const supabaseClient = getClient(client);
  const { data: inquiries, error: inquiryError } = await supabaseClient
    .from('property_inquiries')
    .select('*')
    .eq('assigned_agent_id', agentId)
    .in('status', ['new', 'contacted', 'prelisting', 'cma'])
    .order('assigned_at', { ascending: false });
    
  if (inquiryError) throw inquiryError;
  if (!inquiries || inquiries.length === 0) return [];

  const propertyIds = [...new Set(inquiries.map(i => i.property_id).filter(Boolean))];
  
  let propertiesMap = {};
  if (propertyIds.length > 0) {
    const { data: properties, error: propertiesError } = await supabaseClient
      .from('properties')
      .select('id, listing_title_es, listing_title_en, name')
      .in('id', propertyIds);
      
    if (propertiesError) {
      console.error('DAL [getAgentActiveInquiries] failed to fetch properties:', propertiesError);
    } else if (properties) {
      properties.forEach(p => {
        propertiesMap[p.id] = p;
      });
    }
  }

  return inquiries.map(inquiry => ({
    ...inquiry,
    properties: inquiry.property_id ? (propertiesMap[inquiry.property_id] || null) : null
  }));
}


export async function updatePropertyInquiry(id, updates, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('property_inquiries')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
  return data;
}

// --- Lead Communications ---

export async function insertLeadCommunication(commData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('lead_communications')
    .insert([commData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertLeadFollowUp(followUpData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('lead_follow_ups')
    .insert([followUpData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllInquiries(client = null) {
  const supabaseClient = getClient(client);
  const { data: inquiries, error: inquiryError } = await supabaseClient
    .from('property_inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (inquiryError) throw inquiryError;
  if (!inquiries || inquiries.length === 0) return [];

  const propertyIds = [...new Set(inquiries.map(i => i.property_id).filter(Boolean))];
  
  let propertiesMap = {};
  if (propertyIds.length > 0) {
    const { data: properties, error: propertiesError } = await supabaseClient
      .from('properties')
      .select('id, name, listing_title_es, listing_title_en')
      .in('id', propertyIds);

    if (propertiesError) {
      console.error('DAL [getAllInquiries] failed to fetch properties:', propertiesError);
    } else if (properties) {
      properties.forEach(p => {
        propertiesMap[p.id] = p;
      });
    }
  }

  return inquiries.map(inquiry => ({
    ...inquiry,
    properties: inquiry.property_id ? (propertiesMap[inquiry.property_id] || null) : null
  }));
}

export async function getLeadSources(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('lead_sources')
    .select('*')
    .eq('active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function getLeadCommunications(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('lead_communications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPendingLeadFollowUps(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('lead_follow_ups')
    .select('*, property_inquiries(lead_name)')
    .eq('status', 'pending')
    .order('due_date');
  if (error) throw error;
  return data;
}
