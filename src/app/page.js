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

      // Dynamic OKR Source of Truth Calculations from Properties, Reservations, and Commissions
      let dbProperties = [];
      if (profile.auth_user_id) {
        const { data: props } = await supabase
          .from('properties')
          .select('created_at, listing_contract_date')
          .eq('agent_id', profile.auth_user_id)
          .in('status', ['approved', 'published', 'sold']);
        dbProperties = props || [];
      }

      const { data: dbReservations } = await supabase
        .from('office_reservations')
        .select('created_at, expected_sign_date')
        .eq('profile_id', profile.id)
        .in('status', ['signed', 'closed']);

      const { data: dbCommissions } = await supabase
        .from('agent_commissions')
        .select('created_at, closing_date')
        .eq('agent_id', profile.id)
        .in('status', ['processing', 'paid', 'partial']);

      // Merge dynamic calculations into initialEntries
      const entriesMap = {};
      
      // Initialize with existing entries, clearing manual fields for the automated ones
      initialEntries.forEach(entry => {
        entriesMap[entry.date] = {
          ...entry,
          captaciones: 0,
          reservas: 0,
          cierres: 0
        };
      });

      // Helper to ensure a date node exists in the map
      const ensureDateNode = (dateStr) => {
        if (!entriesMap[dateStr]) {
          entriesMap[dateStr] = {
            profile_id: profile.id,
            date: dateStr,
            llamadas: 0,
            prelistings: 0,
            acm: 0,
            listings: 0,
            captaciones: 0,
            busquedas: 0,
            consultas: 0,
            muestras: 0,
            reservas: 0,
            transacciones: 0,
            cierres: 0
          };
        }
      };

      // 1. Map properties (Captaciones) by their listing_contract_date or created_at date
      (dbProperties || []).forEach(prop => {
        const actualDate = prop.listing_contract_date || prop.created_at;
        if (actualDate) {
          const dateStr = actualDate.split('T')[0];
          ensureDateNode(dateStr);
          entriesMap[dateStr].captaciones += 1;
        }
      });

      // 2. Map reservations (Reservas) by expected_sign_date or fallback to created_at
      (dbReservations || []).forEach(res => {
        let dateStr = res.expected_sign_date;
        if (!dateStr && res.created_at) {
          dateStr = res.created_at.split('T')[0];
        }
        if (dateStr) {
          ensureDateNode(dateStr);
          entriesMap[dateStr].reservas += 1;
        }
      });

      // 3. Map commissions (Cierres) by closing_date or fallback to created_at
      (dbCommissions || []).forEach(comm => {
        let dateStr = comm.closing_date;
        if (!dateStr && comm.created_at) {
          dateStr = comm.created_at.split('T')[0];
        }
        if (dateStr) {
          ensureDateNode(dateStr);
          entriesMap[dateStr].cierres += 1;
        }
      });

      // Flatten map back to initialEntries
      initialEntries = Object.values(entriesMap);

      // Fetch Follow Ups
      const { data: followUps } = await supabase
        .from('lead_follow_ups')
        .select('*, property_inquiries(lead_name, lead_phone)')
        .eq('status', 'pending')
        .order('due_date');
      initialFollowUps = followUps || [];

      // Fetch Active Properties Count (Fixed Bug: agent_id matches profile.auth_user_id)
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact' })
        .eq('agent_id', profile.auth_user_id || profile.id)
        .in('status', ['approved', 'published']);
      initialActiveCount = count || 0;

      // Fetch Sold Properties for DOM Stats (Fixed Bug: agent_id matches profile.auth_user_id)
      const { data: soldProps } = await supabase
        .from('properties')
        .select('id, created_at, updated_at, sold_date, days_on_market')
        .eq('agent_id', profile.auth_user_id || profile.id)
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
