"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import TopNav from '@/components/layout/TopNav';
import Link from 'next/link';
import { getACMFlatIndex, searchACMLocations } from '@/lib/locations';

export default function BusquedaClient() {
  const { profile, supabase } = useAuth();
  const { t, lang } = useApp();
  
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

  useEffect(() => {
    loadSearches();
  }, [profile]);

  const loadSearches = async () => {
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
  };

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
        alert(data.error || "Error al guardar. Verifica tu conexión o vuelve a iniciar sesión.");
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
      alert("Propiedad externa agregada exitosamente.");
    } catch (error) {
      console.error(error);
      alert("Error agregando propiedad externa.");
    }
  };

  const copyPortalLink = () => {
    if (!selectedSearch) return;
    const url = `${window.location.origin}/portal/busqueda/${selectedSearch.id}`;
    navigator.clipboard.writeText(url);
    alert('Enlace del Portal copiado al portapapeles. ¡Envíalo a tu cliente!');
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
      <TopNav title="BÚSQUEDA" subtitle="Matchmaking Inmobiliario" />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto space-y-8">

          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-xl font-black italic text-slate-900 dark:text-white">Panel de Requerimientos</h2>
              <p className="text-xs text-slate-500 mt-1">Registra lo que tus clientes buscan y encuentra propiedades (match) dentro de la oficina.</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-nexus-blue hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Nueva Búsqueda
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-black italic text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>🗺️</span> Zonas Calientes
                </h3>
                <div className="space-y-3">
                  {Object.entries(zoneStats).sort((a,b) => b[1] - a[1]).slice(0,5).map(([zone, count]) => (
                    <div key={zone} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{zone}</span>
                      <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded text-[10px] font-black">{count} búsquedas</span>
                    </div>
                  ))}
                  {Object.keys(zoneStats).length === 0 && <p className="text-xs text-slate-400">No hay búsquedas activas en la red.</p>}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[600px]">
                <div className="flex border-b border-slate-100 dark:border-slate-700">
                  <button 
                    onClick={() => setActiveTab('mias')}
                    className={`flex-1 p-4 text-xs font-black italic text-center transition-colors ${activeTab === 'mias' ? 'text-nexus-blue border-b-2 border-nexus-blue bg-blue-50 dark:bg-blue-900/10' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    Mis Búsquedas
                  </button>
                  <button 
                    onClick={() => setActiveTab('red')}
                    className={`flex-1 p-4 text-xs font-black italic text-center transition-colors ${activeTab === 'red' ? 'text-nexus-blue border-b-2 border-nexus-blue bg-blue-50 dark:bg-blue-900/10' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    Red Altitud
                  </button>
                </div>
                
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50 flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center"><div className="animate-spin w-5 h-5 mx-auto border-2 border-nexus-blue border-t-transparent rounded-full"></div></div>
                  ) : activeTab === 'mias' ? (
                    searches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">No tienes búsquedas registradas.</div>
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
                            {s.operation_type === 'alquiler' ? 'ALQUILER' : 'VENTA'} • {s.property_type} • {(s.zones && s.zones.length > 0) ? s.zones.join(', ') : 'Sin zona'}
                          </p>
                          <p className="text-xs font-black italic text-nexus-blue mb-3">
                            ${Number(s.price_min || 0).toLocaleString()} - ${Number(s.price_max || 0).toLocaleString()}
                          </p>

                          {needsRenewal && s.status === 'activa' && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-3 text-center">
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-2">+30 días sin verificar.</p>
                              <button onClick={(e) => { e.stopPropagation(); handleRenewSearch(s.id); }} className="bg-amber-500 text-white px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">
                                Confirmar Activa
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    allSearches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">No hay búsquedas activas en la red.</div>
                    ) : allSearches.map(s => (
                      <div key={s.id} className="p-5 border-l-4 border-transparent">
                        <div className="flex items-center gap-2 mb-2">
                          {s.profiles?.avatar_url ? (
                            <img src={s.profiles.avatar_url} alt={s.profiles.full_name} className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold">
                              {s.profiles?.full_name?.charAt(0) || '?'}
                            </div>
                          )}
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{s.profiles?.full_name || 'Agente'}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{s.property_type}</h4>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mb-2">
                          {s.operation_type === 'alquiler' ? 'ALQ' : 'VTA'} • {(s.zones && s.zones.length > 0) ? s.zones.join(', ') : 'Sin zona'}
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
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Selecciona una búsqueda para ver coincidencias</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[600px]">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white flex items-center gap-2">
                      <span>✨</span> Coincidencias para {selectedSearch.client_name}
                    </h3>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto">
                    {loadingMatches ? (
                      <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full"></div></div>
                    ) : matches.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-4 text-center">No hay coincidencias actuales con el inventario.</p>
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
                                    {pipe?.status === 'enviada' ? 'Enviada' : 'Marcar Enviada'}
                                  </button>
                                ) : (
                                  <span className={`text-[10px] px-3 py-1.5 rounded-lg font-bold ${pipe.status === 'interesado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {pipe.status === 'interesado' ? 'Interesado' : 'Rechazada'}
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
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pipeline y Portal del Cliente</h3>
                      <div className="flex space-x-2">
                        <button onClick={() => setShowExternalModal(true)} className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors">
                          + Externa
                        </button>
                        <button onClick={copyPortalLink} className="text-xs font-bold px-3 py-1.5 bg-nexus-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm flex items-center">
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                          Copiar Portal URL
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {(pipelineMap[selectedSearch.id] || []).map(p => (
                        <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <span className={`w-2 h-2 rounded-full ${p.status === 'enviada' ? 'bg-blue-400' : p.status === 'interesado' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {p.match_type === 'external' ? (p.external_data?.name || 'Propiedad Externa') : 'Propiedad'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold uppercase text-slate-500">{p.status}</span>
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
            <h3 className="text-xl font-black italic text-slate-900 dark:text-white mb-6">Nuevo Requerimiento</h3>
            <form onSubmit={handleCreateSearch} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nombre del Cliente</label>
                <input required type="text" value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="Ej. Juan Pérez" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Operación</label>
                  <select value={form.operation_type} onChange={e => setForm({...form, operation_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="venta">Venta</option>
                    <option value="alquiler">Alquiler</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tipo Propiedad</label>
                  <select value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="Lote">Lote</option>
                    <option value="Casa">Casa</option>
                    <option value="Apartamento">Apartamento</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Finca">Finca</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Zonas (Múltiples)</label>
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
                        placeholder="Escribe la zona (Ej. Cajón, Uvita...)" 
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
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Área Mínima del Lote</label>
                    <div className="flex gap-2">
                      <input type="number" value={form.min_sqm} onChange={e => setForm({...form, min_sqm: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="Ej. 1000" />
                      <select value={form.min_sqm_unit} onChange={e => setForm({...form, min_sqm_unit: e.target.value})} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                        <option value="m2">m²</option>
                        <option value="ha">Hectáreas</option>
                        <option value="acres">Acres</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Habs Mín.</label>
                    <input type="number" value={form.min_bedrooms} onChange={e => setForm({...form, min_bedrooms: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="Ej. 3" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Baños Mín.</label>
                    <input type="number" step="0.5" value={form.min_bathrooms} onChange={e => setForm({...form, min_bathrooms: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="Ej. 2" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">M² Mínimos Construcción</label>
                    <input type="number" value={form.min_sqm} onChange={e => setForm({...form, min_sqm: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="Ej. 150" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Precio Mínimo ($)</label>
                  <input type="number" value={form.price_min} onChange={e => setForm({...form, price_min: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Precio Máximo ($)</label>
                  <input type="number" value={form.price_max} onChange={e => setForm({...form, price_max: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="500000" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tolerancia Precio</label>
                  <select value={form.price_tolerance} onChange={e => setForm({...form, price_tolerance: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="0">Exacto (0%)</option>
                    <option value="5">+/- 5%</option>
                    <option value="10">+/- 10%</option>
                    <option value="15">+/- 15%</option>
                    <option value="20">+/- 20%</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Must Haves (Indispensables)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.must_haves.map((m, i) => (
                      <span key={i} className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                        {m} <button type="button" onClick={() => handleRemoveTag('must_haves', i)} className="hover:text-emerald-900">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={tagInput.must} onChange={e => setTagInput({...tagInput, must: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('must_haves', tagInput.must))} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder="Ej. 3 Cuartos" />
                    <button type="button" onClick={() => handleAddTag('must_haves', tagInput.must)} className="bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-300">+</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">Nice to Haves (Deseables)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.nice_to_haves.map((n, i) => (
                      <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                        {n} <button type="button" onClick={() => handleRemoveTag('nice_to_haves', i)} className="hover:text-blue-900">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={tagInput.nice} onChange={e => setTagInput({...tagInput, nice: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('nice_to_haves', tagInput.nice))} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder="Ej. Piscina" />
                    <button type="button" onClick={() => handleAddTag('nice_to_haves', tagInput.nice)} className="bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-300">+</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tiempo de Compra</label>
                  <select value={form.purchase_timeframe} onChange={e => setForm({...form, purchase_timeframe: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="urgente">Urgente</option>
                    <option value="3_6_meses">3 a 6 meses</option>
                    <option value="mas_6_meses">Más de 6 meses</option>
                    <option value="no_sabe">No lo sabe</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tipo de Pago</label>
                  <select value={form.purchase_type} onChange={e => setForm({...form, purchase_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="efectivo">Efectivo</option>
                    <option value="credito_otorgado">Crédito Otorgado</option>
                    <option value="financiamiento_dueno">Financiamiento del Dueño</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-nexus-blue text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">Guardar Búsqueda</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExternalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Agregar Propiedad Externa</h3>
              <button onClick={() => setShowExternalModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleAddExternal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre / Título</label>
                <input required type="text" value={externalForm.name} onChange={e => setExternalForm({...externalForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" placeholder="Ej. Casa en Escazú" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Precio (USD)</label>
                <input required type="number" value={externalForm.price} onChange={e => setExternalForm({...externalForm, price: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" placeholder="Ej. 250000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">URL (Opcional)</label>
                <input type="url" value={externalForm.url} onChange={e => setExternalForm({...externalForm, url: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-nexus-blue hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md">
                  Agregar a Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
