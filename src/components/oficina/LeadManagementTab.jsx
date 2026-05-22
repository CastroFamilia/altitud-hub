"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/context';
import { getAllInquiries, getLeadSources, getLeadCommunications, getPendingLeadFollowUps, updatePropertyInquiry } from '@/lib/dal/contacts';
import { insertPropertyInquiry } from '@/lib/dal/properties';
import CommunicationPanel from './CommunicationPanel';
import Image from 'next/image';

const TYPE_COLORS = {
  propiedad_especifica: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  comprar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  vender: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  alquiler: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  otro: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};
const STATUS_COLORS = {
  new: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  contacted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  prelisting: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  cma: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  listed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  converted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  dismissed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};
const LANG_FLAGS = { es: '🇪🇸', en: '🇺🇸', other: '🌐' };

const EMPTY_FORM = { lead_name:'', lead_email:'', lead_phone:'', lead_type:'otro', source:'manual', lead_language:'es', property_id:'', assigned_agent_id:'', notes:'' };

export default function LeadManagementTab({ profiles = [], initialLeads = [], initialSources = [], initialCommunications = [], initialFollowUps = [], properties = [] }) {
  const { lang, t } = useApp();


  const [leads, setLeads] = useState(initialLeads);
  const [sources, setSources] = useState(initialSources);
  const [communications, setCommunications] = useState(initialCommunications);
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [loading, setLoading] = useState(initialLeads.length === 0);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({...EMPTY_FORM});
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllInquiries(supabase);
      setLeads(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const data = await getLeadSources(supabase);
      setSources(data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchComms = useCallback(async () => {
    try {
      const data = await getLeadCommunications(supabase);
      setCommunications(data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchFollowUps = useCallback(async () => {
    try {
      const data = await getPendingLeadFollowUps(supabase);
      setFollowUps(data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchLeads(); fetchSources(); fetchComms(); fetchFollowUps(); }, [fetchLeads, fetchSources, fetchComms, fetchFollowUps]);

  const agents = profiles.filter(p => p.role !== 'photographer');
  const agentMap = useMemo(() => Object.fromEntries(agents.map(a => [a.id, a])), [agents]);

  // Follow-up lookup: inquiry_id → pending follow-ups
  const followUpMap = useMemo(() => {
    const map = {};
    (followUps || []).filter(f => f.status === 'pending').forEach(f => {
      if (!map[f.inquiry_id]) map[f.inquiry_id] = [];
      map[f.inquiry_id].push(f);
    });
    return map;
  }, [followUps]);

  const todayStr = new Date().toISOString().split('T')[0];
  const hasOverdueFollowUp = (leadId) => (followUpMap[leadId] || []).some(f => f.due_date < todayStr);
  const hasTodayFollowUp = (leadId) => (followUpMap[leadId] || []).some(f => f.due_date === todayStr);
  const hasFutureFollowUp = (leadId) => (followUpMap[leadId] || []).some(f => f.due_date > todayStr);

  const isBreached = (lead) => {
    if (lead.status !== 'new' || lead.first_contact_at) return false;
    if (!lead.assigned_at) return false;
    return (new Date().getTime() - new Date(lead.assigned_at).getTime()) > 48 * 60 * 60 * 1000;
  };

  const filtered = useMemo(() => {
    let list = leads;
    if (filter === 'breached') list = list.filter(l => isBreached(l));
    else if (filter !== 'all') list = list.filter(l => l.status === filter);
    if (typeFilter !== 'all') list = list.filter(l => l.lead_type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l => (l.lead_name||'').toLowerCase().includes(q) || (l.lead_email||'').toLowerCase().includes(q) || (l.lead_phone||'').includes(q));
    }
    return list;
  }, [leads, filter, typeFilter, search]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    week: leads.filter(l => { const d = new Date(l.created_at); const w = new Date(); w.setDate(w.getDate()-7); return d >= w; }).length,
    converted: leads.filter(l => l.status === 'converted').length,
  }), [leads]);

  // Build searchable property list — filtered by selected agent
  const propertyOptions = useMemo(() => {
    return (properties || []).filter(p => p.status !== 'sold').map(p => ({
      id: p.id,
      label: (lang === 'es' ? p.listing_title_es : p.listing_title_en) || p.name || `Propiedad ${p.id.slice(0, 8)}`,
      agent_id: p.agent_id,
    }));
  }, [properties, lang]);

  // Filtered by selected agent
  const agentProperties = useMemo(() => {
    if (!form.assigned_agent_id) return [];
    return propertyOptions.filter(p => p.agent_id === form.assigned_agent_id);
  }, [propertyOptions, form.assigned_agent_id]);

  // Property search autocomplete state
  const [propSearch, setPropSearch] = useState('');
  const [showPropDropdown, setShowPropDropdown] = useState(false);
  const selectedPropLabel = propertyOptions.find(p => p.id === form.property_id)?.label || '';

  const filteredProps = useMemo(() => {
    if (!propSearch) return agentProperties;
    const q = propSearch.toLowerCase();
    return agentProperties.filter(p => p.label.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [agentProperties, propSearch]);

  const handleAgentChange = (agentId) => {
    setForm(prev => ({ ...prev, assigned_agent_id: agentId, property_id: '' }));
    setPropSearch('');
  };

  const handlePropertySelect = (propId) => {
    const prop = propertyOptions.find(p => p.id === propId);
    setForm(prev => ({ ...prev, property_id: propId }));
    setPropSearch('');
    setShowPropDropdown(false);
  };


  const handleCreate = async () => {
    if (!form.lead_name) return;
    setSaving(true);
    const payload = { ...form, status: 'new', property_id: form.property_id || null, assigned_agent_id: form.assigned_agent_id || null };
    if (!payload.property_id) delete payload.property_id;
    if (!payload.assigned_agent_id) delete payload.assigned_agent_id;
    try {
      await insertPropertyInquiry(payload, supabase);
    } catch (e) {
      console.error(e);
    }
    setShowCreate(false);
    setForm({...EMPTY_FORM});
    setSaving(false);
    fetchLeads();
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updatePropertyInquiry(id, { status }, supabase);
    } catch (e) {
      console.error(e);
    }
    fetchLeads();
  };

  const handleAssign = async (id, agentId) => {
    try {
      await updatePropertyInquiry(id, { assigned_agent_id: agentId || null }, supabase);
    } catch (e) {
      console.error(e);
    }
    fetchLeads();
  };

  const timeAgo = (d) => {
    // eslint-disable-next-line react-hooks/purity
    const mins = Math.floor((Date.now() - new Date(d)) / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins/60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs/24)}d`;
  };

  const typeLabel = (tp) => t('ofc_lead_' + ({propiedad_especifica:'propiedad',comprar:'comprar',vender:'vender',alquiler:'alquiler',otro:'otro'}[tp]||'otro'));
  const statusLabel = (s) => {
    const custom = { prelisting: 'Pre-Listing', cma: 'CMA', listed: 'Listed', rejected: 'Rejected' };
    if (custom[s]) return custom[s];
    return t('ofc_leads_' + ({new:'new',contacted:'contacted',converted:'converted',dismissed:'dismissed'}[s]||s));
  };

  const sourceLabel = (src) => {
    const found = sources.find(s => s.name === src);
    if (found) return lang === 'es' ? found.label_es : found.label_en;
    return src || 'Manual';
  };

  const inputCls = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2";

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: t('ofc_leads_total'), val: stats.total, color: 'text-slate-900 dark:text-white' },
          { label: t('ofc_leads_new'), val: stats.new, color: 'text-green-500' },
          { label: t('ofc_leads_this_week'), val: stats.week, color: 'text-blue-500' },
          { label: t('ofc_leads_converted'), val: stats.converted, color: 'text-purple-500' },
        ].map((s,i) => (
          <div key={i} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{s.label}</p>
            <p className={`text-2xl font-black italic mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Actions Row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button onClick={() => setShowCreate(true)} className="bg-nexus-blue hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
          <span>+</span> {t('ofc_leads_create')}
        </button>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ofc_leads_search')} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-2">
        {['all','new','contacted','prelisting','cma','listed','converted','rejected','dismissed','breached'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter===f?'bg-nexus-blue text-white':'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white'} ${f==='breached' && filter!=='breached'?'!text-red-500 !bg-red-50 border border-red-200':''}`}>
            {f==='all'?t('ofc_leads_all'):f==='breached'?'🚨 Vencido':statusLabel(f)} <span className="opacity-60 ml-1">({f==='all'?leads.length:f==='breached'?leads.filter(isBreached).length:leads.filter(l=>l.status===f).length})</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {['all','propiedad_especifica','comprar','vender','alquiler','otro'].map(f => (
          <button key={f} onClick={() => setTypeFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${typeFilter===f?'bg-purple-600 text-white':'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}>
            {f==='all'?t('ofc_leads_all_types'):typeLabel(f)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12"><div className="w-6 h-6 border-2 border-nexus-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">📩</p>
          <p className="text-sm font-bold">{t('ofc_leads_empty')}</p>
          <p className="text-xs mt-1">{t('ofc_leads_empty_desc')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => {
            const agent = agentMap[lead.assigned_agent_id];
            const isOpen = expanded === lead.id;
            const propTitle = lead.properties ? (lang === 'es' ? lead.properties.listing_title_es : lead.properties.listing_title_en) || lead.properties.name : null;
            return (
              <div key={lead.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all">
                <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : lead.id)}>
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${lead.status==='new'?'bg-green-500 animate-pulse':lead.status==='contacted'?'bg-blue-500':lead.status==='converted'?'bg-purple-500':'bg-slate-400'}`} />
                  {/* Name & contact */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{lead.lead_name || t('ofc_leads_no_name')}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      {lead.lead_phone && <span>{lead.lead_phone}</span>}
                      {lead.lead_email && <span className="truncate">{lead.lead_email}</span>}
                    </div>
                    {/* Property linked — visible in list */}
                    {propTitle && (
                      <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5 truncate flex items-center gap-1">
                        <span>🏠</span> {propTitle}
                      </p>
                    )}
                  </div>
                  {/* Follow-up badge */}
                  {isBreached(lead) && <span className="text-[9px] font-black px-2 py-1 rounded-full bg-red-600 text-white flex-shrink-0 animate-pulse shadow-lg shadow-red-500/30">🚨 SLA Vencido</span>}
                  {hasOverdueFollowUp(lead.id) && <span className="text-[9px] font-black px-2 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0 animate-pulse">🔔 {t('ofc_leads_followup_overdue')}</span>}
                  {!hasOverdueFollowUp(lead.id) && hasTodayFollowUp(lead.id) && <span className="text-[9px] font-black px-2 py-1 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">🔔 {t('ofc_leads_followup_today')}</span>}
                  {!hasOverdueFollowUp(lead.id) && !hasTodayFollowUp(lead.id) && hasFutureFollowUp(lead.id) && <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400 flex-shrink-0">🔔</span>}
                  {/* Type badge */}
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[lead.status] || STATUS_COLORS.new}`}>{statusLabel(lead.status)}</span>
                  {/* Language */}
                  <span className="text-sm flex-shrink-0">{LANG_FLAGS[lead.lead_language] || '🌐'}</span>
                  {/* Agent */}
                  {agent && <Image src={agent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.full_name)}&background=5a82bf&color=fff&size=28`} className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-600 flex-shrink-0" alt="" title={agent.full_name} width={28} height={28} />}
                  {/* Time */}
                  <span className="text-[10px] text-slate-400 font-medium flex-shrink-0 w-8 text-right">{timeAgo(lead.created_at)}</span>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-out Drawer for Lead Details */}
      {(() => {
        const lead = leads.find(l => l.id === expanded);
        if (!lead) return null;
        const agent = agentMap[lead.assigned_agent_id];
        const propTitle = lead.properties ? (lang === 'es' ? lead.properties.listing_title_es : lead.properties.listing_title_en) || lead.properties.name : null;
        
        return (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setExpanded(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div 
              className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300"
              onClick={e => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-nexus-blue/10 flex items-center justify-center text-nexus-blue text-lg">
                    {lead.lead_name?.charAt(0).toUpperCase() || '👤'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{lead.lead_name || t('ofc_leads_no_name')}</h3>
                    <p className="text-xs text-slate-500">{lead.lead_email || lead.lead_phone}</p>
                  </div>
                </div>
                <button onClick={() => setExpanded(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 text-xl">&times;</button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">{t('ofc_leads_source')}</span>
                    <p className="text-slate-900 dark:text-white font-medium mt-0.5">{sourceLabel(lead.source)}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">{t('ofc_leads_type')}</span>
                    <p className="mt-0.5"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${TYPE_COLORS[lead.lead_type]||TYPE_COLORS.otro}`}>{typeLabel(lead.lead_type)}</span></p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">{t('ofc_leads_language')}</span>
                    <p className="text-slate-900 dark:text-white font-medium mt-0.5">{LANG_FLAGS[lead.lead_language]} {lead.lead_language==='es'?'Español':lead.lead_language==='en'?'English':'Other'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">{t('ofc_leads_date')}</span>
                    <p className="text-slate-900 dark:text-white font-medium mt-0.5">{new Date(lead.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {propTitle && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
                    <p className="text-[10px] text-blue-500 uppercase font-bold flex items-center gap-1"><span>🏠</span> {t('ofc_leads_linked_property')}</p>
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mt-1">{propTitle}</p>
                  </div>
                )}

                {lead.status === 'rejected' && lead.rejection_reason && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-900/30">
                    <p className="text-[10px] text-red-600 uppercase font-bold flex items-center gap-1"><span>❌</span> Motivo de Rechazo (Agente)</p>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mt-1">{lead.rejection_reason}</p>
                  </div>
                )}

                {lead.notes && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">{t('ofc_leads_notes')}</p>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                      {lead.notes}
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-bold mb-1 block">{t('ofc_leads_status')}</label>
                    <select value={lead.status} onChange={e => handleStatusChange(lead.id, e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-nexus-blue outline-none transition-all">
                      {['new','contacted','prelisting','cma','listed','converted','rejected','dismissed'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-bold mb-1 block">{t('ofc_leads_agent')}</label>
                    <select value={lead.assigned_agent_id||''} onChange={e => handleAssign(lead.id, e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-nexus-blue outline-none transition-all">
                      <option value="">{t('ofc_leads_unassigned')}</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Communication Panel */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                  <CommunicationPanel
                    lead={lead}
                    agentId={lead.assigned_agent_id}
                    communications={communications}
                    onUpdate={() => { fetchComms(); fetchFollowUps(); }}
                    onFollowUpCreated={fetchFollowUps}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-8 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-xl font-black italic text-slate-900 dark:text-white">{t('ofc_leads_create')}</h3>
              <p className="text-xs text-slate-400 mt-1">{t('ofc_leads_create_desc')}</p>
            </div>

            <div>
              <label className={labelCls}>{t('ofc_leads_client_name')} *</label>
              <input value={form.lead_name} onChange={e => setForm(p=>({...p, lead_name: e.target.value}))} placeholder="Ej. Juan Pérez" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.lead_email} onChange={e => setForm(p=>({...p, lead_email: e.target.value}))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('ofc_leads_phone')}</label>
                <input value={form.lead_phone} onChange={e => setForm(p=>({...p, lead_phone: e.target.value}))} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>{t('ofc_leads_reason')}</label>
              <div className="flex flex-wrap gap-2">
                {['propiedad_especifica','comprar','vender','alquiler','otro'].map(t => (
                  <button key={t} onClick={() => setForm(p=>({...p, lead_type: t}))} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${form.lead_type===t?'bg-nexus-blue text-white border-nexus-blue':'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                    {typeLabel(t)}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. Agent selector — FIRST */}
            <div>
              <label className={labelCls}>{t('ofc_leads_assign_agent')} *</label>
              <select value={form.assigned_agent_id} onChange={e => handleAgentChange(e.target.value)} className={inputCls}>
                <option value="">{t('ofc_leads_select')}</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>

            {/* 2. Property autocomplete — only shows after agent selected */}
            {form.assigned_agent_id && (
              <div className="relative">
                <label className={labelCls}>{lang === 'en' ? 'Property' : 'Propiedad'}</label>
                {form.property_id ? (
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
                    <span className="text-sm">🏠</span>
                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex-1 truncate">{selectedPropLabel}</span>
                    <button type="button" onClick={() => { setForm(p => ({...p, property_id: ''})); setPropSearch(''); }} className="text-blue-400 hover:text-red-500 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={propSearch}
                      onChange={e => { setPropSearch(e.target.value); setShowPropDropdown(true); }}
                      onFocus={() => setShowPropDropdown(true)}
                      placeholder={lang === 'en' ? 'Type property title or ID...' : 'Escriba título o ID de propiedad...'}
                      className={inputCls}
                    />
                    {showPropDropdown && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                        {filteredProps.length === 0 ? (
                          <p className="px-4 py-3 text-xs text-slate-400 text-center">
                            {agentProperties.length === 0
                              ? (lang === 'en' ? 'No properties for this agent' : 'Sin propiedades para este agente')
                              : (lang === 'en' ? 'No matches found' : 'No se encontraron coincidencias')
                            }
                          </p>
                        ) : filteredProps.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handlePropertySelect(p.id)}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                          >
                            <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">🏠 {p.label}</p>
                            <p className="text-[9px] text-slate-400 font-mono">{p.id.slice(0, 8)}...</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {!form.property_id && agentProperties.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">{agentProperties.length} {lang === 'en' ? 'properties available' : 'propiedades disponibles'}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('ofc_leads_lead_source')}</label>
                <select value={form.source} onChange={e => setForm(p=>({...p, source: e.target.value}))} className={inputCls}>
                  <option value="manual">Manual</option>
                  {sources.map(s => <option key={s.id} value={s.name}>{s.icon} {lang==='es'?s.label_es:s.label_en}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t('ofc_leads_language')}</label>
                <select value={form.lead_language} onChange={e => setForm(p=>({...p, lead_language: e.target.value}))} className={inputCls}>
                  <option value="es">🇪🇸 Español</option>
                  <option value="en">🇺🇸 English</option>
                  <option value="other">🌐 {t('ofc_lead_otro')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>{t('ofc_leads_notes')}</label>
              <textarea value={form.notes} onChange={e => setForm(p=>({...p, notes: e.target.value}))} rows={3} className={inputCls + " resize-none"} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">
                {t('ofc_leads_cancel')}
              </button>
              <button onClick={handleCreate} disabled={!form.lead_name || saving} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-nexus-blue text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50">
                {saving ? t('ofc_leads_saving') : t('ofc_leads_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
