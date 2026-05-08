import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/* ═══════════════════════════════════════════════════════════════
   PUBLIC ANALYTICS — Track Page View
   POST /api/public/analytics/track
   
   Records a page view event for a property or development page.
   No authentication required — called from the tracker script.
   ═══════════════════════════════════════════════════════════════ */

const ALLOWED_ORIGINS = [
  'https://remax-altitud.cr',
  'https://www.remax-altitud.cr',
  'https://hub.remax-altitud.cr',
  'http://localhost:3000',
  'http://localhost:3001',
];

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Privacy-safe IP hashing with daily salt
function hashIP(ip) {
  const today = new Date().toISOString().split('T')[0];
  const salt = process.env.ANALYTICS_SALT || 'altitud-analytics-2026';
  return crypto.createHash('sha256').update(`${ip}-${today}-${salt}`).digest('hex').slice(0, 16);
}

function getCorsHeaders(req) {
  const origin = req.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(req) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const {
      property_id,
      development_id,
      page_url,
      referrer,
      user_agent,
      device_type,
      session_id,
    } = body;

    if (!page_url) {
      return NextResponse.json({ error: 'page_url required' }, { status: 400, headers: corsHeaders });
    }

    // Get client IP and hash it
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const ipHash = hashIP(ip);

    // Debounce: skip if same session viewed same property in last 30 seconds
    if (session_id && (property_id || development_id)) {
      const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
      let query = supabase
        .from('listing_page_views')
        .select('id')
        .eq('session_id', session_id)
        .gte('viewed_at', thirtySecsAgo)
        .limit(1);

      if (property_id) query = query.eq('property_id', property_id);
      if (development_id) query = query.eq('development_id', development_id);

      const { data: existing } = await query;
      if (existing && existing.length > 0) {
        return new NextResponse(null, { status: 204, headers: corsHeaders });
      }
    }

    // Insert page view
    const { data, error } = await supabase
      .from('listing_page_views')
      .insert({
        property_id: property_id || null,
        development_id: development_id || null,
        page_url,
        referrer: referrer || null,
        user_agent: user_agent ? user_agent.slice(0, 500) : null,
        ip_hash: ipHash,
        device_type: ['desktop', 'mobile', 'tablet'].includes(device_type) ? device_type : 'unknown',
        session_id: session_id || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Analytics track error:', error);
      return NextResponse.json({ error: 'Track failed' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json(
      { view_id: data?.id },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Analytics error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
