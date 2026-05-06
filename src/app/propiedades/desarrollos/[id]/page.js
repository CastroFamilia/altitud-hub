"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/layout/TopNav';
import DevelopmentStatusBadge from '@/components/propiedades/DevelopmentStatusBadge';
import { formatPriceRange } from '@/components/propiedades/DevelopmentCard';
import BlockEditor from '@/components/propiedades/BlockEditor';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   DETALLE DESARROLLO — Development Detail & Editor
   ═══════════════════════════════════════════════════════════════ */

export default function DevelopmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, lang } = useApp();
  const { user } = useAuth();

  const [dev, setDev] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [activeTab, setActiveTab] = useState('Editor');

  useEffect(() => {
    if (!id) return;
    const fetchDev = async () => {
      const { data, error } = await supabase
        .from('developments')
        .select('*')
        .eq('id', id)
        .single();
      if (error) { console.error(error); setLoading(false); return; }
      setDev(data);
      setBlocks(data.sections || []);
      setLoading(false);
    };
    fetchDev();
  }, [id]);

  const handleSave = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('developments')
        .update({ sections: blocks })
        .eq('id', id);
      if (error) throw error;
      alert(lang === 'en' ? 'Saved successfully' : 'Guardado exitosamente');
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
                    {lang === 'en' ? 'Developments' : 'Desarrollos'}
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
                      {lang === 'en' ? 'View Live' : 'Ver Pública'}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {lang === 'en' ? 'Settings' : 'Configuración'}
                </button>
                <button onClick={handleSave} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  )}
                  {lang === 'en' ? 'Save Changes' : 'Guardar Cambios'}
                </button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-6 -mb-px overflow-x-auto">
              {['Editor', 'Inventario', 'Leads', 'Ajustes'].map((tab) => (
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
            <div className="lg:col-span-1 space-y-4">
              <div className="glass-panel rounded-2xl p-4 sticky top-48">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                  {lang === 'en' ? 'Page Blocks' : 'Bloques de Página'}
                </h3>
                
                <div className="space-y-2">
                  {[
                    { id: 'hero', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Hero / Portada' },
                    { id: 'text', icon: 'M4 6h16M4 12h16M4 18h7', label: 'Texto / Descripción' },
                    { id: 'gallery', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Galería de Fotos' },
                    { id: 'amenities', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', label: 'Amenidades' },
                    { id: 'faq', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Preguntas Frecuentes' },
                    { id: 'lead', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'Formulario Contacto' },
                    { id: 'agent', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Tarjeta del Agente' }
                  ].map(block => (
                    <button key={block.id} onClick={() => addBlock(block.id)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors group border border-dashed border-gray-200 dark:border-slate-700 hover:border-emerald-500 text-left">
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={block.icon} /></svg>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-500">{block.label}</span>
                      <svg className="w-4 h-4 ml-auto text-gray-300 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Page Preview / Canvas */}
            <div className="lg:col-span-3">
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
                      {lang === 'en' ? 'Your page is empty' : 'Tu página está vacía'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                      {lang === 'en' ? 'Start building your marketing page by adding blocks from the panel on the left.' : 'Comienza a construir tu página de marketing agregando bloques desde el panel de la izquierda.'}
                    </p>
                    <button onClick={() => addBlock('hero')} className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg">
                      {lang === 'en' ? 'Add Hero Block' : 'Agregar Bloque de Portada'}
                    </button>
                  </div>
                )}
                
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
