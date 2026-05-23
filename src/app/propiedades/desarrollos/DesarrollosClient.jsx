"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/layout/TopNav';
import DevelopmentCard from '@/components/propiedades/DevelopmentCard';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   MIS DESARROLLOS — Agent Development Portfolio
   Shows all developments with status-based filtering and stats.
   ═══════════════════════════════════════════════════════════════ */

const TABS = [
  { key: 'all', labelKey: 'dev_tab_all' },
  { key: 'draft', labelKey: 'dev_tab_draft' },
  { key: 'pending_approval', labelKey: 'dev_tab_pending' },
  { key: 'active', labelKey: 'dev_tab_active' },
  { key: 'sold_out', labelKey: 'dev_tab_sold_out' },
  { key: 'archived', labelKey: 'dev_tab_archived' },
];

export default function DesarrollosClient({ initialDevelopments = [] }) {
  const { t, lang } = useApp();
  const { user } = useAuth();
  const router = useRouter();

  const [developments, setDevelopments] = useState(initialDevelopments);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Removed initial fetch useEffect, keep function if needed to refresh

  // Filtered
  const filtered = useMemo(() => {
    let list = developments;
    if (activeTab !== 'all') list = list.filter(d => d.status === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.slug || '').toLowerCase().includes(q) ||
        (d.developer_name || '').toLowerCase().includes(q) ||
        (d.tagline_es || '').toLowerCase().includes(q) ||
        (d.tagline_en || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [developments, activeTab, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: developments.length,
    active: developments.filter(d => d.status === 'active').length,
    draft: developments.filter(d => d.status === 'draft').length,
    totalUnits: developments.reduce((sum, d) => sum + (d.total_units || 0), 0),
    availableUnits: developments.reduce((sum, d) => sum + (d.available_units || 0), 0),
    propertiesListed: developments.reduce((sum, d) => sum + (d.properties_count || 0), 0),
  }), [developments]);

  return (
    <>
      <TopNav title={t('dev_title')} subtitle={t('dev_page_subtitle')} />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-7xl w-full mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('dev_title')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('dev_page_subtitle')}
              </p>
            </div>
            <Link
              href="/propiedades/desarrollos/nuevo"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              {t('dev_new')}
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: t('auto_developments'), value: stats.total, color: 'from-gray-500 to-gray-600' },
              { label: t('dev_stat_active'), value: stats.active, color: 'from-green-400 to-green-500' },
              { label: t('prop_stat_draft'), value: stats.draft, color: 'from-gray-400 to-gray-500' },
              { label: t('dev_stat_total_units'), value: stats.totalUnits, color: 'from-blue-400 to-blue-500' },
              { label: t('auto_props_listed'), value: `${stats.propertiesListed}/${stats.totalUnits}`, color: 'from-amber-400 to-amber-500' },
              { label: t('dev_available_units'), value: stats.availableUnits, color: 'from-emerald-400 to-emerald-500' },
            ].map((stat, i) => (
              <div key={i} className="glass-panel p-3 rounded-xl text-center">
                <p className={`text-2xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Search + Tabs */}
          <div className="glass-panel rounded-2xl p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('dev_search')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-colors"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {TABS.map(tab => {
                  const count = tab.key === 'all' ? developments.length : developments.filter(d => d.status === tab.key).length;
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === tab.key
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}>
                      {t(tab.labelKey)}
                      {count > 0 && (
                        <span className={`ml-1.5 px-1 py-0.5 rounded-md text-[9px] ${activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-bg'}`}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Developments Grid */}
          {loading ? (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {t('dev_loading')}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mt-4">
                {activeTab === 'all' ? t('dev_empty_title') : t('dev_empty_status')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                {t('dev_empty_desc')}
              </p>
              {activeTab === 'all' && (
                <Link href="/propiedades/desarrollos/nuevo"
                  className="inline-flex items-center gap-2 px-5 py-2.5 mt-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  {t('dev_btn_create')}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(dev => (
                <DevelopmentCard key={dev.id} development={dev} lang={lang} />
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
