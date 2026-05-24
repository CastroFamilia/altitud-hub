import { supabase } from '@/lib/supabase';

// --- Properties ---

export async function getPropertyDetails(id) {
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_images(id, image_url, thumbnail_url, priority, drive_file_id)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getPropertiesWithDriveFolders() {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      id, name, listing_title_es, listing_title_en,
      unparsed_address, owner_name, agent_id,
      drive_photos_folder_id, drive_photos_folder_url,
      photos_ready, status, created_at,
      property_images(id)
    `)
    .not('drive_photos_folder_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}


export async function updateProperty(id, updates, client = null) {
  const supabaseClient = client || supabase;
  const { error } = await supabaseClient.from('properties').update(updates).eq('id', id);
  if (error) throw error;

  // Notify brokers if status is pending_approval
  if (updates && updates.status === 'pending_approval') {
    try {
      const { data: prop } = await supabaseClient
        .from('properties')
        .select('name, listing_title_es, listing_title_en, agent_id, office_code')
        .eq('id', id)
        .single();
      
      if (prop) {
        const title = prop.listing_title_es || prop.listing_title_en || prop.name || 'Propiedad sin título';
        const officeId = prop.office_code?.toLowerCase()?.includes('cero') || prop.office_code === 'R0700151' ? 'cero' : 'altitud';
        
        const { data: brokers } = await supabaseClient
          .from('profiles')
          .select('auth_user_id')
          .eq('role', 'broker')
          .eq('office', officeId);
        
        if (brokers && brokers.length > 0) {
          let agentName = 'Un agente';
          if (prop.agent_id) {
            const { data: agentProfile } = await supabaseClient
              .from('profiles')
              .select('full_name')
              .eq('auth_user_id', prop.agent_id)
              .single();
            if (agentProfile?.full_name) agentName = agentProfile.full_name;
          }

          for (const broker of brokers) {
            if (broker.auth_user_id) {
              await supabaseClient.from('notifications').insert({
                user_id: broker.auth_user_id,
                title: '🏠 Propiedad por aprobar',
                message: `${agentName} ha enviado la propiedad "${title}" para aprobación.`,
                link: '/oficina?tab=propiedades',
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to notify brokers about property approval:', e);
    }
  }
}

export async function getPropertiesForApproval(client = null) {
  const supabaseClient = client || supabase;
  const { data, error } = await supabaseClient
    .from('properties')
    .select('*, property_images(image_url, priority)')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPropertiesByDevelopmentId(devId, client = null) {
  const supabaseClient = client || supabase;
  const { data, error } = await supabaseClient
    .from('properties')
    .select('id,title_es,title_en,property_type,size_m2,price,status,main_image_url')
    .eq('development_id', devId);
  if (error) throw error;
  return data;
}

export async function getUnlinkedProperties(client = null) {
  const supabaseClient = client || supabase;
  const { data, error } = await supabaseClient
    .from('properties')
    .select('id,title_es,title_en,property_type,status')
    .is('development_id', null);
  if (error) throw error;
  return data;
}

// --- Images ---

export async function deletePropertyImage(imageId) {
  const { error } = await supabase.from('property_images').delete().eq('id', imageId);
  if (error) throw error;
}
export async function getPropertiesByContactId(contactId, client = null) {
  const supabaseClient = client || supabase;
  const { data, error } = await supabaseClient
    .from('properties')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPropertiesByIds(ids, client = null) {
  if (!ids || ids.length === 0) return [];
  const supabaseClient = client || supabase;
  const { data, error } = await supabaseClient
    .from('properties')
    .select('*')
    .in('id', ids);

  if (error) throw error;
  return data;
}

// --- Syndications & Inquiries ---

export async function getPropertySyndications(propertyId) {
  const { data, error } = await supabase.from('property_syndication').select('*').eq('property_id', propertyId);
  if (error) throw error;
  return data;
}

export async function upsertPropertySyndication({ property_id, portal_name, portal_listing_url, status }) {
  const { data, error } = await supabase
    .from('property_syndication')
    .upsert({
      property_id,
      portal_name,
      portal_listing_url,
      status: status || 'synced',
      published_at: status === 'synced' ? new Date().toISOString() : undefined,
    }, { onConflict: 'property_id,portal_name' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPropertyInquiries(propertyId, client = null) {
  const supabaseClient = client || supabase;
  const { data, error } = await supabaseClient.from('property_inquiries').select('id, portal_name, status').eq('property_id', propertyId);
  if (error) throw error;
  return data;
}

export async function getInquiriesByContactId(contactId, client = null) {
  const supabaseClient = client || supabase;
  const { data, error } = await supabaseClient
    .from('property_inquiries')
    .select('*')
    .eq('contact_id', contactId)
    .order('inquiry_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function insertPropertyInquiry(inquiryData, client = null) {
  const supabaseClient = client || supabase;
  const { data, error } = await supabaseClient
    .from('property_inquiries')
    .insert([inquiryData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- Milestones ---

export async function getListingMilestone(propertyId) {
  const { data, error } = await supabase
    .from('listing_milestones')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error; // Ignore 0 rows error
  return data;
}

export async function upsertListingMilestone(milestoneUpdate) {
  const { error } = await supabase.from('listing_milestones').upsert(milestoneUpdate, { onConflict: 'property_id' });
  if (error) throw error;
}

export async function insertProperty(payload) {
  const { data, error } = await supabase.from('properties').insert([payload]).select().single();
  if (error) throw error;

  if (data && data.status === 'pending_approval') {
    try {
      const title = data.listing_title_es || data.listing_title_en || data.name || 'Propiedad sin título';
      const officeId = data.office_code?.toLowerCase()?.includes('cero') || data.office_code === 'R0700151' ? 'cero' : 'altitud';
      
      const { data: brokers } = await supabase
        .from('profiles')
        .select('auth_user_id')
        .eq('role', 'broker')
        .eq('office', officeId);
      
      if (brokers && brokers.length > 0) {
        let agentName = 'Un agente';
        if (data.agent_id) {
          const { data: agentProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('auth_user_id', data.agent_id)
            .single();
          if (agentProfile?.full_name) agentName = agentProfile.full_name;
        }

        for (const broker of brokers) {
          if (broker.auth_user_id) {
            await supabase.from('notifications').insert({
              user_id: broker.auth_user_id,
              title: '🏠 Propiedad por aprobar',
              message: `${agentName} ha enviado la propiedad "${title}" para aprobación.`,
              link: '/oficina?tab=propiedades',
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to notify brokers about new property approval:', e);
    }
  }

  return data;
}
