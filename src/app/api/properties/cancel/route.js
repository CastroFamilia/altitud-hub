import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cancelProperty as reconnectCancel, isWriteConfigured } from '@/lib/reconnect-api';
import { rateLimit } from '@/lib/rate-limit';

/* ═══════════════════════════════════════════════════════════════
   CANCEL PROPERTY ON RECONNECT
   POST /api/properties/cancel
   
   Removes a listing from RECONNECT and updates Hub status.
   SCAFFOLDED — activate when credentials arrive.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  const limited = rateLimit(req, { keyPrefix: 'prop-cancel' });
  if (limited) return limited;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { propertyId } = await req.json();

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }

    const { data: property, error: fetchError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (fetchError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Attempt RECONNECT cancellation if configured and listing exists
    if (isWriteConfigured() && property.reconnect_listing_key) {
      const result = await reconnectCancel(property.reconnect_listing_key);
      if (!result.success) {
        console.error('RECONNECT cancel error:', result.error);
        // Continue with local cancellation anyway
      }
    }

    // Update Hub status
    await supabaseAdmin
      .from('properties')
      .update({ status: 'cancelled' })
      .eq('id', propertyId);

    // Update syndication records
    await supabaseAdmin
      .from('property_syndication')
      .update({ status: 'removed', last_synced_at: new Date().toISOString() })
      .eq('property_id', propertyId);

    return NextResponse.json({
      success: true,
      message: 'Property cancelled',
      reconnect_configured: isWriteConfigured(),
    });

  } catch (err) {
    console.error('Cancel error:', err);
    return NextResponse.json({ error: 'Cancel failed: ' + err.message }, { status: 500 });
  }
}
