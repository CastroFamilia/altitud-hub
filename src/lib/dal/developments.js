import { supabase as defaultClient } from '@/lib/supabase';

function getClient(client) {
  return client || defaultClient;
}

export async function getDevelopments(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getDevelopmentsList(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('developments')
    .select('id, name, slug, status')
    .order('name');

  if (error) throw error;
  return data;
}

export async function getDevelopmentsByAgentId(agentId, client = null) {
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
