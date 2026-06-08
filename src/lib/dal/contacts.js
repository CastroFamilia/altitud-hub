import { supabase } from '@/lib/supabase';

// Helper to use either client or server supabase instance
const getClient = (client) => client || supabase;

const MOCK_CONTACTS = [
  {
    id: 'contact-1',
    user_id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
    first_name: 'Juan',
    last_name: 'Pérez',
    email: 'juan.perez@example.com',
    phone: '+506 8888-8881',
    type: 'buyer',
    status: 'active',
    primary_language: 'es',
    newsletter_opt_in: true,
    created_at: '2026-01-01T10:00:00Z'
  },
  {
    id: 'contact-2',
    user_id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
    first_name: 'Maria',
    last_name: 'Gomez',
    email: 'maria.gomez@example.com',
    phone: '+506 8888-8882',
    type: 'seller',
    status: 'active',
    primary_language: 'en',
    newsletter_opt_in: false,
    created_at: '2026-01-02T10:00:00Z'
  }
];

export async function getContacts(userId, client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return MOCK_CONTACTS;
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return MOCK_CONTACTS.find(c => c.id === id) || MOCK_CONTACTS[0];
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return { id: `contact-${Date.now()}`, ...contactData };
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    const contact = MOCK_CONTACTS.find(c => c.id === id) || MOCK_CONTACTS[0];
    return { ...contact, ...updates };
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return contactsData.map((c, i) => ({ id: `contact-${Date.now()}-${i}`, ...c }));
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('contacts')
    .insert(contactsData)
    .select();

  if (error) throw error;
  return data;
}

export async function getAllContactsMinimal(client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return MOCK_CONTACTS.map(c => ({ id: c.id, first_name: c.first_name, last_name: c.last_name, type: c.type }));
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('contacts')
    .select('id, first_name, last_name, type')
    .order('first_name');

  if (error) throw error;
  return data;
}

export async function getNewsletterSubscribers(client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return MOCK_CONTACTS.filter(c => c.newsletter_opt_in).map(c => ({
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone,
      type: c.type,
      primary_language: c.primary_language
    }));
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return MOCK_CONTACTS.map(c => ({ id: c.id, first_name: c.first_name, last_name: c.last_name, birth_date: '1990-06-08', move_in_date: '2020-01-01' }));
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return [
      {
        id: 'inquiry-1',
        lead_name: 'Test Buyer',
        lead_phone: '+506 8888-8888',
        lead_email: 'buyer@example.com',
        status: 'new',
        assigned_agent_id: agentId,
        property_id: 'property-1',
        properties: { id: 'property-1', name: 'Casa Bella', listing_title_es: 'Casa Bella', listing_title_en: 'Casa Bella' },
        assigned_at: '2026-06-01T12:00:00Z',
      }
    ];
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return { id, ...updates };
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return { id: `comm-${Date.now()}`, ...commData };
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return { id: `follow-${Date.now()}`, ...followUpData };
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return [
      {
        id: 'inquiry-1',
        lead_name: 'Test Buyer',
        lead_phone: '+506 8888-8888',
        lead_email: 'buyer@example.com',
        status: 'new',
        property_id: 'property-1',
        properties: { id: 'property-1', name: 'Casa Bella', listing_title_es: 'Casa Bella', listing_title_en: 'Casa Bella' },
        created_at: '2026-06-01T12:00:00Z',
      }
    ];
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return [
      { id: 'source-1', name: 'Encuentra24', active: true, sort_order: 1 },
      { id: 'source-2', name: 'Web', active: true, sort_order: 2 }
    ];
  }
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
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return [
      { id: 'comm-1', contact_id: 'contact-1', type: 'whatsapp', content: 'Enviada información', created_at: '2026-06-02T12:00:00Z' }
    ];
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('lead_communications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPendingLeadFollowUps(client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return [
      {
        id: 'follow-1',
        contact_id: 'contact-1',
        property_inquiry_id: 'inquiry-1',
        status: 'pending',
        due_date: '2026-06-10T12:00:00Z',
        notes: 'Llamar para coordinar cita',
        property_inquiries: { lead_name: 'Test Buyer' }
      }
    ];
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('lead_follow_ups')
    .select('*, property_inquiries(lead_name)')
    .eq('status', 'pending')
    .order('due_date');
  if (error) throw error;
  return data;
}
