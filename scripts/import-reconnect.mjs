#!/usr/bin/env node

/* ═══════════════════════════════════════════════════════════════
   RECONNECT → HUB Full Import Script
   
   Fetches ALL properties from the RECONNECT office feed and
   upserts them into the Hub's Supabase database, matching
   each property to its agent by AssociateId.

   Usage: node scripts/import-reconnect.mjs [--office altitud|cero|all] [--dry-run]
   ═══════════════════════════════════════════════════════════════ */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env.local ──
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const IS_SERVICE_ROLE = !!env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env.local');
  process.exit(1);
}

console.log(`📡 Supabase: ${SUPABASE_URL}`);
console.log(`🔑 Using: ${IS_SERVICE_ROLE ? 'Service Role Key' : 'Anon Key'}`);
if (!IS_SERVICE_ROLE) {
  console.log('⚠️  No service role key found — using anon key. RLS policies will apply.');
  console.log('   Add SUPABASE_SERVICE_ROLE_KEY to .env.local for full admin access.');
}

// ── Config ──
const RECONNECT_FEED_BASE = 'https://api.remax-cca.com/api';
const OFFICE_GUIDS = {
  altitud: 'FEA8746D-CC1D-41B8-89F3-D04AC98274AF',
  cero: '4AD5AE8F-5B47-4A1A-A953-40445F2B4940',
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const officeArg = args.find((a, i) => args[i - 1] === '--office') || 'all';
const officesToImport = officeArg === 'all' ? ['altitud', 'cero'] : [officeArg];

// ── Supabase REST helpers ──
async function supabaseRest(table, method, body, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation,resolution=merge-duplicates' : 'return=representation',
  };
  
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(url, opts);
  const text = await res.text();
  
  if (!res.ok) {
    throw new Error(`Supabase ${method} ${table}: ${res.status} — ${text}`);
  }
  
  return text ? JSON.parse(text) : null;
}

async function supabaseSelect(table, query) {
  return supabaseRest(table, 'GET', null, query);
}

async function supabaseInsert(table, data) {
  return supabaseRest(table, 'POST', data);
}

async function supabaseUpdate(table, data, matchQuery) {
  return supabaseRest(table, 'PATCH', data, matchQuery);
}

// ── Y/N to bool ──
function ynToBool(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toUpperCase() === 'Y';
  return !!val;
}

// ── Map RECONNECT → Hub schema ──
function mapToHub(rp) {
  return {
    reconnect_listing_id: rp.ListingId,
    reconnect_listing_key: rp.ListingKey,
    name: rp.ListingTitle_es || rp.ListingTitle_en || rp.ListingTitle || '',
    listing_title_en: rp.ListingTitle_en || '',
    listing_title_es: rp.ListingTitle_es || '',
    property_type: rp.PropertyTypeName_es || rp.PropertyTypeName_en || null,
    listing_contract_type: rp.ListingContractType || 1,
    unparsed_address: rp.UnparsedAddress || '',
    latitude: rp.Latitude || null,
    longitude: rp.Longitude || null,
    country_id: rp.CountryId || 52,
    state_dep_prov_id: rp.StateDepProvId || null,
    location_id: rp.LocationId || null,
    bedrooms_total: rp.BedroomsTotal || 0,
    bathrooms_full: rp.BathroomsFull || 0,
    bathrooms_half: rp.BathroomsHalf || 0,
    stories: rp.Stories || 1,
    lot_size_area: rp.LotSizeArea || null,
    construction_size: rp.ConstructionSize || null,
    list_price: rp.ListPrice || null,
    list_price_currency_id: rp.CurrencyId || 2,
    listing_side_comm: rp.ListingSideComm || 3,
    selling_side_comm: rp.SellingSideComm || 3,
    public_remarks_en: rp.PublicRemarks_en || '',
    public_remarks_es: rp.publicRemarks_es || '',
    pool_private: ynToBool(rp.PoolPrivate),
    garage: ynToBool(rp.Garage),
    garage_spaces: rp.GarageSpaces || 0,
    garage_covered: ynToBool(rp.GarageCovered),
    cooling: ynToBool(rp.Cooling),
    has_view: ynToBool(rp.Viewyn),
    gated_community: ynToBool(rp.GatedCommunity),
    furnished: ynToBool(rp.Furnishedyn),
    maid_room: ynToBool(rp.MaidRoom),
    listing_agreement: ynToBool(rp.Listingagreementyn),
    listing_contract_date: rp.ListingContractDate || null,
    expiration_date: rp.ExpirationDate || null,
    video_link: rp.Videolink || '',
    status: 'published',
    reconnect_last_sync: new Date().toISOString(),
  };
}

// ── Extract images from pipe-separated string ──
function extractImages(rp) {
  const raw = rp.Images || '';
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split('|').filter(u => u.trim()).map((url, i) => ({
      image_url: url.trim(),
      thumbnail_url: null,
      priority: i,
    }));
  }
  return [];
}

// ── MAIN ──
async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  RECONNECT → ALTITUD HUB Import');
  console.log(`  Offices: ${officesToImport.join(', ')}`);
  console.log(`  Mode: ${dryRun ? '🔍 DRY RUN' : '🚀 LIVE IMPORT'}`);
  console.log('═══════════════════════════════════════════\n');

  // 1. Fetch all profiles to build AssociateId → auth_user_id map
  console.log('📋 Loading Hub profiles...');
  let profiles;
  try {
    profiles = await supabaseSelect('profiles', '?select=id,email,full_name,remax_agent_id,auth_user_id,role');
  } catch (err) {
    console.error('❌ Failed to load profiles:', err.message);
    console.log('\n💡 If using anon key, you may need to add SUPABASE_SERVICE_ROLE_KEY to .env.local');
    console.log('   Find it at: https://app.supabase.com → Project Settings → API → service_role key');
    process.exit(1);
  }

  console.log(`   Found ${profiles.length} profiles in Hub`);

  // Build lookup: AssociateId → auth_user_id
  const associateToAuth = {};
  const associateToProfile = {};
  for (const p of profiles) {
    if (p.remax_agent_id) {
      associateToAuth[p.remax_agent_id] = p.auth_user_id;
      associateToProfile[p.remax_agent_id] = p;
    }
  }
  console.log(`   Mapped ${Object.keys(associateToAuth).length} agents by AssociateId`);

  // Find broker auth_user_id as fallback (agent_id is NOT NULL in properties table)
  const broker = profiles.find(p => p.role === 'broker' && p.auth_user_id);
  const fallbackAgentId = broker?.auth_user_id || null;
  if (fallbackAgentId) {
    console.log(`   🔑 Fallback agent_id: ${broker.full_name} (${broker.email})`);
  } else {
    console.error('❌ No broker with auth_user_id found. Cannot import (agent_id is NOT NULL).');
    process.exit(1);
  }
  console.log('');

  // 2. Fetch RECONNECT properties
  let allProperties = [];
  for (const officeKey of officesToImport) {
    const guid = OFFICE_GUIDS[officeKey];
    console.log(`📡 Fetching ${officeKey} feed (${guid})...`);

    const res = await fetch(`${RECONNECT_FEED_BASE}/PropertiesPerOffice/${guid}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      console.error(`   ❌ Feed error: ${res.status}`);
      continue;
    }

    const data = await res.json();
    const props = Array.isArray(data) ? data : [];
    console.log(`   ✅ Got ${props.length} properties`);

    for (const p of props) {
      p._officeKey = officeKey;
      p._officeCode = officeKey === 'altitud' ? 'R0700130' : 'R0700151';
    }
    allProperties.push(...props);
  }

  console.log(`\n📦 Total RECONNECT properties: ${allProperties.length}\n`);

  if (allProperties.length === 0) {
    console.log('Nothing to import.');
    process.exit(0);
  }

  // 3. Group by agent for reporting
  const byAgent = {};
  for (const rp of allProperties) {
    const aid = rp.AssociateId || 'unknown';
    const name = `${rp.FirstName || ''} ${rp.LastName || ''}`.trim() || 'Unknown';
    if (!byAgent[aid]) byAgent[aid] = { name, count: 0, hasAuth: !!associateToAuth[aid] };
    byAgent[aid].count++;
  }

  console.log('👥 Agent breakdown:');
  for (const [aid, info] of Object.entries(byAgent).sort((a, b) => b[1].count - a[1].count)) {
    const status = info.hasAuth ? '✅ mapped' : '⚠️  no auth_user_id';
    const profile = associateToProfile[aid];
    const profileInfo = profile ? ` → ${profile.full_name} (${profile.email})` : '';
    console.log(`   AssociateId ${aid}: ${info.name} — ${info.count} listings ${status}${profileInfo}`);
  }

  // 4. Check for agents without auth_user_id
  const unmappedAgents = Object.entries(byAgent).filter(([aid, info]) => !info.hasAuth && aid !== 'unknown');
  if (unmappedAgents.length > 0) {
    console.log(`\n⚠️  ${unmappedAgents.length} agents have no auth_user_id (haven't logged in yet).`);
    console.log('   Their properties will be imported with agent_id = NULL.');
    console.log('   They will be reassigned when these agents log into the Hub.\n');
  }

  // 5. Import each property
  let imported = 0, updated = 0, skipped = 0, errored = 0;
  const errors = [];
  const imageCount = { total: 0, inserted: 0 };

  for (let i = 0; i < allProperties.length; i++) {
    const rp = allProperties[i];
    const mapped = mapToHub(rp);
    const images = extractImages(rp);
    const agentAuthId = associateToAuth[rp.AssociateId] || null;
    const agentName = `${rp.FirstName || ''} ${rp.LastName || ''}`.trim();

    process.stdout.write(`\r   [${i + 1}/${allProperties.length}] ${mapped.name?.slice(0, 50) || 'Untitled'}...`);

    if (dryRun) {
      imported++;
      imageCount.total += images.length;
      continue;
    }

    try {
      // Check if property already exists by reconnect_listing_id
      const existing = await supabaseSelect(
        'properties',
        `?reconnect_listing_id=eq.${mapped.reconnect_listing_id}&select=id&limit=1`
      );

      if (existing && existing.length > 0) {
        // Update existing property
        const propId = existing[0].id;
        await supabaseUpdate('properties', {
          ...mapped,
          office_code: rp._officeCode,
          updated_at: new Date().toISOString(),
        }, `?id=eq.${propId}`);
        updated++;

        // Sync images
        for (const img of images) {
          try {
            await supabaseInsert('property_images', {
              property_id: propId,
              image_url: img.image_url,
              thumbnail_url: img.thumbnail_url,
              priority: img.priority,
            });
            imageCount.inserted++;
          } catch (e) {
            // Duplicate image — skip silently
          }
          imageCount.total++;
        }
      } else {
        // Insert new property — agent_id is NOT NULL, so fallback to broker
        const insertData = {
          ...mapped,
          agent_id: agentAuthId || fallbackAgentId,
          office_code: rp._officeCode,
        };

        const [newProp] = await supabaseInsert('properties', insertData);

        if (newProp && images.length > 0) {
          const imageRecords = images.map(img => ({
            property_id: newProp.id,
            image_url: img.image_url,
            thumbnail_url: img.thumbnail_url,
            priority: img.priority,
          }));

          try {
            await supabaseInsert('property_images', imageRecords);
            imageCount.inserted += imageRecords.length;
          } catch (e) {
            console.warn(`\n   ⚠️  Image insert error for ${mapped.reconnect_listing_id}: ${e.message}`);
          }
          imageCount.total += images.length;
        }

        imported++;
      }
    } catch (err) {
      errored++;
      errors.push({
        listing_id: mapped.reconnect_listing_id,
        title: mapped.name?.slice(0, 40),
        agent: agentName,
        error: err.message,
      });
    }
  }

  // 6. Summary
  console.log('\n\n═══════════════════════════════════════════');
  console.log('  IMPORT COMPLETE' + (dryRun ? ' (DRY RUN)' : ''));
  console.log('═══════════════════════════════════════════');
  console.log(`  📦 Total in feed:     ${allProperties.length}`);
  console.log(`  ✅ New imported:       ${imported}`);
  console.log(`  🔄 Updated existing:  ${updated}`);
  console.log(`  ⏭️  Skipped:           ${skipped}`);
  console.log(`  ❌ Errors:            ${errored}`);
  console.log(`  🖼️  Images:            ${imageCount.inserted}/${imageCount.total} inserted`);
  console.log('═══════════════════════════════════════════\n');

  if (errors.length > 0) {
    console.log('❌ Errors:');
    for (const e of errors) {
      console.log(`   Listing ${e.listing_id} (${e.title}) — ${e.agent}: ${e.error}`);
    }
    console.log('');
  }
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
