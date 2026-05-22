"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

export default function OfficePortfolioSection({ properties = [], profiles = [], lang = 'es' }) {
  const [activeTypeFilter, setActiveTypeFilter] = useState('all');
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeProperties = useMemo(() =>
    properties.filter(p => p.status !== 'cancelled'),
  [properties]);

  // Filter pipeline
  const filtered = useMemo(() => {
    let list = activeProperties;
    if (activeStatusTab !== 'all') list = list.filter(p => p.status === activeStatusTab);
    if (activeTypeFilter !== 'all') list = list.filter(p => String(p.property_type_id) === activeTypeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.listing_title_es || '').toLowerCase().includes(q) ||
        (p.unparsed_address || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeProperties, activeStatusTab, activeTypeFilter, searchQuery]);

  // KPIs
  const kpis = useMemo(() => {
    const published = activeProperties.filter(p => p.status === 'published');
    const withPrice = activeProperties.filter(p => p.list_price > 0);
    const totalValue = withPrice.reduce((s, p) => s + Number(p.list_price), 0);
    const avgValue = withPrice.length > 0 ? Math.round(totalValue / withPrice.length) : 0;

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
      byType[tid].avg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    }

    const totalCommission = withPrice.reduce((s, p) => {
      const listingSide = Number(p.listing_side_comm || 3) / 100;
      return s + (Number(p.list_price) * listingSide);
    }, 0);

    const now = Date.now();
    const domValues = published.filter(p => p.submitted_at).map(p => Math.floor((now - new Date(p.submitted_at).getTime()) / 86400000));
    const avgDOM = domValues.length > 0 ? Math.round(domValues.reduce((a, b) => a + b, 0) / domValues.length) : 0;

    const statusCounts = {};
    for (const tab of STATUS_TABS) {
      statusCounts[tab.key] = tab.key === 'all' ? activeProperties.length : activeProperties.filter(p => p.status === tab.key).length;
    }

    // By agent
    const byAgent = {};
    for (const p of activeProperties) {
      const aid = p.agent_id || 'unassigned';
      if (!byAgent[aid]) byAgent[aid] = { count: 0, value: 0, published: 0 };
      byAgent[aid].count++;
      byAgent[aid].value += Number(p.list_price) || 0;
      if (p.status === 'published') byAgent[aid].published++;
    }

    return { totalValue, avgValue, byType, totalCommission, avgDOM, statusCounts, totalCount: activeProperties.length, publishedCount: published.length, byAgent };
  }, [activeProperties]);

  const availableTypes = useMemo(() => {
    const types = {};
    for (const p of activeProperties) {
      if (p.property_type_id && !types[p.property_type_id]) types[p.property_type_id] = true;
    }
    return Object.keys(types).sort((a, b) => Number(a) - Number(b));
  }, [activeProperties]);

  // Profile lookup
  const profileMap = useMemo(() => {
    const map = {};
    profiles.forEach(p => { if (p.auth_user_id) map[p.auth_user_id] = p; });
    return map;
  }, [profiles]);

  // Top agents by listing count
  const topAgents = useMemo(() => {
    return Object.entries(kpis.byAgent)
      .filter(([k]) => k !== 'unassigned')
      .map(([aid, data]) => ({ ...data, agent_id: aid, profile: profileMap[aid] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [kpis.byAgent, profileMap]);

  return (
    <div className="space-y-6 mb-8">
      {/* ═══ KPI DASHBOARD ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Portfolio */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 text-center col-span-2 md:col-span-1 relative overflow-hidden border border-slate-200/60 dark:border-slate-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-nexus-blue/5 to-nexus-blue/10 dark:from-nexus-blue/10 dark:to-nexus-blue/20" />
          <div className="relative">
            <p className="text-2xl font-black bg-gradient-to-r from-nexus-blue to-blue-700 bg-clip-text text-transparent">
              {formatCurrency(kpis.totalValue)}
            </p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'en' ? 'Portfolio Value' : 'Valor Cartera'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{kpis.totalCount} {lang === 'en' ? 'properties' : 'propiedades'}</p>
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
              className={`bg-white dark:bg-slate-800/80 rounded-2xl p-4 text-center transition-all hover:shadow-md cursor-pointer border border-slate-200/60 dark:border-slate-700/50 ${
                activeTypeFilter === String(typeId) ? 'ring-2 ring-nexus-blue shadow-md' : ''
              }`}
            >
              <p className="text-lg mb-0.5">{typeInfo.icon}</p>
              <p className={`text-lg font-black bg-gradient-to-r ${typeInfo.color} bg-clip-text text-transparent`}>
                {data.count}
              </p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
                {typeInfo[lang]}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{formatCurrency(data.avg)} prom</p>
            </button>
          );
        })}

        {/* Days on Market */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 text-center border border-slate-200/60 dark:border-slate-700/50">
          <p className="text-lg mb-0.5">⏱️</p>
          <p className={`text-lg font-black ${kpis.avgDOM > 120 ? 'text-red-500' : kpis.avgDOM > 60 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {kpis.avgDOM}d
          </p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
            {lang === 'en' ? 'Avg DOM' : 'Días Prom'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{kpis.publishedCount} publicadas</p>
        </div>
      </div>

      {/* ═══ VALUE BY TYPE + COMMISSIONS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-700/50">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-3">
            {lang === 'en' ? 'Average Value by Type' : 'Valor Promedio por Tipo'}
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
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 w-20 shrink-0">
                      {typeInfo?.[lang] || `Tipo ${tid}`}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${typeInfo?.color || 'from-gray-400 to-gray-500'} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-16 text-right">
                      {formatCurrency(data.avg)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Commissions + Agent Breakdown */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-700/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 dark:from-emerald-500/10 dark:to-emerald-600/15" />
          <div className="relative">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-3">
              {lang === 'en' ? 'Potential Commissions' : 'Comisiones Potenciales'}
            </h3>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">
              {formatCurrency(kpis.totalCommission)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comisiones lado captación del inventario activo
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div>
                <p className="text-sm font-black text-slate-700 dark:text-slate-300">{formatCurrency(kpis.avgValue)}</p>
                <p className="text-[10px] text-slate-400">Precio prom.</p>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div>
                <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                  {kpis.totalCount > 0 ? formatCurrency(kpis.totalCommission / kpis.totalCount) : '$0'}
                </p>
                <p className="text-[10px] text-slate-400">Comisión prom.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ AGENT PORTFOLIO BREAKDOWN ═══ */}
      {topAgents.length > 0 && (
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-700/50">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-4">
            📊 {lang === 'en' ? 'Portfolio by Agent' : 'Cartera por Agente'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {topAgents.map(a => (
              <div key={a.agent_id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                <Image
                  src={a.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.profile?.full_name || '?')}&background=5a82bf&color=fff`}
                  className="w-8 h-8 rounded-full"
                  alt=""
                  width={32}
                  height={32}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{a.profile?.full_name || 'Sin asignar'}</p>
                  <p className="text-[10px] text-slate-500">
                    {a.count} prop · {a.published} pub
                  </p>
                </div>
                <p className="text-xs font-black text-nexus-blue tabular-nums">{formatCurrency(a.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ FILTERS BAR ═══ */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar título, dirección..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-nexus-blue outline-none text-sm transition-colors text-slate-900 dark:text-white"
            />
          </div>

          {/* Type filter pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setActiveTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTypeFilter === 'all'
                  ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Todos
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
                      ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <span>{typeInfo.icon}</span> {typeInfo[lang]}
                  <span className={`text-[9px] px-1 py-0.5 rounded ${activeTypeFilter === tid ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 flex-wrap mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
          {STATUS_TABS.map(tab => {
            const count = kpis.statusCounts[tab.key] || 0;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveStatusTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeStatusTab === tab.key
                    ? 'bg-nexus-blue text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {lang === 'en' ? tab.labelEn : tab.labelEs}
                {count > 0 && (
                  <span className={`ml-1.5 px-1 py-0.5 rounded-md text-[9px] ${
                    activeStatusTab === tab.key ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <span className="ml-auto text-[10px] text-slate-400 font-medium">
            {filtered.length} mostradas
          </span>
        </div>
      </div>

      {/* ═══ PROPERTY LIST ═══ */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">{t('ofc_no_properties_cat')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const mainImg = p.property_images?.sort((a, b) => a.priority - b.priority)?.[0]?.image_url;
            const typeInfo = PROPERTY_TYPES[p.property_type_id];
            const agentProfile = profileMap[p.agent_id];
            const statusColors = {
              draft: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
              pending_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
              needs_changes: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
              approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
              published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
              sold: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
            };
            return (
              <Link key={p.id} href={`/propiedades/${p.id}`} target="_blank"
                className="flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 hover:shadow-md hover:border-nexus-blue/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 relative">
                  {mainImg ? <Image src={mainImg} className="object-cover" alt="" fill /> : (
                    <div className="w-full h-full flex items-center justify-center text-xl">{typeInfo?.icon || '🏠'}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-nexus-blue transition-colors">
                    {(lang === 'en' ? p.listing_title_en : p.listing_title_es) || p.name || 'Sin título'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 truncate">{p.unparsed_address || '—'}</span>
                    {agentProfile && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                        <span className="w-3 h-3 rounded-full bg-nexus-blue/20 inline-block" />
                        {agentProfile.full_name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums shrink-0">
                  {p.list_price ? formatCurrency(Number(p.list_price)) : '—'}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${statusColors[p.status] || 'bg-slate-200 text-slate-600'}`}>
                  {p.status?.replace('_', ' ')}
                </span>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-nexus-blue transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
