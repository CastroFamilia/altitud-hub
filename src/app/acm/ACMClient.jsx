"use client";

import { useState, useEffect } from 'react';
import TopNav from '@/components/layout/TopNav';
import { useApp } from '@/lib/context';

const ACM_REMAX_URL = 'https://acm-remax.vercel.app';

export default function ACMClient({ initialProperties = [] }) {
  const { t } = useApp();
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [activeSearches, setActiveSearches] = useState([]);
  
  useEffect(() => {
    fetch('/api/searches?all=true')
      .then(res => res.json())
      .then(data => {
        if(data.searches) {
          setActiveSearches(data.searches.filter(s => s.status === 'activa'));
        }
      })
      .catch(console.error);
  }, []);

  const handleNewACM = () => {
    let url = ACM_REMAX_URL;
    const isDark = document.documentElement.classList.contains('dark');
    const params = new URLSearchParams();
    params.append('theme', isDark ? 'dark' : 'light');

    if (selectedPropertyId) {
      const prop = initialProperties.find(p => p.id === selectedPropertyId);
      if (prop) {
        params.append('prop_id', prop.id);
        params.append('address', prop.name || '');
        params.append('size', prop.size_sqm || '');
        params.append('client', prop.contacts ? `${prop.contacts.first_name} ${prop.contacts.last_name || ''}`.trim() : '');
      }
    }
    url += `?${params.toString()}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <TopNav titleKey="header_title" subtitleKey="header_subtitle" />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 relative z-0 bg-slate-50 dark:bg-dark-bg">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* ── ACM ── */}
          <div className="fade-in space-y-6">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-4xl nexus-header text-nexus-blue dark:text-white leading-none">{t('dash_acm_title')}</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-widest">{t('dash_acm_subtitle')}</p>
              </div>
              <div className="flex flex-col md:flex-row items-end gap-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Vincular Propiedad</label>
                  <select 
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-nexus-blue w-64"
                  >
                    <option value="">-- Sin vincular --</option>
                    {initialProperties.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.contacts?.first_name})</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleNewACM}
                  className="bg-nexus-blue hover:bg-blue-700 text-white px-8 py-3 h-[42px] rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  {t('dash_btn_new_acm')}
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { key: 'dash_stat_acm_created', val: '0', color: 'text-slate-900 dark:text-white' },
                { key: 'dash_stat_acm_draft',   val: '0', color: 'text-amber-500' },
                { key: 'dash_stat_acm_presented', val: '0', color: 'text-nexus-blue' }
              ].map((s, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-slate-700 group hover:shadow-lg transition-all">
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">{t(s.key)}</p>
                  <h3 className={`text-3xl font-black italic mt-2 ${s.color}`}>{s.val}</h3>
                </div>
              ))}
              <div className="bg-slate-900 dark:bg-nexus-blue/20 rounded-[32px] p-6 shadow-xl border border-slate-800 dark:border-nexus-blue/20 relative overflow-hidden group">
                <p className="text-[9px] text-white/60 dark:text-nexus-blue uppercase font-black tracking-widest leading-none">{t('dash_stat_conversion')}</p>
                <h3 className="text-3xl font-black text-white mt-2 italic">0%</h3>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-inner overflow-x-auto no-scrollbar">
              {[
                { key: 'dash_acm_tab_all', count: '0' },
                { key: 'dash_acm_tab_draft' },
                { key: 'dash_acm_tab_complete' },
                { key: 'dash_acm_tab_presented' },
              ].map((tab, idx) => (
                <button key={idx} className={`flex-1 py-3 px-4 rounded-xl transition-all ${idx === 0 ? 'bg-white dark:bg-slate-700 text-nexus-blue dark:text-white shadow-sm' : 'text-slate-500'}`}>
                  {t(tab.key)}{tab.count ? ` ${tab.count}` : ''}
                </button>
              ))}
            </div>

            {/* Cruces / Matchmaking */}
            {activeSearches.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[32px] p-8 shadow-sm border border-blue-200 dark:border-blue-800/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic text-blue-900 dark:text-blue-100">Cruces Inteligentes</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">Hay {activeSearches.length} compradores/inquilinos buscando propiedades ahora mismo.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSearches.slice(0, 6).map(s => (
                    <div key={s.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                      <div className="flex items-center gap-2 mb-2">
                        {s.profiles?.avatar_url ? (
                          <img src={s.profiles.avatar_url} alt="agent" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                            {s.profiles?.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{s.profiles?.full_name || 'Agente'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{s.property_type}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest my-1">
                        {s.operation_type === 'alquiler' ? 'ALQ' : 'VTA'} • {(s.zones && s.zones.length > 0) ? s.zones.join(', ') : 'Sin zona'}
                      </p>
                      <p className="text-xs font-black italic text-nexus-blue">
                        ${Number(s.price_min || 0).toLocaleString()} - ${Number(s.price_max || 0).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('dash_acm_empty')}</p>
                <button
                  onClick={handleNewACM}
                  className="mt-2 text-nexus-blue hover:text-blue-700 text-[11px] font-black uppercase tracking-widest transition-colors"
                >
                  {t('dash_btn_new_acm')} →
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
