"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import TopNav from '@/components/layout/TopNav';
import Link from 'next/link';
import { getACMFlatIndex, searchACMLocations } from '@/lib/locations';
import Image from 'next/image';

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

export default function BusquedaClient() {
  const { profile, supabase } = useAuth();
  const { t, lang } = useApp();
  const l = LOCAL_T[lang] || LOCAL_T.es;
  
  const [searches, setSearches] = useState([]);
  const [allSearches, setAllSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState(null);
  const [activeTab, setActiveTab] = useState('mias'); // 'mias' | 'red'
  
  const [form, setForm] = useState({
    operation_type: 'venta',
    client_name: '',
    property_type: 'Casa',
    price_min: '',
    price_max: '',
    purchase_timeframe: 'urgente',
    purchase_type: 'efectivo',
    zones: [],
    must_haves: [],
    nice_to_haves: [],
    price_tolerance: '0',
    min_bedrooms: '',
    min_bathrooms: '',
    min_sqm: '',
    min_sqm_unit: 'm2'
  });

  const locationsIndex = getACMFlatIndex();

  const [tagInput, setTagInput] = useState({ zone: '', must: '', nice: '' });
  const [zoneSuggestions, setZoneSuggestions] = useState([]);

  const handleAddTag = (field, value) => {
    if (!value.trim()) return;
    setForm(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
    setTagInput(prev => ({ ...prev, [field === 'zones' ? 'zone' : field === 'must_haves' ? 'must' : 'nice']: '' }));
  };

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
  const [externalForm, setExternalForm] = useState({
    url: '',
    name: '',
    price: '',
    image_url: '',
    location: ''
  });

  const loadSearches = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch('/api/searches');
      const data = await res.json();
      setSearches(data.searches || []);
      
      const resAll = await fetch('/api/searches?all=true');
      const dataAll = await resAll.json();
      setAllSearches((dataAll.searches || []).filter(s => s.status === 'activa'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadSearches();
  }, [loadSearches]);


  const handleCreateSearch = async (e) => {
    e.preventDefault();
    try {
      let final_min_sqm = Number(form.min_sqm || 0);
      if (['Lote', 'Finca'].includes(form.property_type) && final_min_sqm > 0) {
        if (form.min_sqm_unit === 'ha') final_min_sqm = final_min_sqm * 10000;
        if (form.min_sqm_unit === 'acres') final_min_sqm = final_min_sqm * 4046.86;
      }

      const payload = { ...form, min_sqm: final_min_sqm };

      const res = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.search) {

        setShowModal(false);
        setForm({ operation_type: 'venta', client_name: '', property_type: 'Casa', price_min: '', price_max: '', purchase_timeframe: 'urgente', purchase_type: 'efectivo', zones: [], must_haves: [], nice_to_haves: [], price_tolerance: '0', min_bedrooms: '', min_bathrooms: '', min_sqm: '', min_sqm_unit: 'm2' });
        loadSearches();
      } else {
        alert(data.error || l.err_save_alert);
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleAddExternal = async (e) => {
    e.preventDefault();
    if (!selectedSearch || !externalForm.name || !externalForm.price) return;
    
    try {
      const externalData = {
        name: externalForm.name,
        list_price: Number(externalForm.price),
        main_image_url: externalForm.image_url,
        url: externalForm.url,
        location: externalForm.location
      };

      const { data: pipelineItem, error: err } = await supabase
        .from('buyer_search_pipeline')
        .insert({
          search_id: selectedSearch.id,
          match_type: 'external',
          match_id: '00000000-0000-0000-0000-000000000000',
          status: 'enviada',
          external_data: externalData
        })
        .select()
        .single();

      if (err) throw err;

      setPipelineMap(prev => ({
        ...prev,
        [selectedSearch.id]: [...(prev[selectedSearch.id] || []), pipelineItem]
      }));

      setShowExternalModal(false);
      setExternalForm({ url: '', name: '', price: '', image_url: '', location: '' });
      alert(l.added_ext_alert);
    } catch (error) {
      console.error(error);
      alert(l.err_ext_alert);
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
      loadSearches();
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
      <TopNav title={l.title} subtitle={l.subtitle} />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto space-y-8">

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
                        const pipe = (pipelineMap[selectedSearch.id] || []).find(p => p.match_id === m.id);
                        return (
                          <div key={m.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-start shadow-sm mb-4">
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase tracking-wider">
                                    {m.type.toUpperCase()}
                                  </span>
                                  {m.match_score !== undefined && (
                                    <span className="ml-2 text-[10px] font-bold text-white bg-nexus-blue px-2 py-0.5 rounded uppercase tracking-wider">
                                      Match {m.match_score}%
                                    </span>
                                  )}
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-tight">{m.name}</h4>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-nexus-blue text-sm">${Number(m.price).toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="mt-3 flex gap-2">
                                {!pipe || pipe.status === 'enviada' ? (
                                  <button onClick={() => updateStatus(m.id, m.type, 'enviada')} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-colors ${pipe?.status === 'enviada' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-blue-50'}`}>
                                    {pipe?.status === 'enviada' ? l.status_sent : l.mark_sent}
                                  </button>
                                ) : (
                                  <span className={`text-[10px] px-3 py-1.5 rounded-lg font-bold ${pipe.status === 'interesado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {pipe.status === 'interesado' ? l.status_int : l.status_rej}
                                  </span>
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
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black italic text-slate-900 dark:text-white mb-6">{l.modal_req_title}</h3>
            <form onSubmit={handleCreateSearch} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_name}</label>
                <input required type="text" value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder={l.modal_req_name_pl} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_op}</label>
                  <select value={form.operation_type} onChange={e => setForm({...form, operation_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="venta">{l.op_sale}</option>
                    <option value="alquiler">{l.op_rent}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_type}</label>
                  <select value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="Lote">{l.type_lot}</option>
                    <option value="Casa">{l.type_house}</option>
                    <option value="Apartamento">{l.type_apt}</option>
                    <option value="Comercial">{l.type_com}</option>
                    <option value="Finca">{l.type_farm}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_zones}</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.zones.map((z, i) => (
                      <span key={i} className="bg-nexus-blue/10 text-nexus-blue px-2 py-1 rounded text-xs flex items-center gap-1 font-bold">
                        {z} <button type="button" onClick={() => handleRemoveTag('zones', i)} className="hover:text-blue-800">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={tagInput.zone} 
                        onChange={e => {
                          const val = e.target.value;
                          setTagInput({...tagInput, zone: val});
                          setZoneSuggestions(val.length > 1 ? searchACMLocations(val, 10) : []);
                        }} 
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (tagInput.zone.trim()) {
                              handleAddTag('zones', tagInput.zone);
                              setZoneSuggestions([]);
                            }
                          }
                        }} 
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none" 
                        placeholder={l.modal_req_zones_pl} 
                        autoComplete="off"
                      />
                      <button type="button" onClick={() => {
                        handleAddTag('zones', tagInput.zone);
                        setZoneSuggestions([]);
                      }} className="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-300">+</button>
                    </div>
                    {zoneSuggestions.length > 0 && (
                      <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                        {zoneSuggestions.map((loc, i) => (
                          <li 
                            key={i} 
                            onClick={() => {
                              handleAddTag('zones', loc.display);
                              setZoneSuggestions([]);
                            }}
                            className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                          >
                            <span className="font-bold">{loc.barrio || loc.district}</span>
                            <span className="text-slate-400 ml-1">, {loc.canton}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              {['Lote', 'Finca'].includes(form.property_type) ? (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_min_area}</label>
                    <div className="flex gap-2">
                      <input type="number" value={form.min_sqm} onChange={e => setForm({...form, min_sqm: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder={l.modal_req_area_pl} />
                      <select value={form.min_sqm_unit} onChange={e => setForm({...form, min_sqm_unit: e.target.value})} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                        <option value="m2">{l.unit_m2}</option>
                        <option value="ha">{l.unit_ha}</option>
                        <option value="acres">{l.unit_ac}</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_beds}</label>
                    <input type="number" value={form.min_bedrooms} onChange={e => setForm({...form, min_bedrooms: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder={l.modal_req_beds_pl} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_baths}</label>
                    <input type="number" step="0.5" value={form.min_bathrooms} onChange={e => setForm({...form, min_bathrooms: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder={l.modal_req_baths_pl} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_const}</label>
                    <input type="number" value={form.min_sqm} onChange={e => setForm({...form, min_sqm: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder={l.modal_req_const_pl} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_pmin}</label>
                  <input type="number" value={form.price_min} onChange={e => setForm({...form, price_min: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_pmax}</label>
                  <input type="number" value={form.price_max} onChange={e => setForm({...form, price_max: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="500000" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_tol}</label>
                  <select value={form.price_tolerance} onChange={e => setForm({...form, price_tolerance: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="0">{l.tol_0}</option>
                    <option value="5">{l.tol_5}</option>
                    <option value="10">{l.tol_10}</option>
                    <option value="15">{l.tol_15}</option>
                    <option value="20">{l.tol_20}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">{l.modal_req_must}</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.must_haves.map((m, i) => (
                      <span key={i} className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                        {m} <button type="button" onClick={() => handleRemoveTag('must_haves', i)} className="hover:text-emerald-900">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={tagInput.must} onChange={e => setTagInput({...tagInput, must: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('must_haves', tagInput.must))} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder={l.modal_req_must_pl} />
                    <button type="button" onClick={() => handleAddTag('must_haves', tagInput.must)} className="bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-300">+</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">{l.modal_req_nice}</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.nice_to_haves.map((n, i) => (
                      <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                        {n} <button type="button" onClick={() => handleRemoveTag('nice_to_haves', i)} className="hover:text-blue-900">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={tagInput.nice} onChange={e => setTagInput({...tagInput, nice: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('nice_to_haves', tagInput.nice))} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder={l.modal_req_nice_pl} />
                    <button type="button" onClick={() => handleAddTag('nice_to_haves', tagInput.nice)} className="bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-300">+</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_time}</label>
                  <select value={form.purchase_timeframe} onChange={e => setForm({...form, purchase_timeframe: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="urgente">{l.time_urg}</option>
                    <option value="3_6_meses">{l.time_3_6}</option>
                    <option value="mas_6_meses">{l.time_6_plus}</option>
                    <option value="no_sabe">{l.time_dk}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_pay}</label>
                  <select value={form.purchase_type} onChange={e => setForm({...form, purchase_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="efectivo">{l.pay_cash}</option>
                    <option value="credito_otorgado">{l.pay_cred}</option>
                    <option value="financiamiento_dueno">{l.pay_own}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">{l.btn_cancel}</button>
                <button type="submit" className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-nexus-blue text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">{l.btn_save_search}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExternalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{l.modal_ext_title}</h3>
              <button onClick={() => setShowExternalModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleAddExternal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{l.modal_ext_name}</label>
                <input required type="text" value={externalForm.name} onChange={e => setExternalForm({...externalForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" placeholder={l.modal_ext_name_pl} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{l.modal_ext_price}</label>
                <input required type="number" value={externalForm.price} onChange={e => setExternalForm({...externalForm, price: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" placeholder="Ej. 250000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{l.modal_ext_url}</label>
                <input type="url" value={externalForm.url} onChange={e => setExternalForm({...externalForm, url: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-nexus-blue hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md">
                  {l.btn_add_pipe}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
