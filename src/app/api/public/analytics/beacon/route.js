import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/* ═══════════════════════════════════════════════════════════════
   PUBLIC ANALYTICS — Beacon (Time on Page)
   POST /api/public/analytics/beacon
   
   Updates duration_seconds on existing page view record.
   Called via navigator.sendBeacon() on page unload.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { session_id, property_id, development_id, duration_seconds, view_id } = body;

    if (!duration_seconds || duration_seconds < 2) {
      return new NextResponse(null, { status: 204 });
    }

    // Cap at 30 minutes to avoid outliers
    const cappedDuration = Math.min(parseInt(duration_seconds, 10), 1800);

    if (view_id) {
      // Update specific view record
      await supabase
        .from('listing_page_views')
        .update({ duration_seconds: cappedDuration })
        .eq('id', view_id);
    } else if (session_id) {
      // Find the most recent view for this session
      let query = supabase
        .from('listing_page_views')
        .select('id')
        .eq('session_id', session_id)
        .order('viewed_at', { ascending: false })
        .limit(1);

      if (property_id) query = query.eq('property_id', property_id);
      if (development_id) query = query.eq('development_id', development_id);

      const { data } = await query;
      if (data && data[0]) {
        await supabase
          .from('listing_page_views')
          .update({ duration_seconds: cappedDuration })
          .eq('id', data[0].id);
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('Beacon error:', err);
    return new NextResponse(null, { status: 204 }); // Always return 204 for beacons
  }
}
