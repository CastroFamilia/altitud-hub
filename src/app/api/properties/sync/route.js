import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateProperty, isWriteConfigured } from '@/lib/reconnect-api';
import { rateLimit } from '@/lib/rate-limit';

/* ═══════════════════════════════════════════════════════════════
   SYNC PROPERTY TO RECONNECT
   POST /api/properties/sync
   
   Pushes the latest Hub data to RECONNECT via FullUpdateProperty.
   SCAFFOLDED — activate when credentials arrive.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  const limited = rateLimit(req, { keyPrefix: 'prop-sync' });
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

    if (!property.reconnect_listing_key) {
      return NextResponse.json(
        { error: 'Property has no RECONNECT listing key. Publish first.' },
        { status: 400 }
      );
    }

    const officeCode = property.office_code || 'altitud';

    if (!isWriteConfigured(officeCode)) {
      return NextResponse.json({
        success: false,
        scaffolded: true,
        message: 'RECONNECT write credentials not configured. Sync will activate when credentials are set.',
      });
    }

    const result = await updateProperty(property.reconnect_listing_key, property, officeCode);

    if (!result.success) {
      await supabaseAdmin.from('property_syndication').upsert({
        property_id: propertyId,
        portal_name: 'reconnect',
        status: 'error',
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'property_id,portal_name' });

      return NextResponse.json(
        { error: 'RECONNECT sync failed', details: result.error },
        { status: 502 }
      );
    }

    // Update sync timestamp
    await supabaseAdmin
      .from('properties')
      .update({ reconnect_last_sync: new Date().toISOString() })
      .eq('id', propertyId);

    // Update syndication record
    await supabaseAdmin.from('property_syndication').upsert({
      property_id: propertyId,
      portal_name: 'reconnect',
      status: 'synced',
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'property_id,portal_name' });

    return NextResponse.json({ success: true, message: 'Synced to RECONNECT' });

  } catch (err) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: 'Sync failed: ' + err.message }, { status: 500 });
  }
}
