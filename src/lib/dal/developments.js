import sql from '@/lib/db';

export async function getDevelopments() {
  const data = await sql`
    SELECT *
    FROM developments
    ORDER BY created_at DESC
  `;
  return data;
}

export async function getDevelopmentsList() {
  const data = await sql`
    SELECT id, name, slug, status
    FROM developments
    ORDER BY name ASC
  `;
  return data;
}

export async function getDevelopmentsByAgentId(agentId) {
  const data = await sql`
    SELECT *
    FROM developments
    WHERE agent_id = ${agentId}
    ORDER BY updated_at DESC
  `;
  return data;
}

export async function getDevelopmentById(id) {
  const data = await sql`
    SELECT *
    FROM developments
    WHERE id = ${id}
  `;
  return data[0] || null;
}

export async function getDevelopmentMinimal(id) {
  const data = await sql`
    SELECT id, name, slug, status, agent_id
    FROM developments
    WHERE id = ${id}
  `;
  return data[0] || null;
}

export async function getActiveDevelopmentBySlug(slug) {
  const data = await sql`
    SELECT name, tagline_es, tagline_en, og_image_url, developer_name, status
    FROM developments
    WHERE slug = ${slug} AND status = 'active'
  `;
  return data[0] || null;
}

export async function getActiveDevelopmentWithProperties(slug) {
  const data = await sql`
    SELECT 
      d.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', p.id,
            'title_es', p.title_es,
            'title_en', p.title_en,
            'property_type', p.property_type,
            'size_m2', p.size_m2,
            'price', p.price,
            'status', p.status,
            'main_image_url', p.main_image_url
          )
        ) FILTER (WHERE p.id IS NOT NULL), '[]'
      ) as properties
    FROM developments d
    LEFT JOIN properties p ON p.development_id = d.id
    WHERE d.slug = ${slug} AND d.status = 'active'
    GROUP BY d.id
  `;
  return data[0] || null;
}

export async function getActiveDevelopmentsWithProperties() {
  const data = await sql`
    SELECT 
      d.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', p.id,
            'title_es', p.title_es,
            'title_en', p.title_en,
            'property_type', p.property_type,
            'size_m2', p.size_m2,
            'price', p.price,
            'status', p.status,
            'main_image_url', p.main_image_url
          )
        ) FILTER (WHERE p.id IS NOT NULL), '[]'
      ) as properties
    FROM developments d
    LEFT JOIN properties p ON p.development_id = d.id
    WHERE d.status = 'active'
    GROUP BY d.id
  `;
  return data;
}

export async function insertDevelopment(developmentData) {
  const data = await sql`
    INSERT INTO developments ${sql(developmentData)}
    RETURNING *
  `;
  const development = data[0];

  if (development && development.status === 'pending_approval') {
    try {
      const title = development.name || 'Desarrollo sin título';
      const officeId = development.office_code?.toLowerCase()?.includes('cero') ? 'cero' : 'altitud';
      
      const brokers = await sql`
        SELECT auth_user_id
        FROM profiles
        WHERE role = 'broker' AND office = ${officeId}
      `;
      
      if (brokers && brokers.length > 0) {
        let agentName = 'Un agente';
        if (development.agent_id) {
          const agentProfile = await sql`
            SELECT full_name
            FROM profiles
            WHERE auth_user_id = ${development.agent_id}
          `;
          if (agentProfile[0]?.full_name) agentName = agentProfile[0].full_name;
        }

        for (const broker of brokers) {
          if (broker.auth_user_id) {
            await sql`
              INSERT INTO notifications ${sql({
                user_id: broker.auth_user_id,
                title: '🏢 Desarrollo por aprobar',
                message: `${agentName} ha enviado el desarrollo "${title}" para aprobación.`,
                link: '/oficina?tab=propiedades'
              })}
            `;
          }
        }
      }
    } catch (e) {
      console.error('Failed to notify brokers about new development approval:', e);
    }
  }

  return development;
}

export async function updateDevelopment(id, updates) {
  const data = await sql`
    UPDATE developments
    SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING *
  `;
  const development = data[0];

  if (updates && updates.status === 'pending_approval' && development) {
    try {
      const title = development.name || 'Desarrollo sin título';
      const officeId = development.office_code?.toLowerCase()?.includes('cero') ? 'cero' : 'altitud';
      
      const brokers = await sql`
        SELECT auth_user_id
        FROM profiles
        WHERE role = 'broker' AND office = ${officeId}
      `;
      
      if (brokers && brokers.length > 0) {
        let agentName = 'Un agente';
        if (development.agent_id) {
          const agentProfile = await sql`
            SELECT full_name
            FROM profiles
            WHERE auth_user_id = ${development.agent_id}
          `;
          if (agentProfile[0]?.full_name) agentName = agentProfile[0].full_name;
        }

        for (const broker of brokers) {
          if (broker.auth_user_id) {
            await sql`
              INSERT INTO notifications ${sql({
                user_id: broker.auth_user_id,
                title: '🏢 Desarrollo por aprobar',
                message: `${agentName} ha enviado el desarrollo "${title}" para aprobación.`,
                link: '/oficina?tab=propiedades'
              })}
            `;
          }
        }
      }
    } catch (e) {
      console.error('Failed to notify brokers about development approval:', e);
    }
  }

  return development;
}

export async function deleteDevelopment(id) {
  await sql`
    DELETE FROM developments
    WHERE id = ${id}
  `;
  return true;
}
