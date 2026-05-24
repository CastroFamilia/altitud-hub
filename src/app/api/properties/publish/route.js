import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createProperty, createPropertyImage, isWriteConfigured } from '@/lib/reconnect-api';
import { rateLimit } from '@/lib/rate-limit';

/* ═══════════════════════════════════════════════════════════════
   PUBLISH PROPERTY TO RECONNECT
   POST /api/properties/publish
   
   Takes a property ID, pushes it to RECONNECT, and updates
   the Hub with the external listing ID.
   
   SCAFFOLDED — write operations activate when RECONNECT 
   credentials are configured. Local status update works now.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  const limited = rateLimit(req, { keyPrefix: 'prop-publish' });
  if (limited) return limited;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { propertyId } = await req.json();

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }

    // 1. Fetch property from Hub
    const { data: property, error: fetchError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (fetchError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.status !== 'approved' && property.status !== 'published') {
      return NextResponse.json(
        { error: 'Property must be approved before publishing' },
        { status: 400 }
      );
    // 2. Attempt RECONNECT publish (if credentials available)
    let reconnectResult = null;
    const officeCode = property.office_code || 'altitud';
    let failedCount = 0;
    let failedDetails = [];

    if (isWriteConfigured(officeCode)) {
      reconnectResult = await createProperty(property, officeCode);

      if (!reconnectResult.success) {
        await supabaseAdmin.from('property_syndication').upsert({
          property_id: propertyId,
          portal_name: 'reconnect',
          status: 'error',
          error_message: reconnectResult.error || 'Unknown publish error',
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'property_id,portal_name' });

        return NextResponse.json(
          { error: 'RECONNECT publish failed', details: reconnectResult.error },
          { status: 502 }
        );
      }

      // 2b. Sync images to RECONNECT
      if (reconnectResult.listingKey) {
        const { data: images } = await supabaseAdmin
          .from('property_images')
          .select('*')
          .eq('property_id', propertyId)
          .order('priority', { ascending: true });

        if (images && images.length > 0) {
          for (const img of images) {
            if (!img.reconnect_photo_id) {
              try {
                const imgRes = await createPropertyImage(
                  reconnectResult.listingKey,
                  img.image_url,
                  img.priority || 0,
                  officeCode
                );
                if (imgRes.success && imgRes.photoId) {
                  await supabaseAdmin
                    .from('property_images')
                    .update({ reconnect_photo_id: imgRes.photoId })
                    .eq('id', img.id);
                } else {
                  failedCount++;
                  failedDetails.push(`${img.alt_text || img.id}: ${imgRes.error || 'API error'}`);
                }
              } catch (e) {
                failedCount++;
                failedDetails.push(`${img.alt_text || img.id}: ${e.message}`);
              }
            }
          }
        }
      }
    }

    // 3. Update Hub status
    const updates = {
      status: 'published',
    };

    if (reconnectResult?.listingId) {
      updates.reconnect_listing_id = reconnectResult.listingId;
      updates.reconnect_listing_key = reconnectResult.listingKey;
      updates.reconnect_last_sync = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('properties')
      .update(updates)
      .eq('id', propertyId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update property status' }, { status: 500 });
    }

    // 4. Create syndication record
    if (reconnectResult?.listingId) {
      const errorMsg = failedCount > 0
        ? `Sincronizado parcial: ${failedCount} imágenes fallaron (${failedDetails.slice(0, 3).join(', ')})`
        : null;

      await supabaseAdmin.from('property_syndication').upsert({
        property_id: propertyId,
        portal_name: 'reconnect',
        portal_listing_id: String(reconnectResult.listingId),
        status: 'synced',
        error_message: errorMsg,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'property_id,portal_name' });
    }

    return NextResponse.json({
      success: true,
      published: true,
      reconnect_configured: isWriteConfigured(officeCode),
      reconnect_listing_id: reconnectResult?.listingId || null,
      message: isWriteConfigured(officeCode)
        ? 'Published to RECONNECT and Hub'
        : 'Published locally in Hub. RECONNECT sync will activate when credentials are configured.',
    });

  } catch (err) {
    console.error('Publish error:', err);
    return NextResponse.json({ error: 'Publish failed: ' + err.message }, { status: 500 });
  }
}
