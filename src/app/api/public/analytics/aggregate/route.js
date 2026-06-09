import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';

/* ═══════════════════════════════════════════════════════════════
   ANALYTICS AGGREGATION
   POST /api/public/analytics/aggregate
   
   Rolls up listing_page_views into listing_daily_stats.
   Can be triggered by Vercel Cron or manually by broker.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  const limited = rateLimit(req, { maxRequests: 2, keyPrefix: 'analytics-agg' });
  if (limited) return limited;

  try {
    const supabase = getSupabaseAdmin();
    const { days = 7 } = await req.json().catch(() => ({}));

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get all views grouped by property + date
    const { data: views, error } = await supabase
      .from('page_events')
      .select('property_id, development_id, event_meta, referrer, created_at')
      .eq('event_type', 'page_view')
      .gte('created_at', startDate + 'T00:00:00Z');

    if (error) throw error;
    if (!views || views.length === 0) {
      return NextResponse.json({ message: 'No views to aggregate', processed: 0 });
    }

    // Group by (property_id or development_id) + date
    const groups = {};

    for (const v of views) {
      const date = v.created_at.split('T')[0];
      const key = `${v.property_id || 'null'}_${v.development_id || 'null'}_${date}`;

      if (!groups[key]) {
        groups[key] = {
          property_id: v.property_id,
          development_id: v.development_id,
          stat_date: date,
          total_views: 0,
          unique_ips: new Set(),
          durations: [],
          referrers: {},
          mobile: 0,
          desktop: 0,
          tablet: 0,
        };
      }

      const g = groups[key];
      g.total_views++;
      const ipHash = v.event_meta?.ip_hash || null;
      if (ipHash) g.unique_ips.add(ipHash);
      const duration = v.event_meta?.duration_seconds || 0;
      if (duration > 0) g.durations.push(duration);
      if (v.referrer) g.referrers[v.referrer] = (g.referrers[v.referrer] || 0) + 1;
      const deviceType = v.event_meta?.device_type || 'desktop';
      if (deviceType === 'mobile') g.mobile++;
      else if (deviceType === 'tablet') g.tablet++;
      else g.desktop++;
    }

    // Upsert aggregated stats
    let processed = 0;

    for (const g of Object.values(groups)) {
      const avgDuration = g.durations.length > 0
        ? Math.round(g.durations.reduce((a, b) => a + b, 0) / g.durations.length)
        : 0;

      const topReferrer = Object.entries(g.referrers)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      const total = g.total_views || 1;

      const stat = {
        property_id: g.property_id,
        development_id: g.development_id,
        stat_date: g.stat_date,
        total_views: g.total_views,
        unique_visitors: g.unique_ips.size,
        avg_duration_seconds: avgDuration,
        top_referrer: topReferrer,
        mobile_pct: Math.round((g.mobile / total) * 100),
        desktop_pct: Math.round((g.desktop / total) * 100),
      };

      // Upsert based on property_id + stat_date or development_id + stat_date
      if (g.property_id) {
        const { data: existing } = await supabase
          .from('listing_daily_stats')
          .select('id')
          .eq('property_id', g.property_id)
          .eq('stat_date', g.stat_date)
          .single();

        if (existing) {
          await supabase.from('listing_daily_stats').update(stat).eq('id', existing.id);
        } else {
          await supabase.from('listing_daily_stats').insert(stat);
        }
      } else if (g.development_id) {
        const { data: existing } = await supabase
          .from('listing_daily_stats')
          .select('id')
          .eq('development_id', g.development_id)
          .eq('stat_date', g.stat_date)
          .single();

        if (existing) {
          await supabase.from('listing_daily_stats').update(stat).eq('id', existing.id);
        } else {
          await supabase.from('listing_daily_stats').insert(stat);
        }
      }

      processed++;
    }

    return NextResponse.json({
      success: true,
      processed,
      total_views: views.length,
      date_range: { from: startDate, to: new Date().toISOString().split('T')[0] },
    });
  } catch (err) {
    console.error('Aggregation error:', err);
    return NextResponse.json(
      { error: 'Aggregation failed: ' + err.message },
      { status: 500 }
    );
  }
}
