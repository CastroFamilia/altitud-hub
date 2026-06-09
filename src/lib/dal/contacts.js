"use server";
import sql from '@/lib/db';
export async function getContacts(userId) {
  const data = await sql`
    SELECT *
    FROM contacts
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return data;
}

export async function getLeadsAsContacts(agentProfileId) {
  try {
    const data = await sql`
      SELECT 
        id, 
        name as first_name, 
        '' as last_name, 
        email, 
        phone, 
        intent as type, 
        'Web: ' || source as lead_origin, 
        'B' as contact_classification,
        created_at 
      FROM leads
      WHERE assigned_agent_id = ${agentProfileId}
      ORDER BY created_at DESC
    `;
    return data;
  } catch (err) {
    console.error('Error fetching leads:', err.message);
    return [];
  }
}

export async function getContactDetails(id) {
  const data = await sql`
    SELECT *
    FROM contacts
    WHERE id = ${id}
  `;
  return data[0] || null;
}

export async function insertContact(contactData) {
  const data = await sql`
    INSERT INTO contacts ${sql(contactData)}
    RETURNING *
  `;
  return data[0];
}

export async function updateContact(id, updates) {
  const data = await sql`
    UPDATE contacts
    SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING *
  `;
  return data[0];
}

export async function insertMultipleContacts(contactsData) {
  if (!contactsData || contactsData.length === 0) return [];
  const data = await sql`
    INSERT INTO contacts ${sql(contactsData)}
    RETURNING *
  `;
  return data;
}

export async function getAllContactsMinimal() {
  const data = await sql`
    SELECT id, first_name, last_name, type
    FROM contacts
    ORDER BY first_name ASC
  `;
  return data;
}

export async function getNewsletterSubscribers() {
  const data = await sql`
    SELECT first_name, last_name, email, phone, type, primary_language
    FROM contacts
    WHERE newsletter_opt_in = true
    ORDER BY first_name ASC
  `;
  return data;
}

export async function getContactsForAlerts(userId) {
  const data = await sql`
    SELECT id, first_name, last_name, birth_date, move_in_date
    FROM contacts
    WHERE user_id = ${userId} AND status = 'active'
  `;
  return data;
}

// --- Property Inquiries ---

export async function getAgentActiveInquiries(agentId) {
  const inquiries = await sql`
    SELECT *
    FROM property_inquiries
    WHERE assigned_agent_id = ${agentId}
      AND status IN ('new', 'contacted', 'prelisting', 'cma')
    ORDER BY assigned_at DESC
  `;
  if (!inquiries || inquiries.length === 0) return [];

  const propertyIds = [...new Set(inquiries.map(i => i.property_id).filter(Boolean))];
  
  let propertiesMap = {};
  if (propertyIds.length > 0) {
    const properties = await sql`
      SELECT id, listing_title_es, listing_title_en, name
      FROM properties
      WHERE id IN ${sql(propertyIds)}
    `;
    properties.forEach(p => {
      propertiesMap[p.id] = p;
    });
  }

  return inquiries.map(inquiry => ({
    ...inquiry,
    properties: inquiry.property_id ? (propertiesMap[inquiry.property_id] || null) : null
  }));
}

export async function updatePropertyInquiry(id, updates) {
  const data = await sql`
    UPDATE property_inquiries
    SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING *
  `;
  return data[0] || null;
}

// --- Lead Communications ---

export async function insertLeadCommunication(commData) {
  const data = await sql`
    INSERT INTO lead_communications ${sql(commData)}
    RETURNING *
  `;
  return data[0];
}

export async function insertLeadFollowUp(followUpData) {
  const data = await sql`
    INSERT INTO lead_follow_ups ${sql(followUpData)}
    RETURNING *
  `;
  return data[0];
}

export async function getAllInquiries() {
  const inquiries = await sql`
    SELECT *
    FROM property_inquiries
    ORDER BY created_at DESC
  `;
  if (!inquiries || inquiries.length === 0) return [];

  const propertyIds = [...new Set(inquiries.map(i => i.property_id).filter(Boolean))];
  
  let propertiesMap = {};
  if (propertyIds.length > 0) {
    const properties = await sql`
      SELECT id, name, listing_title_es, listing_title_en
      FROM properties
      WHERE id IN ${sql(propertyIds)}
    `;
    properties.forEach(p => {
      propertiesMap[p.id] = p;
    });
  }

  return inquiries.map(inquiry => ({
    ...inquiry,
    properties: inquiry.property_id ? (propertiesMap[inquiry.property_id] || null) : null
  }));
}

export async function getLeadSources() {
  const data = await sql`
    SELECT *
    FROM lead_sources
    WHERE active = true
    ORDER BY sort_order ASC
  `;
  return data;
}

export async function getLeadCommunications() {
  const data = await sql`
    SELECT *
    FROM lead_communications
    ORDER BY created_at DESC
  `;
  return data;
}

export async function getPendingLeadFollowUps() {
  const data = await sql`
    SELECT 
      l.*,
      CASE WHEN p.id IS NOT NULL THEN
        json_build_object('lead_name', p.lead_name)
      ELSE
        null
      END as property_inquiries
    FROM lead_follow_ups l
    LEFT JOIN property_inquiries p ON p.id = l.inquiry_id
    WHERE l.status = 'pending'
    ORDER BY l.due_date ASC
  `;
  return data;
}
