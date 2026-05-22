import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-server';
import { fetchOfficeProperties, mapReconnectToHub, extractReconnectImages, OFFICE_GUIDS } from '@/lib/reconnect-api';
import { rateLimit } from '@/lib/rate-limit';

/* ═══════════════════════════════════════════════════════════════
   IMPORT PROPERTIES FROM RECONNECT
   POST /api/properties/import
   
   Pulls existing listings from the RECONNECT office feed
   and upserts them into the Hub's properties table.
   Secured at the application layer.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  const limited = rateLimit(req, { maxRequests: 5, keyPrefix: 'prop-import' });
  if (limited) return limited;

  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Get profiles to check role
    const { data: profile } = await supabaseSession
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 });
    }

    const isAuthorized = ['broker', 'admin', 'assistant'].includes(profile.role);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'No autorizado. Solo los brokers y asistentes pueden importar propiedades.' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { officeKey, agentId, associateId } = await req.json();

    if (!officeKey || !OFFICE_GUIDS[officeKey]) {
      return NextResponse.json(
        { error: 'Invalid officeKey. Use "altitud" or "cero".' },
        { status: 400 }
      );
    }

    // 1. Fetch from RECONNECT feed
    const { properties: allProperties, error: feedError } = await fetchOfficeProperties(officeKey);

    if (feedError) {
      return NextResponse.json({ error: feedError }, { status: 502 });
    }

    // Filter by RECONNECT AssociateId if provided
    const reconnectProperties = associateId
      ? allProperties.filter(rp => String(rp.AssociateId) === String(associateId))
      : allProperties;

    if (!reconnectProperties.length) {
      return NextResponse.json({ imported: 0, message: associateId ? `No properties found for AssociateId ${associateId}.` : 'No properties found in feed.' });
    }

    // 2. Map and upsert each property
    let imported = 0;
    let skipped = 0;
    let errors = [];

    const officeCode = officeKey === 'altitud' ? 'R0700130' : 'R0700151';

    // Build agent lookup: RECONNECT AssociateId → Hub auth_user_id
    const { data: agentProfiles } = await supabaseAdmin
      .from('profiles')
      .select('auth_user_id, remax_agent_id')
      .not('remax_agent_id', 'is', null)
      .not('auth_user_id', 'is', null);

    const agentLookup = {};
    for (const p of (agentProfiles || [])) {
      agentLookup[String(p.remax_agent_id)] = p.auth_user_id;
    }

    for (const rp of reconnectProperties) {
      try {
        const mapped = mapReconnectToHub(rp);
        const images = extractReconnectImages(rp);

        if (!mapped.reconnect_listing_id) {
          skipped++;
          continue;
        }

        // Resolve correct agent from RECONNECT AssociateId, fallback to body agentId or currently authenticated user.id
        const rpAssociateId = String(rp.AssociateId || rp.associateId || '');
        const resolvedAgentId = agentLookup[rpAssociateId] || agentId || user.id;

        // Check if already imported
        const { data: existing } = await supabaseAdmin
          .from('properties')
          .select('id')
          .eq('reconnect_listing_id', mapped.reconnect_listing_id)
          .single();

        if (existing) {
          // Update existing property fields and agent assignment
          await supabaseAdmin
            .from('properties')
            .update({
              ...mapped,
              agent_id: resolvedAgentId,
              office_code: officeCode,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          // Sync images safely without database constraint requirements (check-then-upsert)
          if (images.length > 0) {
            const { data: currentImages } = await supabaseAdmin
              .from('property_images')
              .select('id, image_url')
              .eq('property_id', existing.id);

            const currentUrlsMap = {};
            for (const img of (currentImages || [])) {
              currentUrlsMap[img.image_url] = img.id;
            }

            for (const img of images) {
              const existingImageId = currentUrlsMap[img.image_url];
              if (existingImageId) {
                // Update priority or thumbnail if changed
                await supabaseAdmin
                  .from('property_images')
                  .update({
                    thumbnail_url: img.thumbnail_url,
                    priority: img.priority,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingImageId);
              } else {
                // Insert new image record
                await supabaseAdmin
                  .from('property_images')
                  .insert({
                    property_id: existing.id,
                    image_url: img.image_url,
                    thumbnail_url: img.thumbnail_url,
                    priority: img.priority,
                  });
              }
            }
          }

          imported++;
        } else {
          // Insert new property record
          const { data: newProp, error: insertError } = await supabaseAdmin
            .from('properties')
            .insert({
              ...mapped,
              agent_id: resolvedAgentId,
              office_code: officeCode,
            })
            .select('id')
            .single();

          if (insertError) {
            errors.push({ listing: mapped.reconnect_listing_id, error: insertError.message });
            continue;
          }

          // Insert newly fetched property images
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
