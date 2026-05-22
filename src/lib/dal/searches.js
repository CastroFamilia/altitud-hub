import { supabase as defaultClient } from '@/lib/supabase';

function getClient(client) {
  return client || defaultClient;
}

async function attachProfiles(searches, supabaseClient) {
  if (!searches || searches.length === 0) return searches;
  const agentIds = [...new Set(searches.map(s => s.agent_id).filter(Boolean))];
  if (agentIds.length === 0) return searches;

  const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('auth_user_id, full_name, avatar_url, phone')
    .in('auth_user_id', agentIds);

  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.auth_user_id] = p; });

  return searches.map(s => ({
    ...s,
    profiles: profileMap[s.agent_id] || null,
  }));
}

export async function getSearchesByAgentId(agentId, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_searches')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return attachProfiles(data, supabaseClient);
}

export async function getActiveSearches(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_searches')
    .select('*')
    .eq('status', 'activa')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return attachProfiles(data, supabaseClient);
}

export async function getAllSearches(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_searches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return attachProfiles(data, supabaseClient);
}

export async function getActiveSearchesForAgent(agentId, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_searches')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'activa');

  if (error) throw error;
  return data;
}

export async function getSearchById(id, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_searches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function insertSearch(searchData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_searches')
    .insert([searchData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSearch(id, updates, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_searches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSearch(id, client = null) {
  const supabaseClient = getClient(client);
  const { error } = await supabaseClient
    .from('buyer_searches')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function insertSearchMatch(matchData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('search_matches')
    .insert([matchData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function insertVote(voteData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_search_votes')
    .insert([voteData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPipelineItem(id, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_search_pipeline')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getSearchWithAgentById(id, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_searches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) return data;

  // Fetch profile separately since FK points to auth.users, not profiles
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('full_name, avatar_url, phone, email, office')
    .eq('auth_user_id', data.agent_id)
    .single();

  return { ...data, profiles: profile || null };
}

export async function getPipelineForSearch(searchId, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_search_pipeline')
    .select('*')
    .eq('search_id', searchId);

  if (error) throw error;
  return data;
}

export async function getVotesForPipelines(pipelineIds, client = null) {
  if (!pipelineIds || pipelineIds.length === 0) return [];
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('buyer_search_votes')
    .select('*')
    .in('pipeline_id', pipelineIds);

  if (error) throw error;
  return data;
}

export async function getPropertiesForMatch(searchData, userId, client = null) {
  const supabaseClient = getClient(client);
  const tolerance = searchData.price_tolerance ? Number(searchData.price_tolerance) / 100 : 0;
  const priceMin = searchData.price_min ? searchData.price_min * (1 - tolerance) : 0;
  const priceMax = searchData.price_max ? searchData.price_max * (1 + tolerance) : 999999999;

  let query = supabaseClient
    .from('properties')
    .select('*, profiles!properties_agent_id_fkey(full_name, avatar_url, phone, email)')
    .eq('property_type', searchData.property_type)
    .neq('agent_id', userId)
    .gte('list_price', priceMin)
    .lte('list_price', priceMax)
    .in('status', ['Activa', 'En_captacion']);

  if (searchData.min_bedrooms > 0) query = query.gte('bedrooms_total', searchData.min_bedrooms);
  if (searchData.min_bathrooms > 0) query = query.gte('bathrooms_full', searchData.min_bathrooms);
  if (searchData.min_sqm > 0) query = query.gte('construction_size', searchData.min_sqm);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getAcmsForMatch(searchData, userId, client = null) {
  const supabaseClient = getClient(client);
  const tolerance = searchData.price_tolerance ? Number(searchData.price_tolerance) / 100 : 0;
  const priceMin = searchData.price_min ? searchData.price_min * (1 - tolerance) : 0;
  const priceMax = searchData.price_max ? searchData.price_max * (1 + tolerance) : 999999999;

  const { data, error } = await supabaseClient
    .from('acm_reports')
    .select('*, profiles!acm_reports_user_id_fkey(full_name, avatar_url, phone, email)')
    .eq('property_type', searchData.property_type)
    .neq('user_id', userId)
    .gte('suggested_price', priceMin)
    .lte('suggested_price', priceMax);

  if (error) throw error;
  return data;
}

export async function upsertPipelineItem({ search_id, match_type, match_id, status }, client = null) {
  const supabaseClient = getClient(client);

  const { data: existing } = await supabaseClient
    .from('buyer_search_pipeline')
    .select('*')
    .eq('search_id', search_id)
    .eq('match_type', match_type)
    .eq('match_id', match_id)
    .single();

  if (existing) {
    const { data, error } = await supabaseClient
      .from('buyer_search_pipeline')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select().single();
    
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabaseClient
      .from('buyer_search_pipeline')
      .insert({
        search_id,
        match_type,
        match_id,
        status
      })
      .select().single();
    
    if (error) throw error;
    return data;
  }
}
