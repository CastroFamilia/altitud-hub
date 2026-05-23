"use client";

import { useState, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/lib/context';
import TopNav from '@/components/layout/TopNav';
import PropertyCard from '@/components/propiedades/PropertyCard';
import Link from 'next/link';
import dynamic from 'next/dynamic';

/* ═══════════════════════════════════════════════════════════════
   Mis Propiedades — Dashboard + Portfolio Intelligence
   ═══════════════════════════════════════════════════════════════ */

// Lazy-load the map component (SSR-incompatible)
const PortfolioMap = dynamic(() => import('./PortfolioMap'), { ssr: false });

import { PROPERTY_TYPES } from '@/lib/constants/property-constants';

const STATUS_TABS = [
  { key: 'all', labelEs: 'Todo', labelEn: 'All' },
  { key: 'draft', labelEs: 'Borrador', labelEn: 'Draft' },
  { key: 'pending_approval', labelEs: 'Pendiente', labelEn: 'Pending' },
  { key: 'needs_changes', labelEs: 'Cambios', labelEn: 'Changes' },
  { key: 'approved', labelEs: 'Aprobada', labelEn: 'Approved' },
  { key: 'published', labelEs: 'Publicada', labelEn: 'Published' },
  { key: 'sold', labelEs: 'Vendida', labelEn: 'Sold' },
];

function formatCurrency(value) {
  if (!value || value === 0) return '$0';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export default function PropiedadesClient({ initialProperties = [], isBroker = false }) {
  const { t, lang } = useApp();
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [activeTypeFilter, setActiveTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(true);

  // ── Computed data ──
  const activeProperties = useMemo(() =>
    initialProperties.filter(p => p.status !== 'cancelled'),
  [initialProperties]);

  // Build zone price averages for comparison
  const zonePriceMap = useMemo(() => {
    const map = {};
    for (const p of activeProperties) {
      if (!p.list_price || !p.property_type_id || !p.lot_size_area || Number(p.lot_size_area) <= 0) continue;
      const zone = p.location_id || p.state_dep_prov_id || 'general';
      const key = `${p.property_type_id}_${zone}`;
      const pricePerM2 = Number(p.list_price) / Number(p.lot_size_area);
      if (!map[key]) map[key] = { ppm2s: [], count: 0 };
      map[key].ppm2s.push(pricePerM2);
      map[key].count++;
    }
    for (const key of Object.keys(map)) {
      const ppm2s = map[key].ppm2s;
      map[key].avgPPM2 = Math.round(ppm2s.reduce((a, b) => a + b, 0) / ppm2s.length);
    }
    return map;
  }, [activeProperties]);

  // Filter pipeline
  const filtered = useMemo(() => {
    let list = activeProperties;

    if (activeStatusTab !== 'all') {
      list = list.filter(p => p.status === activeStatusTab);
    }
    if (activeTypeFilter !== 'all') {
      list = list.filter(p => String(p.property_type_id) === activeTypeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.listing_title_es || '').toLowerCase().includes(q) ||
        (p.listing_title_en || '').toLowerCase().includes(q) ||
        (p.unparsed_address || '').toLowerCase().includes(q) ||
        (p.owner_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeProperties, activeStatusTab, activeTypeFilter, searchQuery]);

  // ── KPI calculations ──
  const kpis = useMemo(() => {
    const published = activeProperties.filter(p => p.status === 'published');
    const withPrice = activeProperties.filter(p => p.list_price > 0);

    // Total portfolio value
    const totalValue = withPrice.reduce((s, p) => s + Number(p.list_price), 0);
    const avgValue = withPrice.length > 0 ? Math.round(totalValue / withPrice.length) : 0;

    // Type breakdown
    const byType = {};
    for (const p of activeProperties) {
      const tid = p.property_type_id || 0;
      if (!byType[tid]) byType[tid] = { count: 0, value: 0, prices: [] };
      byType[tid].count++;
      if (p.list_price > 0) {
        byType[tid].value += Number(p.list_price);
        byType[tid].prices.push(Number(p.list_price));
      }
    }
    for (const tid of Object.keys(byType)) {
      const prices = byType[tid].prices;
      byType[tid].avg = prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0;
    }

    // Commissions
    const totalCommission = withPrice.reduce((s, p) => {
      const listingSide = Number(p.listing_side_comm || 3) / 100;
      return s + (Number(p.list_price) * listingSide);
    }, 0);

    // Average days on market (published only)
    const now = Date.now();
    const domValues = published
      .filter(p => p.submitted_at)
      .map(p => Math.floor((now - new Date(p.submitted_at).getTime()) / (1000 * 60 * 60 * 24)));
    const avgDOM = domValues.length > 0
      ? Math.round(domValues.reduce((a, b) => a + b, 0) / domValues.length)
      : 0;

    // Status counts
    const statusCounts = {};
    for (const tab of STATUS_TABS) {
      statusCounts[tab.key] = tab.key === 'all'
        ? activeProperties.length
        : activeProperties.filter(p => p.status === tab.key).length;
    }

    return {
      totalValue, avgValue, byType, totalCommission, avgDOM,
      statusCounts,
      totalCount: activeProperties.length,
      publishedCount: published.length,
    };
  }, [activeProperties]);

  // ── Available property types for filter ──
  const availableTypes = useMemo(() => {
    const types = {};
    for (const p of activeProperties) {
      if (p.property_type_id && !types[p.property_type_id]) {
        types[p.property_type_id] = true;
      }
    }
    return Object.keys(types).sort((a, b) => Number(a) - Number(b));
  }, [activeProperties]);

  // Properties with coordinates for the map
  const mapProperties = useMemo(() =>
    filtered.filter(p => p.latitude && p.longitude),
  [filtered]);

  return (
    <>
      <TopNav titleKey="nav_properties" subtitleKey="nav_portfolio" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-[1400px] w-full mx-auto">

          {/* ═══ HEADER ═══ */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {t('auto_my_portfolio')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {isBroker
                  ? (t('auto_all_office_properties'))
                  : (t('auto_your_active_listings_and'))}
              </p>
            </div>
            <Link
              href="/propiedades/nueva"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              {t('prop_btn_new')}
            </Link>
          </div>

          {/* ═══ KPI DASHBOARD ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {/* Total Portfolio */}
            <div className="glass-panel rounded-2xl p-4 text-center col-span-2 md:col-span-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-brand-600/10 dark:from-brand-500/10 dark:to-brand-600/20" />
              <div className="relative">
                <p className="text-2xl font-black bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
                  {formatCurrency(kpis.totalValue)}
                </p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mt-1">
                  {t('auto_portfolio_value')}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{kpis.totalCount} {t('auto_properties')}</p>
              </div>
            </div>

            {/* Type breakdown cards */}
            {[3, 1, 4, 5].map(typeId => {
              const typeInfo = PROPERTY_TYPES[typeId];
              const data = kpis.byType[typeId] || { count: 0, value: 0, avg: 0 };
              if (!typeInfo) return null;
              return (
                <button
                  key={typeId}
                  onClick={() => setActiveTypeFilter(activeTypeFilter === String(typeId) ? 'all' : String(typeId))}
                  className={`glass-panel rounded-2xl p-4 text-center transition-all hover:shadow-md cursor-pointer ${
                    activeTypeFilter === String(typeId) ? 'ring-2 ring-brand-500 shadow-md' : ''
                  }`}
                >
                  <p className="text-lg mb-0.5">{typeInfo.icon}</p>
                  <p className={`text-lg font-black bg-gradient-to-r ${typeInfo.color} bg-clip-text text-transparent`}>
                    {data.count}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
                    {typeInfo[lang]}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatCurrency(data.avg)} {t('auto_avg')}</p>
                </button>
              );
            })}

            {/* Days on Market */}
            <div className="glass-panel rounded-2xl p-4 text-center">
              <p className="text-lg mb-0.5">⏱️</p>
              <p className={`text-lg font-black ${kpis.avgDOM > 120 ? 'text-red-500' : kpis.avgDOM > 60 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {kpis.avgDOM}d
              </p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
                {t('auto_avg_dom')}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{kpis.publishedCount} {t('auto_published')}</p>
            </div>
          </div>

          {/* ═══ COMMISSIONS + AVG ROW ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {/* Average values by type */}
            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-3">
                {t('auto_average_value_by_type')}
              </h3>
              <div className="space-y-2">
                {Object.entries(kpis.byType)
                  .filter(([_, d]) => d.count > 0 && d.avg > 0)
                  .sort(([, a], [, b]) => b.avg - a.avg)
                  .map(([tid, data]) => {
                    const typeInfo = PROPERTY_TYPES[tid];
                    const maxVal = Math.max(...Object.values(kpis.byType).map(d => d.avg || 0));
                    const pct = maxVal > 0 ? (data.avg / maxVal) * 100 : 0;
                    return (
                      <div key={tid} className="flex items-center gap-3">
                        <span className="text-sm w-6 text-center">{typeInfo?.icon || '🏠'}</span>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 w-20 shrink-0">
                          {typeInfo?.[lang] || `Tipo ${tid}`}
                        </span>
                        <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-dark-border overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${typeInfo?.color || 'from-gray-400 to-gray-500'} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-gray-700 dark:text-gray-300 w-16 text-right">
                          {formatCurrency(data.avg)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Commissions */}
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 dark:from-emerald-500/10 dark:to-emerald-600/15" />
              <div className="relative">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-3">
                  {t('auto_potential_commissions')}
                </h3>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">
                  {formatCurrency(kpis.totalCommission)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('auto_listing_side_commissions_on')}
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div>
                    <p className="text-sm font-black text-gray-700 dark:text-gray-300">{formatCurrency(kpis.avgValue)}</p>
                    <p className="text-[10px] text-gray-400">{t('auto_avg_price')}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-dark-border" />
                  <div>
                    <p className="text-sm font-black text-gray-700 dark:text-gray-300">
                      {kpis.totalCount > 0 ? formatCurrency(kpis.totalCommission / kpis.totalCount) : '$0'}
                    </p>
                    <p className="text-[10px] text-gray-400">{t('auto_avg_commission')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ MAP ═══ */}
          {mapProperties.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  {t('auto_map')} ({mapProperties.length})
                </h3>
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showMap ? (t('auto_hide')) : (t('auto_show'))}
                </button>
              </div>
              {showMap && (
                <div className="glass-panel rounded-2xl overflow-hidden" style={{ height: '380px' }}>
                  <PortfolioMap properties={mapProperties} lang={lang} />
                </div>
              )}
            </div>
          )}

          {/* ═══ FILTERS BAR ═══ */}
          <div className="glass-panel rounded-2xl p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('auto_search_title_address_owner')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-colors"
                />
              </div>

              {/* Type filter pills */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setActiveTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTypeFilter === 'all'
                      ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900 shadow-md'
                      : 'bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  {t('auto_all')}
                </button>
                {availableTypes.map(tid => {
                  const typeInfo = PROPERTY_TYPES[tid];
                  if (!typeInfo) return null;
                  const count = activeProperties.filter(p => String(p.property_type_id) === tid).length;
                  return (
                    <button
                      key={tid}
                      onClick={() => setActiveTypeFilter(activeTypeFilter === tid ? 'all' : tid)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTypeFilter === tid
                          ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900 shadow-md'
                          : 'bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <span>{typeInfo.icon}</span> {typeInfo[lang]}
                      <span className={`text-[9px] px-1 py-0.5 rounded ${activeTypeFilter === tid ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-bg'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status tabs */}
            <div className="flex items-center gap-1 flex-wrap mt-3 pt-3 border-t border-gray-100 dark:border-dark-border">
              {STATUS_TABS.map(tab => {
                const count = kpis.statusCounts[tab.key] || 0;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveStatusTab(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeStatusTab === tab.key
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                        : 'bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {lang === 'en' ? tab.labelEn : tab.labelEs}
                    {count > 0 && (
                      <span className={`ml-1.5 px-1 py-0.5 rounded-md text-[9px] ${
                        activeStatusTab === tab.key ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-bg'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              <span className="ml-auto text-[10px] text-gray-400 font-medium">
                {filtered.length} {t('auto_shown')}
              </span>
            </div>
          </div>

          {/* ═══ PROPERTY GRID ═══ */}
          {filtered.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mt-4">
                {t('auto_no_properties_found')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                {t('auto_try_adjusting_your_filters')}
              </p>
              <Link
                href="/propiedades/nueva"
                className="inline-flex items-center gap-2 px-5 py-2.5 mt-6 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                {t('prop_btn_create') || (t('auto_new_property'))}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(property => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  lang={lang}
                  zonePriceMap={zonePriceMap}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
