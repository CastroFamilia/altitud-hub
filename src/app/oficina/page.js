import { createClient } from '@/lib/supabase-server';
import OficinaClient from './OficinaClient';
import { getDevelopments } from '@/lib/dal/developments';
import { getOfficeExpenses, getOfficeExpenseCategories, getPettyCashFunds, getPettyCashTransactions, getOfficeSalaryConfig, getOfficeEvents, getEventAttendance, getAgentCommissions, getOfficeReservations } from '@/lib/dal/office';

export default async function OficinaPage() {
  const supabase = await createClient();

  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, teams:teams!profiles_team_id_fkey(name)')
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

  // Fetch properties for analytics and office goals
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, listing_title_es, listing_title_en, status, property_type, property_type_id, created_at, updated_at, listing_contract_date, sold_date, days_on_market, list_price, list_price_currency_id, listing_agreement, listing_side_comm, selling_side_comm, contact_id, agent_id, unparsed_address, lot_size_area, submitted_at, office_code, property_images(image_url, priority), contacts(lead_origin)')
    .order('updated_at', { ascending: false });

  // Fetch developments for analytics
  const developments = await getDevelopments(supabase);

  // --- Office Finance Data ---
  const expenses = await getOfficeExpenses(supabase);
  const categories = await getOfficeExpenseCategories(supabase);
  const funds = await getPettyCashFunds(supabase);
  const transactions = await getPettyCashTransactions(supabase);
  const salaries = await getOfficeSalaryConfig(supabase);

  // --- Office Events & Attendance ---
  const officeEvents = await getOfficeEvents(supabase);
  const eventAttendance = await getEventAttendance(supabase);

  // --- Dashboard Analytics Data ---
  const commissions = await getAgentCommissions(supabase);
  const reservations = await getOfficeReservations(supabase);


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
