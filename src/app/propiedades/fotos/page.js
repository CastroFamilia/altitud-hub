"use client";

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/layout/TopNav';

/* ═══════════════════════════════════════════════════════════════
   PHOTOGRAPHER PANEL — /propiedades/fotos
   
   A dedicated view for the office photographer to:
   - See all properties that need photos
   - Open Drive folders directly
   - Sync photos from Drive
   - Mark properties as "photos ready"
   ═══════════════════════════════════════════════════════════════ */

const FILTERS = [
  { key: 'pending', label_es: 'Pendientes de Fotos', label_en: 'Pending Photos' },
  { key: 'ready', label_es: 'Fotos Listas', label_en: 'Photos Ready' },
  { key: 'all', label_es: 'Todas', label_en: 'All' },
];

export default function PhotographerPanel() {
  const { lang } = useApp();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [syncingId, setSyncingId] = useState(null);
  const [markingId, setMarkingId] = useState(null);

  // Fetch all properties that have a Drive folder
  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id, name, listing_title_es, listing_title_en,
          unparsed_address, owner_name, agent_id,
          drive_photos_folder_id, drive_photos_folder_url,
          photos_ready, status, created_at,
          property_images(id)
        `)
        .not('drive_photos_folder_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with image counts
      const enriched = (data || []).map(p => ({
        ...p,
        photo_count: p.property_images?.length || 0,
      }));

      setProperties(enriched);
    } catch (err) {
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  // Filtered list
  const filtered = useMemo(() => {
    if (filter === 'pending') return properties.filter(p => !p.photos_ready);
    if (filter === 'ready') return properties.filter(p => p.photos_ready);
    return properties;
  }, [properties, filter]);

  // Sync photos from Drive
  const handleSync = async (propertyId) => {
    setSyncingId(propertyId);
    try {
      const res = await fetch('/api/properties/sync-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(lang === 'en'
          ? `Synced ${data.synced} new photos (${data.total_images} total)`
          : `Sincronizadas ${data.synced} fotos nuevas (${data.total_images} total)`
        );
        fetchProperties();
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  // Mark as photos ready
  const handleMarkReady = async (propertyId, ready) => {
    setMarkingId(propertyId);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ photos_ready: ready })
        .eq('id', propertyId);
      if (error) throw error;
      fetchProperties();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setMarkingId(null);
    }
  };

  const pendingCount = properties.filter(p => !p.photos_ready).length;
  const readyCount = properties.filter(p => p.photos_ready).length;

  return (
    <>
      <TopNav titleKey="nav_properties" subtitleKey="nav_portfolio" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-5xl w-full mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">📸</span>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {lang === 'en' ? 'Photographer Panel' : 'Panel del Fotógrafo'}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {lang === 'en'
                      ? 'Manage property photos and sync from Google Drive'
                      : 'Gestiona las fotos de propiedades y sincroniza desde Google Drive'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: lang === 'en' ? 'Pending' : 'Pendientes', value: pendingCount, color: 'from-amber-400 to-amber-500' },
              { label: lang === 'en' ? 'Ready' : 'Listas', value: readyCount, color: 'from-green-400 to-green-500' },
              { label: 'Total', value: properties.length, color: 'from-gray-400 to-gray-500' },
            ].map((s, i) => (
              <div key={i} className="glass-panel p-4 rounded-xl text-center">
                <p className={`text-3xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-6">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filter === f.key
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {lang === 'en' ? f.label_en : f.label_es}
              </button>
            ))}
          </div>

          {/* Properties List */}
          {loading ? (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {lang === 'en' ? 'Loading...' : 'Cargando...'}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <span className="text-5xl">📷</span>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mt-4">
                {filter === 'pending'
                  ? (lang === 'en' ? 'All caught up!' : '¡Todo al día!')
                  : (lang === 'en' ? 'No properties found' : 'Sin propiedades')
                }
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {filter === 'pending'
                  ? (lang === 'en' ? 'No properties are waiting for photos' : 'Ninguna propiedad está esperando fotos')
                  : (lang === 'en' ? 'No properties in this category' : 'Sin propiedades en esta categoría')
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => {
                const title = (lang === 'en' ? p.listing_title_en : p.listing_title_es) || p.name || 'Sin nombre';
                const isSyncing = syncingId === p.id;
                const isMarking = markingId === p.id;

                return (
                  <div key={p.id} className="glass-panel rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      {/* Status indicator */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                        p.photos_ready
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-amber-50 dark:bg-amber-900/20'
                      }`}>
                        {p.photos_ready ? '✅' : '📷'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {p.unparsed_address && (
                            <span className="flex items-center gap-1 truncate">
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                              {p.unparsed_address}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            🖼️ {p.photo_count} {lang === 'en' ? 'photos' : 'fotos'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Open Drive Folder */}
                        {p.drive_photos_folder_url && (
                          <a
                            href={p.drive_photos_folder_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1.5"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7.71 3.5L1.15 15l4.58 7.5h13.54l4.58-7.5L17.29 3.5H7.71zM14 3.5l6 10.5H8L14 3.5z" /></svg>
                            Drive
                          </a>
                        )}

                        {/* Sync from Drive */}
                        <button
                          onClick={() => handleSync(p.id)}
                          disabled={isSyncing}
                          className="px-3 py-2 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-semibold hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isSyncing ? (
                            <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          )}
                          {lang === 'en' ? 'Sync' : 'Sincronizar'}
                        </button>

                        {/* Mark Ready / Unready */}
                        <button
                          onClick={() => handleMarkReady(p.id, !p.photos_ready)}
                          disabled={isMarking}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 ${
                            p.photos_ready
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                              : 'bg-green-500 text-white shadow-md shadow-green-500/20 hover:bg-green-600'
                          }`}
                        >
                          {p.photos_ready
                            ? (lang === 'en' ? '↩ Reopen' : '↩ Reabrir')
                            : (lang === 'en' ? '✓ Mark Ready' : '✓ Marcar Lista')
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
