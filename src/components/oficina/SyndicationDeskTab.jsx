"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/lib/context';
import Image from 'next/image';

/* ═══════════════════════════════════════════════════════════════
   SYNDICATION DESK — "Cargar Portales"
   
   Centralized workspace for the office assistant to manage
   portal links across ALL approved/published properties.
   
   Features:
   • Property list with inline portal link inputs
   • Progress indicator per property (X/Y portals loaded)
   • Filter by agent, completeness, or search text
   • Auto-save on Enter or click
   • The agent sees links instantly in their SyndicationPanel
   ═══════════════════════════════════════════════════════════════ */

function ProgressRing({ value, max, size = 36 }) {
  const pct = max > 0 ? value / max : 0;
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  const color = pct >= 1 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#94a3b8';

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeWidth={3} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-500" />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        className="rotate-90 origin-center text-[9px] font-black fill-slate-600 dark:fill-slate-300"
        style={{ transformOrigin: `${size/2}px ${size/2}px` }}>
        {value}/{max}
      </text>
    </svg>
  );
}

export default function SyndicationDeskTab({ properties: initialProperties = [], profiles = [] }) {
  const { lang } = useApp();
  const [portals, setPortals] = useState([]);
  const [syndications, setSyndications] = useState([]); // all syndication records
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('incomplete'); // 'all' | 'incomplete' | 'complete'
  const [editingCell, setEditingCell] = useState(null); // { propertyId, portalSlug }
  const [linkValue, setLinkValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedProperty, setExpandedProperty] = useState(null);

  // Filter properties to only approved/published
  const eligibleProperties = useMemo(() =>
    (initialProperties || []).filter(p =>
      ['approved', 'published'].includes(p.status)
    ),
  [initialProperties]);

  // Build profile lookup
  const profileMap = useMemo(() => {
    const map = {};
    (profiles || []).forEach(p => {
      if (p.auth_user_id) map[p.auth_user_id] = p;
    });
    return map;
  }, [profiles]);

  // Unique agents from eligible properties
  const agents = useMemo(() => {
    const seen = new Set();
    const result = [];
    eligibleProperties.forEach(p => {
      if (p.agent_id && !seen.has(p.agent_id)) {
        seen.add(p.agent_id);
        const profile = profileMap[p.agent_id];
        result.push({ id: p.agent_id, name: profile?.full_name || 'Agente' });
      }
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [eligibleProperties, profileMap]);

  // Load portals and syndications
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch portal registry
      const regRes = await fetch('/api/portals/registry');
      const regData = await regRes.json();
      setPortals(regData.portals || []);

      // Fetch all syndication records for eligible property IDs
      const propertyIds = eligibleProperties.map(p => p.id);
      if (propertyIds.length > 0) {
        const synRes = await fetch('/api/portals/syndication-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property_ids: propertyIds }),
        });
        const synData = await synRes.json();
        setSyndications(synData.syndications || []);
      }
    } catch (err) {
      console.error('SyndicationDesk load error:', err);
      // Fallback: fetch individually if bulk fails
      try {
        const regRes = await fetch('/api/portals/registry');
        const regData = await regRes.json();
        setPortals(regData.portals || []);
      } catch (e) {
        console.error('Fallback portals load error:', e);
      }
    } finally {
      setLoading(false);
    }
  }, [eligibleProperties]);

  useEffect(() => { loadData(); }, [loadData]);

  // Get syndication record for a property+portal combo
  const getSyn = useCallback((propertyId, portalSlug) => {
    return syndications.find(s =>
      s.property_id === propertyId &&
      s.portal_name === portalSlug &&
      s.status !== 'removed'
    );
  }, [syndications]);

  // Count published portals for a property
  const getProgress = useCallback((propertyId) => {
    const published = syndications.filter(s =>
      s.property_id === propertyId &&
      s.status === 'synced' &&
      s.portal_listing_url
    ).length;
    return { published, total: portals.length };
  }, [syndications, portals]);

  // Save a portal link
  const handleSaveLink = async (propertyId, portalSlug) => {
    if (!linkValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/portals/syndication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          portal_name: portalSlug,
          portal_listing_url: linkValue.trim(),
          status: 'synced',
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setSyndications(prev => {
          const filtered = prev.filter(s => !(s.property_id === propertyId && s.portal_name === portalSlug));
          return [...filtered, data.syndication];
        });
        setEditingCell(null);
        setLinkValue('');
      } else {
        alert('Error: ' + (data.error || 'Unknown'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Remove a portal link
  const handleRemoveLink = async (propertyId, portalSlug) => {
    if (!confirm(lang === 'en' ? 'Remove this portal link?' : '¿Eliminar este enlace del portal?')) return;
    try {
      await fetch(`/api/portals/syndication?property_id=${propertyId}&portal_name=${portalSlug}`, {
        method: 'DELETE',
      });
      setSyndications(prev => prev.filter(s => !(s.property_id === propertyId && s.portal_name === portalSlug)));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Filter and search properties
  const filteredProperties = useMemo(() => {
    let result = eligibleProperties;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => {
        const title = (lang === 'en' ? p.listing_title_en : p.listing_title_es) || p.name || '';
        const address = p.unparsed_address || '';
        return title.toLowerCase().includes(q) || address.toLowerCase().includes(q);
      });
    }

    // Agent filter
    if (filterAgent !== 'all') {
      result = result.filter(p => p.agent_id === filterAgent);
    }

    // Status filter
    if (filterStatus === 'incomplete') {
      result = result.filter(p => {
        const { published, total } = getProgress(p.id);
        return published < total;
      });
    } else if (filterStatus === 'complete') {
      result = result.filter(p => {
        const { published, total } = getProgress(p.id);
        return total > 0 && published >= total;
      });
    }

    return result;
  }, [eligibleProperties, search, filterAgent, filterStatus, getProgress, lang]);

  // Global stats
  const globalStats = useMemo(() => {
    const totalProperties = eligibleProperties.length;
    let totalPending = 0;
    let totalPublished = 0;
    eligibleProperties.forEach(p => {
      const { published, total } = getProgress(p.id);
      totalPublished += published;
      totalPending += (total - published);
    });
    return { totalProperties, totalPending, totalPublished };
  }, [eligibleProperties, getProgress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">
            {lang === 'en' ? 'Loading properties & portals...' : 'Cargando propiedades y portales...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>📋</span>
            {lang === 'en' ? 'Portal Syndication Desk' : 'Cargar Portales'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'en'
              ? `${globalStats.totalProperties} properties · ${globalStats.totalPending} portal links pending`
              : `${globalStats.totalProperties} propiedades · ${globalStats.totalPending} enlaces de portal pendientes`}
          </p>
        </div>

        {/* KPI cards */}
        <div className="flex gap-3">
          <div className="text-center px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
            <p className="text-xl font-black tabular-nums text-blue-600 dark:text-blue-400">{globalStats.totalProperties}</p>
            <p className="text-[9px] text-blue-400 uppercase font-bold tracking-wider">
              {lang === 'en' ? 'Properties' : 'Propiedades'}
            </p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
            <p className="text-xl font-black tabular-nums text-amber-600 dark:text-amber-400">{globalStats.totalPending}</p>
            <p className="text-[9px] text-amber-400 uppercase font-bold tracking-wider">
              {lang === 'en' ? 'Pending' : 'Pendientes'}
            </p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
            <p className="text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{globalStats.totalPublished}</p>
            <p className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider">
              {lang === 'en' ? 'Published' : 'Publicados'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'en' ? 'Search properties...' : 'Buscar propiedades...'}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-dark-border rounded-xl text-sm bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        {/* Agent filter */}
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 dark:border-dark-border rounded-xl text-sm bg-white dark:bg-white/5 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[180px]"
        >
          <option value="all">{lang === 'en' ? 'All Agents' : 'Todos los Agentes'}</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <div className="flex bg-slate-100 dark:bg-white/5 rounded-xl p-0.5 border border-slate-200 dark:border-dark-border">
          {[
            { key: 'incomplete', label: lang === 'en' ? 'Pending' : 'Pendientes' },
            { key: 'all', label: lang === 'en' ? 'All' : 'Todas' },
            { key: 'complete', label: lang === 'en' ? 'Complete' : 'Completas' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                filterStatus === f.key
                  ? 'bg-white dark:bg-dark-panel text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Property List ── */}
      {filteredProperties.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {filterStatus === 'incomplete'
              ? (lang === 'en' ? 'All portals are loaded! Great work.' : '¡Todos los portales están cargados! Gran trabajo.')
              : (lang === 'en' ? 'No properties found.' : 'No se encontraron propiedades.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProperties.map(property => {
            const title = (lang === 'en' ? property.listing_title_en : property.listing_title_es) || property.name || 'Sin título';
            const agentProfile = profileMap[property.agent_id];
            const mainImg = property.property_images?.sort((a, b) => (a.priority || 0) - (b.priority || 0))?.[0]?.image_url;
            const price = property.list_price
              ? `${property.list_price_currency_id === 2 ? '₡' : '$'}${Number(property.list_price).toLocaleString()}`
              : '';
            const { published, total } = getProgress(property.id);
            const isExpanded = expandedProperty === property.id;

            return (
              <div
                key={property.id}
                className="glass-panel rounded-2xl border border-slate-200 dark:border-dark-border overflow-hidden transition-all hover:shadow-md"
              >
                {/* ── Property Header Row ── */}
                <button
                  onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 overflow-hidden shrink-0 relative">
                    {mainImg ? (
                      <Image src={mainImg} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{price}</span>
                      {agentProfile && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          ·
                          <Image
                            src={agentProfile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agentProfile.full_name)}&background=5a82bf&color=fff&size=14`}
                            alt="" width={14} height={14} className="rounded-full"
                          />
                          {agentProfile.full_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress ring */}
                  <ProgressRing value={published} max={total} />

                  {/* Expand arrow */}
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* ── Portal Rows (expanded) ── */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-dark-border divide-y divide-slate-50 dark:divide-white/[0.03]">
                    {portals.map(portal => {
                      const syn = getSyn(property.id, portal.slug);
                      const isPublished = syn && syn.status === 'synced' && syn.portal_listing_url;
                      const isEditing = editingCell?.propertyId === property.id && editingCell?.portalSlug === portal.slug;

                      return (
                        <div
                          key={portal.slug}
                          className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                            isPublished
                              ? 'bg-emerald-50/30 dark:bg-emerald-900/5'
                              : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Portal icon + name */}
                          <span className={`text-base shrink-0 ${isPublished ? '' : 'grayscale opacity-60'}`}>{portal.icon_emoji}</span>
                          <div className="w-36 shrink-0">
                            <p className={`text-xs font-semibold truncate ${isPublished ? 'text-slate-700 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                              {portal.display_name}
                            </p>
                          </div>

                          {/* Status + link/input */}
                          <div className="flex-1 min-w-0">
                            {isPublished && !isEditing ? (
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <a
                                  href={syn.portal_listing_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-brand-500 hover:text-brand-600 truncate underline underline-offset-2"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {syn.portal_listing_url}
                                </a>
                                {syn.published_at && (
                                  <span className="text-[9px] text-slate-300 dark:text-slate-600 shrink-0">
                                    {new Date(syn.published_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            ) : isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="url"
                                  value={linkValue}
                                  onChange={e => setLinkValue(e.target.value)}
                                  placeholder={lang === 'en' ? 'Paste portal link...' : 'Pegar enlace del portal...'}
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-brand-300 dark:border-brand-700 bg-white dark:bg-dark-bg text-xs focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveLink(property.id, portal.slug);
                                    if (e.key === 'Escape') { setEditingCell(null); setLinkValue(''); }
                                  }}
                                />
                                <button
                                  onClick={() => handleSaveLink(property.id, portal.slug)}
                                  disabled={saving || !linkValue.trim()}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold transition-colors disabled:opacity-50 shrink-0"
                                >
                                  {saving ? '...' : '✓'}
                                </button>
                                <button
                                  onClick={() => { setEditingCell(null); setLinkValue(''); }}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600 italic">
                                {lang === 'en' ? 'Not loaded' : 'No cargado'}
                              </span>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            {isPublished && !isEditing ? (
                              <>
                                {/* Edit */}
                                <button
                                  onClick={() => {
                                    setEditingCell({ propertyId: property.id, portalSlug: portal.slug });
                                    setLinkValue(syn.portal_listing_url || '');
                                  }}
                                  className="p-1.5 rounded-lg text-slate-300 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                                  title={lang === 'en' ? 'Edit link' : 'Editar enlace'}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                {/* Remove */}
                                <button
                                  onClick={() => handleRemoveLink(property.id, portal.slug)}
                                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  title={lang === 'en' ? 'Remove' : 'Eliminar'}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </>
                            ) : !isEditing ? (
                              <button
                                onClick={() => {
                                  setEditingCell({ propertyId: property.id, portalSlug: portal.slug });
                                  setLinkValue('');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                {lang === 'en' ? 'Add Link' : 'Cargar'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
