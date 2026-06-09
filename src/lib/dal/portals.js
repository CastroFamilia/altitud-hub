import sql from '@/lib/db';

/* ═══════════════════════════════════════════════════════════════
   PORTALS DAL — Data Access Layer for Portal Registry
   & Property Syndication management.
   Uses raw SQL via postgres.js (bypassing RLS inherently as it's a direct connection)
   ═══════════════════════════════════════════════════════════════ */

// ── Portal Registry ──

/**
 * Get all active portals sorted by display_order.
 * Optionally filter by office scope.
 */
export async function getPortalRegistry(officeScope = null) {
  let data;
  if (officeScope) {
    data = await sql`
      SELECT * FROM portal_registry
      WHERE is_active = true
        AND (office_scope = 'all' OR office_scope = ${officeScope})
      ORDER BY display_order ASC
    `;
  } else {
    data = await sql`
      SELECT * FROM portal_registry
      WHERE is_active = true
      ORDER BY display_order ASC
    `;
  }
  return data || [];
}

/**
 * Get all portals (including inactive) for admin management.
 */
export async function getAllPortals() {
  const data = await sql`
    SELECT * FROM portal_registry
    ORDER BY display_order ASC
  `;
  return data || [];
}

/**
 * Create or update a portal in the registry.
 */
export async function upsertPortal(portalData) {
  const keys = Object.keys(portalData).filter(k => k !== 'slug');
  let data;
  if (keys.length > 0) {
    [data] = await sql`
      INSERT INTO portal_registry ${sql(portalData)}
      ON CONFLICT (slug)
      DO UPDATE SET ${sql(portalData, keys)}
      RETURNING *
    `;
  } else {
    [data] = await sql`
      INSERT INTO portal_registry ${sql(portalData)}
      ON CONFLICT (slug) DO NOTHING
      RETURNING *
    `;
  }
  return data;
}

/**
 * Toggle a portal's active status.
 */
export async function togglePortalActive(portalId, isActive) {
  await sql`
    UPDATE portal_registry
    SET is_active = ${isActive}
    WHERE id = ${portalId}
  `;
}

/**
 * Delete a portal from the registry.
 */
export async function deletePortal(portalId) {
  await sql`
    DELETE FROM portal_registry
    WHERE id = ${portalId}
  `;
}

/**
 * Update display order for multiple portals (batch reorder).
 */
export async function reorderPortals(orderedSlugs) {
  for (let i = 0; i < orderedSlugs.length; i++) {
    await sql`
      UPDATE portal_registry
      SET display_order = ${i + 1}
      WHERE slug = ${orderedSlugs[i]}
    `;
  }
}

// ── Property Syndication (enhanced) ──

/**
 * Get syndications for a property WITH full portal registry data.
 * Returns ALL active portals with their syndication status (if any).
 */
export async function getPropertySyndicationsWithPortals(propertyId, officeScope = null) {
  // Get all active portals
  const portals = await getPortalRegistry(officeScope);

  // Get syndication records for this property
  const syndications = await sql`
    SELECT * FROM property_syndication
    WHERE property_id = ${propertyId}
  `;

  // Merge: for each portal, attach its syndication record (if exists)
  return portals.map(portal => {
    const syn = (syndications || []).find(s => s.portal_name === portal.slug);
    return {
      ...portal,
      syndication: syn || null,
      is_published: syn && syn.status === 'synced',
      is_requested: syn && syn.status === 'requested',
    };
  });
}

/**
 * Create or update a syndication record (broker registers a portal link).
 */
export async function upsertPropertySyndication(data) {
  const keys = Object.keys(data).filter(k => k !== 'property_id' && k !== 'portal_name');
  let result;
  if (keys.length > 0) {
    [result] = await sql`
      INSERT INTO property_syndication ${sql(data)}
      ON CONFLICT (property_id, portal_name)
      DO UPDATE SET ${sql(data, keys)}
      RETURNING *
    `;
  } else {
    [result] = await sql`
      INSERT INTO property_syndication ${sql(data)}
      ON CONFLICT (property_id, portal_name) DO NOTHING
      RETURNING *
    `;
  }
  return result;
}

/**
 * Remove a syndication record (set status to 'removed').
 */
export async function removePropertySyndication(propertyId, portalName) {
  await sql`
    UPDATE property_syndication
    SET status = 'removed'
    WHERE property_id = ${propertyId}
      AND portal_name = ${portalName}
  `;
}

/**
 * Delete a syndication record entirely.
 */
export async function deletePropertySyndication(id) {
  await sql`
    DELETE FROM property_syndication
    WHERE id = ${id}
  `;
}

/**
 * Get all properties with RECONNECT syndication for stats sync.
 */
export async function getReconnectSyncedProperties() {
  const data = await sql`
    SELECT id, property_id, portal_listing_id, portal_listing_url, listing_views, interested_count, days_listed
    FROM property_syndication
    WHERE portal_name = 'reconnect'
      AND status = 'synced'
  `;
  return data || [];
}

/**
 * Update stats for a syndication record (used by cron).
 */
export async function updateSyndicationStats(syndicationId, stats) {
  await sql`
    UPDATE property_syndication
    SET 
      listing_views = ${stats.listing_views},
      interested_count = ${stats.interested_count},
      days_listed = ${stats.days_listed},
      stats_updated_at = NOW()
    WHERE id = ${syndicationId}
  `;
}

/**
 * Get inquiry counts grouped by portal_name for a property.
 */
export async function getInquiryCountsByPortal(propertyId) {
  const data = await sql`
    SELECT portal_name
    FROM property_inquiries
    WHERE property_id = ${propertyId}
  `;

  const counts = {};
  (data || []).forEach(inq => {
    const portal = inq.portal_name || 'direct';
    counts[portal] = (counts[portal] || 0) + 1;
  });
  return counts;
}
