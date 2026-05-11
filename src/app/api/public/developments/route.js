import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/* ═══════════════════════════════════════════════════════════════
   PUBLIC DEVELOPMENTS API — /api/public/developments
   
   Returns all active developments, including their sections,
   properties, and basic agent info for the public website.
   ═══════════════════════════════════════════════════════════════ */

export async function GET(request) {
  try {
    const supabase = await createClient();

    // Fetch active developments with their properties
    const { data: developments, error } = await supabase
      .from('developments')
      .select(`
        *,
        properties:properties(
          id, title_es, title_en, property_type, size_m2, price, status, main_image_url
        )
      `)
      .eq('status', 'active');

    if (error) throw error;

    // Fetch agents for these developments
    const agentIds = [...new Set(developments.map(d => d.agent_id).filter(Boolean))];
    let profiles = [];
    
    if (agentIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('auth_user_id, full_name, email, phone, avatar_url, office')
        .in('auth_user_id', agentIds);
        
      profiles = profilesData || [];
    }

    // Attach agent info
    const developmentsWithAgents = developments.map(dev => {
      const agent = profiles.find(p => p.auth_user_id === dev.agent_id) || null;
      return {
        ...dev,
        agent,
      };
    });

    return NextResponse.json({
      success: true,
      count: developmentsWithAgents.length,
      data: developmentsWithAgents,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });

  } catch (err) {
    console.error('Public developments API error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
