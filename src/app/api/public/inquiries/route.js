import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/* ═══════════════════════════════════════════════════════════════
   PUBLIC LEAD CAPTURE
   POST /api/public/inquiries
   
   Receives lead form submissions from the public website.
   Inserts into property_inquiries and auto-assigns to the
   property's agent. Replaces the Google Form.
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

// Auto-detect lead source from referrer
function detectSource(referrer) {
  if (!referrer) return 'sitio_web';
  const r = referrer.toLowerCase();
  if (r.includes('facebook')) return 'facebook';
  if (r.includes('instagram')) return 'instagram';
  if (r.includes('google')) return 'google';
  if (r.includes('remax.com') || r.includes('remax.cr')) return 'remax_portal';
  if (r.includes('encuentra24')) return 'encuentra24';
  if (r.includes('zillow')) return 'zillow';
  return 'sitio_web';
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const {
      property_id,
      development_id,
      lead_name,
      lead_email,
      lead_phone,
      message,
      referrer,
      language,
      reason,
    } = body;

    if (!lead_name && !lead_email && !lead_phone) {
      return NextResponse.json(
        { error: 'At least one contact field is required (name, email, or phone).' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Try to find the property's agent for auto-assignment
    let assignedAgentId = null;
    if (property_id) {
      const { data: prop } = await supabase
        .from('properties')
        .select('agent_id')
        .eq('id', property_id)
        .single();
      if (prop?.agent_id) assignedAgentId = prop.agent_id;
    }

    const source = detectSource(referrer);

    const inquiry = {
      lead_name: lead_name || null,
      lead_email: lead_email || null,
      lead_phone: lead_phone || null,
      reason: reason || 'propiedad',
      source,
      reconnect_listing_id: property_id || null,
      notes: message || null,
      lead_language: language || 'es',
      assigned_agent_id: assignedAgentId,
      status: 'new',
    };

    const { data, error } = await supabase
      .from('property_inquiries')
      .insert(inquiry)
      .select('id')
      .single();

    if (error) {
      console.error('Lead capture error:', error);
      return NextResponse.json(
        { error: 'Failed to save inquiry' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, inquiry_id: data?.id },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Lead capture error:', err);
    return NextResponse.json(
      { error: 'Internal error: ' + err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
