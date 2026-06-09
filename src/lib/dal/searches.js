import sql from '@/lib/db';

async function attachProfiles(searches) {
  if (!searches || searches.length === 0) return searches;
  const agentIds = [...new Set(searches.map(s => s.agent_id).filter(Boolean))];
  if (agentIds.length === 0) return searches;

  const profiles = await sql`
    SELECT auth_user_id, full_name, avatar_url, phone
    FROM profiles
    WHERE auth_user_id IN ${sql(agentIds)}
  `;

  const profileMap = {};
  profiles.forEach(p => { profileMap[p.auth_user_id] = p; });

  return searches.map(s => ({
    ...s,
    profiles: profileMap[s.agent_id] || null,
  }));
}

export async function getSearchesByAgentId(agentId) {
  const data = await sql`
    SELECT *
    FROM buyer_searches
    WHERE agent_id = ${agentId}
    ORDER BY created_at DESC
  `;
  return attachProfiles(data);
}

export async function getActiveSearches() {
  const data = await sql`
    SELECT *
    FROM buyer_searches
    WHERE status = 'activa'
    ORDER BY created_at DESC
  `;
  return attachProfiles(data);
}

export async function getAllSearches() {
  const data = await sql`
    SELECT *
    FROM buyer_searches
    ORDER BY created_at DESC
  `;
  return attachProfiles(data);
}

export async function getActiveSearchesForAgent(agentId) {
  const data = await sql`
    SELECT *
    FROM buyer_searches
    WHERE agent_id = ${agentId} AND status = 'activa'
  `;
  return data;
}

export async function getSearchById(id) {
  const data = await sql`
    SELECT *
    FROM buyer_searches
    WHERE id = ${id}
  `;
  return data[0] || null;
}

export async function insertSearch(searchData) {
  const data = await sql`
    INSERT INTO buyer_searches ${sql(searchData)}
    RETURNING *
  `;
  return data[0];
}

export async function updateSearch(id, updates) {
  const data = await sql`
    UPDATE buyer_searches
    SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING *
  `;
  return data[0];
}

export async function deleteSearch(id) {
  await sql`
    DELETE FROM buyer_searches
    WHERE id = ${id}
  `;
  return true;
}

export async function insertSearchMatch(matchData) {
  const data = await sql`
    INSERT INTO search_matches ${sql(matchData)}
    RETURNING *
  `;
  return data[0];
}

export async function insertVote(voteData) {
  const data = await sql`
    INSERT INTO buyer_search_votes ${sql(voteData)}
    RETURNING *
  `;
  return data[0];
}

export async function getPipelineItem(id) {
  const data = await sql`
    SELECT *
    FROM buyer_search_pipeline
    WHERE id = ${id}
  `;
  return data[0] || null;
}

export async function getSearchWithAgentById(id) {
  const data = await sql`
    SELECT *
    FROM buyer_searches
    WHERE id = ${id}
  `;
  
  if (!data || data.length === 0) return null;
  const search = data[0];

  const profile = await sql`
    SELECT full_name, avatar_url, phone, email, office
    FROM profiles
    WHERE auth_user_id = ${search.agent_id}
  `;

  return { ...search, profiles: profile[0] || null };
}

export async function getPipelineForSearch(searchId) {
  const data = await sql`
    SELECT *
    FROM buyer_search_pipeline
    WHERE search_id = ${searchId}
  `;
  return data;
}

export async function getVotesForPipelines(pipelineIds) {
  if (!pipelineIds || pipelineIds.length === 0) return [];
  const data = await sql`
    SELECT *
    FROM buyer_search_votes
    WHERE pipeline_id IN ${sql(pipelineIds)}
  `;
  return data;
}

export async function getPropertiesForMatch(searchData, userId) {
  const tolerance = searchData.price_tolerance ? Number(searchData.price_tolerance) / 100 : 0;
  const priceMin = searchData.price_min ? searchData.price_min * (1 - tolerance) : 0;
  const priceMax = searchData.price_max ? searchData.price_max * (1 + tolerance) : 999999999;

  let query = sql`
    SELECT 
      p.*,
      CASE 
        WHEN pr.auth_user_id IS NOT NULL THEN json_build_object(
          'full_name', pr.full_name,
          'avatar_url', pr.avatar_url,
          'phone', pr.phone,
          'email', pr.email
        )
        ELSE NULL
      END as profiles
    FROM properties p
    LEFT JOIN profiles pr ON p.agent_id = pr.auth_user_id
    WHERE p.property_type = ${searchData.property_type}
      AND p.agent_id != ${userId}
      AND p.list_price >= ${priceMin}
      AND p.list_price <= ${priceMax}
      AND p.status IN ('Activa', 'En_captacion')
  `;

  if (searchData.min_bedrooms > 0) query = sql`${query} AND p.bedrooms_total >= ${searchData.min_bedrooms}`;
  if (searchData.min_bathrooms > 0) query = sql`${query} AND p.bathrooms_full >= ${searchData.min_bathrooms}`;
  if (searchData.min_sqm > 0) query = sql`${query} AND p.construction_size >= ${searchData.min_sqm}`;

  const data = await query;
  return data;
}

export async function getAcmsForMatch(searchData, userId) {
  const tolerance = searchData.price_tolerance ? Number(searchData.price_tolerance) / 100 : 0;
  const priceMin = searchData.price_min ? searchData.price_min * (1 - tolerance) : 0;
  const priceMax = searchData.price_max ? searchData.price_max * (1 + tolerance) : 999999999;

  const data = await sql`
    SELECT 
      a.*,
      CASE 
        WHEN pr.auth_user_id IS NOT NULL THEN json_build_object(
          'full_name', pr.full_name,
          'avatar_url', pr.avatar_url,
          'phone', pr.phone,
          'email', pr.email
        )
        ELSE NULL
      END as profiles
    FROM acm_reports a
    LEFT JOIN profiles pr ON a.user_id = pr.auth_user_id
    WHERE a.property_type = ${searchData.property_type}
      AND a.user_id != ${userId}
      AND a.suggested_price >= ${priceMin}
      AND a.suggested_price <= ${priceMax}
  `;

  return data;
}

export async function upsertPipelineItem({ search_id, match_type, match_id, status }) {
  const existing = await sql`
    SELECT *
    FROM buyer_search_pipeline
    WHERE search_id = ${search_id}
      AND match_type = ${match_type}
      AND match_id = ${match_id}
  `;

  if (existing && existing.length > 0) {
    const data = await sql`
      UPDATE buyer_search_pipeline
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${existing[0].id}
      RETURNING *
    `;
    return data[0];
  } else {
    const data = await sql`
      INSERT INTO buyer_search_pipeline (search_id, match_type, match_id, status)
      VALUES (${search_id}, ${match_type}, ${match_id}, ${status})
      RETURNING *
    `;
    return data[0];
  }
}
