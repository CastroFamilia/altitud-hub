import { createClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import PlanClient from './PlanClient';

export default async function PlanPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Determine the default active planning year based on office settings
  let activeYear = new Date().getFullYear();
  let profile = null;

  if (user) {
    try {
      let { data: realP } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email?.toLowerCase())
        .maybeSingle();
      
      profile = realP;

      if (realP && (realP.role === 'broker' || realP.role === 'admin')) {
        const cookieStore = await cookies();
        const impId = cookieStore.get('impersonated_id')?.value;
        if (impId) {
          const { data: impP } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', impId)
            .maybeSingle();
          if (impP) {
            profile = impP;
          }
        }
      }
      
      const officeId = profile?.office || 'altitud';
      
      const { data: config } = await supabase
        .from('office_config')
        .select('config_value')
        .eq('office', officeId)
        .eq('config_key', 'active_planning_year')
        .maybeSingle();
      
      if (config?.config_value?.year) {
        activeYear = config.config_value.year;
      }
    } catch (e) {
      console.warn('Failed to fetch active planning year:', e);
    }
  }

  // Support both async and sync searchParams for Next.js cross-compatibility
  const resolvedParams = searchParams instanceof Promise ? await searchParams : searchParams;
  const yearParam = resolvedParams?.year ? parseInt(resolvedParams.year, 10) : activeYear;

  let initialPlan = null;

  if (profile) {
    try {
      // Load the plan matching both agent email and queried plan_year
      const { data, error } = await supabase
        .from('business_plans')
        .select('*')
        .eq('agent_email', profile.email)
        .eq('plan_year', yearParam)
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        initialPlan = data;
      }
    } catch (err) {
      console.error('Error fetching plan data on server:', err);
    }
  }

  return <PlanClient initialPlan={initialPlan} queriedYear={yearParam} />;
}
