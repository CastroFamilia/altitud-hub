"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { getPropertiesForApproval, updateProperty, upsertListingMilestone } from '@/lib/dal/properties';
import { getAgentProfiles, insertNotification } from '@/lib/dal/office';
import PropertyStatusBadge from '@/components/propiedades/PropertyStatusBadge';
import DevelopmentStatusBadge from '@/components/propiedades/DevelopmentStatusBadge';
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
  const { t, lang } = useApp();
  const { profile } = useAuth();
  const [properties, setProperties] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [developments, setDevelopments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('properties'); // 'properties' | 'developments' | 'reservations'
  const [filter, setFilter] = useState('pending_approval');
  const [devFilter, setDevFilter] = useState('pending_approval');
  const [resFilter, setResFilter] = useState('pending');
  const [expanded, setExpanded] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [descLang, setDescLang] = useState('es');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const formatCurrency = (amount) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const [propsData, profilesData, resData, devData] = await Promise.all([
        getPropertiesForApproval(supabase),
        getAgentProfiles(supabase),
        supabase.from('office_reservations').select('*').order('created_at', { ascending: false }),
        supabase.from('developments').select('*').order('created_at', { ascending: false })
      ]);
      setProperties(propsData || []);
      setProfiles(profilesData || []);
      setReservations(resData.data || []);
      setDevelopments(devData.data || []);
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

  const officeDevelopments = developments.filter(d => {
    const devOffice = d.office_code?.toLowerCase()?.includes('cero') || d.office_code === 'R0700151' ? 'cero' : 'altitud';
    const agentProfile = profileByAuthId[d.agent_id];
    const office = agentProfile ? agentProfile.office : devOffice;
    return office === selectedOffice;
  });

  const officeReservations = reservations.filter(r => {
    const agentProfile = profiles.find(p => p.id === r.profile_id);
    const office = agentProfile ? agentProfile.office : (r.office || 'altitud');
    return office === selectedOffice;
  });

  const filteredReservations = resFilter === 'all'
    ? officeReservations
    : officeReservations.filter(r => r.status === resFilter);

  const filteredDevelopments = devFilter === 'all'
    ? officeDevelopments
    : officeDevelopments.filter(d => d.status === devFilter);

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
    if (!rejectNotes.trim()) return alert(t('auto_please_add_notes'));
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

  const handleAcceptReservation = async (id) => {
    setActionLoading(true);
    const resv = reservations.find(r => r.id === id);
    try {
      const { error } = await supabase
        .from('office_reservations')
        .update({ status: 'signed', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      const agentProfile = profiles.find(p => p.id === resv?.profile_id);
      if (agentProfile?.auth_user_id) {
        await insertNotification({
          user_id: agentProfile.auth_user_id,
          title: lang === 'en' ? '✅ Reservation Accepted' : '✅ Reserva Aceptada',
          message: lang === 'en' 
            ? `Your reservation for "${resv?.property_address || ''}" was accepted by the broker.`
            : `Tu reserva de "${resv?.property_address || ''}" fue aceptada por el broker.`,
          link: '/negocio',
        }, supabase);
      }

      await fetchProperties();
    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    }
    setActionLoading(false);
    setExpanded(null);
  };

  const resFilters = [
    { key: 'pending', label: lang === 'en' ? 'Pending' : 'Pendientes', count: officeReservations.filter(r => r.status === 'pending').length },
    { key: 'signed', label: lang === 'en' ? 'Accepted' : 'Aceptadas', count: officeReservations.filter(r => r.status === 'signed').length },
    { key: 'closed', label: lang === 'en' ? 'Closed' : 'Cerradas', count: officeReservations.filter(r => r.status === 'closed').length },
    { key: 'fallen', label: lang === 'en' ? 'Fallen' : 'Caídas', count: officeReservations.filter(r => r.status === 'fallen').length },
    { key: 'all', label: lang === 'en' ? 'All' : 'Todas', count: officeReservations.length },
  ];

  const filters = [
    { key: 'pending_approval', label: t('auto_pending'), count: officeProperties.filter(p => p.status === 'pending_approval').length },
    { key: 'needs_changes', label: t('auto_changes_req'), count: officeProperties.filter(p => p.status === 'needs_changes').length },
    { key: 'approved', label: t('auto_approved'), count: officeProperties.filter(p => p.status === 'approved').length },
    { key: 'published', label: t('auto_published_1'), count: officeProperties.filter(p => p.status === 'published').length },
    { key: 'all', label: t('auto_all'), count: officeProperties.length },
  ];

  const devFilters = [
    { key: 'pending_approval', label: lang === 'en' ? 'Pending' : 'Pendientes', count: officeDevelopments.filter(d => d.status === 'pending_approval').length },
    { key: 'needs_changes', label: lang === 'en' ? 'Changes Requested' : 'Cambios Solicitados', count: officeDevelopments.filter(d => d.status === 'needs_changes').length },
    { key: 'active', label: lang === 'en' ? 'Active' : 'Activos', count: officeDevelopments.filter(d => d.status === 'active').length },
    { key: 'all', label: lang === 'en' ? 'All' : 'Todos', count: officeDevelopments.length },
  ];

  const handleApproveDev = async (id) => {
    setActionLoading(true);
    const devItem = developments.find(d => d.id === id);
    try {
      const { error } = await supabase
        .from('developments')
        .update({
          status: 'active',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id || null,
          broker_notes: null
        })
        .eq('id', id);
      
      if (error) throw error;
      
      if (devItem?.agent_id) {
        await insertNotification({
          user_id: devItem.agent_id,
          title: lang === 'en' ? '✅ Development Approved' : '✅ Desarrollo Aprobado',
          message: lang === 'en'
            ? `Your development "${devItem.name}" was approved by the broker and is now active.`
            : `Tu desarrollo "${devItem.name}" fue aprobado por el broker y ya está activo.`,
          link: `/propiedades/desarrollos/${devItem.id}`,
        }, supabase);
      }
      
      await fetchProperties();
    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    }
    setActionLoading(false);
    setExpanded(null);
  };

  const handleRejectDev = async (id) => {
    if (!rejectNotes.trim()) return alert(t('auto_please_add_notes') || 'Por favor ingresa notas');
    setActionLoading(true);
    const devItem = developments.find(d => d.id === id);
    try {
      const { error } = await supabase
        .from('developments')
        .update({
          status: 'needs_changes',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id || null,
          broker_notes: rejectNotes
        })
        .eq('id', id);
      
      if (error) throw error;
      
      if (devItem?.agent_id) {
        await insertNotification({
          user_id: devItem.agent_id,
          title: lang === 'en' ? '⚠️ Changes Requested on Development' : '⚠️ Cambios Solicitados en Desarrollo',
          message: lang === 'en'
            ? `The broker requested changes on "${devItem.name}": ${rejectNotes}`
            : `El broker solicitó cambios en "${devItem.name}": ${rejectNotes}`,
          link: `/propiedades/desarrollos/${devItem.id}/editar`,
        }, supabase);
      }
      
      setRejectNotes('');
      await fetchProperties();
    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    }
    setActionLoading(false);
    setExpanded(null);
  };

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
      {/* Sub-tab segmented selector */}
      <div className="flex bg-slate-800/60 rounded-2xl p-1 shadow-sm border border-slate-700 mb-6 max-w-md">
        <button
          onClick={() => setSubTab('properties')}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
            subTab === 'properties'
              ? 'bg-nexus-blue text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🏠</span> {lang === 'en' ? 'Properties' : 'Propiedades'}
          {officeProperties.filter(p => p.status === 'pending_approval').length > 0 && (
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1">
              {officeProperties.filter(p => p.status === 'pending_approval').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('developments')}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
            subTab === 'developments'
              ? 'bg-nexus-blue text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🏢</span> {lang === 'en' ? 'Developments' : 'Desarrollos'}
          {officeDevelopments.filter(d => d.status === 'pending_approval').length > 0 && (
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1">
              {officeDevelopments.filter(d => d.status === 'pending_approval').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('reservations')}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
            subTab === 'reservations'
              ? 'bg-nexus-blue text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>📋</span> {lang === 'en' ? 'Reservations' : 'Reservas'}
          {officeReservations.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1">
              {officeReservations.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {subTab === 'properties' ? (
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
              <p className="text-sm">{t('auto_no_properties_in_this')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => {
                const isOpen = expanded === p.id;
                const mainImg = p.property_images?.sort((a, b) => a.priority - b.priority)?.[0]?.image_url;
                const title = (lang === 'en' ? p.listing_title_en : p.listing_title_es) || p.name;
                const photoCount = p.property_images?.length || 0;
                const agentProfile = profileByAuthId[p.agent_id];
                const submittedDate = p.submitted_at ? new Date(p.submitted_at).toLocaleDateString(t('auto_en_us'), { month: 'short', day: 'numeric' }) : null;

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
                        title={t('auto_view_details')}
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
                          <div><span className="text-slate-500 text-xs">{t('auto_owner')}</span><p className="text-white font-medium">{p.owner_name || '—'}</p></div>
                          <div><span className="text-slate-500 text-xs">{t('auto_phone')}</span><p className="text-white font-medium">{p.owner_phones || '—'}</p></div>
                          <div><span className="text-slate-500 text-xs">Email</span><p className="text-white font-medium">{p.owner_email || '—'}</p></div>
                          <div><span className="text-slate-500 text-xs">{t('auto_agreement')}</span><p className={`font-medium ${p.listing_agreement ? 'text-green-400' : 'text-red-400'}`}>{p.listing_agreement ? '✅ Firmado' : '❌ Pendiente'}</p></div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                          <div><span className="text-slate-500 text-xs">{t('auto_bedrooms')}</span><p className="text-white">{p.bedrooms_total || 0}</p></div>
                          <div><span className="text-slate-500 text-xs">{t('auto_bathrooms')}</span><p className="text-white">{p.bathrooms_full || 0}</p></div>
                          <div><span className="text-slate-500 text-xs">{t('auto_lot')}</span><p className="text-white">{p.lot_size_area ? `${Number(p.lot_size_area).toLocaleString()} m²` : '—'}</p></div>
                          <div><span className="text-slate-500 text-xs">{t('auto_construction')}</span><p className="text-white">{p.construction_size ? `${Number(p.construction_size).toLocaleString()} m²` : '—'}</p></div>
                        </div>

                        {/* Commission & Classification */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                          <div><span className="text-slate-500 text-xs">{t('auto_listing_comm')}</span><p className="text-white font-medium">{p.listing_side_comm != null ? `${p.listing_side_comm}%` : '—'}</p></div>
                          <div><span className="text-slate-500 text-xs">{t('auto_selling_comm')}</span><p className="text-white font-medium">{p.selling_side_comm != null ? `${p.selling_side_comm}%` : '—'}</p></div>
                          <div><span className="text-slate-500 text-xs">{t('auto_property_type')}</span><p className={`font-medium ${p.property_type_id ? 'text-white' : 'text-amber-400'}`}>{p.property_type_id ? `ID ${p.property_type_id}` : '⚠ ' + (t('auto_not_set'))}</p></div>
                          <div><span className="text-slate-500 text-xs">{t('auto_location_id')}</span><p className={`font-medium ${p.location_id ? 'text-white' : 'text-amber-400'}`}>{p.location_id || ('⚠ ' + (t('auto_not_set')))}</p></div>
                        </div>

                        {/* Photo thumbnails */}
                        {photoCount > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-slate-500 mb-2">📸 {photoCount} {t('auto_photos')}</p>
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
                              <p className="text-xs text-slate-500">{t('auto_description')}</p>
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
                              {descLang === 'en' ? (p.public_remarks_en || <span className="italic text-slate-500">{t('auto_no_english_description')}</span>) : (p.public_remarks_es || <span className="italic text-slate-500">{t('auto_no_spanish_description')}</span>)}
                            </p>
                          </div>
                        )}

                        {/* Approval checklist */}
                        {p.status === 'pending_approval' && (() => {
                          const checks = [
                            { ok: !!p.owner_name, required: true, label: t('auto_owner_info_verified') },
                            { ok: !!p.listing_agreement, required: true, label: t('auto_listing_agreement_signed_1') },
                            { ok: photoCount > 0, required: false, label: lang === 'en' ? `Photos uploaded (${photoCount})` : `Fotos subidas (${photoCount})` },
                            { ok: !!p.list_price, required: true, label: t('auto_price_set') },
                            { ok: !!p.public_remarks_es, required: false, label: t('auto_spanish_description') },
                            { ok: !!p.public_remarks_en, required: false, label: t('auto_english_description') },
                            { ok: !!(p.public_remarks_es && p.public_remarks_en), required: false, label: t('auto_bilingual_descriptions') },
                            { ok: !!p.property_type_id, required: false, label: t('auto_property_type_set') },
                            { ok: !!p.location_id, required: false, label: t('auto_reconnect_location_id') },
                            { ok: !!(p.listing_side_comm && p.selling_side_comm), required: false, label: t('auto_commission_splits') },
                          ];
                          const passed = checks.filter(c => c.ok).length;
                          const total = checks.length;
                          const pct = Math.round((passed / total) * 100);
                          return (
                            <div className="bg-slate-900 rounded-xl p-4 mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{t('auto_approval_checklist')}</p>
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
                                ✅ {t('auto_approve')}
                              </button>
                              <button onClick={() => handleApproveAndPublish(p.id)} disabled={actionLoading} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
                                🚀 {t('auto_approve_publish')}
                              </button>
                            </div>
                            <div>
                              <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={2} placeholder={t('auto_notes_for_the_agent')} className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 resize-none outline-none focus:ring-1 focus:ring-amber-500" />
                              <button onClick={() => handleReject(p.id)} disabled={actionLoading} className="mt-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
                                ❌ {t('auto_request_changes')}
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
      ) : subTab === 'developments' ? (
        <div>
          {/* Stats summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {devFilters.map(f => (
              <button key={f.key} onClick={() => setDevFilter(f.key)}
                className={`rounded-xl p-3 text-left transition-all border ${
                  devFilter === f.key
                    ? 'bg-nexus-blue/10 border-nexus-blue/40 ring-1 ring-nexus-blue/30'
                    : 'bg-slate-800/30 border-slate-700 hover:border-slate-500'
                }`}>
                <p className="text-2xl font-black text-white">{f.count}</p>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${devFilter === f.key ? 'text-nexus-blue' : 'text-slate-400'}`}>{f.label}</p>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-nexus-blue border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredDevelopments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">{lang === 'en' ? 'No developments in this status.' : 'No hay desarrollos en este estado.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDevelopments.map(d => {
                const isOpen = expanded === d.id;
                const logoImg = d.logo_url || d.og_image_url;
                const title = d.name;
                const agentProfile = profileByAuthId[d.agent_id];
                const submittedDate = d.submitted_at ? new Date(d.submitted_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { month: 'short', day: 'numeric' }) : null;
                const linkedProps = properties.filter(p => p.development_id === d.id);
                const totalSections = d.sections?.length || 0;

                return (
                  <div key={d.id} className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    {/* Summary row */}
                    <div className="flex items-center gap-4 p-4 hover:bg-slate-800 transition-colors">
                      <button onClick={() => setExpanded(isOpen ? null : d.id)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                          {logoImg ? (
                            <Image src={logoImg} className="w-full h-full object-cover" alt="" fill />
                          ) : (
                            <span className="text-2xl">🏢</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{title}</p>
                          <p className="text-xs text-slate-400">/d/{d.slug} · {d.unit_label || 'Lotes'} ({linkedProps.length} un.)</p>
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
                      <DevelopmentStatusBadge status={d.status} t={t} />
                      {/* View detail link */}
                      <Link
                        href={`/propiedades/desarrollos/${d.id}`}
                        target="_blank"
                        className="text-slate-400 hover:text-nexus-blue transition-colors p-1.5"
                        title={t('auto_view_details')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </Link>
                      <button onClick={() => setExpanded(isOpen ? null : d.id)} className="text-slate-500">
                        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="border-t border-slate-700 p-4 bg-slate-900/10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                          <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Developer' : 'Desarrollador'}</span><p className="text-white font-medium">{d.developer_name || '—'}</p></div>
                          <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Contact' : 'Contacto'}</span><p className="text-white font-medium">{d.developer_contact || '—'}</p></div>
                          <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Unit Type' : 'Tipo de Unidad'}</span><p className="text-white font-medium">{d.unit_label || '—'}</p></div>
                          <div><span className="text-slate-500 text-xs">{lang === 'en' ? 'Builder Sections' : 'Secciones de Página'}</span><p className="text-white font-medium">{totalSections} bloques</p></div>
                        </div>

                        {d.tagline_es && (
                          <div className="mb-4 bg-slate-900/50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">{lang === 'en' ? 'Project Description' : 'Eslogan / Descripción'}</p>
                            <p className="text-xs text-slate-300 font-medium">{d.tagline_es}</p>
                          </div>
                        )}

                        {/* Linked inventory list */}
                        {linkedProps.length > 0 && (
                          <div className="mb-4 bg-slate-900/30 rounded-xl p-3 border border-slate-800">
                            <p className="text-xs text-slate-500 mb-2 font-bold tracking-wide uppercase">🏡 {lang === 'en' ? 'Linked Inventory' : 'Inventario Vinculado'} ({linkedProps.length})</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {linkedProps.map(p => {
                                const propTitle = (lang === 'en' ? p.listing_title_en : p.listing_title_es) || p.name;
                                return (
                                  <div key={p.id} className="flex justify-between items-center bg-slate-800/40 p-2 rounded-lg text-xs">
                                    <span className="text-slate-300 truncate max-w-[200px]">{propTitle}</span>
                                    <span className="font-mono text-slate-400 font-semibold shrink-0">${p.price?.toLocaleString()}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Approval checklist */}
                        {d.status === 'pending_approval' && (() => {
                          const hasHero = d.sections?.some(s => s.type === 'hero');
                          const hasLead = d.sections?.some(s => s.type === 'lead');
                          const checks = [
                            { ok: !!d.name, required: true, label: lang === 'en' ? 'Name defined' : 'Nombre definido' },
                            { ok: !!d.slug, required: true, label: lang === 'en' ? 'Friendly URL (slug)' : 'Ruta amigable (slug)' },
                            { ok: hasHero, required: false, label: lang === 'en' ? 'Page Hero Block configured' : 'Bloque de Portada (Hero) configurado' },
                            { ok: hasLead, required: false, label: lang === 'en' ? 'Lead Capture Form block configured' : 'Formulario de captura de leads configurado' },
                            { ok: linkedProps.length > 0, required: false, label: lang === 'en' ? `Inventory loaded (${linkedProps.length} properties)` : `Inventario cargado (${linkedProps.length} propiedades)` },
                            { ok: totalSections > 0, required: false, label: lang === 'en' ? `Page sections (${totalSections})` : `Secciones de página (${totalSections})` },
                          ];
                          const passed = checks.filter(c => c.ok).length;
                          const total = checks.length;
                          const pct = Math.round((passed / total) * 100);
                          return (
                            <div className="bg-slate-900 rounded-xl p-4 mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{t('auto_approval_checklist')}</p>
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
                        {d.status === 'pending_approval' && (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleApproveDev(d.id)} disabled={actionLoading} className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
                                ✅ {t('auto_approve') || 'Aprobar'}
                              </button>
                            </div>
                            <div>
                              <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={2} placeholder={t('auto_notes_for_the_agent') || 'Notas para el agente...'} className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 resize-none outline-none focus:ring-1 focus:ring-amber-500" />
                              <button onClick={() => handleRejectDev(d.id)} disabled={actionLoading} className="mt-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
                                ❌ {t('auto_request_changes') || 'Solicitar Cambios'}
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
      ) : (
        /* Reservations view */
        <div>
          {/* Reservation stats/filters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {resFilters.map(f => (
              <button key={f.key} onClick={() => setResFilter(f.key)}
                className={`rounded-xl p-3 text-left transition-all border ${
                  resFilter === f.key
                    ? 'bg-nexus-blue/10 border-nexus-blue/40 ring-1 ring-nexus-blue/30'
                    : 'bg-slate-800/30 border-slate-700 hover:border-slate-500'
                }`}>
                <p className="text-2xl font-black text-white">{f.count}</p>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${resFilter === f.key ? 'text-nexus-blue' : 'text-slate-400'}`}>{f.label}</p>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-nexus-blue border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">{lang === 'en' ? 'No reservations in this status.' : 'No hay reservas en este estado.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReservations.map(r => {
                const isResOpen = expanded === r.id;
                const agentProfile = profiles.find(p => p.id === r.profile_id);
                const submittedDate = r.created_at ? new Date(r.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { month: 'short', day: 'numeric' }) : null;

                return (
                  <div key={r.id} className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    {/* Summary row */}
                    <div className="flex items-center gap-4 p-4 hover:bg-slate-800 transition-colors">
                      <button onClick={() => setExpanded(isResOpen ? null : r.id)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 text-lg">
                          📝
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400">
                              {r.type || 'LOI'}
                            </span>
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                              {r.side === 'both' ? (lang === 'en' ? 'Both Sides' : 'Doble Punta') : r.side === 'buying' ? (lang === 'en' ? 'Buyer Side' : 'Punta Compradora') : (lang === 'en' ? 'Seller Side' : 'Punta Vendedora')}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white truncate">{r.property_address}</p>
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

                      <div className="flex flex-col items-end text-xs mr-2">
                        <span className="text-slate-400">{lang === 'en' ? 'Res. Amount' : 'Monto Reserva'}</span>
                        <span className="font-extrabold text-white">{formatCurrency(r.reservation_amount)}</span>
                      </div>

                      <div className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 ${
                        r.status === 'signed' ? 'bg-green-900/40 text-green-400 border border-green-800/50' :
                        r.status === 'closed' ? 'bg-blue-900/40 text-blue-400 border border-blue-800/50' :
                        r.status === 'fallen' ? 'bg-red-900/40 text-red-400 border border-red-800/50' :
                        'bg-amber-900/40 text-amber-400 border border-amber-800/50 animate-pulse'
                      }`}>
                        {r.status === 'signed' ? (lang === 'en' ? 'Accepted' : 'Aceptada') :
                         r.status === 'closed' ? (lang === 'en' ? 'Closed' : 'Cerrada') :
                         r.status === 'fallen' ? (lang === 'en' ? 'Fallen' : 'Caída') :
                         (lang === 'en' ? 'Pending' : 'Pendiente')}
                      </div>

                      {/* Accept reservation button when pending */}
                      {r.status === 'pending' && (
                        <button
                          onClick={() => handleAcceptReservation(r.id)}
                          disabled={actionLoading}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-700 text-white transition-all disabled:opacity-50 flex items-center gap-1 shrink-0 shadow-lg shadow-green-600/20"
                        >
                          <span>✅</span> {lang === 'en' ? 'Accept' : 'Aceptar'}
                        </button>
                      )}

                      {r.drive_folder_url && (
                        <a
                          href={r.drive_folder_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-[#0F9D58] hover:bg-[#0F9D58]/10 transition-colors shrink-0"
                          title={lang === 'en' ? 'Open Drive Folder' : 'Abrir carpeta de Drive'}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                        </a>
                      )}

                      <button onClick={() => setExpanded(isResOpen ? null : r.id)} className="text-slate-500 p-1">
                        <svg className={`w-4 h-4 transition-transform ${isResOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isResOpen && (
                      <div className="border-t border-slate-700 p-4 bg-slate-900/30">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                          <div>
                            <span className="text-slate-500 block mb-0.5">{lang === 'en' ? 'Seller Name' : 'Propietario / Vendedor'}</span>
                            <p className="text-white font-semibold">{r.seller_name || '—'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">{lang === 'en' ? 'Buyer Name' : 'Comprador'}</span>
                            <p className="text-white font-semibold">{r.buyer_name || '—'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">{lang === 'en' ? 'Registry Numbers' : 'Fincas / Registro'}</span>
                            <p className="text-white font-mono">{r.registry_numbers || '—'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">{lang === 'en' ? 'Plan Numbers' : 'Plano'}</span>
                            <p className="text-white font-mono">{r.plan_numbers || '—'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4 border-t border-slate-700/50 pt-3">
                          <div>
                            <span className="text-slate-500 block mb-0.5">{lang === 'en' ? 'Expected Sign' : 'Firma Esperada'}</span>
                            <p className="text-white font-semibold">{r.expected_sign_date ? new Date(r.expected_sign_date).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES') : '—'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">{lang === 'en' ? 'Close Deadline' : 'Límite Escritura'}</span>
                            <p className="text-white font-semibold">{r.close_deadline ? new Date(r.close_deadline).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES') : '—'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">{lang === 'en' ? 'Deposit Deadline' : 'Fecha Límite Arras'}</span>
                            <p className="text-white font-semibold">{r.earnest_money_deadline ? new Date(r.earnest_money_deadline).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES') : '—'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">{lang === 'en' ? 'Due Diligence Date' : 'Límite DD (Arras No Reembolsables)'}</span>
                            <p className="text-white font-semibold">{r.earnest_money_non_refundable_date ? new Date(r.earnest_money_non_refundable_date).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES') : '—'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4 border-t border-slate-700/50 pt-3">
                          <div>
                            <span className="text-slate-500 block mb-0.5">{lang === 'en' ? 'Sale Price' : 'Precio de Venta'}</span>
                            <p className="text-white font-semibold">{formatCurrency(r.sale_price)}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">{lang === 'en' ? 'Commission' : 'Comisión'}</span>
                            <p className="text-white font-semibold">{r.commission_pct ? `${r.commission_pct}%` : '—'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">{lang === 'en' ? 'Projected Net Commission' : 'Comisión Neta Proyectada'}</span>
                            <p className="text-emerald-400 font-semibold">{formatCurrency(r.agent_commission_amount)}</p>
                          </div>
                        </div>

                        {r.negotiation_details && (
                          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs">
                            <span className="text-slate-500 block mb-1 font-bold tracking-wide uppercase">{lang === 'en' ? 'Negotiation Details' : 'Detalles de la Negociación'}</span>
                            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{r.negotiation_details}</p>
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
      )}
    </div>
  );
}
