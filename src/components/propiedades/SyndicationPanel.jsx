"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';

/* ═══════════════════════════════════════════════════════════════
   SYNDICATION PANEL v2 — Multi-Portal Dashboard
   
   Dynamic, data-driven portal syndication panel showing:
   • RECONNECT stats KPI cards (views, interested, days)
   • All portals from portal_registry with live status
   • Published portals at top with clickable links
   • "Request Publication" button for on_request portals
   • Per-portal inquiry counts (origin tracking)
   • Progress indicator: "Published on X/Y portals"
   
   Agents use this panel + Olympia to analyze performance
   and adapt strategy based on portal-specific metrics.
   ═══════════════════════════════════════════════════════════════ */

const STATUS_CONFIG = {
  synced:    { label: { es: 'Publicado', en: 'Published' },  color: 'text-emerald-500', dot: 'bg-emerald-500' },
  requested: { label: { es: 'Solicitado', en: 'Requested' }, color: 'text-amber-500',   dot: 'bg-amber-500' },
  pending:   { label: { es: 'Pendiente', en: 'Pending' },    color: 'text-blue-400',    dot: 'bg-blue-400' },
  error:     { label: { es: 'Error', en: 'Error' },          color: 'text-red-500',     dot: 'bg-red-500' },
  removed:   { label: { es: 'Removido', en: 'Removed' },     color: 'text-gray-400',    dot: 'bg-gray-400' },
};

function StatCard({ value, label, accent }) {
  return (
    <div className="text-center py-3 px-2 rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-white/5 dark:to-white/[0.02] border border-slate-100 dark:border-white/10">
      <p className={`text-2xl font-black tabular-nums ${accent || 'text-slate-900 dark:text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

export default function SyndicationPanel({ propertyId, propertyStatus, onPublish, agentId, agentName, propertyTitle, office }) {
  const { lang } = useApp();
  const [portalsWithSyn, setPortalsWithSyn] = useState([]);
  const [inquiryCounts, setInquiryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(null);
  const [publishing, setPublishing] = useState(false);

  // Fetch portals + syndication data
  useEffect(() => {
    if (!propertyId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get portal registry
        const regRes = await fetch('/api/portals/registry');
        const regData = await regRes.json();
        const portals = regData.portals || [];

        // Get syndication records for this property
        const { getPropertySyndications, getPropertyInquiries } = await import('@/lib/dal/properties');
        const [syndications, inquiries] = await Promise.all([
          getPropertySyndications(propertyId),
          getPropertyInquiries(propertyId),
        ]);

        // Merge portals with syndication data
        const merged = portals.map(portal => {
          const syn = (syndications || []).find(s => s.portal_name === portal.slug);
          return {
            ...portal,
            syndication: syn || null,
            is_published: syn && syn.status === 'synced',
            is_requested: syn && syn.status === 'requested',
          };
        });

        setPortalsWithSyn(merged);

        // Count inquiries per portal
        const counts = {};
        let total = 0;
        (inquiries || []).forEach(inq => {
          const portal = inq.portal_name || 'direct';
          counts[portal] = (counts[portal] || 0) + 1;
          total++;
        });
        counts._total = total;
        setInquiryCounts(counts);
      } catch (err) {
        console.error('SyndicationPanel load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [propertyId]);

  // Handle RECONNECT publish
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/properties/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      const data = await res.json();
      if (data.success) {
        if (onPublish) onPublish();
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const [addingLink, setAddingLink] = useState(null); // portal slug being edited
  const [linkUrl, setLinkUrl] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  // Handle adding a direct link (mark as published)
  const handleAddLink = async (portalSlug) => {
    if (!linkUrl.trim()) return;
    setSavingLink(true);
    try {
      const { upsertPropertySyndication } = await import('@/lib/dal/properties');
      const result = await upsertPropertySyndication({
        property_id: propertyId,
        portal_name: portalSlug,
        portal_listing_url: linkUrl.trim(),
        status: 'synced',
      });
      // Update local state
      setPortalsWithSyn(prev => prev.map(p =>
        p.slug === portalSlug
          ? { ...p, syndication: result, is_published: true, is_requested: false }
          : p
      ));
      setAddingLink(null);
      setLinkUrl('');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSavingLink(false);
    }
  };

  // Handle request publication on premium portal
  const handleRequestPublish = async (portalSlug, portalName) => {
    setRequesting(portalSlug);
    try {
      const res = await fetch('/api/portals/request-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          portal_name: portalSlug,
          agent_id: agentId,
          agent_name: agentName,
          property_title: propertyTitle,
          office: office,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPortalsWithSyn(prev => prev.map(p =>
          p.slug === portalSlug
            ? { ...p, syndication: data.syndication, is_requested: true }
            : p
        ));
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setRequesting(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Separate published vs unpublished
  const published = portalsWithSyn.filter(p => p.is_published);
  const requested = portalsWithSyn.filter(p => p.is_requested && !p.is_published);
  const unpublished = portalsWithSyn.filter(p => !p.is_published && !p.is_requested);

  // RECONNECT stats
  const reconnectSyn = portalsWithSyn.find(p => p.slug === 'reconnect')?.syndication;
  const hasReconnectStats = reconnectSyn && (reconnectSyn.listing_views > 0 || reconnectSyn.days_listed > 0);

  const totalPortals = portalsWithSyn.length;
  const publishedCount = published.length;

  return (
    <div className="space-y-4">

      {/* ── RECONNECT Stats KPI Cards ── */}
      {hasReconnectStats && (
        <div>
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            RECONNECT {lang === 'en' ? 'Stats' : 'Estadísticas'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              value={reconnectSyn.listing_views || 0}
              label={lang === 'en' ? 'Views' : 'Vistas'}
              accent="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              value={reconnectSyn.interested_count || 0}
              label={lang === 'en' ? 'Interested' : 'Interesados'}
              accent="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              value={reconnectSyn.days_listed || 0}
              label={lang === 'en' ? 'Days' : 'Días'}
              accent="text-amber-600 dark:text-amber-400"
            />
          </div>
          {reconnectSyn.stats_updated_at && (
            <p className="text-[8px] text-slate-300 dark:text-slate-600 text-right mt-1">
              {lang === 'en' ? 'Updated' : 'Actualizado'}: {new Date(reconnectSyn.stats_updated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* ── Publish to RECONNECT button ── */}
      {propertyStatus === 'approved' && (
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="w-full px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {publishing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          )}
          {lang === 'en' ? 'Publish to RECONNECT' : 'Publicar en RECONNECT'}
        </button>
      )}

      {/* ── Progress Bar ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
            {lang === 'en' ? 'Published on' : 'Publicado en'}
          </p>
          <p className="text-xs font-black text-slate-700 dark:text-slate-300">
            {publishedCount}<span className="text-slate-300 dark:text-slate-600">/{totalPortals}</span>
          </p>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${totalPortals > 0 ? (publishedCount / totalPortals) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* ── Published Portals ── */}
      {published.length > 0 && (
        <div className="space-y-1">
          {published.map(portal => {
            const syn = portal.syndication;
            const inqCount = inquiryCounts[portal.slug] || 0;
            return (
              <div key={portal.slug} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-800/20 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{portal.icon_emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">{portal.display_name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      <span className="text-[10px] font-medium text-emerald-500">
                        {lang === 'en' ? 'Published' : 'Publicado'}
                      </span>
                      {syn?.published_at && (
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">
                          · {new Date(syn.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Portal-specific stats (views) */}
                  {syn?.listing_views > 0 && portal.slug !== 'reconnect' && (
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      {syn.listing_views}
                    </span>
                  )}
                  {/* Inquiry count per portal */}
                  {inqCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold">
                      {inqCount} {inqCount === 1 ? 'lead' : 'leads'}
                    </span>
                  )}
                  {/* External link */}
                  {syn?.portal_listing_url && (
                    <a href={syn.portal_listing_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-500 transition-colors p-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Requested Portals ── */}
      {requested.length > 0 && (
        <div className="space-y-1">
          {requested.map(portal => (
            <div key={portal.slug} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-800/20">
              <div className="flex items-center gap-2.5">
                <span className="text-base">{portal.icon_emoji}</span>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-white">{portal.display_name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                    <span className="text-[10px] font-medium text-amber-500">
                      {lang === 'en' ? 'Requested — pending admin' : 'Solicitado — pendiente admin'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Unpublished Portals ── */}
      {unpublished.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] text-slate-300 dark:text-slate-600 uppercase font-bold tracking-wider mt-2 mb-1">
            {lang === 'en' ? 'Not yet published' : 'Aún no publicado'}
          </p>
          {unpublished.map(portal => (
            <div key={portal.slug} className="rounded-xl transition-all">
              <div className="flex items-center justify-between py-2 px-3 opacity-70 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2.5">
                  <span className="text-base grayscale">{portal.icon_emoji}</span>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{portal.display_name}</p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600">
                      {portal.category === 'on_request'
                        ? (lang === 'en' ? 'Available on request' : 'Disponible bajo solicitud')
                        : (lang === 'en' ? 'Not published' : 'No publicado')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setAddingLink(addingLink === portal.slug ? null : portal.slug); setLinkUrl(''); }}
                    className="px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    {lang === 'en' ? 'Add Link' : 'Agregar Link'}
                  </button>
                  {portal.category === 'on_request' && (
                    <button
                      onClick={() => handleRequestPublish(portal.slug, portal.display_name)}
                      disabled={requesting === portal.slug}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {requesting === portal.slug ? (
                        <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      )}
                      {lang === 'en' ? 'Request' : 'Solicitar'}
                    </button>
                  )}
                </div>
              </div>
              {addingLink === portal.slug && (
                <div className="px-3 pb-3 flex items-center gap-2">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder={lang === 'en' ? 'Paste portal link here...' : 'Pegar link del portal aquí...'}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLink(portal.slug)}
                  />
                  <button
                    onClick={() => handleAddLink(portal.slug)}
                    disabled={savingLink || !linkUrl.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {savingLink ? '...' : (lang === 'en' ? 'Save' : 'Guardar')}
                  </button>
                  <button
                    onClick={() => { setAddingLink(null); setLinkUrl(''); }}
                    className="p-2 text-slate-400 hover:text-slate-600"
                  >✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Total Inquiries Footer ── */}
      {(inquiryCounts._total || 0) > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {lang === 'en' ? `${inquiryCounts._total} total inquiries` : `${inquiryCounts._total} consultas totales`}
          </p>
          <div className="flex items-center gap-1">
            {Object.entries(inquiryCounts).filter(([k]) => k !== '_total' && k !== 'direct').slice(0, 3).map(([portal, count]) => (
              <span key={portal} className="text-[9px] text-slate-300 dark:text-slate-600">
                {portal.replace(/_/g, ' ')}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
