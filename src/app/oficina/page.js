import { createClient } from '@/lib/supabase-server';
import OficinaClient from './OficinaClient';

export default async function OficinaPage() {
  const supabase = await createClient();

  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, teams(name)')
    .order('full_name');

  // Fetch teams
  const { data: teams } = await supabase
    .from('teams')
    .select('*');

  // Fetch listing milestones for velocity analytics
  const { data: milestones } = await supabase
    .from('listing_milestones')
    .select('*');

  // Fetch leads (property inquiries) with linked property info
  const { data: inquiries } = await supabase
    .from('property_inquiries')
    .select('*, properties(name, listing_title_es, listing_title_en)')
    .order('created_at', { ascending: false });

  // Fetch configurable lead sources
  const { data: leadSources } = await supabase
    .from('lead_sources')
    .select('*')
    .eq('active', true)
    .order('sort_order');

  // Fetch communication log entries
  const { data: communications } = await supabase
    .from('lead_communications')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch follow-up reminders
  const { data: followUps } = await supabase
    .from('lead_follow_ups')
    .select('*, property_inquiries(lead_name)')
    .order('due_date', { ascending: true });

  // Fetch properties for analytics (name + listing titles for display)
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, listing_title_es, listing_title_en')
    .order('name');

  // Fetch developments for analytics
  const { data: developments } = await supabase
    .from('developments')
    .select('id, name')
    .order('name');

  // --- Office Finance Data ---
  const { data: expenses } = await supabase.from('office_expenses').select('*');
  const { data: categories } = await supabase.from('office_expense_categories').select('*').eq('active', true).order('sort_order');
  const { data: funds } = await supabase.from('petty_cash_funds').select('*').eq('is_active', true);
  const { data: transactions } = await supabase.from('petty_cash_transactions').select('*').order('created_at', { ascending: false });
  const { data: salaries } = await supabase.from('office_salary_config').select('*').eq('is_active', true);

  // --- Office Events & Attendance ---
  const { data: officeEvents } = await supabase.from('office_events').select('*').order('event_date', { ascending: false });
  const { data: eventAttendance } = await supabase.from('event_attendance').select('*');

  // --- Dashboard Analytics Data ---
  const { data: commissions } = await supabase.from('agent_commissions').select('*, profiles!agent_commissions_agent_id_fkey(full_name, avatar_url, commission_tier_id)').order('closing_date', { ascending: false });
  const { data: reservations } = await supabase.from('office_reservations').select('*').order('created_at', { ascending: false });


  return (
    <OficinaClient 
      initialProfiles={profiles || []} 
      initialTeams={teams || []} 
      initialMilestones={milestones || []} 
      initialInquiries={inquiries || []}
      initialLeadSources={leadSources || []}
      initialCommunications={communications || []}
      initialFollowUps={followUps || []}
      initialProperties={properties || []}
      initialDevelopments={developments || []}
      initialExpenses={expenses || []}
      initialCategories={categories || []}
      initialFunds={funds || []}
      initialTxs={transactions || []}
      initialSalaries={salaries || []}
      initialEvents={officeEvents || []}
      initialAttendance={eventAttendance || []}
      initialCommissions={commissions || []}
      initialReservations={reservations || []}
    />
  );
}
