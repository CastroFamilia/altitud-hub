import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-server';
import { supabase as anonClient } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════════
   BULK SYNDICATION FETCH API
   POST /api/portals/syndication-bulk
   
   Returns all syndication records for a batch of property IDs.
   Used by the SyndicationDeskTab to load data for all properties
   in a single request instead of N+1 queries.
   ═══════════════════════════════════════════════════════════════ */

export async function POST(req) {
  try {
    const { property_ids } = await req.json();

    if (!Array.isArray(property_ids) || property_ids.length === 0) {
      return NextResponse.json({ syndications: [] });
    }

    const client = createAdminSupabase() || anonClient;

    const { data, error } = await client
      .from('property_syndication')
      .select('*')
      .in('property_id', property_ids);

    if (error) throw error;

    return NextResponse.json({ syndications: data || [] });
  } catch (err) {
    console.error('Syndication bulk fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
