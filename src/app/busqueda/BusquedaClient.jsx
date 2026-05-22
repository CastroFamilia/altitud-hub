"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddRequirementModal from '@/components/busqueda/AddRequirementModal';
import AddExternalPropertyModal from '@/components/busqueda/AddExternalPropertyModal';
import { getACMFlatIndex, searchACMLocations } from '@/lib/locations';
import Image from 'next/image';
import { trackOkrActivity } from '@/lib/okr-tracker';

const LOCAL_T = {
  es: {
    title: 'BÚSQUEDA',
    subtitle: 'Matchmaking Inmobiliario',
    panel_title: 'Panel de Requerimientos',
    panel_desc: 'Registra lo que tus clientes buscan y encuentra propiedades (match) dentro de la oficina.',
    btn_new: 'Nueva Búsqueda',
    hot_zones: 'Zonas Calientes',
    no_active: 'No hay búsquedas activas en la red.',
    tab_mine: 'Mis Búsquedas',
    tab_net: 'Red Altitud',
    no_mine: 'No tienes búsquedas registradas.',
    days_unverified: '+30 días sin verificar.',
    confirm_active: 'Confirmar Activa',
    agent: 'Agente',
    select_search: 'Selecciona una búsqueda para ver coincidencias',
    matches_for: 'Coincidencias para',
    no_matches: 'No hay coincidencias actuales con el inventario.',
    status_sent: 'Enviada',
    mark_sent: 'Marcar Enviada',
    status_int: 'Interesado',
    status_rej: 'Rechazada',
    pipe_title: 'Pipeline y Portal del Cliente',
    btn_ext: '+ Externa',
    btn_copy: 'Copiar Portal URL',
    prop_ext: 'Propiedad Externa',
    prop: 'Propiedad',
    modal_req_title: 'Nuevo Requerimiento',
    modal_req_name: 'Nombre del Cliente',
    modal_req_name_pl: 'Ej. Juan Pérez',
    modal_req_op: 'Operación',
    op_sale: 'Venta',
    op_rent: 'Alquiler',
    modal_req_type: 'Tipo Propiedad',
    type_lot: 'Lote',
    type_house: 'Casa',
    type_apt: 'Apartamento',
    type_com: 'Comercial',
    type_farm: 'Finca',
    modal_req_zones: 'Zonas (Múltiples)',
    modal_req_zones_pl: 'Escribe la zona (Ej. Cajón, Uvita...)',
    modal_req_min_area: 'Área Mínima del Lote',
    modal_req_area_pl: 'Ej. 1000',
    unit_m2: 'm²',
    unit_ha: 'Hectáreas',
    unit_ac: 'Acres',
    modal_req_beds: 'Habs Mín.',
    modal_req_beds_pl: 'Ej. 3',
    modal_req_baths: 'Baños Mín.',
    modal_req_baths_pl: 'Ej. 2',
    modal_req_const: 'M² Mínimos Construcción',
    modal_req_const_pl: 'Ej. 150',
    modal_req_pmin: 'Precio Mínimo ($)',
    modal_req_pmax: 'Precio Máximo ($)',
    modal_req_tol: 'Tolerancia Precio',
    tol_0: 'Exacto (0%)',
    tol_5: '+/- 5%',
    tol_10: '+/- 10%',
    tol_15: '+/- 15%',
    tol_20: '+/- 20%',
    modal_req_must: 'Must Haves (Indispensables)',
    modal_req_must_pl: 'Ej. 3 Cuartos',
    modal_req_nice: 'Nice to Haves (Deseables)',
    modal_req_nice_pl: 'Ej. Piscina',
    modal_req_time: 'Tiempo de Compra',
    time_urg: 'Urgente',
    time_3_6: '3 a 6 meses',
    time_6_plus: 'Más de 6 meses',
    time_dk: 'No lo sabe',
    modal_req_pay: 'Tipo de Pago',
    pay_cash: 'Efectivo',
    pay_cred: 'Crédito Otorgado',
    pay_own: 'Financiamiento del Dueño',
    btn_cancel: 'Cancelar',
    btn_save_search: 'Guardar Búsqueda',
    modal_ext_title: 'Agregar Propiedad Externa',
    modal_ext_name: 'Nombre / Título',
    modal_ext_name_pl: 'Ej. Casa en Escazú',
    modal_ext_price: 'Precio (USD)',
    modal_ext_url: 'URL (Opcional)',
    btn_add_pipe: 'Agregar a Pipeline',
    copied_alert: 'Enlace del Portal copiado al portapapeles. ¡Envíalo a tu cliente!',
    added_ext_alert: 'Propiedad externa agregada exitosamente.',
    err_ext_alert: 'Error agregando propiedad externa.',
    err_save_alert: 'Error al guardar. Verifica tu conexión o vuelve a iniciar sesión.'
  },
  en: {
    title: 'SEARCH',
    subtitle: 'Real Estate Matchmaking',
    panel_title: 'Requirements Panel',
    panel_desc: 'Register what your clients are looking for and find matching properties within the office.',
    btn_new: 'New Search',
    hot_zones: 'Hot Zones',
    no_active: 'No active searches in the network.',
    tab_mine: 'My Searches',
    tab_net: 'Altitude Network',
    no_mine: 'You have no registered searches.',
    days_unverified: '+30 days unverified.',
    confirm_active: 'Confirm Active',
    agent: 'Agent',
    select_search: 'Select a search to view matches',
    matches_for: 'Matches for',
    no_matches: 'No current matches with inventory.',
    status_sent: 'Sent',
    mark_sent: 'Mark Sent',
    status_int: 'Interested',
    status_rej: 'Rejected',
    pipe_title: 'Pipeline and Client Portal',
    btn_ext: '+ External',
    btn_copy: 'Copy Portal URL',
    prop_ext: 'External Property',
    prop: 'Property',
    modal_req_title: 'New Requirement',
    modal_req_name: 'Client Name',
    modal_req_name_pl: 'E.g. John Doe',
    modal_req_op: 'Operation',
    op_sale: 'Sale',
    op_rent: 'Rent',
    modal_req_type: 'Property Type',
    type_lot: 'Lot',
    type_house: 'House',
    type_apt: 'Apartment',
    type_com: 'Commercial',
    type_farm: 'Farm',
    modal_req_zones: 'Zones (Multiple)',
    modal_req_zones_pl: 'Type zone (E.g. Cajón, Uvita...)',
    modal_req_min_area: 'Minimum Lot Area',
    modal_req_area_pl: 'E.g. 1000',
    unit_m2: 'm²',
    unit_ha: 'Hectares',
    unit_ac: 'Acres',
    modal_req_beds: 'Min. Beds',
    modal_req_beds_pl: 'E.g. 3',
    modal_req_baths: 'Min. Baths',
    modal_req_baths_pl: 'E.g. 2',
    modal_req_const: 'Min. Construction Sqm',
    modal_req_const_pl: 'E.g. 150',
    modal_req_pmin: 'Min. Price ($)',
    modal_req_pmax: 'Max. Price ($)',
    modal_req_tol: 'Price Tolerance',
    tol_0: 'Exact (0%)',
    tol_5: '+/- 5%',
    tol_10: '+/- 10%',
    tol_15: '+/- 15%',
    tol_20: '+/- 20%',
    modal_req_must: 'Must Haves',
    modal_req_must_pl: 'E.g. 3 Bedrooms',
    modal_req_nice: 'Nice to Haves',
    modal_req_nice_pl: 'E.g. Pool',
    modal_req_time: 'Purchase Timeframe',
    time_urg: 'Urgent',
    time_3_6: '3 to 6 months',
    time_6_plus: 'More than 6 months',
    time_dk: 'Doesn\'t know',
    modal_req_pay: 'Payment Type',
    pay_cash: 'Cash',
    pay_cred: 'Bank Credit',
    pay_own: 'Owner Financing',
    btn_cancel: 'Cancel',
    btn_save_search: 'Save Search',
    modal_ext_title: 'Add External Property',
    modal_ext_name: 'Name / Title',
    modal_ext_name_pl: 'E.g. House in Escazú',
    modal_ext_price: 'Price (USD)',
    modal_ext_url: 'URL (Optional)',
    btn_add_pipe: 'Add to Pipeline',
    copied_alert: 'Portal link copied to clipboard. Send it to your client!',
    added_ext_alert: 'External property added successfully.',
    err_ext_alert: 'Error adding external property.',
    err_save_alert: 'Error saving. Check your connection or log in again.'
  }
};

export default function BusquedaClient({ initialSearches = [], initialAllSearches = [] }) {
  const { profile, supabase } = useAuth();
  const router = useRouter();
  const { t, lang } = useApp();
  const l = LOCAL_T[lang] || LOCAL_T['es'];
  
  const [searches, setSearches] = useState(initialSearches);
  const [allSearches, setAllSearches] = useState(initialAllSearches);
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState(null);
  const [activeTab, setActiveTab] = useState('mias'); // 'mias' | 'red'
  
  
  const handleRemoveTag = (field, index) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const [matches, setMatches] = useState([]);
  const [pipelineMap, setPipelineMap] = useState({});
  const [loadingMatches, setLoadingMatches] = useState(false);

  const [showExternalModal, setShowExternalModal] = useState(false);
        const handleSelectSearch = async (search) => {
    setSelectedSearch(search);
    setLoadingMatches(true);
    try {
      const res = await fetch(`/api/searches/matches?search_id=${search.id}`);
      const data = await res.json();
      setMatches(data.matches || []);
      setPipelineMap(prev => ({ ...prev, [search.id]: data.pipeline || [] }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const updateStatus = async (id, type, newStatus) => {
    try {
      const res = await fetch('/api/searches/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_id: selectedSearch.id,
          match_type: type,
          match_id: id,
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.pipeline) {
        handleSelectSearch(selectedSearch);
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    }
  };

    const copyPortalLink = () => {
    if (!selectedSearch) return;
    const url = `${window.location.origin}/portal/busqueda/${selectedSearch.id}`;
    navigator.clipboard.writeText(url);
    alert(l.copied_alert);
  };

  const handleRenewSearch = async (searchId) => {
    try {
      await fetch('/api/searches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: searchId, status: 'activa' })
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const zoneStats = allSearches.reduce((acc, s) => {
    const zone = s.zone_name || 'Sin Zona';
    acc[zone] = (acc[zone] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
        <div className="space-y-8">

          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-xl font-black italic text-slate-900 dark:text-white">{l.panel_title}</h2>
              <p className="text-xs text-slate-500 mt-1">{l.panel_desc}</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-nexus-blue hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              {l.btn_new}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-black italic text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>🗺️</span> {l.hot_zones}
                </h3>
                <div className="space-y-3">
                  {Object.entries(zoneStats).sort((a,b) => b[1] - a[1]).slice(0,5).map(([zone, count]) => (
                    <div key={zone} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{zone}</span>
                      <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded text-[10px] font-black">{count}</span>
                    </div>
                  ))}
                  {Object.keys(zoneStats).length === 0 && <p className="text-xs text-slate-400">{l.no_active}</p>}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[600px]">
                <div className="flex border-b border-slate-100 dark:border-slate-700">
                  <button 
                    onClick={() => setActiveTab('mias')}
                    className={`flex-1 p-4 text-xs font-black italic text-center transition-colors ${activeTab === 'mias' ? 'text-nexus-blue border-b-2 border-nexus-blue bg-blue-50 dark:bg-blue-900/10' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    {l.tab_mine}
                  </button>
                  <button 
                    onClick={() => setActiveTab('red')}
                    className={`flex-1 p-4 text-xs font-black italic text-center transition-colors ${activeTab === 'red' ? 'text-nexus-blue border-b-2 border-nexus-blue bg-blue-50 dark:bg-blue-900/10' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    {l.tab_net}
                  </button>
                </div>
                
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50 flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center"><div className="animate-spin w-5 h-5 mx-auto border-2 border-nexus-blue border-t-transparent rounded-full"></div></div>
                  ) : activeTab === 'mias' ? (
                    searches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">{l.no_mine}</div>
                    ) : searches.map(s => {
                      const daysSinceVerified = Math.floor((new Date() - new Date(s.last_verified_at)) / (1000 * 60 * 60 * 24));
                      const needsRenewal = daysSinceVerified >= 30;

                      return (
                        <div 
                          key={s.id} 
                          onClick={() => handleSelectSearch(s)}
                          className={`p-5 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${selectedSearch?.id === s.id ? 'bg-nexus-blue/5 dark:bg-nexus-blue/10 border-l-4 border-nexus-blue' : 'border-l-4 border-transparent'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{s.client_name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${s.status === 'activa' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                              {s.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mb-2">
                            {s.operation_type === 'alquiler' ? (lang === 'en' ? 'RENT' : 'ALQUILER') : (lang === 'en' ? 'SALE' : 'VENTA')} • {s.property_type} • {(s.zones && s.zones.length > 0) ? s.zones.join(', ') : '-'}
                          </p>
                          <p className="text-xs font-black italic text-nexus-blue mb-3">
                            ${Number(s.price_min || 0).toLocaleString()} - ${Number(s.price_max || 0).toLocaleString()}
                          </p>

                          {needsRenewal && s.status === 'activa' && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-3 text-center">
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-2">{l.days_unverified}</p>
                              <button onClick={(e) => { e.stopPropagation(); handleRenewSearch(s.id); }} className="bg-amber-500 text-white px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">
                                {l.confirm_active}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    allSearches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">{l.no_active}</div>
                    ) : allSearches.map(s => (
                      <div key={s.id} className="p-5 border-l-4 border-transparent">
                        <div className="flex items-center gap-2 mb-2">
                          {s.profiles?.avatar_url ? (
                            <Image src={s.profiles.avatar_url} alt={s.profiles.full_name} className="w-5 h-5 rounded-full object-cover" width={20} height={20} />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold">
                              {s.profiles?.full_name?.charAt(0) || '?'}
                            </div>
                          )}
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{s.profiles?.full_name || l.agent}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{s.property_type}</h4>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mb-2">
                          {s.operation_type === 'alquiler' ? (lang === 'en' ? 'RENT' : 'ALQ') : (lang === 'en' ? 'SALE' : 'VTA')} • {(s.zones && s.zones.length > 0) ? s.zones.join(', ') : '-'}
                        </p>
                        <p className="text-xs font-black italic text-nexus-blue">
                          ${Number(s.price_min || 0).toLocaleString()} - ${Number(s.price_max || 0).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {!selectedSearch ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center h-full flex flex-col items-center justify-center">
                  <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{l.select_search}</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[600px]">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white flex items-center gap-2">
                      <span>✨</span> {l.matches_for} {selectedSearch.client_name}
                    </h3>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto">
                    {loadingMatches ? (
                      <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full"></div></div>
                    ) : matches.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-4 text-center">{l.no_matches}</p>
                    ) : (
                      matches.map(m => {
                        const matchKey = m.id || m.match_id;
                        const pipe = (pipelineMap[selectedSearch.id] || []).find(p => p.match_id === m.id);
                        const isReconnect = m.type === 'reconnect';
                        return (
                          <div key={matchKey} className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-start shadow-sm mb-4 transition-all ${isReconnect ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                            {/* Thumbnail — RECONNECT listings only */}
                            {isReconnect && m.main_image_url && (
                              <div className="w-full md:w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                                <img src={m.main_image_url} alt={m.name} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  {isReconnect ? (
                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                      <span className="text-[10px] font-black text-white bg-emerald-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        🔗 RECONNECT
                                      </span>
                                      {m.office_key && (
                                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                          {m.office_key === 'altitud' ? 'Altitud' : 'Cero'}
                                        </span>
                                      )}
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">· Live</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase tracking-wider">
                                      {m.type.toUpperCase()}
                                    </span>
                                  )}
                                  {m.match_score !== undefined && (
                                    <span className="ml-2 text-[10px] font-bold text-white bg-nexus-blue px-2 py-0.5 rounded uppercase tracking-wider">
                                      Match {m.match_score}%
                                    </span>
                                  )}
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-tight">{m.name}</h4>
                                  {isReconnect && m.location && (
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                                      {m.location}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className={`font-black text-sm ${isReconnect ? 'text-emerald-700 dark:text-emerald-400' : 'text-nexus-blue'}`}>${Number(m.price).toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="mt-3 flex gap-2 flex-wrap">
                                {isReconnect ? (
                                  <Link
                                    href="/propiedades"
                                    className="text-[10px] px-3 py-1.5 rounded-lg font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors"
                                  >
                                    🏠 Ver en Mis Propiedades
                                  </Link>
                                ) : (
                                  !pipe || pipe.status === 'enviada' ? (
                                    <button onClick={() => updateStatus(m.id, m.type, 'enviada')} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-colors ${pipe?.status === 'enviada' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-blue-50'}`}>
                                      {pipe?.status === 'enviada' ? l.status_sent : l.mark_sent}
                                    </button>
                                  ) : (
                                    <span className={`text-[10px] px-3 py-1.5 rounded-lg font-bold ${pipe.status === 'interesado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {pipe.status === 'interesado' ? l.status_int : l.status_rej}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{l.pipe_title}</h3>
                      <div className="flex space-x-2">
                        <button onClick={() => setShowExternalModal(true)} className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors">
                          {l.btn_ext}
                        </button>
                        <button onClick={copyPortalLink} className="text-xs font-bold px-3 py-1.5 bg-nexus-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm flex items-center">
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                          {l.btn_copy}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {(pipelineMap[selectedSearch.id] || []).map(p => (
                        <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <span className={`w-2 h-2 rounded-full ${p.status === 'enviada' ? 'bg-blue-400' : p.status === 'interesado' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {p.match_type === 'external' ? (p.external_data?.name || l.prop_ext) : l.prop}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold uppercase text-slate-500">
                            {p.status === 'interesado' ? l.status_int : p.status === 'rechazada' ? l.status_rej : l.status_sent}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      <AddRequirementModal isOpen={showModal} onClose={() => setShowModal(false)} l={l} />
      <AddExternalPropertyModal isOpen={showExternalModal} onClose={() => setShowExternalModal(false)} activeSearchId={selectedSearch?.id} l={l} />
    </>
  );
}
