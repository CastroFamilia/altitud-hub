"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { getPropertiesForApproval, updateProperty, upsertListingMilestone } from '@/lib/dal/properties';
import { getAgentProfiles, insertNotification } from '@/lib/dal/office';
import PropertyStatusBadge from '@/components/propiedades/PropertyStatusBadge';
import { formatPrice } from '@/components/propiedades/PropertyCard';
import Link from 'next/link';
import Image from 'next/image';

// Helper: create a notification for the agent when broker changes property status
async function notifyAgent(agentId, propertyTitle, newStatus, brokerNotes) {
  if (!agentId) return;
  const statusLabels = {
    approved: { title: '✅ Propiedad aprobada', msg: `Tu propiedad "${propertyTitle}" fue aprobada por el broker.` },
    needs_changes: { title: '⚠️ Cambios solicitados', msg: `El broker solicitó cambios en "${propertyTitle}": ${brokerNotes || ''}` },
    published: { title: '🚀 Propiedad publicada', msg: `Tu propiedad "${propertyTitle}" fue aprobada y publicada.` },
  };
  const info = statusLabels[newStatus];
  if (!info) return;
  try {
    await insertNotification({
      user_id: agentId,
      title: info.title,
      message: info.msg,
      link: '/propiedades',
    }, supabase);
  } catch (e) {
    console.error('Notification insert error:', e);
  }
}

export default function PropertyApprovalTab({ selectedOffice = 'altitud' }) {
  const { lang } = useApp();
  const { profile } = useAuth();
  const [properties, setProperties] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_approval');
  const [expanded, setExpanded] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [descLang, setDescLang] = useState('es');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const [propsData, profilesData] = await Promise.all([
        getPropertiesForApproval(supabase),
        getAgentProfiles(supabase),
      ]);
      setProperties(propsData || []);
      setProfiles(profilesData || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

    // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchProperties(); }, []);

  // Build a lookup: auth_user_id -> profile
  const profileByAuthId = {};
  profiles.forEach(p => { if (p.auth_user_id) profileByAuthId[p.auth_user_id] = p; });

  // Filter properties by office
  const officeProperties = properties.filter(p => {
    const propOffice = p.office_code?.toLowerCase()?.includes('cero') || p.office_code === 'R0700151' ? 'cero' : 'altitud';
    const agentProfile = profileByAuthId[p.agent_id];
    const office = agentProfile ? agentProfile.office : propOffice;
    return office === selectedOffice;
  });

  const filtered = filter === 'all'
    ? officeProperties
    : officeProperties.filter(p => p.status === filter);

  const handleApprove = async (id) => {
    setActionLoading(true);
    const prop = properties.find(p => p.id === id);
    try {
      await updateProperty(id, {
        status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: profile?.id || null, broker_notes: null
      }, supabase);
      
      // Record milestone timestamp for velocity tracking
      await upsertListingMilestone({
        property_id: id, agent_id: prop?.agent_id, broker_approved_at: new Date().toISOString()
      }, supabase);
      const title = prop?.listing_title_es || prop?.listing_title_en || prop?.name || '';
      await notifyAgent(prop?.agent_id, title, 'approved');
      await fetchProperties();
    } catch (e) {
      console.error(e);
    }
    setActionLoading(false);
    setExpanded(null);
  };

  const handleApproveAndPublish = async (id) => {
    setActionLoading(true);
    try {
      const prop = properties.find(p => p.id === id);
      await updateProperty(id, {
        status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: profile?.id || null, broker_notes: null
      }, supabase);

      const res = await fetch('/api/properties/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: id }),
      });
      const data = await res.json();
      if (!data.success) {
        console.warn('Publish note:', data.message || data.error);
      }

      const title = prop?.listing_title_es || prop?.listing_title_en || prop?.name || '';
      // Record milestone timestamps for velocity tracking
      const now = new Date().toISOString();
      await upsertListingMilestone({
        property_id: id, agent_id: prop?.agent_id, broker_approved_at: now, published_at: now
      }, supabase);
      await notifyAgent(prop?.agent_id, title, 'published');
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
    const prop = properties.find(p => p.id === id);
    try {
      await updateProperty(id, {
        status: 'needs_changes', reviewed_at: new Date().toISOString(), reviewed_by: profile?.id || null, broker_notes: rejectNotes
      }, supabase);
      
      const title = prop?.listing_title_es || prop?.listing_title_en || prop?.name || '';
      await notifyAgent(prop?.agent_id, title, 'needs_changes', rejectNotes);
      await fetchProperties();
      setRejectNotes('');
    } catch (e) {
      console.error(e);
    }
    setActionLoading(false);
    setExpanded(null);
  };

  const filters = [
    { key: 'pending_approval', label: lang === 'en' ? 'Pending' : 'Pendientes', count: officeProperties.filter(p => p.status === 'pending_approval').length },
    { key: 'needs_changes', label: lang === 'en' ? 'Changes Req.' : 'Necesita Cambios', count: officeProperties.filter(p => p.status === 'needs_changes').length },
    { key: 'approved', label: lang === 'en' ? 'Approved' : 'Aprobadas', count: officeProperties.filter(p => p.status === 'approved').length },
    { key: 'published', label: lang === 'en' ? 'Published' : 'Publicadas', count: officeProperties.filter(p => p.status === 'published').length },
    { key: 'all', label: lang === 'en' ? 'All' : 'Todas', count: officeProperties.length },
  ];

  // Batch approve
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    const ids = [...selectedIds];
    const now = new Date().toISOString();
    for (const id of ids) {
      const prop = properties.find(p => p.id === id);
      await updateProperty(id, {
        status: 'approved', reviewed_at: now, reviewed_by: profile?.id || null, broker_notes: null
      }, supabase);
      // Record milestone timestamp for velocity tracking
      await upsertListingMilestone({
        property_id: id, agent_id: prop?.agent_id, broker_approved_at: now
      }, supabase);
      if (prop?.agent_id) {
        const title = prop?.listing_title_es || prop?.listing_title_en || prop?.name || '';
        await notifyAgent(prop.agent_id, title, 'approved');
      }
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
      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-xl p-3 text-left transition-all border ${
              filter === f.key
                ? 'bg-nexus-blue/10 border-nexus-blue/40 ring-1 ring-nexus-blue/30'
                : 'bg-slate-800/30 border-slate-700 hover:border-slate-500'
            }`}>
            <p className="text-2xl font-black text-white">{f.count}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${filter === f.key ? 'text-nexus-blue' : 'text-slate-400'}`}>{f.label}</p>
          </button>
        ))}
      </div>

      {/* Batch actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4">
          <button onClick={handleBatchApprove} disabled={actionLoading}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-700 text-white transition-all disabled:opacity-50 flex items-center gap-1.5">
            ✅ {lang === 'en' ? `Approve ${selectedIds.size} Selected` : `Aprobar ${selectedIds.size} Seleccionadas`}
          </button>
        </div>
      )}

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
            const agentProfile = profileByAuthId[p.agent_id];
            const submittedDate = p.submitted_at ? new Date(p.submitted_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CR', { month: 'short', day: 'numeric' }) : null;

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
                    <div className="w-14 h-14 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0 relative">
                      {mainImg ? <Image src={mainImg} className="w-full h-full object-cover" alt="" fill /> : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{title}</p>
                      <p className="text-xs text-slate-400">{formatPrice(p.list_price, p.list_price_currency_id)} · {p.unparsed_address || '—'}</p>
                      {/* Agent + submitted date */}
                      <div className="flex items-center gap-2 mt-1">
                        {agentProfile && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Image src={agentProfile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agentProfile.full_name)}&background=5a82bf&color=fff&size=16`} alt="" width={14} height={14} className="rounded-full" />
                            {agentProfile.full_name}
                          </span>
                        )}
                        {submittedDate && <span className="text-[10px] text-slate-600">· {submittedDate}</span>}
                      </div>
                    </div>
                  </button>
                  <PropertyStatusBadge status={p.status} lang={lang} />
                  {/* View detail link */}
                  <Link
                    href={`/propiedades/${p.id}`}
                    target="_blank"
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
                    {p.status === 'pending_approval' && (() => {
                      const checks = [
                        { ok: !!p.owner_name, required: true, label: lang === 'en' ? 'Owner info verified' : 'Info propietario verificada' },
                        { ok: !!p.listing_agreement, required: true, label: lang === 'en' ? 'Listing agreement signed' : 'Contrato firmado' },
                        { ok: photoCount > 0, required: false, label: lang === 'en' ? `Photos uploaded (${photoCount})` : `Fotos subidas (${photoCount})` },
                        { ok: !!p.list_price, required: true, label: lang === 'en' ? 'Price set' : 'Precio establecido' },
                        { ok: !!p.public_remarks_es, required: false, label: lang === 'en' ? 'Spanish description' : 'Descripción en español' },
                        { ok: !!p.public_remarks_en, required: false, label: lang === 'en' ? 'English description' : 'Descripción en inglés' },
                        { ok: !!(p.public_remarks_es && p.public_remarks_en), required: false, label: lang === 'en' ? 'Bilingual descriptions ✓' : 'Descripciones bilingües ✓' },
                        { ok: !!p.property_type_id, required: false, label: lang === 'en' ? 'Property type set' : 'Tipo de propiedad definido' },
                        { ok: !!p.location_id, required: false, label: lang === 'en' ? 'RECONNECT location ID' : 'Ubicación RECONNECT' },
                        { ok: !!(p.listing_side_comm && p.selling_side_comm), required: false, label: lang === 'en' ? 'Commission splits' : 'Splits de comisión' },
                      ];
                      const passed = checks.filter(c => c.ok).length;
                      const total = checks.length;
                      const pct = Math.round((passed / total) * 100);
                      return (
                        <div className="bg-slate-900 rounded-xl p-4 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{lang === 'en' ? 'Approval Checklist' : 'Checklist de Aprobación'}</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct === 100 ? 'bg-green-900/40 text-green-400' : pct >= 60 ? 'bg-amber-900/40 text-amber-400' : 'bg-red-900/40 text-red-400'}`}>{passed}/{total} ({pct}%)</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-slate-800 rounded-full mb-3 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="space-y-1.5 text-sm">
                            {checks.map((c, i) => (
                              <p key={i} className={c.ok ? 'text-green-400' : c.required ? 'text-red-400' : 'text-amber-400'}>
                                {c.ok ? '☑' : '☐'} {c.label}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

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
