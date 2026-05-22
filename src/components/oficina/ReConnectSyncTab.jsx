"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function ReConnectSyncTab({ properties = [], profiles = [] }) {
  const router = useRouter();
  const [syncingOffice, setSyncingOffice] = useState(null); // 'altitud' | 'cero' | null
  const [syncResult, setSyncResult] = useState(null); // { success: boolean, imported: number, total_in_feed: number, skipped: number, errors?: array }
  const [searchQuery, setSearchQuery] = useState('');
  const [officeFilter, setOfficeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState(null); // Selected property for sliding detailed drawer

  // Filter properties imported from ReConnect
  const reconnectProperties = useMemo(() => {
    return properties.filter(p => p.reconnect_listing_id);
  }, [properties]);

  // Statistics
  const stats = useMemo(() => {
    const total = reconnectProperties.length;
    const altitudCount = reconnectProperties.filter(p => 
      p.office_code === 'R0700130' || !p.office_code?.toLowerCase()?.includes('cero')
    ).length;
    const ceroCount = total - altitudCount;

    // Get the most recent sync time
    let lastSync = 'Nunca';
    if (total > 0) {
      const dates = reconnectProperties
        .map(p => p.reconnect_last_sync ? new Date(p.reconnect_last_sync) : null)
        .filter(d => d);
      if (dates.length > 0) {
        const maxDate = new Date(Math.max(...dates));
        lastSync = maxDate.toLocaleString('es-CR', {
          timeZone: 'America/Costa_Rica',
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      }
    }

    return { total, altitudCount, ceroCount, lastSync };
  }, [reconnectProperties]);

  // Unique property types for filter dropdown
  const uniqueTypes = useMemo(() => {
    const types = reconnectProperties.map(p => p.property_type).filter(t => t);
    return Array.from(new Set(types));
  }, [reconnectProperties]);

  // Filtered properties for list
  const filteredProperties = useMemo(() => {
    return reconnectProperties.filter(p => {
      // 1. Search Query (Title or ReConnect ID)
      const matchesSearch = 
        !searchQuery ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.listing_title_es?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.reconnect_listing_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.finca_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.plano_number?.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Office Filter
      const isCero = p.office_code === 'R0700151' || p.office_code?.toLowerCase()?.includes('cero');
      const matchesOffice = 
        officeFilter === 'all' ||
        (officeFilter === 'cero' && isCero) ||
        (officeFilter === 'altitud' && !isCero);

      // 3. Type Filter
      const matchesType = typeFilter === 'all' || p.property_type === typeFilter;

      return matchesSearch && matchesOffice && matchesType;
    });
  }, [reconnectProperties, searchQuery, officeFilter, typeFilter]);

  // Format currency
  const formatPrice = (price, currencyId) => {
    if (!price) return 'Precio Privado';
    const isUSD = currencyId === 2;
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: isUSD ? 'USD' : 'CRC',
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Trigger Office Sync
  const handleSyncOffice = async (officeKey) => {
    setSyncingOffice(officeKey);
    setSyncResult(null);
    try {
      const res = await fetch('/api/properties/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officeKey }),
      });
      const data = await res.json();
      setSyncResult(data);
      if (data.success) {
        router.refresh();
      }
    } catch (err) {
      console.error('Office sync failed:', err);
      setSyncResult({ success: false, error: err.message });
    } finally {
      setSyncingOffice(null);
    }
  };

  // Trigger Individual Listing Sync
  const [syncingListingId, setSyncingListingId] = useState(null);
  const handleSyncSingleListing = async (listingId, officeCode) => {
    setSyncingListingId(listingId);
    try {
      const officeKey = officeCode === 'R0700151' ? 'cero' : 'altitud';
      const res = await fetch('/api/properties/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officeKey, associateId: null, agentId: null }), // re-fetches feed
      });
      const data = await res.json();
      if (data.success) {
        // Find updated details to show inside the drawer
        router.refresh();
        alert('Sincronización de propiedad finalizada exitosamente.');
      } else {
        alert('Error al sincronizar: ' + (data.error || 'Desconocido'));
      }
    } catch (err) {
      alert('Error de red: ' + err.message);
    } finally {
      setSyncingListingId(null);
    }
  };

  // Safe helper to resolve property assigned agent details
  const getAssignedAgent = (agentId) => {
    if (!agentId) return null;
    return profiles.find(prof => prof.auth_user_id === agentId) || null;
  };

  return (
    <div className="space-y-8 animate-fade-in relative z-10">
      
      {/* ── Header Area ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black italic text-slate-900 dark:text-white flex items-center gap-2">
            <span className="p-2 rounded-xl bg-nexus-blue/10 dark:bg-nexus-blue/20 text-nexus-blue text-lg">🔄</span> 
            <span>{t('ofc_sync_reconnect')}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Módulo inteligente de importación, mapeo y auditoría de propiedades desde el feed REI API CCA v1.0.
          </p>
        </div>
      </div>

      {/* ── Ingestion Summary Statistics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Propiedades Ingestadas', val: stats.total, color: 'text-nexus-blue', bgGlow: 'bg-nexus-blue/10', icon: '🏠' },
          { label: 'Remax Altitud (R0700130)', val: stats.altitudCount, color: 'text-blue-500', bgGlow: 'bg-blue-500/10', icon: '🏢' },
          { label: 'Altitud Cero (R0700151)', val: stats.ceroCount, color: 'text-sky-500', bgGlow: 'bg-sky-500/10', icon: '🏖️' },
          { label: 'Última Actualización', val: stats.lastSync, color: 'text-emerald-500 dark:text-emerald-400', bgGlow: 'bg-emerald-500/10', icon: '🕒', isDate: true },
        ].map((s, idx) => (
          <div key={idx} className="glass-panel backdrop-blur-md bg-white/40 dark:bg-slate-900/40 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/80 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-xl -mr-4 -mt-4 transition-all duration-300 ${s.bgGlow}`}></div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</span>
              <span className="text-sm shrink-0">{s.icon}</span>
            </div>
            <span className={`text-xl md:text-2xl font-black mt-4 leading-none ${s.color} ${s.isDate ? 'text-xs md:text-[11px] font-bold tracking-wide uppercase leading-normal' : ''}`}>
              {s.val}
            </span>
          </div>
        ))}
      </div>

      {/* ── Active Sync Control Desk ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sync Altitud */}
        <div className="glass-panel backdrop-blur-md bg-white/30 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/80 rounded-[28px] p-6 flex flex-col justify-between gap-6 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-blue/5 rounded-full blur-2xl group-hover:bg-nexus-blue/10 transition-all duration-300"></div>
          <div className="space-y-3">
            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
              Altitud Office Feed
            </span>
            <h4 className="text-base font-black text-slate-900 dark:text-white mt-3 flex items-center gap-2">
              RE/MAX Altitud <span className="text-[10px] font-black bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">R0700130</span>
            </h4>
            <p className="text-[10px] text-slate-400 leading-relaxed font-bold tracking-wider uppercase">
              GUID: FEA8746D-CC1D-41B8-89F3-D04AC98274AF
            </p>
          </div>
          <button
            onClick={() => handleSyncOffice('altitud')}
            disabled={!!syncingOffice}
            className="w-full bg-nexus-blue hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {syncingOffice === 'altitud' ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                Importando Propiedades...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" /></svg>
                Sincronizar Oficina Altitud
              </>
            )}
          </button>
        </div>

        {/* Sync Cero */}
        <div className="glass-panel backdrop-blur-md bg-white/30 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/80 rounded-[28px] p-6 flex flex-col justify-between gap-6 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-all duration-300"></div>
          <div className="space-y-3">
            <span className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
              Cero Office Feed
            </span>
            <h4 className="text-base font-black text-slate-900 dark:text-white mt-3 flex items-center gap-2">
              Altitud Cero <span className="text-[10px] font-black bg-sky-500/10 text-sky-500 px-2 py-0.5 rounded">R0700151</span>
            </h4>
            <p className="text-[10px] text-slate-400 leading-relaxed font-bold tracking-wider uppercase">
              GUID: 4AD5AE8F-5B47-4A1A-A953-40445F2B4940
            </p>
          </div>
          <button
            onClick={() => handleSyncOffice('cero')}
            disabled={!!syncingOffice}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-500/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {syncingOffice === 'cero' ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                Importando Propiedades...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" /></svg>
                Sincronizar Oficina Cero
              </>
            )}
          </button>
        </div>

      </div>

      {/* ── Sync Feedback Box ── */}
      {syncResult && (
        <div className={`p-6 rounded-[22px] border shadow-sm transition-all duration-300 ${
          syncResult.success 
            ? 'bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/10' 
            : 'bg-rose-500/5 border-rose-500/20 dark:bg-rose-500/10'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h5 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${syncResult.success ? 'text-emerald-500' : 'text-rose-500'}`}>
                <span>{syncResult.success ? '✓' : '✗'}</span>
                <span>{syncResult.success ? 'Sincronización Finalizada Exitosamente' : 'Fallo en la Descarga del Feed'}</span>
              </h5>
              {syncResult.success ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                  <div className="p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">{t('ofc_sync_found')}</p>
                    <p className="text-base font-black text-slate-800 dark:text-slate-200 mt-1">{syncResult.total_in_feed}</p>
                  </div>
                  <div className="p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Importados/Actualizados</p>
                    <p className="text-base font-black text-emerald-500 mt-1">{syncResult.imported}</p>
                  </div>
                  <div className="p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">{t('ofc_sync_ignored')}</p>
                    <p className="text-base font-black text-slate-500 mt-1">{syncResult.skipped}</p>
                  </div>
                  <div className="p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">{t('ofc_sync_errors')}</p>
                    <p className="text-base font-black text-rose-500 mt-1">{syncResult.errors?.length || 0}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-rose-400 mt-2 font-bold tracking-wide leading-relaxed uppercase">
                  {syncResult.error || 'Ocurrió un error inesperado al descargar el feed de ReConnect.'}
                </p>
              )}
            </div>
            <button onClick={() => setSyncResult(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Interactive Properties List ── */}
      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-[32px] shadow-xl border border-slate-200/60 dark:border-slate-800/80 overflow-hidden">
        
        {/* Search & Filters */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-slate-50/20 dark:bg-slate-900/10">
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
              <span>📋</span> Registro de Propiedades Sincronizadas
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">Inventario ingestado bajo control del Broker. Filtrados: {filteredProperties.length}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:max-w-2xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por Título, ReConnect ID, Finca, Plano..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue transition-all"
              />
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
            </div>

            {/* Office Filter */}
            <select
              value={officeFilter}
              onChange={e => setOfficeFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
            >
              <option value="all">{t('ofc_all_offices')}</option>
              <option value="altitud">RE/MAX Altitud</option>
              <option value="cero">{t('ofc_portal_cero')}</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
            >
              <option value="all">Todos los Tipos</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Listings Roster Table */}
        <div className="overflow-x-auto">
          {filteredProperties.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
              No hay propiedades importadas asociadas a esta búsqueda o filtros.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 dark:bg-slate-900/10 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4.5 text-[9px] font-black uppercase tracking-widest text-slate-400 w-16">Foto</th>
                  <th className="px-6 py-4.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Título / Clasificación</th>
                  <th className="px-6 py-4.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Datos ReConnect</th>
                  <th className="px-6 py-4.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Catastro / Registro</th>
                  <th className="px-6 py-4.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Precio / Valuación</th>
                  <th className="px-6 py-4.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Última Sincronización</th>
                  <th className="px-6 py-4.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredProperties.map(p => {
                  const isCero = p.office_code === 'R0700151' || p.office_code?.toLowerCase()?.includes('cero');
                  const syncTime = p.reconnect_last_sync 
                    ? new Date(p.reconnect_last_sync).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })
                    : 'Nunca';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden relative shrink-0">
                          {p.property_images?.[0]?.image_url || p.images?.[0]?.image_url ? (
                            <img
                              src={p.property_images?.[0]?.image_url || p.images?.[0]?.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">🏠</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={p.name}>
                          {p.name || p.listing_title_es}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                            {p.property_type || 'Casa'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">#{p.reconnect_listing_id}</p>
                        <span className={`inline-block mt-1.5 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          isCero 
                            ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/20 dark:text-sky-400' 
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          {isCero ? 'Cero Office' : 'Altitud Office'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                            <span className="text-[8px] font-black uppercase text-slate-400 mr-1">Finca:</span>
                            {p.finca_number || <span className="italic text-slate-400 text-[9px]">No Registrado</span>}
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                            <span className="text-[8px] font-black uppercase text-slate-400 mr-1">Plano:</span>
                            {p.plano_number || <span className="italic text-slate-400 text-[9px]">No Registrado</span>}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatPrice(p.list_price, p.list_price_currency_id)}
                        </p>
                        {p.list_price_private && (
                          <span className="inline-block mt-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/25 text-rose-500 rounded">
                            Privado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                        {syncTime}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedProperty(p)}
                          className="bg-nexus-blue/10 hover:bg-nexus-blue text-nexus-blue hover:text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center inline-flex"
                        >
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* ── 💎 Ingestion Sheet Details Drawer (Ficha de Ingesta) ── */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-all duration-300" onClick={() => setSelectedProperty(null)}>
          <div 
            className="w-full max-w-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl h-full shadow-2xl p-8 overflow-y-auto border-l border-slate-200/50 dark:border-slate-800/80 flex flex-col gap-6 relative z-50 animate-slide-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Trigger */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="bg-nexus-blue/10 dark:bg-nexus-blue/20 text-nexus-blue px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">
                  Ficha de Ingesta ReConnect
                </span>
                <h4 className="text-base font-black text-slate-900 dark:text-white mt-2">
                  #{selectedProperty.reconnect_listing_id} — {selectedProperty.name || selectedProperty.listing_title_es}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedProperty(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Ingestion Photo & Quick Tags */}
            <div className="w-full h-48 rounded-[20px] bg-slate-900 overflow-hidden relative border border-slate-200/40 dark:border-slate-800/80 shrink-0">
              {selectedProperty.property_images?.[0]?.image_url || selectedProperty.images?.[0]?.image_url ? (
                <img 
                  src={selectedProperty.property_images?.[0]?.image_url || selectedProperty.images?.[0]?.image_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold uppercase text-xs">🏠 Sin Fotos Cargadas</div>
              )}
              
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                <span className="bg-slate-950/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                  {selectedProperty.property_type || 'Casa'}
                </span>
                <span className="bg-nexus-blue/90 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                  {selectedProperty.office_code === 'R0700151' ? 'Cero Office' : 'Altitud Office'}
                </span>
              </div>
            </div>

            {/* Costa Rica Catastro and Registry Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">NÚMERO DE FINCA (REGISTRO)</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-2">
                  {selectedProperty.finca_number || <span className="italic font-bold text-xs text-slate-400">No Registrado</span>}
                </span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">PLANO CATASTRADO (TOPOGRAFÍA)</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-2">
                  {selectedProperty.plano_number || <span className="italic font-bold text-xs text-slate-400">No Registrado</span>}
                </span>
              </div>
            </div>

            {/* Sizing, Valuation & Expired Date */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/80 text-center">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Área Lote</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-250 mt-1 block">
                  {selectedProperty.size_sqm || selectedProperty.lot_size_area ? `${selectedProperty.size_sqm || selectedProperty.lot_size_area} m²` : 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/80 text-center">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Área Construcción</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-250 mt-1 block">
                  {selectedProperty.construction_size_living || selectedProperty.construction_size ? `${selectedProperty.construction_size_living || selectedProperty.construction_size} m²` : 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/80 text-center">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Precio Lista</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-250 mt-1 block truncate" title={formatPrice(selectedProperty.list_price, selectedProperty.list_price_currency_id)}>
                  {formatPrice(selectedProperty.list_price, selectedProperty.list_price_currency_id)}
                </span>
              </div>
            </div>

            {/* Assigned Agent Profile Card */}
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Asesor Asignado en Hub</span>
              {getAssignedAgent(selectedProperty.agent_id) ? (
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-800 relative">
                    <img 
                      src={getAssignedAgent(selectedProperty.agent_id).avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(getAssignedAgent(selectedProperty.agent_id).full_name)}&background=5a82bf&color=fff`} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white leading-none">
                      {getAssignedAgent(selectedProperty.agent_id).full_name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                      {getAssignedAgent(selectedProperty.agent_id).email}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 text-amber-500 text-xs rounded-xl flex items-center gap-2">
                  <span>⚠️</span> Fallback al Administrador General (Asesor no registrado con ID #{selectedProperty.agent_id})
                </div>
              )}
            </div>

            {/* Mapped Public Remarks / Private Remarks */}
            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Descripción de Propiedad (Borrador Español)</span>
                <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {selectedProperty.public_remarks_es || 'Sin descripción en español ingresada.'}
                </p>
              </div>
              
              {selectedProperty.private_remarks_es && (
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Comentarios Privados (Mapeados)</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 whitespace-pre-wrap max-h-24 overflow-y-auto italic">
                    {selectedProperty.private_remarks_es}
                  </p>
                </div>
              )}
            </div>

            {/* Normalization Amenities Checklist */}
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-3">Auditoría de Amenidades (Normalizado)</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { name: 'Piscina Privada', val: selectedProperty.pool_private },
                  { name: 'Cochera', val: selectedProperty.garage },
                  { name: 'Cochera Techada', val: selectedProperty.garage_covered },
                  { name: 'Gated Community', val: selectedProperty.gated_community },
                  { name: 'Equipada / Amoblada', val: selectedProperty.furnished },
                  { name: 'Cuarto de Servicio', val: selectedProperty.maid_room },
                  { name: 'Nueva / Estrenar', val: selectedProperty.property_new },
                  { name: 'Contrato Exclusivo', val: selectedProperty.listing_agreement },
                  { name: 'Cuota Condominal', val: selectedProperty.has_association },
                ].map((a, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-200/50 dark:border-slate-800/60">
                    <span className={`text-[10px] ${a.val ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {a.val ? '✓' : '✗'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-350 truncate">
                      {a.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Logs and Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="text-left">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-450 block">Último Log de Sincronización</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  {selectedProperty.reconnect_last_sync ? new Date(selectedProperty.reconnect_last_sync).toLocaleString('es-CR') : 'Nunca'}
                </span>
              </div>
              
              <button
                onClick={() => handleSyncSingleListing(selectedProperty.reconnect_listing_id, selectedProperty.office_code)}
                disabled={syncingListingId === selectedProperty.reconnect_listing_id}
                className="w-full sm:w-auto bg-nexus-blue hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {syncingListingId === selectedProperty.selectedProperty ? (
                  <>
                    <svg className="animate-spin w-4.5 h-4.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" /></svg>
                    Forzar Re-Sincronización
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
