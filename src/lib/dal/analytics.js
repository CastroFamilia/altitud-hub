import sql from '@/lib/db';

export async function getListingDailyStats(propertyId, developmentId) {
  let query = sql`SELECT * FROM listing_daily_stats WHERE 1=1`;
  if (propertyId) query = sql`${query} AND property_id = ${propertyId}`;
  if (developmentId) query = sql`${query} AND development_id = ${developmentId}`;
  
  query = sql`${query} ORDER BY stat_date DESC LIMIT 90`;
  return await query;
}

export async function getListingPageViewsReferrers(propertyId, developmentId, sinceDate) {
  let query = sql`
    SELECT referrer 
    FROM page_events 
    WHERE created_at >= ${sinceDate + 'T00:00:00Z'} 
    AND event_type = 'page_view'
    AND referrer IS NOT NULL
  `;
  
  if (propertyId) query = sql`${query} AND property_id = ${propertyId}`;
  if (developmentId) query = sql`${query} AND development_id = ${developmentId}`;
  
  query = sql`${query} LIMIT 200`;
  return await query;
}

export async function getListingLeadsCount(propertyId) {
  const data = await sql`
    SELECT count(*) as count 
    FROM property_inquiries 
    WHERE reconnect_listing_id = ${propertyId}
  `;
  return parseInt(data[0].count, 10);
}
