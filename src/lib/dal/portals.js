import { createAdminSupabase } from '@/lib/supabase-server';
import { supabase as anonClient } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════════
   PORTALS DAL — Data Access Layer for Portal Registry
   & Property Syndication management.
   Uses admin (service-role) client to bypass RLS on server-side
   API routes where auth.uid() is unavailable.
   ═══════════════════════════════════════════════════════════════ */

function getClient() {
  return createAdminSupabase() || anonClient;
}

// ── Portal Registry ──

/**
 * Get all active portals sorted by display_order.
 * Optionally filter by office scope.
 */
export async function getPortalRegistry(officeScope = null) {
  let query = getClient()
    .from('portal_registry')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (officeScope) {
    query = query.or(`office_scope.eq.all,office_scope.eq.${officeScope}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get all portals (including inactive) for admin management.
 */
export async function getAllPortals() {
  const { data, error } = await getClient()
    .from('portal_registry')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Create or update a portal in the registry.
 */
export async function upsertPortal(portalData) {
  const { data, error } = await getClient()
    .from('portal_registry')
    .upsert(portalData, { onConflict: 'slug' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Toggle a portal's active status.
 */
export async function togglePortalActive(portalId, isActive) {
  const { error } = await getClient()
    .from('portal_registry')
    .update({ is_active: isActive })
    .eq('id', portalId);
  if (error) throw error;
}

/**
 * Delete a portal from the registry.
 */
export async function deletePortal(portalId) {
  const { error } = await getClient()
    .from('portal_registry')
    .delete()
    .eq('id', portalId);
  if (error) throw error;
}

/**
 * Update display order for multiple portals (batch reorder).
 */
export async function reorderPortals(orderedSlugs) {
  const updates = orderedSlugs.map((slug, i) => ({
    slug,
    display_order: i + 1,
  }));

  for (const update of updates) {
    const { error } = await getClient()
      .from('portal_registry')
      .update({ display_order: update.display_order })
      .eq('slug', update.slug);
    if (error) throw error;
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
  const { data: syndications, error } = await getClient()
    .from('property_syndication')
    .select('*')
    .eq('property_id', propertyId);

  if (error) throw error;

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
  const { data: result, error } = await getClient()
    .from('property_syndication')
    .upsert(data, { onConflict: 'property_id,portal_name' })
    .select()
    .single();
  if (error) throw error;
  return result;
}

/**
 * Remove a syndication record (set status to 'removed').
 */
export async function removePropertySyndication(propertyId, portalName) {
  const { error } = await getClient()
    .from('property_syndication')
    .update({ status: 'removed' })
    .eq('property_id', propertyId)
    .eq('portal_name', portalName);
  if (error) throw error;
}

/**
 * Delete a syndication record entirely.
 */
export async function deletePropertySyndication(id) {
  const { error } = await getClient()
    .from('property_syndication')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * Get all properties with RECONNECT syndication for stats sync.
 */
export async function getReconnectSyncedProperties() {
  const { data, error } = await getClient()
    .from('property_syndication')
    .select('id, property_id, portal_listing_id, portal_listing_url, listing_views, interested_count, days_listed')
    .eq('portal_name', 'reconnect')
    .eq('status', 'synced');
  if (error) throw error;
  return data || [];
}

/**
 * Update stats for a syndication record (used by cron).
 */
export async function updateSyndicationStats(syndicationId, stats) {
  const { error } = await getClient()
    .from('property_syndication')
    .update({
      listing_views: stats.listing_views,
      interested_count: stats.interested_count,
      days_listed: stats.days_listed,
      stats_updated_at: new Date().toISOString(),
    })
    .eq('id', syndicationId);
  if (error) throw error;
}

/**
 * Get inquiry counts grouped by portal_name for a property.
 */
export async function getInquiryCountsByPortal(propertyId) {
  const { data, error } = await getClient()
    .from('property_inquiries')
    .select('portal_name')
    .eq('property_id', propertyId);

  if (error) throw error;

  const counts = {};
  (data || []).forEach(inq => {
    const portal = inq.portal_name || 'direct';
    counts[portal] = (counts[portal] || 0) + 1;
  });
  return counts;
}
