import { createClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import PropiedadesClient from './PropiedadesClient';

export default async function PropiedadesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialProperties = [];
  let isBroker = false;

  if (user) {
    try {
      const { data: realP } = await supabase
        .from('profiles')
        .select('id, role, auth_user_id, team_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      let profile = realP;
      let isImpersonating = false;

      if (realP && (realP.role === 'broker' || realP.role === 'admin')) {
        const cookieStore = await cookies();
        const impId = cookieStore.get('impersonated_id')?.value;
        if (impId) {
          const { data: impP } = await supabase
            .from('profiles')
            .select('id, role, auth_user_id, team_id')
            .eq('id', impId)
            .maybeSingle();
          if (impP) {
            profile = impP;
            isImpersonating = true;
          }
        }
      }

      isBroker = profile?.role === 'broker';

      // Main properties query — syndication/inquiries may fail due to RLS,
      // so we query them separately as fallback
      let query = supabase
        .from('properties')
        .select(`
          *,
          property_images(image_url, priority)
        `)
        .order('updated_at', { ascending: false });

      if (!isBroker || isImpersonating) {
        let agentIds = [profile?.auth_user_id];
        if (profile?.role === 'team_leader' && profile?.team_id) {
          const { data: teamMembers } = await supabase
            .from('profiles')
            .select('auth_user_id')
            .eq('team_id', profile.team_id);
          if (teamMembers) {
            agentIds = [...agentIds, ...teamMembers.map(m => m.auth_user_id).filter(Boolean)];
          }
        }
        query = query.in('agent_id', agentIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Properties fetch error:', error.message);
      }

      if (data) {
        // Try to fetch syndication data separately
        let syndicationMap = {};
        let inquiryMap = {};

        try {
          const propertyIds = data.map(p => p.id);

          if (propertyIds.length > 0) {
            const { data: synData } = await supabase
              .from('property_syndication')
              .select('property_id, portal_name, portal_listing_url, status')
              .in('property_id', propertyIds);

            if (synData) {
              for (const s of synData) {
                if (!syndicationMap[s.property_id]) syndicationMap[s.property_id] = [];
                syndicationMap[s.property_id].push(s);
              }
            }

            const { data: inqData } = await supabase
              .from('property_inquiries')
              .select('property_id, id, status, received_at')
              .in('property_id', propertyIds);

            if (inqData) {
              for (const i of inqData) {
                if (!inquiryMap[i.property_id]) inquiryMap[i.property_id] = [];
                inquiryMap[i.property_id].push(i);
              }
            }
          }
        } catch (e) {
          // Syndication/inquiry data is optional — don't break the page
          console.error('Optional data fetch failed:', e.message);
        }

        initialProperties = data.map(p => ({
          ...p,
          main_image_url: p.property_images
            ?.sort((a, b) => a.priority - b.priority)?.[0]?.image_url || null,
          image_count: p.property_images?.length || 0,
          portal_links: (syndicationMap[p.id] || [])
            .filter(s => s.status === 'synced' && s.portal_listing_url)
            .map(s => ({ name: s.portal_name, url: s.portal_listing_url })),
          inquiry_count: (inquiryMap[p.id] || []).length,
        }));
      }
    } catch (err) {
      console.error('Error fetching properties on server:', err);
    }
  }

  return <PropiedadesClient initialProperties={initialProperties} isBroker={isBroker} />;
}
