"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import PropertyStatusBadge from '@/components/propiedades/PropertyStatusBadge';
import { formatPrice } from '@/components/propiedades/PropertyCard';
import Link from 'next/link';
import Image from 'next/image';

export default function PropertyApprovalTab() {
  const { lang } = useApp();
  const { profile } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_approval');
  const [expanded, setExpanded] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [descLang, setDescLang] = useState('es'); // bilingual description toggle
  const [selectedIds, setSelectedIds] = useState(new Set()); // batch selection

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(image_url, priority)')
      .order('submitted_at', { ascending: false });
    if (!error) setProperties(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProperties(); }, []);

  const filtered = filter === 'all'
    ? properties
    : properties.filter(p => p.status === filter);

  const handleApprove = async (id) => {
    setActionLoading(true);
    const { error } = await supabase.from('properties').update({
      status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: profile?.id || null, broker_notes: null
    }).eq('id', id);
    if (!error) await fetchProperties();
    setActionLoading(false);
    setExpanded(null);
  };

  const handleApproveAndPublish = async (id) => {
    setActionLoading(true);
    try {
      // First approve
      const { error: approveError } = await supabase.from('properties').update({
        status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: profile?.id || null, broker_notes: null
      }).eq('id', id);
      if (approveError) throw approveError;

      // Then publish via API
      const res = await fetch('/api/properties/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: id }),
      });
      const data = await res.json();
      if (!data.success) {
        console.warn('Publish note:', data.message || data.error);
      }

      await fetchProperties();
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setActionLoading(false);
    setExpanded(null);
  };

  const handleReject = async (id) => {
    if (!rejectNotes.trim()) return alert(lang === 'en' ? 'Please add notes' : 'Agrega notas para el agente');
    setActionLoading(true);
    const { error } = await supabase.from('properties').update({
      status: 'needs_changes', reviewed_at: new Date().toISOString(), reviewed_by: profile?.id || null, broker_notes: rejectNotes
    }).eq('id', id);
    if (!error) { await fetchProperties(); setRejectNotes(''); }
    setActionLoading(false);
    setExpanded(null);
  };

  const filters = [
    { key: 'pending_approval', label: lang === 'en' ? 'Pending' : 'Pendientes', count: properties.filter(p => p.status === 'pending_approval').length },
    { key: 'needs_changes', label: lang === 'en' ? 'Changes Req.' : 'Necesita Cambios', count: properties.filter(p => p.status === 'needs_changes').length },
    { key: 'approved', label: lang === 'en' ? 'Approved' : 'Aprobadas', count: properties.filter(p => p.status === 'approved').length },
    { key: 'published', label: lang === 'en' ? 'Published' : 'Publicadas', count: properties.filter(p => p.status === 'published').length },
    { key: 'all', label: lang === 'en' ? 'All' : 'Todas', count: properties.length },
  ];

  // Batch approve
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    const ids = [...selectedIds];
    for (const id of ids) {
      await supabase.from('properties').update({
        status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: profile?.id || null, broker_notes: null
      }).eq('id', id);
    }
    setSelectedIds(new Set());
    await fetchProperties();
    setActionLoading(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* Filter tabs + batch actions */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f.key ? 'bg-nexus-blue text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
              {f.label} <span className="ml-1 opacity-70">({f.count})</span>
            </button>
          ))}
        </div>
        {selectedIds.size > 0 && (
          <button onClick={handleBatchApprove} disabled={actionLoading}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-700 text-white transition-all disabled:opacity-50 flex items-center gap-1.5">
            ✅ {lang === 'en' ? `Approve ${selectedIds.size} Selected` : `Aprobar ${selectedIds.size} Seleccionadas`}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-nexus-blue border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">{lang === 'en' ? 'No properties in this category' : 'Sin propiedades en esta categoría'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const isOpen = expanded === p.id;
            const mainImg = p.property_images?.sort((a, b) => a.priority - b.priority)?.[0]?.image_url;
            const title = (lang === 'en' ? p.listing_title_en : p.listing_title_es) || p.name;
            const photoCount = p.property_images?.length || 0;

            return (
              <div key={p.id} className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                {/* Summary row */}
                <div className="flex items-center gap-4 p-4 hover:bg-slate-800 transition-colors">
                  {/* Batch select checkbox */}
                  {p.status === 'pending_approval' && (
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 rounded border-slate-600 text-nexus-blue focus:ring-nexus-blue bg-slate-800 cursor-pointer flex-shrink-0" />
                  )}
                  <button onClick={() => setExpanded(isOpen ? null : p.id)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                      {mainImg ? <Image src={mainImg} className="w-full h-full object-cover" alt="" fill /> : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{title}</p>
                      <p className="text-xs text-slate-400">{formatPrice(p.list_price, p.list_price_currency_id)} · {p.unparsed_address || '—'}</p>
                    </div>
                  </button>
                  <PropertyStatusBadge status={p.status} lang={lang} />
                  {/* View detail link */}
                  <Link
                    href={`/propiedades/${p.id}`}
                    className="text-slate-400 hover:text-nexus-blue transition-colors p-1.5"
                    title={lang === 'en' ? 'View details' : 'Ver detalle'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </Link>
                  <button onClick={() => setExpanded(isOpen ? null : p.id)} className="text-slate-500">
                    <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-700 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                      <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Owner' : 'Propietario'}</span><p className="text-white font-medium">{p.owner_name || '—'}</p></div>
                      <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Phone' : 'Teléfono'}</span><p className="text-white font-medium">{p.owner_phones || '—'}</p></div>
                      <div><span className="text-slate-500 text-xs">Email</span><p className="text-white font-medium">{p.owner_email || '—'}</p></div>
                      <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Agreement' : 'Contrato'}</span><p className={`font-medium ${p.listing_agreement ? 'text-green-400' : 'text-red-400'}`}>{p.listing_agreement ? '✅ Firmado' : '❌ Pendiente'}</p></div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                      <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Bedrooms' : 'Habitaciones'}</span><p className="text-white">{p.bedrooms_total || 0}</p></div>
                      <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Bathrooms' : 'Baños'}</span><p className="text-white">{p.bathrooms_full || 0}</p></div>
                      <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Lot' : 'Terreno'}</span><p className="text-white">{p.lot_size_area ? `${Number(p.lot_size_area).toLocaleString()} m²` : '—'}</p></div>
                      <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Construction' : 'Construcción'}</span><p className="text-white">{p.construction_size ? `${Number(p.construction_size).toLocaleString()} m²` : '—'}</p></div>
                    </div>

                    {/* Commission & Classification */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                      <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Listing Comm.' : 'Comisión Listing'}</span><p className="text-white font-medium">{p.listing_side_comm != null ? `${p.listing_side_comm}%` : '—'}</p></div>
                      <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Selling Comm.' : 'Comisión Selling'}</span><p className="text-white font-medium">{p.selling_side_comm != null ? `${p.selling_side_comm}%` : '—'}</p></div>
                      <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Property Type' : 'Tipo'}</span><p className={`font-medium ${p.property_type_id ? 'text-white' : 'text-amber-400'}`}>{p.property_type_id ? `ID ${p.property_type_id}` : '⚠ ' + (lang === 'en' ? 'Not set' : 'Sin definir')}</p></div>
                      <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Location ID' : 'Ubicación ID'}</span><p className={`font-medium ${p.location_id ? 'text-white' : 'text-amber-400'}`}>{p.location_id || ('⚠ ' + (lang === 'en' ? 'Not set' : 'Sin definir'))}</p></div>
                    </div>

                    {/* Photo thumbnails */}
                    {photoCount > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-2">📸 {photoCount} {lang === 'en' ? 'photos' : 'fotos'}</p>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {p.property_images?.sort((a, b) => a.priority - b.priority).slice(0, 6).map((img, i) => (
                            <Image key={i} src={img.image_url} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" alt="" width={64} height={64} />
                          ))}
                          {photoCount > 6 && (
                            <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center text-xs text-slate-400 flex-shrink-0">+{photoCount - 6}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bilingual Description Preview */}
                    {(p.public_remarks_es || p.public_remarks_en) && (
                      <div className="mb-4 bg-slate-900 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-slate-500">{lang === 'en' ? 'Description' : 'Descripción'}</p>
                          <div className="flex gap-1">
                            {['es', 'en'].map(l => (
                              <button key={l} onClick={() => setDescLang(l)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${descLang === l ? 'bg-nexus-blue text-white' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>
                                {l === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-4">
                          {descLang === 'en' ? (p.public_remarks_en || <span className="italic text-slate-500">{lang === 'en' ? 'No English description' : 'Sin descripción en inglés'}</span>) : (p.public_remarks_es || <span className="italic text-slate-500">{lang === 'en' ? 'No Spanish description' : 'Sin descripción en español'}</span>)}
                        </p>
                      </div>
                    )}

                    {/* Approval checklist */}
                    {p.status === 'pending_approval' && (
                      <div className="bg-slate-900 rounded-xl p-4 mb-4">
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">{lang === 'en' ? 'Approval Checklist' : 'Checklist de Aprobación'}</p>
                        <div className="space-y-1.5 text-sm">
                          <p className={p.owner_name ? 'text-green-400' : 'text-red-400'}>{p.owner_name ? '☑' : '☐'} {lang === 'en' ? 'Owner info verified' : 'Info propietario verificada'}</p>
                          <p className={p.listing_agreement ? 'text-green-400' : 'text-red-400'}>{p.listing_agreement ? '☑' : '☐'} {lang === 'en' ? 'Listing agreement signed' : 'Contrato firmado'}</p>
                          <p className={photoCount > 0 ? 'text-green-400' : 'text-amber-400'}>{photoCount > 0 ? '☑' : '☐'} {lang === 'en' ? `Photos uploaded (${photoCount})` : `Fotos subidas (${photoCount})`}</p>
                          <p className={p.list_price ? 'text-green-400' : 'text-red-400'}>{p.list_price ? '☑' : '☐'} {lang === 'en' ? 'Price set' : 'Precio establecido'}</p>
                          <p className={(p.public_remarks_es || p.public_remarks_en) ? 'text-green-400' : 'text-amber-400'}>{(p.public_remarks_es || p.public_remarks_en) ? '☑' : '☐'} {lang === 'en' ? 'Description written' : 'Descripción escrita'}</p>
                          <p className={p.property_type_id ? 'text-green-400' : 'text-amber-400'}>{p.property_type_id ? '☑' : '☐'} {lang === 'en' ? 'Property type set' : 'Tipo de propiedad definido'}</p>
                          <p className={p.location_id ? 'text-green-400' : 'text-amber-400'}>{p.location_id ? '☑' : '☐'} {lang === 'en' ? 'RECONNECT location ID' : 'Ubicación RECONNECT'}</p>
                          <p className={(p.listing_side_comm && p.selling_side_comm) ? 'text-green-400' : 'text-amber-400'}>{(p.listing_side_comm && p.selling_side_comm) ? '☑' : '☐'} {lang === 'en' ? 'Commission splits' : 'Splits de comisión'}</p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {p.status === 'pending_approval' && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleApprove(p.id)} disabled={actionLoading} className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
                            ✅ {lang === 'en' ? 'Approve' : 'Aprobar'}
                          </button>
                          <button onClick={() => handleApproveAndPublish(p.id)} disabled={actionLoading} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
                            🚀 {lang === 'en' ? 'Approve & Publish' : 'Aprobar y Publicar'}
                          </button>
                        </div>
                        <div>
                          <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={2} placeholder={lang === 'en' ? 'Notes for the agent (required for rejection)...' : 'Notas para el agente (requeridas para rechazo)...'} className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 resize-none outline-none focus:ring-1 focus:ring-amber-500" />
                          <button onClick={() => handleReject(p.id)} disabled={actionLoading} className="mt-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
                            ❌ {lang === 'en' ? 'Request Changes' : 'Necesita Cambios'}
                          </button>
                        </div>
                      </div>
                    )}
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
