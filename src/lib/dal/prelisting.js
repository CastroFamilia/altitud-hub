import { supabase as defaultClient } from '@/lib/supabase';

function getClient(client) {
  return client || defaultClient;
}

export async function insertAcmReport(reportData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('acm_reports')
    .insert([reportData])
    .select()
    .single();
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export async function updateAcmReport(id, updates, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('acm_reports')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export async function getSavedPresentation(id, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('saved_presentations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export async function insertSavedPresentation(presentationData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('saved_presentations')
    .insert([presentationData])
    .select()
    .single();
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export async function getPrintablePages(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('printable_pages')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export async function uploadPrintableCover(file, filePath, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient.storage
    .from('printables')
    .upload(filePath, file);
  if (error) throw new Error(error.message || JSON.stringify(error));
  
  const { data: publicUrlData } = supabaseClient.storage
    .from('printables')
    .getPublicUrl(filePath);
    
  return publicUrlData.publicUrl;
}
