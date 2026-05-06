import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchOfficeProperties, mapReconnectToHub, extractReconnectImages, OFFICE_GUIDS } from '@/lib/reconnect-api';

/* ═══════════════════════════════════════════════════════════════
   IMPORT PROPERTIES FROM RECONNECT
   POST /api/properties/import
   
   Pulls existing listings from the RECONNECT office feed
   and upserts them into the Hub's properties table.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { officeKey, agentId } = await req.json();

    if (!officeKey || !OFFICE_GUIDS[officeKey]) {
      return NextResponse.json(
        { error: 'Invalid officeKey. Use "altitud" or "cero".' },
        { status: 400 }
      );
    }

    // 1. Fetch from RECONNECT feed
    const { properties: reconnectProperties, error: feedError } = await fetchOfficeProperties(officeKey);

    if (feedError) {
      return NextResponse.json({ error: feedError }, { status: 502 });
    }

    if (!reconnectProperties.length) {
      return NextResponse.json({ imported: 0, message: 'No properties found in feed.' });
    }

    // 2. Map and upsert each property
    let imported = 0;
    let skipped = 0;
    let errors = [];

    const officeCode = officeKey === 'altitud' ? 'R0700130' : 'R0700151';

    for (const rp of reconnectProperties) {
      try {
        const mapped = mapReconnectToHub(rp);
        const images = extractReconnectImages(rp);

        if (!mapped.reconnect_listing_id) {
          skipped++;
          continue;
        }

        // Check if already imported
        const { data: existing } = await supabaseAdmin
          .from('properties')
          .select('id')
          .eq('reconnect_listing_id', mapped.reconnect_listing_id)
          .single();

        if (existing) {
          // Update existing
          await supabaseAdmin
            .from('properties')
            .update({
              ...mapped,
              office_code: officeCode,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          // Sync images
          if (images.length > 0) {
            for (const img of images) {
              await supabaseAdmin
                .from('property_images')
                .upsert({
                  property_id: existing.id,
                  image_url: img.image_url,
                  thumbnail_url: img.thumbnail_url,
                  priority: img.priority,
                }, { onConflict: 'property_id,image_url', ignoreDuplicates: true });
            }
          }

          imported++;
        } else {
          // Insert new
          const { data: newProp, error: insertError } = await supabaseAdmin
            .from('properties')
            .insert({
              ...mapped,
              agent_id: agentId || null,
              office_code: officeCode,
            })
            .select('id')
            .single();

          if (insertError) {
            errors.push({ listing: mapped.reconnect_listing_id, error: insertError.message });
            continue;
          }

          // Insert images
          if (newProp && images.length > 0) {
            const imageRecords = images.map(img => ({
              property_id: newProp.id,
              image_url: img.image_url,
              thumbnail_url: img.thumbnail_url,
              priority: img.priority,
            }));
            await supabaseAdmin.from('property_images').insert(imageRecords);
          }

          imported++;
        }
      } catch (err) {
        errors.push({ listing: rp.ListingId || rp.Id || 'unknown', error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      total_in_feed: reconnectProperties.length,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json({ error: 'Import failed: ' + err.message }, { status: 500 });
  }
}
