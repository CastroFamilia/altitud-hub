"use client";

import { useState } from 'react';
import TopNav from '@/components/layout/TopNav';
import { useApp } from '@/lib/context';

const ACM_REMAX_URL = 'https://acm-remax.vercel.app';

export default function ACMClient({ initialProperties = [] }) {
  const { t } = useApp();
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  const handleNewACM = () => {
    let url = ACM_REMAX_URL;
    if (selectedPropertyId) {
      const prop = initialProperties.find(p => p.id === selectedPropertyId);
      if (prop) {
        const params = new URLSearchParams({
          prop_id: prop.id,
          address: prop.name || '',
          size: prop.size_sqm || '',
          client: prop.contacts ? `${prop.contacts.first_name} ${prop.contacts.last_name || ''}`.trim() : ''
        });
        url += `?${params.toString()}`;
      }
    }
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
