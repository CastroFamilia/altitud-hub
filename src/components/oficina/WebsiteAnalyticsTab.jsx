"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/context';

/* ═══════════════════════════════════════════════════════════════
   WEBSITE ANALYTICS TAB — Broker Dashboard
   Aggregates page views, visitors, devices, referrers, and
   per-listing performance across all properties & developments.
   ═══════════════════════════════════════════════════════════════ */

const RANGE_OPTIONS = [
  { key: '7d',  days: 7 },
  { key: '30d', days: 30 },
  { key: '90d', days: 90 },
  { key: 'all', days: 365 },
];

export default function WebsiteAnalyticsTab({ properties = [], developments = [] }) {
  const { t, lang } = useApp();
  const [range, setRange] = useState('30d');
  const [dailyStats, setDailyStats] = useState([]);
  const [rawViews, setRawViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aggregating, setAggregating] = useState(false);

  const rangeDays = RANGE_OPTIONS.find(r => r.key === range)?.days || 30;
  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    return d.toISOString().split('T')[0];
  }, [rangeDays]);

  // Fetch data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: daily }, { data: views }] = await Promise.all([
        supabase
          .from('listing_daily_stats')
          .select('*')
          .gte('stat_date', startDate)
          .order('stat_date', { ascending: false }),
        supabase
          .from('listing_page_views')
          .select('property_id, development_id, referrer, device_type, viewed_at, duration_seconds, session_id')
          .gte('viewed_at', startDate + 'T00:00:00Z')
          .order('viewed_at', { ascending: false })
          .limit(5000),
      ]);
      setDailyStats(daily || []);
      setRawViews(views || []);
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  // Trigger aggregation
  const handleAggregate = async () => {
    setAggregating(true);
    try {
      const res = await fetch('/api/public/analytics/aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: rangeDays }),
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error('Aggregation error:', err);
    } finally {
      setAggregating(false);
    }
  };

  // ── Computed Metrics ──
  const metrics = useMemo(() => {
    const totalViews = dailyStats.reduce((s, d) => s + (d.total_views || 0), 0);
    const totalUnique = dailyStats.reduce((s, d) => s + (d.unique_visitors || 0), 0);
    const avgDuration = dailyStats.length > 0
      ? Math.round(dailyStats.reduce((s, d) => s + (d.avg_duration_seconds || 0), 0) / dailyStats.length)
      : 0;
    const mobilePct = dailyStats.length > 0
      ? Math.round(dailyStats.reduce((s, d) => s + (Number(d.mobile_pct) || 0), 0) / dailyStats.length)
      : 0;
    return { totalViews, totalUnique, avgDuration, mobilePct, desktopPct: 100 - mobilePct };
  }, [dailyStats]);

  // ── Daily chart data (last N days, filled gaps) ──
  const chartData = useMemo(() => {
    const days = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    const statsByDate = {};
    dailyStats.forEach(s => {
      if (!statsByDate[s.stat_date]) statsByDate[s.stat_date] = { views: 0, unique: 0 };
      statsByDate[s.stat_date].views += s.total_views || 0;
      statsByDate[s.stat_date].unique += s.unique_visitors || 0;
    });
    return days.map(date => ({
      date,
      views: statsByDate[date]?.views || 0,
      unique: statsByDate[date]?.unique || 0,
    }));
  }, [dailyStats, rangeDays]);

  const maxViews = Math.max(...chartData.map(d => d.views), 1);

  // ── Top referrers ──
  const topReferrers = useMemo(() => {
    const counts = {};
    rawViews.forEach(v => {
      if (!v.referrer) return;
      try {
        const host = new URL(v.referrer).hostname.replace('www.', '');
        counts[host] = (counts[host] || 0) + 1;
      } catch {
        counts[v.referrer] = (counts[v.referrer] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([source, count]) => ({ source, count, pct: Math.round((count / (rawViews.length || 1)) * 100) }));
  }, [rawViews]);

  // ── Top listings by views ──
  const topListings = useMemo(() => {
    const propMap = {};
    properties.forEach(p => { propMap[p.id] = lang === 'es' ? (p.listing_title_es || p.name) : (p.listing_title_en || p.name); });
    const devMap = {};
    (developments || []).forEach(d => { devMap[d.id] = d.name; });

    const counts = {};
    dailyStats.forEach(s => {
      const key = s.property_id || s.development_id;
      if (!key) return;
      if (!counts[key]) counts[key] = { id: key, views: 0, unique: 0, type: s.property_id ? 'property' : 'development' };
      counts[key].views += s.total_views || 0;
      counts[key].unique += s.unique_visitors || 0;
    });

    return Object.values(counts)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map(item => ({
        ...item,
        name: item.type === 'property' ? (propMap[item.id] || t('ofc_wa_unknown_property')) : (devMap[item.id] || t('ofc_wa_unknown_dev')),
      }));
  }, [dailyStats, properties, developments, lang, t]);

  // ── Device breakdown ──
  const deviceBreakdown = useMemo(() => {
    const counts = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    rawViews.forEach(v => { counts[v.device_type] = (counts[v.device_type] || 0) + 1; });
    const total = rawViews.length || 1;
    return [
      { type: '🖥️ Desktop', count: counts.desktop, pct: Math.round((counts.desktop / total) * 100) },
      { type: '📱 Mobile', count: counts.mobile, pct: Math.round((counts.mobile / total) * 100) },
      { type: '📋 Tablet', count: counts.tablet, pct: Math.round((counts.tablet / total) * 100) },
    ].filter(d => d.count > 0);
  }, [rawViews]);

  // ── Helpers ──
  const formatDuration = (s) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const formatDate = (d) => {
    const date = new Date(d + 'T12:00:00');
    return date.toLocaleDateString(lang === 'es' ? 'es-CR' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const isEmpty = metrics.totalViews === 0 && rawViews.length === 0;

  return (
    <div className="space-y-6">
      {/* ── Header Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Range Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-900/50 rounded-xl p-1">
          {RANGE_OPTIONS.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                range === r.key
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {r.key === 'all' ? t('ofc_wa_range_all') : `${r.days}${t('ofc_wa_range_days')}`}
            </button>
          ))}
        </div>

        {/* Aggregate Button */}
        <button
          onClick={handleAggregate}
          disabled={aggregating}
          className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {aggregating ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('ofc_wa_aggregating')}
            </>
          ) : (
            <>
              <span>🔄</span> {t('ofc_wa_refresh')}
            </>
          )}
        </button>
      </div>

      {/* ── Empty State ── */}
      {!loading && isEmpty ? (
        <div className="text-center py-16 space-y-4">
          <div className="text-6xl">📊</div>
          <h3 className="text-lg font-black italic text-slate-900 dark:text-white">
            {t('ofc_wa_empty_title')}
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {t('ofc_wa_empty_desc')}
          </p>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 max-w-lg mx-auto text-left mt-6 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-3">{t('ofc_wa_embed_title')}</p>
            <code className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 block whitespace-pre-wrap break-all font-mono">
{`<script
  src="https://hub.remax-altitud.cr/tracker/altitud-tracker.js"
  data-hub-url="https://hub.remax-altitud.cr"
  data-property-id="PROPERTY_UUID"
  async></script>`}
            </code>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-nexus-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: t('ofc_wa_total_views'), val: metrics.totalViews.toLocaleString(), color: 'text-slate-900 dark:text-white', icon: '👁️' },
              { label: t('ofc_wa_unique_visitors'), val: metrics.totalUnique.toLocaleString(), color: 'text-blue-500', icon: '👤' },
              { label: t('ofc_wa_avg_time'), val: formatDuration(metrics.avgDuration), color: 'text-emerald-500', icon: '⏱️' },
              { label: t('ofc_wa_mobile'), val: `${metrics.mobilePct}%`, color: 'text-purple-500', icon: '📱' },
              { label: t('ofc_wa_desktop'), val: `${metrics.desktopPct}%`, color: 'text-amber-500', icon: '🖥️' },
            ].map((s, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 group hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{s.icon}</span>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{s.label}</p>
                </div>
                <p className={`text-2xl font-black italic tabular-nums ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* ── Views Chart ── */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{t('ofc_wa_views_over_time')}</h4>
              <span className="text-[10px] text-slate-400 font-bold">{chartData.reduce((s, d) => s + d.views, 0).toLocaleString()} {t('ofc_wa_total_label')}</span>
            </div>

            {/* Bar Chart */}
            <div className="flex items-end gap-[2px] h-32">
              {chartData.map((d, i) => {
                const heightPct = Math.max((d.views / maxViews) * 100, 2);
                const showLabel = chartData.length <= 30 || i % Math.ceil(chartData.length / 15) === 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500 rounded-sm transition-all group-hover:from-blue-600 group-hover:to-blue-500 cursor-default relative"
                      style={{ height: `${heightPct}%`, minHeight: '2px' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-[9px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {formatDate(d.date)}: {d.views} {t('ofc_wa_views_label')}
                      </div>
                    </div>
                    {showLabel && (
                      <span className="text-[7px] text-slate-400 font-bold mt-0.5 whitespace-nowrap">
                        {new Date(d.date + 'T12:00:00').getDate()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Two-Column Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Top Listings */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>🏆</span> {t('ofc_wa_top_listings')}
              </h4>
              {topListings.length === 0 ? (
                <p className="text-xs text-slate-400 italic">{t('ofc_wa_no_listing_data')}</p>
              ) : (
                <div className="space-y-2">
                  {topListings.map((item, i) => {
                    const barWidth = Math.max((item.views / (topListings[0]?.views || 1)) * 100, 5);
                    return (
                      <div key={item.id} className="group">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-[10px] font-black w-5 text-right tabular-nums ${i < 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                            {i + 1}.
                          </span>
                          <span className="flex-1 text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                            {item.name}
                          </span>
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                            item.type === 'property'
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}>
                            {item.type === 'property' ? '🏠' : '🏗️'}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums w-12 text-right">{item.views}</span>
                        </div>
                        <div className="ml-8 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-700"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Traffic Sources + Devices */}
            <div className="space-y-4">
              {/* Top Referrers */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>🔗</span> {t('ofc_wa_traffic_sources')}
                </h4>
                {topReferrers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">{t('ofc_wa_no_referrer_data')}</p>
                ) : (
                  <div className="space-y-2.5">
                    {topReferrers.map((r, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 truncate flex-1 max-w-[60%]">{r.source}</span>
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                            style={{ width: `${r.pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 tabular-nums w-10 text-right">{r.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Device Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📱</span> {t('ofc_wa_devices')}
                </h4>
                {deviceBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">{t('ofc_wa_no_device_data')}</p>
                ) : (
                  <div className="space-y-3">
                    {deviceBreakdown.map((d, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{d.type}</span>
                          <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{d.pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              i === 0 ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                              : i === 1 ? 'bg-gradient-to-r from-purple-400 to-purple-600'
                              : 'bg-gradient-to-r from-amber-400 to-amber-600'
                            }`}
                            style={{ width: `${d.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Embed Code Snippet ── */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg">🧩</span>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{t('ofc_wa_embed_title')}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{t('ofc_wa_embed_desc')}</p>
              </div>
            </div>
            <code className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 block whitespace-pre-wrap break-all font-mono">
{`<script src="https://hub.remax-altitud.cr/tracker/altitud-tracker.js"
  data-hub-url="https://hub.remax-altitud.cr"
  data-property-id="YOUR_PROPERTY_UUID"
  async></script>`}
            </code>
          </div>
        </>
      )}
    </div>
  );
}
