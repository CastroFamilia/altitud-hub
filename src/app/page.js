"use client";

import TopNav from '@/components/layout/TopNav';
import { useApp } from '@/lib/context';

export default function Dashboard() {
  const { t } = useApp();

  const tabs = [
    { key: 'dash_tab_all', count: '0' },
    { key: 'dash_tab_pending' },
    { key: 'dash_tab_done' },
    { key: 'dash_tab_followup' },
    { key: 'dash_tab_rejected' },
    { key: 'dash_tab_make_acm' },
  ];

  const headers = ['dash_th_client', 'dash_th_zone', 'dash_th_contact', 'dash_th_status', 'dash_th_action'];

  return (
    <>
      <TopNav titleKey="header_title" subtitleKey="header_subtitle" />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 relative z-0 bg-slate-50 dark:bg-dark-bg">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* ── PRE-LISTING HUB ── */}
          <div className="fade-in space-y-6">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-4xl nexus-header text-nexus-blue dark:text-white leading-none">{t('dash_prelisting_title')}</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-widest">{t('dash_prelisting_subtitle')}</p>
              </div>
              <button className="bg-nexus-blue hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95">
                {t('dash_btn_new_interview')}
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { key: 'dash_stat_interviews', val: '0', color: 'text-slate-900 dark:text-white' },
                { key: 'dash_stat_followup',   val: '0',  color: 'text-amber-500' },
                { key: 'dash_stat_ready_acm',  val: '0',  color: 'text-nexus-blue' }
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
              {tabs.map((tab, idx) => (
                <button key={idx} className={`flex-1 py-3 px-4 rounded-xl transition-all ${idx === 0 ? 'bg-white dark:bg-slate-700 text-nexus-blue dark:text-white shadow-sm' : 'text-slate-500'}`}>
                  {t(tab.key)}{tab.count ? ` ${tab.count}` : ''}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    {headers.map((key, idx) => (
                      <th key={idx} className="py-4 px-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t(key)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-600">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin entrevistas registradas</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* ── REGISTRO ACM ── */}
          <div className="fade-in space-y-6 pb-12">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-3xl nexus-header text-nexus-blue dark:text-white leading-none">{t('dash_acm_title')}</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-widest">{t('dash_acm_subtitle')}</p>
              </div>
              <button className="bg-nexus-blue hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95">
                {t('dash_btn_new_acm')}
              </button>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-[32px] p-12 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-4">
               <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
               </div>
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('dash_acm_empty')}</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
