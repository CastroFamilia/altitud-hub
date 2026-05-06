import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/* ═══════════════════════════════════════════════════════════════
   PUBLIC PROPERTIES FEED
   GET /api/public/properties/feed
   
   Returns all published properties as JSON. No authentication.
   Designed for portal consumption and future website integration.
   
   Query params:
     ?office=R0700130 — Filter by office code
     ?type=3 — Filter by property_type_id
     ?limit=50 — Limit results (default 100)
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const office = searchParams.get('office');
    const type = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

    // Build query — only published properties
    let query = supabaseAdmin
      .from('properties')
      .select(`
        id, name, listing_title_en, listing_title_es,
        public_remarks_en, public_remarks_es,
        property_type_id, listing_contract_type,
        unparsed_address, latitude, longitude,
        country_id, state_dep_prov_id, location_id,
        bedrooms_total, bathrooms_full, bathrooms_half, stories,
        lot_size_area, construction_size, year_built,
        list_price, list_price_currency_id,
        pool_private, garage, garage_spaces, cooling,
        has_view, gated_community, furnished, maid_room, property_new,
        video_link, office_code,
        reconnect_listing_id, reconnect_listing_key,
        created_at, updated_at,
        property_images(image_url, thumbnail_url, priority, alt_text)
      `)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (office) query = query.eq('office_code', office);
    if (type) query = query.eq('property_type_id', parseInt(type, 10));

    const { data, error } = await query;

    if (error) {
      console.error('Feed query error:', error);
      return NextResponse.json({ error: 'Feed query failed' }, { status: 500 });
    }

    // Sort images by priority for each property
    const properties = (data || []).map(p => ({
      ...p,
      property_images: (p.property_images || []).sort((a, b) => a.priority - b.priority),
    }));

    return NextResponse.json({
      count: properties.length,
      generated_at: new Date().toISOString(),
      properties,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('Feed error:', err);
    return NextResponse.json({ error: 'Feed failed: ' + err.message }, { status: 500 });
  }
}
