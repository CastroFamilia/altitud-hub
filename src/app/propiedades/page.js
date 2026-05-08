"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/layout/TopNav';
import PropertyCard from '@/components/propiedades/PropertyCard';
import PropertyStatusBadge from '@/components/propiedades/PropertyStatusBadge';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   MIS PROPIEDADES — Agent Portfolio Dashboard
   Shows all properties with status-based filtering and stats.
   ═══════════════════════════════════════════════════════════════ */

const TABS = [
  { key: 'all', labelKey: 'prop_tab_all' },
  { key: 'draft', labelKey: 'prop_tab_draft' },
  { key: 'pending_approval', labelKey: 'prop_tab_pending' },
  { key: 'needs_changes', labelKey: 'prop_tab_changes' },
  { key: 'approved', labelKey: 'prop_tab_approved' },
  { key: 'published', labelKey: 'prop_tab_published' },
  { key: 'sold', labelKey: 'prop_tab_sold' },
];

export default function PropiedadesPage() {
  const { t, lang } = useApp();
  const { user } = useAuth();
  const router = useRouter();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch properties
  useEffect(() => {
    if (!user?.id) return;
    const fetchProperties = async () => {
      setLoading(true);
      try {
        // Fetch properties with their main image
        const { data, error } = await supabase
          .from('properties')
          .select(`
            *,
            property_images(image_url, priority)
          `)
          .eq('agent_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        // Attach main image URL to each property
        const enriched = (data || []).map(p => ({
          ...p,
          main_image_url: p.property_images
            ?.sort((a, b) => a.priority - b.priority)?.[0]?.image_url || null,
        }));

        setProperties(enriched);
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [user?.id]);

  // Filtered properties
  const filtered = useMemo(() => {
    let list = properties;

    // Tab filter
    if (activeTab !== 'all') {
      list = list.filter(p => p.status === activeTab);
    }

    // Search filter
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
  }, [properties, activeTab, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: properties.length,
    draft: properties.filter(p => p.status === 'draft').length,
    pending: properties.filter(p => p.status === 'pending_approval').length,
    needs_changes: properties.filter(p => p.status === 'needs_changes').length,
    approved: properties.filter(p => p.status === 'approved').length,
    published: properties.filter(p => p.status === 'published').length,
    sold: properties.filter(p => p.status === 'sold').length,
  }), [properties]);

  return (
    <>
      <TopNav titleKey="nav_properties" subtitleKey="nav_portfolio" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-7xl w-full mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav_properties')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('prop_subtitle')}
              </p>
            </div>
            <Link
              href="/propiedades/nueva"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              {t('prop_btn_new')}
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: t('prop_stat_total'), value: stats.total, color: 'from-gray-500 to-gray-600' },
              { label: t('prop_stat_draft'), value: stats.draft, color: 'from-gray-400 to-gray-500' },
              { label: t('prop_stat_pending'), value: stats.pending, color: 'from-amber-400 to-amber-500' },
              { label: t('prop_stat_changes'), value: stats.needs_changes, color: 'from-red-400 to-red-500' },
              { label: t('prop_stat_approved'), value: stats.approved, color: 'from-green-400 to-green-500' },
              { label: t('prop_stat_published'), value: stats.published, color: 'from-blue-400 to-blue-500' },
            ].map((stat, i) => (
              <div key={i} className="glass-panel p-3 rounded-xl text-center">
                <p className={`text-2xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Search + Tabs */}
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
                  placeholder={t('prop_search')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-colors"
                />
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 flex-wrap">
                {TABS.map(tab => {
                  const count = tab.key === 'all' ? properties.length : properties.filter(p => p.status === tab.key).length;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === tab.key
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                          : 'bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {t(tab.labelKey)}
                      {count > 0 && (
                        <span className={`ml-1.5 px-1 py-0.5 rounded-md text-[9px] ${
                          activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-bg'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          {loading ? (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {t('prop_loading')}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mt-4">
                {activeTab === 'all' ? t('prop_empty_title') : t('prop_empty_status')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                {t('prop_empty_desc')}
              </p>
              {activeTab === 'all' && (
                <Link
                  href="/propiedades/nueva"
                  className="inline-flex items-center gap-2 px-5 py-2.5 mt-6 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  {t('prop_btn_create')}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(property => (
                <PropertyCard key={property.id} property={property} lang={lang} />
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
