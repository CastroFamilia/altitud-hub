import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchOfficeProperties, OFFICE_GUIDS } from '@/lib/reconnect-api';

/* ═══════════════════════════════════════════════════════════════
   FIX AGENT ASSIGNMENTS ON IMPORTED PROPERTIES
   POST /api/properties/fix-agents
   
   Step 1: Creates missing profiles for RECONNECT agents
   Step 2: Maps AssociateId → profiles.remax_agent_id → auth_user_id
   Step 3: Updates properties.agent_id (FK to auth.users(id))
   
   NOTE: properties.agent_id references auth.users(id), NOT profiles(id).
   Agents without auth_user_id (haven't logged in yet) will be skipped
   and their properties remain assigned to the broker until they register.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { dryRun = true, createProfiles = true } = await req.json().catch(() => ({}));

    // 1. Fetch RECONNECT feeds for both offices
    const officeKeys = Object.keys(OFFICE_GUIDS);
    let allReconnectProperties = [];

    for (const officeKey of officeKeys) {
      const { properties: feedProps, error: feedError } = await fetchOfficeProperties(officeKey);
      if (feedError) {
        console.error(`Feed error for ${officeKey}:`, feedError);
        continue;
      }
      allReconnectProperties = allReconnectProperties.concat(
        feedProps.map(rp => ({ ...rp, _officeKey: officeKey }))
      );
    }

    // 2. Extract unique agents from feed
    const feedAgents = {};
    for (const rp of allReconnectProperties) {
      const associateId = rp.AssociateId || rp.associateId;
      if (associateId && !feedAgents[String(associateId)]) {
        const firstName = rp.FirstName || rp.firstName || '';
        const lastName = rp.LastName || rp.lastName || '';
        const officeKey = rp._officeKey || 'altitud';
        feedAgents[String(associateId)] = {
          associate_id: String(associateId),
          full_name: `${firstName} ${lastName}`.trim() || `Agent ${associateId}`,
          office: officeKey === 'cero' ? 'cero' : 'altitud',
        };
      }
    }

    // 3. Get existing profiles
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_user_id, full_name, remax_agent_id, email, office');

    if (profilesError) {
      return NextResponse.json({ error: 'Failed to fetch profiles: ' + profilesError.message }, { status: 500 });
    }

    // Build lookup by remax_agent_id
    const existingByAssociate = {};
    for (const p of existingProfiles) {
      if (p.remax_agent_id) {
        existingByAssociate[String(p.remax_agent_id)] = p;
      }
    }

    // 4. Create missing profiles (they won't have auth_user_id until they log in)
    const profilesCreated = [];
    const profilesFailed = [];

    if (createProfiles) {
      for (const [associateId, agentInfo] of Object.entries(feedAgents)) {
        if (existingByAssociate[associateId]) continue;

        // Check by name as fallback
        const nameMatch = existingProfiles.find(
          p => p.full_name?.toLowerCase().trim() === agentInfo.full_name.toLowerCase().trim()
        );

        if (nameMatch) {
          if (!dryRun) {
            await supabaseAdmin
              .from('profiles')
              .update({
                remax_agent_id: parseInt(associateId),
                remax_agent_name: agentInfo.full_name,
              })
              .eq('id', nameMatch.id);
          }
          existingByAssociate[associateId] = nameMatch;
          profilesCreated.push({ action: dryRun ? 'would_update' : 'updated', ...agentInfo, profile_id: nameMatch.id });
          continue;
        }

        const emailSlug = agentInfo.full_name.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const profileData = {
          full_name: agentInfo.full_name,
          email: `${emailSlug}@remax-altitud.cr`,
          remax_agent_id: parseInt(associateId),
          remax_agent_name: agentInfo.full_name,
          office: agentInfo.office,
          role: 'agent',
          status: 'invited',
        };

        if (!dryRun) {
          const { data: newProfile, error: insertErr } = await supabaseAdmin
            .from('profiles')
            .insert(profileData)
            .select('id')
            .single();

          if (insertErr) {
            profilesFailed.push({ ...agentInfo, error: insertErr.message });
            continue;
          }
          existingByAssociate[associateId] = { ...profileData, id: newProfile.id, auth_user_id: null };
          profilesCreated.push({ action: 'created', ...agentInfo, profile_id: newProfile.id });
        } else {
          profilesCreated.push({ action: 'would_create', ...agentInfo, email: profileData.email });
        }
      }
    }

    // 5. Build agent lookup: AssociateId → auth_user_id (only for agents who have logged in)
    const agentLookup = {};
    const pendingAgents = [];
    for (const [associateId, profile] of Object.entries(existingByAssociate)) {
      if (profile.auth_user_id) {
        agentLookup[associateId] = {
          auth_user_id: profile.auth_user_id,
          full_name: profile.full_name,
        };
      } else {
        pendingAgents.push({
          associate_id: associateId,
          full_name: profile.full_name,
          reason: 'No auth_user_id — agent has not logged in yet',
        });
      }
    }

    // 6. Build listing → associate mapping
    const listingToAssociate = {};
    for (const rp of allReconnectProperties) {
      const listingId = rp.ListingId || rp.listingId || rp.Id || rp.id;
      const associateId = rp.AssociateId || rp.associateId;
      if (listingId && associateId) {
        listingToAssociate[String(listingId)] = String(associateId);
      }
    }

    // 7. Get all Hub properties
    const { data: hubProperties, error: hubError } = await supabaseAdmin
      .from('properties')
      .select('id, agent_id, reconnect_listing_id, name')
      .not('reconnect_listing_id', 'is', null);

    if (hubError) {
      return NextResponse.json({ error: 'Failed to fetch hub properties: ' + hubError.message }, { status: 500 });
    }

    // 8. Calculate and apply changes
    let updated = 0;
    let skipped = 0;
    let pendingLogin = 0;
    let changes = [];

    for (const prop of hubProperties) {
      const reconnectId = String(prop.reconnect_listing_id);
      const associateId = listingToAssociate[reconnectId];

      if (!associateId) {
        skipped++;
        continue;
      }

      const agentInfo = agentLookup[associateId];

      if (!agentInfo) {
        // Agent exists in profiles but hasn't logged in — can't assign yet
        pendingLogin++;
        continue;
      }

      if (prop.agent_id === agentInfo.auth_user_id) {
        skipped++;
        continue;
      }

      changes.push({
        property_id: prop.id,
        property_name: prop.name?.substring(0, 40),
        associate_id: associateId,
        agent_name: agentInfo.full_name,
        old_agent_id: prop.agent_id,
        new_agent_id: agentInfo.auth_user_id,
      });

      if (!dryRun) {
        const { error: updateError } = await supabaseAdmin
          .from('properties')
          .update({ agent_id: agentInfo.auth_user_id })
          .eq('id', prop.id);

        if (updateError) {
          console.error(`Failed to update property ${prop.id}:`, updateError.message);
          changes[changes.length - 1].error = updateError.message;
          continue;
        }
      }

      updated++;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        total_hub_properties: hubProperties.length,
        total_reconnect_feed: allReconnectProperties.length,
        feed_agents: Object.keys(feedAgents).length,
        profiles_created_or_updated: profilesCreated.length,
        profiles_failed: profilesFailed.length,
        agents_with_auth: Object.keys(agentLookup).length,
        agents_pending_login: pendingAgents.length,
        properties_reassigned: updated,
        properties_pending_agent_login: pendingLogin,
        already_correct_or_skipped: skipped,
      },
      profiles_created: profilesCreated.length > 0 ? profilesCreated : undefined,
      profiles_failed: profilesFailed.length > 0 ? profilesFailed : undefined,
      pending_agents: pendingAgents.length > 0 ? pendingAgents : undefined,
      changes: changes.slice(0, 30),
      message: dryRun
        ? `DRY RUN — ${updated} properties can be reassigned now. ${pendingLogin} are waiting for agents to log in.`
        : `Reassigned ${updated} properties. ${pendingLogin} pending agent login.`,
    });

  } catch (err) {
    console.error('Fix agents error:', err);
    return NextResponse.json({ error: 'Fix failed: ' + err.message }, { status: 500 });
  }
}
