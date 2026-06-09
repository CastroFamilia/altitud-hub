import sql from '@/lib/db';

export async function getAcmsByContactId(contactId) {
  try {
    const data = await sql`
      SELECT id, property_address, created_at, suggested_price, status 
      FROM acm_reports 
      WHERE contact_id = ${contactId} 
      ORDER BY created_at DESC
    `;
    return data;
  } catch (error) {
    throw error;
  }
}

export async function getAcmsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  try {
    const data = await sql`
      SELECT * 
      FROM acm_reports 
      WHERE id IN ${sql(ids)}
    `;
    return data;
  } catch (error) {
    throw error;
  }
}
