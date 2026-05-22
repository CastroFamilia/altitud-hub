import { supabase as defaultClient } from '@/lib/supabase';

function getClient(client) {
  return client || defaultClient;
}

// --- Office Finances ---

export async function getOfficeExpenses(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient.from('office_expenses').select('*');
  if (error) throw error;
  return data;
}

export async function updateOfficeExpense(id, updates, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('office_expenses')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
  return data;
}

export async function getOfficeExpenseCategories(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient.from('office_expense_categories').select('*').eq('active', true).order('sort_order');
  if (error) throw error;
  return data;
}

export async function getPettyCashFunds(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient.from('petty_cash_funds').select('*').eq('is_active', true);
  if (error) throw error;
  return data;
}

export async function getPettyCashTransactions(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient.from('petty_cash_transactions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertPettyCashTransaction(txData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('petty_cash_transactions')
    .insert(txData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOfficeSalaryConfig(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient.from('office_salary_config').select('*').eq('is_active', true);
  if (error) throw error;
  return data;
}

// --- Office Events ---

export async function getOfficeEvents(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient.from('office_events').select('*').order('event_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertOfficeEvent(eventData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient.from('office_events').insert([eventData]).select().single();
  if (error) throw error;
  return data;
}

export async function getEventAttendance(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient.from('event_attendance').select('*');
  if (error) throw error;
  return data;
}

export async function upsertEventAttendance({ eventId, profileId, status, markedBy }, client = null) {
  const supabaseClient = getClient(client);
  const { data: existing } = await supabaseClient
    .from('event_attendance')
    .select('id')
    .eq('event_id', eventId)
    .eq('profile_id', profileId)
    .single();

  if (existing) {
    const { data, error } = await supabaseClient
      .from('event_attendance')
      .update({ status, marked_by: markedBy })
      .eq('id', existing.id);
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabaseClient
      .from('event_attendance')
      .insert([{
        event_id: eventId,
        profile_id: profileId,
        status,
        marked_by: markedBy
      }]);
    if (error) throw error;
    return data;
  }
}


export async function getOfficeReservations(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient.from('office_reservations').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getOfficeBusinessPlans(officeId, yearStr, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('office_business_plans')
    .select('month, revenue_goal')
    .eq('office', officeId)
    .gte('month', `${yearStr}-01-01`)
    .lte('month', `${yearStr}-12-31`);
    
  if (error) throw error;
  return data;
}

export async function getOfficeBusinessPlanByMonth(officeId, monthStr, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('office_business_plans')
    .select('*')
    .eq('office', officeId)
    .eq('month', monthStr)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function upsertOfficeBusinessPlan(planData, client = null) {
  const supabaseClient = getClient(client);
  
  // First check if it exists to know whether to update or insert, matching the original logic
  const { data: existingPlan } = await supabaseClient
    .from('office_business_plans')
    .select('id')
    .eq('office', planData.office)
    .eq('month', planData.month)
    .single();

  if (existingPlan) {
    const { data, error } = await supabaseClient
      .from('office_business_plans')
      .update({
        ...planData.goals,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPlan.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabaseClient
      .from('office_business_plans')
      .insert([{
        office: planData.office,
        month: planData.month,
        ...planData.goals
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// --- Office Settings ---

export async function getOfficeSettings(officeId, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('office_settings')
    .select('*')
    .eq('office_id', officeId)
    .single();
    
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function upsertOfficeSettings(settings, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('office_settings')
    .upsert(settings, { onConflict: 'office_id' });
    
  if (error) throw error;
  return data;
}

// --- Referrals ---

export async function getAgentReferrals(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('agent_referrals')
    .select('*, referring_profile:profiles!agent_referrals_referring_agent_id_fkey(full_name, avatar_url, office), receiving_profile:profiles!agent_referrals_receiving_agent_id_fkey(full_name, avatar_url, office)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateAgentReferral(id, updates, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('agent_referrals')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
  return data;
}

// --- Agent Management ---

export async function getAgentAcmReports(agentId, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('acm_reports')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAgentNotes(agentId, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('agent_notes')
    .select('*, author:author_id(full_name)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAgentProfiles(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, full_name, avatar_url, role');
  if (error) throw error;
  return data;
}

// --- Account Transactions ---

export async function getAccountTransactions(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('account_transactions')
    .select('*');
  if (error) throw error;
  return data;
}

export async function insertAccountTransaction(txData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('account_transactions')
    .insert([txData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertNotification(notificationData, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('notifications')
    .insert([notificationData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Commissions & Tiers ---

export async function getAgentCommissions(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('agent_commissions')
    .select('*, properties(name, listing_title_es, unparsed_address), profiles!agent_commissions_agent_id_fkey(full_name, avatar_url, commission_tier_id)')
    .order('closing_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateAgentCommission(id, updates, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('agent_commissions')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
  return data;
}

export async function getCommissionTiers(client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('commission_tiers')
    .select('*')
    .eq('active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function updateProfile(id, updates, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('profiles')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
  return data;
}

export async function getOfficeReservationById(id, client = null) {
  const supabaseClient = getClient(client);
  const { data, error } = await supabaseClient
    .from('office_reservations')
    .select(`
      *,
      profiles ( full_name, email, phone ),
      due_diligence_items (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}
