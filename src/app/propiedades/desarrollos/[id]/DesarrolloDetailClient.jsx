/* eslint-disable */
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { updateDevelopment } from '@/lib/dal/developments';
import { getPropertiesByDevelopmentId, getUnlinkedProperties, updateProperty } from '@/lib/dal/properties';
import TopNav from '@/components/layout/TopNav';
import DevelopmentStatusBadge from '@/components/propiedades/DevelopmentStatusBadge';
import { formatPriceRange } from '@/components/propiedades/DevelopmentCard';
import BlockEditor from '@/components/propiedades/BlockEditor';
import DevelopmentAnalytics from '@/components/propiedades/DevelopmentAnalytics';
import ReportBuilder from '@/components/propiedades/ReportBuilder';
import Link from 'next/link';

/* InventarioTab — links/unlinks agent properties to this development */
function InventarioTab({ dev, t, lang }) {
  const [properties, setProperties] = useState([]);
  const [agentProps, setAgentProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      const linked = await getPropertiesByDevelopmentId(dev.id);
      const mine = await getUnlinkedProperties();
      setProperties(linked || []);
      setAgentProps(mine || []);
      setLoading(false);
    };
    load();
  }, [dev.id]);

  const linkProp = async (propId) => {
    setLinking(true);
    await updateProperty(propId, { development_id: dev.id });
    const linked = await getPropertiesByDevelopmentId(dev.id);
    setProperties(linked || []);
    setAgentProps(prev => prev.filter(p => p.id !== propId));
    setLinking(false);
    setShowPicker(false);
  };

  const unlinkProp = async (propId) => {
    if (!confirm(t('dev_inv_unlink_confirm'))) return;
    await updateProperty(propId, { development_id: null });
    setProperties(prev => prev.filter(p => p.id !== propId));
  };

  const STATUS_COLOR = { draft: 'bg-gray-100 text-gray-600', pending_approval: 'bg-amber-100 text-amber-700', approved: 'bg-blue-100 text-blue-700', published: 'bg-emerald-100 text-emerald-700', sold: 'bg-purple-100 text-purple-700' };

  if (loading) return <div className="glass-panel rounded-2xl p-12 flex items-center justify-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">{t('dev_inv_title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{properties.length} {t('auto_properties_linked')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPicker(!showPicker)} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            {t('dev_inv_link')}
          </button>
          <Link href={`/propiedades/nuevo?development_id=${dev.id}`} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-colors flex items-center gap-2">
            {t('dev_inv_create')}
          </Link>
        </div>
      </div>

      {showPicker && (
        <div className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('auto_select_a_property_to')}</p>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('dev_inv_search')} className="w-full mb-3 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          {agentProps.filter(p => (p.title_es || p.title_en || '').toLowerCase().includes(search.toLowerCase())).length === 0
            ? <p className="text-sm text-gray-500 text-center py-4">{t('auto_no_unlinked_properties_found')}</p>
            : agentProps.filter(p => (p.title_es || p.title_en || '').toLowerCase().includes(search.toLowerCase())).map(p => (
              <button key={p.id} onClick={() => linkProp(p.id)} disabled={linking} className="w-full flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors text-left mb-1 disabled:opacity-50">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{p.title_es || p.title_en || t('auto_untitled')}</p>
                  <p className="text-xs text-gray-500">{p.property_type}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
              </button>
            ))
          }
        </div>
      )}

      {properties.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">🏘️</span>
          <h3 className="font-bold text-gray-900 dark:text-white">{t('dev_inv_empty')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">{t('dev_inv_empty_desc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map(prop => (
            <div key={prop.id} className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
              {prop.main_image_url ? (
                <div className="aspect-[16/9] bg-gray-100 dark:bg-slate-800 overflow-hidden relative">
                  <img src={prop.main_image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[16/9] bg-gray-100 dark:bg-slate-800 flex items-center justify-center"><span className="text-3xl opacity-30">🏠</span></div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{prop.title_es || prop.title_en || '—'}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${STATUS_COLOR[prop.status] || 'bg-gray-100 text-gray-600'}`}>{prop.status}</span>
                </div>
                <p className="text-xs text-gray-500">{prop.property_type} {prop.size_m2 ? `• ${prop.size_m2.toLocaleString()} m²` : ''}</p>
                {prop.price && <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mt-2">${prop.price.toLocaleString()}</p>}
                <div className="flex gap-2 mt-3">
                  <Link href={`/propiedades/${prop.id}`} className="flex-1 text-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-gray-400">
                    {t('auto_view')}
                  </Link>
                  <button onClick={() => unlinkProp(prop.id)} className="flex-1 text-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                    {t('dev_inv_unlink')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* AjustesTab — status management, share link, danger zone */
function AjustesTab({ dev, setDev, t, lang }) {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/d/${dev.slug}` : `/d/${dev.slug}`;

  const STATUS_FLOW = ['draft', 'pending_approval', 'active', 'sold_out', 'archived'];
  const STATUS_LABELS = { draft: t('dev_status_draft'), pending_approval: t('dev_status_pending'), active: t('dev_status_active'), sold_out: t('dev_status_sold_out'), archived: t('dev_status_archived') };
  const STATUS_COLORS = { draft: 'bg-gray-100 text-gray-600', pending_approval: 'bg-amber-100 text-amber-700', active: 'bg-emerald-100 text-emerald-700', sold_out: 'bg-purple-100 text-purple-700', archived: 'bg-red-100 text-red-600' };

  const changeStatus = async (newStatus) => {
    setSaving(true);
    try {
      await updateDevelopment(dev.id, { status: newStatus });
      setDev(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error(error);
    }
    setSaving(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="space-y-6">
      {/* Status Section */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">{t('dev_settings_status')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('dev_settings_status_note')}</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map(s => (
            <button key={s} onClick={() => changeStatus(s)} disabled={saving || dev.status === s}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${dev.status === s ? STATUS_COLORS[s] + ' ring-2 ring-offset-2 ring-emerald-500' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
              {STATUS_LABELS[s]}
              {dev.status === s && ' ✓'}
            </button>
          ))}
        </div>
        {saving && <p className="text-xs text-emerald-500 mt-3">{t('dev_settings_saving')}</p>}
      </div>

      {/* Share Section */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t('dev_settings_share')}</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-mono text-sm text-gray-600 dark:text-gray-400 truncate">
            {publicUrl}
          </div>
          <button onClick={copyLink} className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${copied ? 'bg-emerald-500 text-white' : 'border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
            {copied ? t('dev_settings_copied') : t('dev_settings_copy_link')}
          </button>
          {dev.status === 'active' && (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="px-4 py-3 rounded-xl text-sm font-semibold border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors whitespace-nowrap">
              {t('auto_view_live')}
            </a>
          )}
        </div>
      </div>

      {/* Edit Meta */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t('dev_settings_edit_meta')}</h2>
        <Link href={`/propiedades/desarrollos/${dev.id}/editar`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          {t('auto_edit_name_slug_branding')}
        </Link>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel rounded-2xl p-6 border border-red-200 dark:border-red-900">
        <h2 className="font-bold text-red-600 dark:text-red-400 mb-4">{t('dev_settings_danger')}</h2>
        <button onClick={() => { if (confirm(t('dev_settings_archive_confirm'))) changeStatus('archived'); }}
          className="px-5 py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          {t('dev_settings_archive')}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DETALLE DESARROLLO — Development Detail & Editor
   ═══════════════════════════════════════════════════════════════ */

export default function DesarrolloDetailClient({ initialDevelopment }) {
  const { id } = useParams();
  const router = useRouter();
  const { t, lang } = useApp();
  const { user } = useAuth();

  const [dev, setDev] = useState(initialDevelopment);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [blocks, setBlocks] = useState(initialDevelopment?.sections || []);
  const [activeTab, setActiveTab] = useState('Editor');
  const [showReport, setShowReport] = useState(false);

  // Removed initial fetch useEffect

  const handleSave = async () => {
    setActionLoading(true);
    try {
      await updateDevelopment(id, { sections: blocks });
      alert(t('auto_saved_successfully'));
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const addBlock = (type) => {
    const newBlock = { id: crypto.randomUUID(), type, content: {} };
    setBlocks([...blocks, newBlock]);
  };

  if (loading) return (
    <>
      <TopNav title={t('dev_detail_title')} subtitle={t('dev_subtitle')} />
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  );

  if (!dev) return null;

  return (
    <>
      <TopNav title={dev.name} subtitle={t('dev_subtitle')} />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg overflow-y-auto w-full">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-dark-border px-4 md:px-8 pt-6 pb-0 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* Breadcrumb & Actions */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Link href="/propiedades/desarrollos" className="hover:text-emerald-500 transition-colors">
                    {t('auto_developments')}
                  </Link>
                  <span>/</span>
                  <span className="text-gray-600 dark:text-white truncate max-w-[200px] md:max-w-xs">{dev.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{dev.name}</h1>
                  <DevelopmentStatusBadge status={dev.status} t={t} size="sm" />
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span className="font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">/d/{dev.slug}</span>
                  {dev.status === 'active' && (
                    <a href={`/d/${dev.slug}`} target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline flex items-center gap-1 text-xs font-medium">
                      {t('auto_view_live_1')}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setShowReport(true)}
                  className="px-4 py-2 rounded-xl bg-[#003DA5] hover:bg-[#002d7a] text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                  <span>📊</span>
                  {t('auto_report')}
                </button>
                <button className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {t('auto_settings')}
                </button>
                <button onClick={handleSave} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  )}
                  {t('auto_save_changes')}
                </button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-6 -mb-px overflow-x-auto">
              {['Editor', 'Inventario', 'Leads', 'Analíticas', 'Ajustes'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Editor Sidebar */}
            {activeTab === 'Editor' && (
              <div className="lg:col-span-1 space-y-4">
                <div className="glass-panel rounded-2xl p-4 sticky top-48">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                    {t('auto_page_blocks')}
                  </h3>
                  
                  <div className="space-y-2">
                    {[
                      { id: 'hero', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Hero / Portada' },
                      { id: 'text', icon: 'M4 6h16M4 12h16M4 18h7', label: 'Texto / Descripción' },
                      { id: 'gallery', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Galería de Fotos' },
                      { id: 'amenities', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', label: 'Amenidades' },
                      { id: 'stats', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Estadísticas' },
                      { id: 'inventory', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Inventario de Unidades' },
                      { id: 'video', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Video' },
                      { id: 'map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', label: 'Mapa de Ubicación' },
                      { id: 'faq', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Preguntas Frecuentes' },
                      { id: 'lead', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'Formulario Contacto' },
                      { id: 'document', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', label: 'Documento / Brochure' },
                      { id: 'social', icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14', label: 'Redes Sociales' },
                      { id: 'agent', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Tarjeta del Agente' },
                    ].map(block => (
                      <button key={block.id} onClick={() => addBlock(block.id)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors group border border-dashed border-gray-200 dark:border-slate-700 hover:border-emerald-500 text-left">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={block.icon} /></svg>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-500">{block.label}</span>
                        <svg className="w-4 h-4 ml-auto text-gray-300 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Page Preview / Canvas */}
            <div className={activeTab === 'Editor' ? "lg:col-span-3" : "lg:col-span-4"}>
              {activeTab === 'Analíticas' ? (
                <DevelopmentAnalytics developmentId={id} />
              ) : activeTab === 'Editor' ? (
                <div className={`glass-panel rounded-2xl min-h-[600px] border-2 border-dashed ${blocks.length === 0 ? 'border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-slate-900/20' : 'border-transparent overflow-hidden'}`}>
                  
                  {blocks.length > 0 ? (
                    <div className="w-full h-full text-left bg-white dark:bg-slate-900">
                      <BlockEditor development={dev} blocks={blocks} onChange={setBlocks} />
                    </div>
                  ) : (
                    <div className="max-w-sm">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {t('auto_your_page_is_empty')}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        {t('auto_start_building_your_marketing')}
                      </p>
                      <button onClick={() => addBlock('hero')} className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg">
                        {t('auto_add_hero_block')}
                      </button>
                    </div>
                  )}
                  
                </div>
              ) : activeTab === 'Inventario' ? (
                <InventarioTab dev={dev} t={t} lang={lang} />
              ) : activeTab === 'Ajustes' ? (
                <AjustesTab dev={dev} setDev={setDev} t={t} lang={lang} />
              ) : (
                <div className="glass-panel rounded-2xl p-12 text-center text-gray-500 dark:text-gray-400">
                  {t('auto_tab_content_coming_soon')}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Report Builder Modal */}
      {showReport && (
        <ReportBuilder
          developmentId={id}
          developmentName={dev.name}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}
