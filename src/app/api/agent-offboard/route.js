import { createClient, createAdminSupabase } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/agent-offboard
 * 
 * Handles agent offboarding — preview data counts or execute bulk reassignment.
 * 
 * Body: {
 *   departingProfileId: string,      // Profile ID of departing agent
 *   receivingProfileId: string,      // Profile ID of receiving agent
 *   selectedCategories: string[],    // Categories to reassign to receiving agent
 *   execute: boolean,                // false = preview counts, true = execute
 *   notes?: string                   // Optional notes
 * }
 * 
 * Categories that are NOT in selectedCategories will be reassigned to
 * the system "Otros" placeholder profile.
 */

const ALL_CATEGORIES = [
  'contacts',
  'properties',
  'acm_reports',
  'buyer_searches',
  'office_listings',
  'office_reservations',
  'office_commissions',
  'agent_commissions',
  'agent_referrals',
  'listing_milestones',
  'lead_communications',
  'lead_follow_ups',
  'saved_presentations',
];

export async function POST(request) {
  const limited = rateLimit(request, { keyPrefix: 'agent-offboard', maxRequests: 10 });
  if (limited) return limited;

  try {
    const supabase = await createClient();
    const adminSupabase = createAdminSupabase();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Broker check
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'broker') {
      return Response.json({ error: 'Solo el broker puede ejecutar offboarding' }, { status: 403 });
    }

    const body = await request.json();
    const { departingProfileId, receivingProfileId, selectedCategories = [], execute = false, notes = '' } = body;

    if (!departingProfileId || !receivingProfileId) {
      return Response.json({ error: 'Se requieren los IDs de ambos perfiles' }, { status: 400 });
    }

    if (departingProfileId === receivingProfileId) {
      return Response.json({ error: 'El agente receptor no puede ser el mismo que se va' }, { status: 400 });
    }

    // Use admin client for cross-user operations (bypasses RLS)
    const db = adminSupabase || supabase;

    // Fetch both profiles
    const { data: departingProfile } = await db
      .from('profiles')
      .select('id, auth_user_id, full_name, email, status')
      .eq('id', departingProfileId)
      .single();

    const { data: receivingProfile } = await db
      .from('profiles')
      .select('id, auth_user_id, full_name, email, status')
      .eq('id', receivingProfileId)
      .single();

    if (!departingProfile) {
      return Response.json({ error: 'Perfil del agente que sale no encontrado' }, { status: 404 });
    }
    if (!receivingProfile) {
      return Response.json({ error: 'Perfil del agente receptor no encontrado' }, { status: 404 });
    }

    // Get placeholder profile ("Otros")
    const { data: placeholderProfile } = await db
      .from('profiles')
      .select('id, auth_user_id')
      .eq('email', 'sistema@remax-altitud.cr')
      .single();

    if (!placeholderProfile) {
      return Response.json({ error: 'Perfil placeholder "Otros" no encontrado. Ejecute la migración primero.' }, { status: 500 });
    }

    const departingUserId = departingProfile.auth_user_id;
    const receivingUserId = receivingProfile.auth_user_id;
    const placeholderUserId = placeholderProfile.auth_user_id;

    // ── COUNT RECORDS ──
    // For each category, count how many records belong to the departing agent
    const counts = {};

    // Tables that use auth.users(id) via agent_id or user_id
    const userIdTables = [
      { key: 'contacts', table: 'contacts', column: 'user_id', useUserId: true },
      { key: 'properties', table: 'properties', column: 'agent_id', useUserId: true },
      { key: 'acm_reports', table: 'acm_reports', column: 'user_id', useUserId: true },
      { key: 'buyer_searches', table: 'buyer_searches', column: 'agent_id', useUserId: true },
      { key: 'listing_milestones', table: 'listing_milestones', column: 'agent_id', useUserId: true },
      { key: 'saved_presentations', table: 'saved_presentations', column: 'agent_id', useUserId: true },
    ];

    // Tables that use profiles(id) via profile_id or agent_id
    const profileIdTables = [
      { key: 'office_listings', table: 'office_listings', column: 'profile_id', useUserId: false },
      { key: 'office_reservations', table: 'office_reservations', column: 'profile_id', useUserId: false },
      { key: 'office_commissions', table: 'office_commissions', column: 'profile_id', useUserId: false },
      { key: 'agent_commissions', table: 'agent_commissions', column: 'agent_id', useUserId: false },
      { key: 'lead_communications', table: 'lead_communications', column: 'agent_id', useUserId: false },
      { key: 'lead_follow_ups', table: 'lead_follow_ups', column: 'agent_id', useUserId: false },
    ];

    // Count user-id based tables
    for (const { key, table, column, useUserId } of userIdTables) {
      const lookupId = useUserId ? departingUserId : departingProfileId;
      if (!lookupId) {
        counts[key] = 0;
        continue;
      }
      const { count, error } = await db
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq(column, lookupId);
      counts[key] = error ? 0 : (count || 0);
    }

    // Count profile-id based tables
    for (const { key, table, column } of profileIdTables) {
      const { count, error } = await db
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq(column, departingProfileId);
      counts[key] = error ? 0 : (count || 0);
    }

    // Referrals are special — agent can be on either side
    const { count: refSent } = await db
      .from('agent_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referring_agent_id', departingProfileId);
    const { count: refReceived } = await db
      .from('agent_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('receiving_agent_id', departingProfileId);
    counts.agent_referrals = (refSent || 0) + (refReceived || 0);

    // Count business plans (to be deleted)
    const { count: bpCount } = await db
      .from('business_plans')
      .select('id', { count: 'exact', head: true })
      .eq('agent_email', departingProfile.email);
    counts.business_plans = bpCount || 0;

    // ── PREVIEW MODE ──
    if (!execute) {
      return Response.json({
        success: true,
        mode: 'preview',
        departingAgent: {
          id: departingProfile.id,
          name: departingProfile.full_name,
          email: departingProfile.email,
        },
        receivingAgent: {
          id: receivingProfile.id,
          name: receivingProfile.full_name,
          email: receivingProfile.email,
        },
        counts,
      });
    }

    // ── EXECUTE MODE ──
    const reassignedCounts = {};
    const placeholderCounts = {};

    // Helper: reassign a table
    async function reassignTable(key, table, column, isUserId) {
      const count = counts[key];
      if (!count) return;

      const isSelected = selectedCategories.includes(key);
      if (!isSelected) {
        // If not selected, do not reassign (it stays with the departing agent)
        placeholderCounts[key] = count;
        return;
      }

      const targetId = isUserId ? receivingUserId : receivingProfileId;
      const lookupId = isUserId ? departingUserId : departingProfileId;
      if (!lookupId) return;

      const { error } = await db
        .from(table)
        .update({ [column]: targetId })
        .eq(column, lookupId);

      if (!error) {
        reassignedCounts[key] = count;
      }
    }

    // Reassign user-id based tables
    for (const { key, table, column, useUserId } of userIdTables) {
      await reassignTable(key, table, column, useUserId);
    }

    // Reassign profile-id based tables
    for (const { key, table, column } of profileIdTables) {
      await reassignTable(key, table, column, false);
    }

    // Handle referrals (two columns)
    if (counts.agent_referrals > 0) {
      const isSelected = selectedCategories.includes('agent_referrals');
      if (isSelected) {
        const targetProfileId = receivingProfileId;

        await db
          .from('agent_referrals')
          .update({ referring_agent_id: targetProfileId })
          .eq('referring_agent_id', departingProfileId);

        await db
          .from('agent_referrals')
          .update({ receiving_agent_id: targetProfileId })
          .eq('receiving_agent_id', departingProfileId);

        reassignedCounts.agent_referrals = counts.agent_referrals;
      } else {
        placeholderCounts.agent_referrals = counts.agent_referrals;
      }
    }

    // Delete business plans
    if (counts.business_plans > 0) {
      await db
        .from('business_plans')
        .delete()
        .eq('agent_email', departingProfile.email);
    }

    // Disable the departing profile
    await db
      .from('profiles')
      .update({ status: 'disabled' })
      .eq('id', departingProfileId);

    // Log the operation
    await db
      .from('agent_offboarding_log')
      .insert({
        departing_profile_id: departingProfileId,
        departing_name: departingProfile.full_name,
        receiving_profile_id: receivingProfileId,
        receiving_name: receivingProfile.full_name,
        performed_by: callerProfile.id,
        reassigned_counts: reassignedCounts,
        placeholder_counts: placeholderCounts,
        selected_categories: selectedCategories,
        notes,
      });

    return Response.json({
      success: true,
      mode: 'executed',
      reassignedCounts,
      placeholderCounts,
      businessPlansDeleted: counts.business_plans,
      departingAgentDisabled: true,
    });

  } catch (err) {
    console.error('Offboarding error:', err);
    return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}
