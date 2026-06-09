import sql from '@/lib/db';

// --- Properties ---

export async function getSyncLogs() {
  try {
    const data = await sql`
      SELECT *
      FROM sync_logs
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return data;
  } catch (err) {
    console.error('Error fetching sync logs:', err.message);
    return [];
  }
}

export async function getPropertyDetails(id) {
  const data = await sql`
    SELECT 
      p.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'image_url', pi.image_url,
            'thumbnail_url', pi.thumbnail_url,
            'priority', pi.priority,
            'drive_file_id', pi.drive_file_id
          )
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) as property_images
    FROM properties p
    LEFT JOIN property_images pi ON p.id = pi.property_id
    WHERE p.id = ${id}
    GROUP BY p.id
  `;
  if (!data || data.length === 0) return null;
  return data[0];
}

export async function getPropertiesWithDriveFolders() {
  const data = await sql`
    SELECT 
      p.id, p.name, p.listing_title_es, p.listing_title_en,
      p.unparsed_address, p.owner_name, p.agent_id,
      p.drive_photos_folder_id, p.drive_photos_folder_url,
      p.photos_ready, p.status, p.created_at,
      COALESCE(
        json_agg(
          json_build_object('id', pi.id)
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) as property_images
    FROM properties p
    LEFT JOIN property_images pi ON p.id = pi.property_id
    WHERE p.drive_photos_folder_id IS NOT NULL
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  return data;
}

export async function updateProperty(id, updates) {
  await sql`
    UPDATE properties
    SET ${sql(updates)}
    WHERE id = ${id}
  `;

  // Notify brokers if status is pending_approval
  if (updates && updates.status === 'pending_approval') {
    try {
      const props = await sql`
        SELECT name, listing_title_es, listing_title_en, agent_id, office_code
        FROM properties
        WHERE id = ${id}
      `;
      const prop = props[0];
      
      if (prop) {
        const title = prop.listing_title_es || prop.listing_title_en || prop.name || 'Propiedad sin título';
        const officeId = prop.office_code?.toLowerCase()?.includes('cero') || prop.office_code === 'R0700151' ? 'cero' : 'altitud';
        
        const brokers = await sql`
          SELECT auth_user_id
          FROM profiles
          WHERE role = 'broker' AND office = ${officeId}
        `;
        
        if (brokers && brokers.length > 0) {
          let agentName = 'Un agente';
          if (prop.agent_id) {
            const agentProfile = await sql`
              SELECT full_name
              FROM profiles
              WHERE auth_user_id = ${prop.agent_id}
            `;
            if (agentProfile[0]?.full_name) agentName = agentProfile[0].full_name;
          }

          for (const broker of brokers) {
            if (broker.auth_user_id) {
              await sql`
                INSERT INTO notifications (user_id, title, message, link)
                VALUES (
                  ${broker.auth_user_id},
                  '🏠 Propiedad por aprobar',
                  ${agentName + ' ha enviado la propiedad "' + title + '" para aprobación.'},
                  '/oficina?tab=propiedades'
                )
              `;
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to notify brokers about property approval:', e);
    }
  }
}

export async function getPropertiesForApproval() {
  const data = await sql`
    SELECT 
      p.*,
      COALESCE(
        json_agg(
          json_build_object(
            'image_url', pi.image_url,
            'priority', pi.priority
          )
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) as property_images
    FROM properties p
    LEFT JOIN property_images pi ON p.id = pi.property_id
    GROUP BY p.id
    ORDER BY p.submitted_at DESC NULLS LAST
  `;
  return data;
}

export async function getPropertiesByDevelopmentId(devId) {
  const data = await sql`
    SELECT id, title_es, title_en, property_type, size_m2, price, status, main_image_url
    FROM properties
    WHERE development_id = ${devId}
  `;
  return data;
}

export async function getUnlinkedProperties() {
  const data = await sql`
    SELECT id, title_es, title_en, property_type, status
    FROM properties
    WHERE development_id IS NULL
  `;
  return data;
}

// --- Images ---

export async function deletePropertyImage(imageId) {
  await sql`
    DELETE FROM property_images
    WHERE id = ${imageId}
  `;
}

export async function getPropertiesByContactId(contactId) {
  const data = await sql`
    SELECT *
    FROM properties
    WHERE contact_id = ${contactId}
    ORDER BY created_at DESC
  `;
  return data;
}

export async function getPropertiesByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const data = await sql`
    SELECT *
    FROM properties
    WHERE id IN ${sql(ids)}
  `;
  return data;
}

// --- Syndications & Inquiries ---

export async function getPropertySyndications(propertyId) {
  const data = await sql`
    SELECT *
    FROM property_syndication
    WHERE property_id = ${propertyId}
  `;
  return data;
}

export async function upsertPropertySyndication({ property_id, portal_name, portal_listing_url, status }) {
  const finalStatus = status || 'synced';
  const publishedAt = finalStatus === 'synced' ? new Date().toISOString() : null;
  const data = await sql`
    INSERT INTO property_syndication (property_id, portal_name, portal_listing_url, status, published_at)
    VALUES (${property_id}, ${portal_name}, ${portal_listing_url}, ${finalStatus}, ${publishedAt})
    ON CONFLICT (property_id, portal_name) 
    DO UPDATE SET 
      portal_listing_url = EXCLUDED.portal_listing_url,
      status = EXCLUDED.status,
      published_at = EXCLUDED.published_at
    RETURNING *
  `;
  return data[0];
}

export async function getPropertyInquiries(propertyId) {
  const data = await sql`
    SELECT id, portal_name, status
    FROM property_inquiries
    WHERE property_id = ${propertyId}
  `;
  return data;
}

export async function getInquiriesByContactId(contactId) {
  const data = await sql`
    SELECT *
    FROM property_inquiries
    WHERE contact_id = ${contactId}
    ORDER BY inquiry_date DESC
  `;
  return data;
}

export async function insertPropertyInquiry(inquiryData) {
  const data = await sql`
    INSERT INTO property_inquiries ${sql(inquiryData)}
    RETURNING *
  `;
  return data[0];
}

// --- Milestones ---

export async function getListingMilestone(propertyId) {
  const data = await sql`
    SELECT *
    FROM listing_milestones
    WHERE property_id = ${propertyId}
  `;
  return data[0] || null;
}

export async function upsertListingMilestone(milestoneUpdate) {
  const keysToUpdate = Object.keys(milestoneUpdate).filter(k => k !== 'property_id');
  if (keysToUpdate.length > 0) {
    await sql`
      INSERT INTO listing_milestones ${sql(milestoneUpdate)}
      ON CONFLICT (property_id) DO UPDATE SET ${sql(milestoneUpdate, keysToUpdate)}
    `;
  } else {
    await sql`
      INSERT INTO listing_milestones ${sql(milestoneUpdate)}
      ON CONFLICT (property_id) DO NOTHING
    `;
  }
}

export async function insertProperty(payload) {
  const data = await sql`
    INSERT INTO properties ${sql(payload)}
    RETURNING *
  `;
  const property = data[0];

  if (property && property.status === 'pending_approval') {
    try {
      const title = property.listing_title_es || property.listing_title_en || property.name || 'Propiedad sin título';
      const officeId = property.office_code?.toLowerCase()?.includes('cero') || property.office_code === 'R0700151' ? 'cero' : 'altitud';
      
      const brokers = await sql`
        SELECT auth_user_id
        FROM profiles
        WHERE role = 'broker' AND office = ${officeId}
      `;
      
      if (brokers && brokers.length > 0) {
        let agentName = 'Un agente';
        if (property.agent_id) {
          const agentProfile = await sql`
            SELECT full_name
            FROM profiles
            WHERE auth_user_id = ${property.agent_id}
          `;
          if (agentProfile[0]?.full_name) agentName = agentProfile[0].full_name;
        }

        for (const broker of brokers) {
          if (broker.auth_user_id) {
            await sql`
              INSERT INTO notifications (user_id, title, message, link)
              VALUES (
                ${broker.auth_user_id},
                '🏠 Propiedad por aprobar',
                ${agentName + ' ha enviado la propiedad "' + title + '" para aprobación.'},
                '/oficina?tab=propiedades'
              )
            `;
          }
        }
      }
    } catch (e) {
      console.error('Failed to notify brokers about new property approval:', e);
    }
  }

  return property;
}
