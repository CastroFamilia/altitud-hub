import { createClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import DashboardClient from './DashboardClient';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialEntries = [];
  let initialFollowUps = [];
  let initialActiveCount = 0;
  let initialSoldStats = { avgDom: 0, recentTrend: 0, count: 0 };

  if (user) {
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profile) {
      // If broker/admin, check for suplantación cookie
      if (profile.role === 'broker' || profile.role === 'admin') {
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
      // Fetch OKR Entries
      const { data: entries } = await supabase
        .from('agent_daily_okr_entries')
        .select('*')
        .eq('profile_id', profile.id);
      
      if (entries && entries.length > 0) {
        initialEntries = entries.map(r => ({ ...r, date: r.date.split('T')[0] }));
      }

      // Fetch Follow Ups
      const { data: followUps } = await supabase
        .from('lead_follow_ups')
        .select('*, property_inquiries(lead_name, lead_phone)')
        .eq('status', 'pending')
        .order('due_date');
      initialFollowUps = followUps || [];

      // Fetch Active Properties Count
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact' })
        .eq('agent_id', profile.id)
        .in('status', ['active', 'published']);
      initialActiveCount = count || 0;

      // Fetch Sold Properties for DOM Stats
      const { data: soldProps } = await supabase
        .from('properties')
        .select('id, created_at, updated_at, sold_date, days_on_market')
        .eq('agent_id', profile.id)
        .eq('status', 'sold')
        .order('updated_at', { ascending: false })
        .limit(20);

      let avgDom = 0;
      let recentTrend = 0;
      if (soldProps && soldProps.length > 0) {
        const doms = soldProps.map(p => p.days_on_market !== null && p.days_on_market !== undefined ? p.days_on_market : Math.max(0, Math.floor((new Date(p.sold_date || p.updated_at) - new Date(p.created_at)) / 86400000)));
        avgDom = Math.round(doms.reduce((a, b) => a + b, 0) / doms.length);
        if (doms.length > 3) {
          const recentAvg = Math.round(doms.slice(0, 3).reduce((a, b) => a + b, 0) / 3);
          const olderAvg = Math.round(doms.slice(3).reduce((a, b) => a + b, 0) / (doms.length - 3));
          recentTrend = recentAvg - olderAvg;
        }
        initialSoldStats = { avgDom, recentTrend, count: soldProps.length };
      }
    }
  }

  return (
    <DashboardClient 
      initialEntries={initialEntries}
      initialFollowUps={initialFollowUps}
      initialActiveCount={initialActiveCount}
      initialSoldStats={initialSoldStats}
    />
  );
}
