import { createClient } from '@/lib/supabase-server';
import PlanClient from './PlanClient';

export default async function PlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialPlan = null;

  if (user) {
    try {
      // First attempt to load from Supabase based on authenticated user email
      const { data, error } = await supabase
        .from('business_plans')
        .select('*')
        .eq('agent_email', user.email)
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        initialPlan = data;
      }
    } catch (err) {
      console.error('Error fetching plan data on server:', err);
    }
  }

  return <PlanClient initialPlan={initialPlan} />;
}
