import { supabase } from '@/lib/supabase';

const getClient = (client) => client || supabase;

export async function getAcmsByContactId(contactId, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('acm_reports')
    .select('id, property_address, created_at, suggested_price, status')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAcmsByIds(ids, client = null) {
  if (!ids || ids.length === 0) return [];
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('acm_reports')
    .select('*')
    .in('id', ids);

  if (error) throw error;
  return data;
}
