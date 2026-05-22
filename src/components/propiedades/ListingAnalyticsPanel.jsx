"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { getListingDailyStats, getListingPageViewsReferrers, getListingLeadsCount } from '@/lib/dal/analytics';

/* ═══════════════════════════════════════════════════════════════
   LISTING ANALYTICS PANEL
   Per-listing analytics shown on the property detail page.
   Displays views (7d/30d/all), unique visitors, avg duration,
   device breakdown, top referrers, and leads count.
   ═══════════════════════════════════════════════════════════════ */

export default function ListingAnalyticsPanel({ propertyId, developmentId }) {
  const { lang } = useApp();
  const [stats, setStats] = useState({ views7d: 0, views30d: 0, viewsAll: 0, uniqueAll: 0, avgDuration: 0, mobile: 0, desktop: 0, leads: 0 });
  const [dailyData, setDailyData] = useState([]);
  const [topReferrers, setTopReferrers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId && !developmentId) return;

    const loadStats = async () => {
      try {
        const now = new Date();
        const d7 = new Date(now - 7 * 86400000).toISOString().split('T')[0];
        const d30 = new Date(now - 30 * 86400000).toISOString().split('T')[0];

        // Get daily stats
        const daily = await getListingDailyStats(propertyId, developmentId);
        setDailyData(daily || []);

        // Calculate aggregated stats
        const all = daily || [];
        const last7 = all.filter(d => d.stat_date >= d7);
        const last30 = all.filter(d => d.stat_date >= d30);

        setStats({
          views7d: last7.reduce((s, d) => s + (d.total_views || 0), 0),
          views30d: last30.reduce((s, d) => s + (d.total_views || 0), 0),
          viewsAll: all.reduce((s, d) => s + (d.total_views || 0), 0),
          uniqueAll: all.reduce((s, d) => s + (d.unique_visitors || 0), 0),
          avgDuration: all.length > 0
            ? Math.round(all.reduce((s, d) => s + (d.avg_duration_seconds || 0), 0) / all.length)
            : 0,
          mobile: all.length > 0
            ? Math.round(all.reduce((s, d) => s + (Number(d.mobile_pct) || 0), 0) / all.length)
            : 0,
          desktop: all.length > 0
            ? Math.round(all.reduce((s, d) => s + (Number(d.desktop_pct) || 0), 0) / all.length)
            : 0,
        });

        // Top referrers from raw views (last 30 days)
        const refs = await getListingPageViewsReferrers(propertyId, developmentId, d30);
        if (refs) {
          const counts = {};
          refs.forEach(r => {
            try {
              const host = new URL(r.referrer).hostname.replace('www.', '');
              counts[host] = (counts[host] || 0) + 1;
            } catch { counts[r.referrer] = (counts[r.referrer] || 0) + 1; }
          });
          setTopReferrers(
            Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([source, count]) => ({ source, count }))
          );
        }

        // Leads count
        if (propertyId) {
          const count = await getListingLeadsCount(propertyId);
          setStats(prev => ({ ...prev, leads: count || 0 }));
        }
      } catch (err) {
        console.error('Analytics load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [propertyId, developmentId]);

  if (loading) return null;
  if (stats.viewsAll === 0 && dailyData.length === 0) return null;

  const formatDuration = (s) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  // Mini sparkline (last 14 days)
  const sparkData = dailyData.slice(0, 14).reverse();
  const maxViews = Math.max(...sparkData.map(d => d.total_views || 0), 1);

  return (
    <div className="space-y-3">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{stats.views7d}</p>
          <p className="text-[8px] text-slate-400 uppercase font-bold">7 {lang === 'en' ? 'days' : 'días'}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{stats.views30d}</p>
          <p className="text-[8px] text-slate-400 uppercase font-bold">30 {lang === 'en' ? 'days' : 'días'}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">{stats.viewsAll}</p>
          <p className="text-[8px] text-slate-400 uppercase font-bold">{lang === 'en' ? 'Total' : 'Total'}</p>
        </div>
      </div>

      {/* Sparkline */}
      {sparkData.length > 1 && (
        <div className="flex items-end gap-0.5 h-8">
          {sparkData.map((d, i) => (
            <div
              key={i}
              className="flex-1 bg-blue-400/40 dark:bg-blue-500/30 rounded-sm transition-all hover:bg-blue-500"
              style={{ height: `${Math.max(((d.total_views || 0) / maxViews) * 100, 4)}%` }}
              title={`${d.stat_date}: ${d.total_views} views`}
            />
          ))}
        </div>
      )}

      {/* Detail rows */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">{lang === 'en' ? 'Unique Visitors' : 'Visitantes Únicos'}</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">{stats.uniqueAll}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{lang === 'en' ? 'Avg. Time' : 'Tiempo Prom.'}</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">{formatDuration(stats.avgDuration)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{lang === 'en' ? 'Device' : 'Dispositivo'}</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            📱 {stats.mobile}% · 🖥️ {stats.desktop}%
          </span>
        </div>
        {stats.leads > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-400">{lang === 'en' ? 'Leads' : 'Consultas'}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.leads}</span>
          </div>
        )}
      </div>

      {/* Top Referrers */}
      {topReferrers.length > 0 && (
        <div>
          <p className="text-[8px] text-slate-400 uppercase font-bold mb-1">{lang === 'en' ? 'Top Sources' : 'Top Fuentes'}</p>
          <div className="space-y-1">
            {topReferrers.map((r, i) => (
              <div key={i} className="flex justify-between text-[10px]">
                <span className="text-slate-500 truncate max-w-[70%]">{r.source}</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
