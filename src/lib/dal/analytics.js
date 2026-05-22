import { supabase } from '@/lib/supabase';

export async function getListingDailyStats(propertyId, developmentId) {
  let query = supabase
    .from('listing_daily_stats')
    .select('*')
    .order('stat_date', { ascending: false })
    .limit(90);

  if (propertyId) query = query.eq('property_id', propertyId);
  if (developmentId) query = query.eq('development_id', developmentId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getListingPageViewsReferrers(propertyId, developmentId, sinceDate) {
  let query = supabase
    .from('listing_page_views')
    .select('referrer')
    .gte('viewed_at', sinceDate + 'T00:00:00Z')
    .not('referrer', 'is', null)
    .limit(200);

  if (propertyId) query = query.eq('property_id', propertyId);
  if (developmentId) query = query.eq('development_id', developmentId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getListingLeadsCount(propertyId) {
  const { count, error } = await supabase
    .from('property_inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('reconnect_listing_id', propertyId);

  if (error) throw error;
  return count;
}
