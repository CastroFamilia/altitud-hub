import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchOfficeProperties, OFFICE_GUIDS } from '@/lib/reconnect-api';
import { TYPE_NAME_TO_ID, resolveTypeId } from '@/lib/constants/property-constants';

/* ═══════════════════════════════════════════════════════════════
   FIX PROPERTY TYPES — Patches property_type_id, property_type,
   latitude, longitude, submitted_at from RECONNECT feed data.
   POST /api/properties/fix-types  { "dryRun": true|false }
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { dryRun = true } = await req.json().catch(() => ({}));

    // 1. Fetch current DB state
    const { data: dbProps } = await supabaseAdmin
      .from('properties')
      .select('id, reconnect_listing_id, property_type_id, property_type, latitude, longitude, submitted_at')
      .not('reconnect_listing_id', 'is', null);

    // 2. Fetch RECONNECT feeds
    let allFeed = [];
    for (const key of Object.keys(OFFICE_GUIDS)) {
      const { properties: feedProps } = await fetchOfficeProperties(key);
      allFeed = allFeed.concat(feedProps || []);
    }

    // 3. Build feed lookup by ListingId
    const feedByListingId = {};
    for (const rp of allFeed) {
      const listingId = rp.ListingId || rp.listingId || rp.Id || rp.id;
      if (listingId) feedByListingId[String(listingId)] = rp;
    }

    // 4. Patch loop
    let updated = 0;
    let skipped = 0;
    const changes = [];
    const typeDistribution = {};

    for (const prop of (dbProps || [])) {
      const feedItem = feedByListingId[String(prop.reconnect_listing_id)];
      if (!feedItem) { skipped++; continue; }

      const typeId = resolveTypeId(feedItem);
      const typeName = (feedItem.PropertyTypeName_es || feedItem.PropertyTypeName_en || '').trim();
      const lat = feedItem.Latitude || feedItem.latitude || null;
      const lng = feedItem.Longitude || feedItem.longitude || null;
      const contractDate = feedItem.ListingContractDate || feedItem.listingContractDate || null;

      // Track distribution
      const dKey = `${typeId} (${typeName || '?'})`;
      typeDistribution[dKey] = (typeDistribution[dKey] || 0) + 1;

      // Build updates for missing fields
      const updates = {};

      if (typeId && (!prop.property_type_id || prop.property_type_id === 0)) {
        updates.property_type_id = typeId;
      }
      if (typeName && !prop.property_type) {
        updates.property_type = typeName;
      }
      if (lat && !prop.latitude) {
        updates.latitude = lat;
      }
      if (lng && !prop.longitude) {
        updates.longitude = lng;
      }
      if (contractDate && !prop.submitted_at) {
        updates.submitted_at = contractDate;
      }

      if (Object.keys(updates).length === 0) {
        skipped++;
        continue;
      }

      changes.push({ id: prop.id, reconnect_listing_id: prop.reconnect_listing_id, updates });

      if (!dryRun) {
        await supabaseAdmin.from('properties').update(updates).eq('id', prop.id);
      }
      updated++;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        total_db: (dbProps || []).length,
        total_feed: allFeed.length,
        patched: updated,
        already_ok: skipped,
      },
      feed_type_distribution: typeDistribution,
      changes: dryRun ? changes.slice(0, 5) : undefined,
      message: dryRun
        ? `DRY RUN — ${updated} properties to patch. POST {"dryRun": false} to execute.`
        : `✅ Patched ${updated} properties.`,
    });
  } catch (err) {
    console.error('Fix types error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
