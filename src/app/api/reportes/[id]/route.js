import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDevelopmentMinimal } from '@/lib/dal/developments';

/* ═══════════════════════════════════════════════════════════════
   REPORT DATA API — /api/reportes/[id]
   Public endpoint — no auth required (report is shared via link)
   
   Query params:
     start=YYYY-MM-DD  (date range start)
     end=YYYY-MM-DD    (date range end)
   ═══════════════════════════════════════════════════════════════ */

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const supabase = await createClient();

    // 1. Fetch development
    let dev = null;
    try {
      dev = await getDevelopmentMinimal(id, supabase);
    } catch (devErr) {
      return NextResponse.json({ success: false, error: 'Development not found' }, { status: 404 });
    }

    // 2. Fetch page views from listing_page_views
    const viewsQuery = supabase
      .from('listing_page_views')
      .select('viewed_at, referrer, device_type, session_id, property_id')
      .eq('development_id', id)
      .order('viewed_at', { ascending: false })
      .limit(10000);

    if (start) viewsQuery.gte('viewed_at', start + 'T00:00:00Z');
    if (end) viewsQuery.lte('viewed_at', end + 'T23:59:59Z');

    const { data: pageViews } = await viewsQuery;

    // 3. Fetch property inquiries (leads)
    const inqQuery = supabase
      .from('property_inquiries')
      .select('id, status, received_at, source')
      .eq('development_id', id)
      .order('received_at', { ascending: false });

    if (start) inqQuery.gte('received_at', start + 'T00:00:00Z');

    const { data: inquiries } = await inqQuery;

    // 4. Fetch properties tied to this development
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title_es, title_en, name, status, sold_price, sold_date, buyer_name, price, listing_title_es, listing_title_en')
      .eq('development_id', id);

    const allProps = properties || [];
    const startDate = start || '2000-01-01';

    const reservations = allProps.filter(p =>
      ['pending_approval', 'approved'].includes(p.status)
    );
    const sales = allProps.filter(p =>
      p.status === 'sold' && (p.sold_date || '') >= startDate
    );

    // 5. Compute metrics
    const views = pageViews || [];
    const totalViews = views.length;
    const uniqueSessions = new Set(views.map(v => v.session_id).filter(Boolean)).size;
    const uniqueVisitors = uniqueSessions || Math.max(Math.round(totalViews * 0.65), totalViews > 0 ? 1 : 0);

    // Traffic sources
    const sourceCounts = {};
    views.forEach(v => {
      if (!v.referrer) return;
      try {
        const host = new URL(v.referrer).hostname.replace('www.', '');
        sourceCounts[host] = (sourceCounts[host] || 0) + 1;
      } catch {
        sourceCounts[v.referrer] = (sourceCounts[v.referrer] || 0) + 1;
      }
    });
    const topReferrers = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([source, count]) => ({
        source,
        count,
        pct: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
      }));

    // Device breakdown
    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    views.forEach(v => {
      const d = v.device_type || 'unknown';
      if (deviceCounts[d] !== undefined) deviceCounts[d]++;
      else deviceCounts.unknown++;
    });
    const deviceTotal = Object.values(deviceCounts).reduce((a, b) => a + b, 0) || 1;
    const deviceBreakdown = Object.entries(deviceCounts)
      .filter(([, c]) => c > 0)
      .map(([type, count]) => ({ type, count, pct: Math.round((count / deviceTotal) * 100) }));

    // Top listings by property_id clicks (no event_type on listing_page_views, so use property_id)
    const propClickCounts = {};
    views.filter(v => v.property_id).forEach(v => {
      propClickCounts[v.property_id] = (propClickCounts[v.property_id] || 0) + 1;
    });
    const topListings = Object.entries(propClickCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([propId, views]) => {
        const prop = allProps.find(p => p.id === propId);
        return {
          id: propId,
          views,
          title_es: prop?.listing_title_es || prop?.title_es || prop?.name || 'Unknown',
          title_en: prop?.listing_title_en || prop?.title_en || prop?.name || 'Unknown',
        };
      });

    // Daily chart data
    const dailyMap = {};
    views.forEach(v => {
      const d = (v.viewed_at || '').split('T')[0];
      if (d) dailyMap[d] = (dailyMap[d] || 0) + 1;
    });

    const salesVolume = sales.reduce((s, p) => s + (Number(p.sold_price) || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        dev,
        metrics: { totalViews, uniqueVisitors },
        topReferrers,
        deviceBreakdown,
        topListings,
        dailyMap,
        inquiries: (inquiries || []).map(i => ({ id: i.id, status: i.status, date: i.received_at, source: i.source })),
        reservations: reservations.map(p => ({
          id: p.id, price: p.price,
          name_es: p.listing_title_es || p.title_es || p.name,
          name_en: p.listing_title_en || p.title_en || p.name,
        })),
        sales: sales.map(p => ({
          id: p.id, sold_price: p.sold_price, sold_date: p.sold_date,
          name_es: p.listing_title_es || p.title_es || p.name,
          name_en: p.listing_title_en || p.title_en || p.name,
        })),
        salesVolume,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err) {
    console.error('Reportes API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
