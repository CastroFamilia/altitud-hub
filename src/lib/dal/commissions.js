import { supabase } from '@/lib/supabase';

export async function getActiveCommissionTiers() {
  const { data, error } = await supabase
    .from('commission_tiers')
    .select('*')
    .eq('active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function insertAgentCommission(commissionData) {
  const { error } = await supabase
    .from('agent_commissions')
    .insert(commissionData);
  if (error) throw error;
}
