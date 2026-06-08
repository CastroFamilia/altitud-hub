import { supabase as defaultClient } from '@/lib/supabase';

function getClient(client) {
  return client || defaultClient;
}

const MOCK_DEVELOPMENTS = [
  {
    id: 'dev-1',
    name: 'Towers of Escazu',
    slug: 'demo-development',
    status: 'active',
    agent_id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
    tagline_es: 'El mejor lugar para vivir',
    tagline_en: 'The best place to live',
    og_image_url: 'https://placeholder.supabase.co/dev1.jpg',
    developer_name: 'Developer XYZ',
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-01T10:00:00Z',
  }
];

export async function getDevelopments(client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return MOCK_DEVELOPMENTS;
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getDevelopmentsList(client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return MOCK_DEVELOPMENTS.map(d => ({ id: d.id, name: d.name, slug: d.slug, status: d.status }));
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .select('id, name, slug, status')
    .order('name');

  if (error) throw error;
  return data;
}

export async function getDevelopmentsByAgentId(agentId, client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return MOCK_DEVELOPMENTS.filter(d => d.agent_id === agentId);
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .select('*')
    .eq('agent_id', agentId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getDevelopmentById(id, client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return MOCK_DEVELOPMENTS.find(d => d.id === id) || MOCK_DEVELOPMENTS[0];
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getDevelopmentMinimal(id, client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    const d = MOCK_DEVELOPMENTS.find(dev => dev.id === id) || MOCK_DEVELOPMENTS[0];
    return { id: d.id, name: d.name, slug: d.slug, status: d.status, agent_id: d.agent_id };
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .select('id, name, slug, status, agent_id')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveDevelopmentBySlug(slug, client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    const d = MOCK_DEVELOPMENTS.find(dev => dev.slug === slug) || MOCK_DEVELOPMENTS[0];
    return { name: d.name, tagline_es: d.tagline_es, tagline_en: d.tagline_en, og_image_url: d.og_image_url, developer_name: d.developer_name, status: d.status };
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .select('name, tagline_es, tagline_en, og_image_url, developer_name, status')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveDevelopmentWithProperties(slug, client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    const d = MOCK_DEVELOPMENTS.find(dev => dev.slug === slug) || MOCK_DEVELOPMENTS[0];
    return {
      ...d,
      properties: [
        {
          id: 'property-1',
          title_es: 'Hermosa Casa en Escazú',
          title_en: 'Beautiful House in Escazu',
          property_type: 'house',
          size_m2: 350,
          price: 450000,
          status: 'published',
          main_image_url: 'https://placeholder.supabase.co/img1.jpg'
        }
      ]
    };
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .select(`
      *,
      properties:properties(id, title_es, title_en, property_type, size_m2, price, status, main_image_url)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveDevelopmentsWithProperties(client = null) {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return MOCK_DEVELOPMENTS.map(d => ({
      ...d,
      properties: [
        {
          id: 'property-1',
          title_es: 'Hermosa Casa en Escazú',
          title_en: 'Beautiful House in Escazu',
          property_type: 'house',
          size_m2: 350,
          price: 450000,
          status: 'published',
          main_image_url: 'https://placeholder.supabase.co/img1.jpg'
        }
      ]
    }));
  }
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .select(`
      *,
      properties:properties(id, title_es, title_en, property_type, size_m2, price, status, main_image_url)
    `)
    .eq('status', 'active');

  if (error) throw error;
  return data;
}

export async function insertDevelopment(developmentData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .insert([developmentData])
    .select()
    .single();

  if (error) throw error;

  if (data && data.status === 'pending_approval') {
    try {
      const title = data.name || 'Desarrollo sin título';
      const officeId = data.office_code?.toLowerCase()?.includes('cero') ? 'cero' : 'altitud';
      
      const { data: brokers } = await supabaseClient
        .from('profiles')
        .select('auth_user_id')
        .eq('role', 'broker')
        .eq('office', officeId);
      
      if (brokers && brokers.length > 0) {
        let agentName = 'Un agente';
        if (data.agent_id) {
          const { data: agentProfile } = await supabaseClient
            .from('profiles')
            .select('full_name')
            .eq('auth_user_id', data.agent_id)
            .single();
          if (agentProfile?.full_name) agentName = agentProfile.full_name;
        }

        for (const broker of brokers) {
          if (broker.auth_user_id) {
            await supabaseClient.from('notifications').insert({
              user_id: broker.auth_user_id,
              title: '🏢 Desarrollo por aprobar',
              message: `${agentName} ha enviado el desarrollo "${title}" para aprobación.`,
              link: '/oficina?tab=propiedades',
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to notify brokers about new development approval:', e);
    }
  }

  return data;
}

export async function updateDevelopment(id, updates, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Notify brokers if status is pending_approval
  if (updates && updates.status === 'pending_approval' && data) {
    try {
      const title = data.name || 'Desarrollo sin título';
      const officeId = data.office_code?.toLowerCase()?.includes('cero') ? 'cero' : 'altitud';
      
      const { data: brokers } = await supabaseClient
        .from('profiles')
        .select('auth_user_id')
        .eq('role', 'broker')
        .eq('office', officeId);
      
      if (brokers && brokers.length > 0) {
        let agentName = 'Un agente';
        if (data.agent_id) {
          const { data: agentProfile } = await supabaseClient
            .from('profiles')
            .select('full_name')
            .eq('auth_user_id', data.agent_id)
            .single();
          if (agentProfile?.full_name) agentName = agentProfile.full_name;
        }

        for (const broker of brokers) {
          if (broker.auth_user_id) {
            await supabaseClient.from('notifications').insert({
              user_id: broker.auth_user_id,
              title: '🏢 Desarrollo por aprobar',
              message: `${agentName} ha enviado el desarrollo "${title}" para aprobación.`,
              link: '/oficina?tab=propiedades',
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to notify brokers about development approval:', e);
    }
  }

  return data;
}

export async function deleteDevelopment(id, client = null) {
  const supabaseClient = getClient(client);
  const { error } = await supabaseClient
    .from('developments')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
