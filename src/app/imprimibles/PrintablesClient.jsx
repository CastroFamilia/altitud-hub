/* eslint-disable */
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/layout/TopNav';
import { useApp } from '@/lib/context';
import PrelistingPrintForm from '@/components/printables/PrelistingPrintForm';
import BuyerQualifyPrintForm from '@/components/printables/BuyerQualifyPrintForm';
import AcmPrintForm from '@/components/printables/AcmPrintForm';

const PRINTABLE_ITEMS = [
  {
    id: 'prelisting-form',
    titleKey: 'print_prelisting_title',
    descKey: 'print_prelisting_desc',
    icon: '📋',
    color: 'from-indigo-500 to-violet-500',
    badge: 'PDF',
  },
  {
    id: 'buyer-qualify',
    titleKey: 'print_buyer_qualify_title',
    descKey: 'print_buyer_qualify_desc',
    icon: '🏠',
    color: 'from-teal-500 to-emerald-500',
    badge: 'PDF',
  },
  {
    id: 'acm-consolidated',
    titleKey: 'print_acm_title',
    descKey: 'print_acm_desc',
    icon: '📊',
    color: 'from-blue-600 to-indigo-600',
    badge: 'PDF',
  },
];

export default function PrintablesClient({ savedPresentations = [] }) {
  const { t } = useApp();
  const router = useRouter();
  const [activePreview, setActivePreview] = useState(null);
  const [acmReports, setAcmReports] = useState([]);
  const [selectedAcmId, setSelectedAcmId] = useState('');
  
  const printRef = useRef(null);
  const buyerPrintRef = useRef(null);
  const acmPrintRef = useRef(null);

  useEffect(() => {
    fetch('/api/acm')
      .then(res => res.json())
      .then(data => {
        if (data.reports) {
          setAcmReports(data.reports);
          if (data.reports.length > 0) {
            setSelectedAcmId(data.reports[0].id);
          }
        }
      })
      .catch(console.error);
  }, []);

  const selectedAcmReport = acmReports.find(r => r.id === selectedAcmId) || null;

  const openPrintWindow = (ref, title) => {
    const printContent = ref.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Montserrat', sans-serif; color: #1a1a2e; background: #fff; }
          @page { size: letter; margin: 0.6in 0.7in; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  const handlePrint = () => openPrintWindow(printRef, t('print_prelisting_title'));
  const handleBuyerPrint = () => openPrintWindow(buyerPrintRef, t('print_buyer_qualify_title'));
  const handleAcmPrint = () => {
    if (!selectedAcmReport) return;
    openPrintWindow(acmPrintRef, `${t('print_acm_title')} - ${selectedAcmReport.property_address || 'CMA'}`);
  };

  return (
    <>
      <TopNav title={t('nav_printables')} subtitle={t('print_subtitle')} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 relative z-0">
        <div className="fade-in max-w-5xl mx-auto space-y-8">

          {/* ── Header ── */}
          <div className="pt-2">
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{t('nav_printables')}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('print_subtitle')}</p>
          </div>

          {/* ── Saved Presentations Section ── */}
          {savedPresentations.length > 0 && (
            <div className="mb-10">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">Mis Presentaciones Pre-Listing Personalizadas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedPresentations.map((pres) => (
                  <div key={pres.id} className="relative text-left glass-panel rounded-2xl border border-gray-200 dark:border-dark-border transition-all duration-300 shadow-sm hover:shadow-md bg-white dark:bg-dark-panel overflow-hidden">
                    <div className="h-24 bg-gray-100 dark:bg-dark-input relative">
                      {pres.cover_background_url && (
                        <img src={pres.cover_background_url} alt="Cover" className="w-full h-full object-cover opacity-60" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end">
                        <h4 className="text-sm font-bold text-white truncate">{pres.client_name || 'Sin Cliente'}</h4>
                        <p className="text-[10px] text-white/80 truncate">{pres.cover_title}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-white dark:bg-dark-panel flex justify-between items-center gap-2">
                      <p className="text-[10px] text-gray-500">{new Date(pres.created_at).toLocaleDateString()}</p>
                      <button 
                        onClick={() => router.push(`/prelisting/carpeta?id=${pres.id}`)}
                        className="bg-brand-50 hover:bg-brand-100 text-brand-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Ver / Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Printable Cards Grid ── */}
          <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">Plantillas Base</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRINTABLE_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePreview(item.id === activePreview ? null : item.id)}
                className={`group relative text-left glass-panel rounded-2xl p-6 border transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                  activePreview === item.id
                    ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-brand-500/10'
                    : 'border-white/10 hover:border-brand-300'
                }`}
              >
                {/* Gradient Blob */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color} opacity-10 rounded-full -mr-6 -mt-6 blur-2xl group-hover:opacity-20 transition-all duration-700`} />

                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-[9px] font-black bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full tracking-widest">{item.badge}</span>
                </div>

                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{t(item.titleKey)}</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed min-h-[44px]">{t(item.descKey)}</p>

                <div className="mt-4 flex items-center text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  {activePreview === item.id ? t('print_hide_preview') : t('print_show_preview')}
                  <svg className={`w-3 h-3 ml-1.5 transition-transform ${activePreview === item.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>
            ))}

            {/* Placeholder for future items */}
            <div className="glass-panel rounded-2xl p-6 border border-dashed border-gray-300 dark:border-dark-border flex flex-col items-center justify-center text-center opacity-50">
              <span className="text-2xl mb-2">➕</span>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('print_coming_soon')}</p>
            </div>
          </div>

          {/* ── Buyer Qualify Preview Area ── */}
          {activePreview === 'buyer-qualify' && (
            <div className="fade-in space-y-4">
              {/* Action Bar */}
              <div className="flex items-center justify-between bg-white dark:bg-dark-panel rounded-xl p-4 border border-gray-200 dark:border-dark-border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{t('print_buyer_qualify_title')}</p>
                    <p className="text-[10px] text-gray-500">{t('print_ready_to_print')}</p>
                  </div>
                </div>
                <button
                  onClick={handleBuyerPrint}
                  className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  {t('print_btn_print')}
                </button>
              </div>

              {/* Print Preview */}
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-dark-bg dark:to-dark-panel px-4 py-2 flex items-center gap-2 border-b border-gray-200 dark:border-dark-border">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[9px] text-gray-400 ml-2 font-mono">{t('print_preview_label')}</span>
                </div>
                <div className="p-4 md:p-8 bg-slate-50 dark:bg-dark-bg overflow-auto max-h-[80vh]">
                  <div ref={buyerPrintRef} className="bg-white shadow-lg mx-auto" style={{ maxWidth: '8.5in', minHeight: '11in' }}>
                    <BuyerQualifyPrintForm />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Preview Area ── */}
          {activePreview === 'prelisting-form' && (
            <div className="fade-in space-y-4">
              {/* Action Bar */}
              <div className="flex items-center justify-between bg-white dark:bg-dark-panel rounded-xl p-4 border border-gray-200 dark:border-dark-border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{t('print_prelisting_title')}</p>
                    <p className="text-[10px] text-gray-500">{t('print_ready_to_print')}</p>
                  </div>
                </div>
                <button
                  onClick={handlePrint}
                  className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  {t('print_btn_print')}
                </button>
              </div>

              {/* Print Preview */}
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-dark-bg dark:to-dark-panel px-4 py-2 flex items-center gap-2 border-b border-gray-200 dark:border-dark-border">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[9px] text-gray-400 ml-2 font-mono">{t('print_preview_label')}</span>
                </div>
                <div className="p-4 md:p-8 bg-slate-50 dark:bg-dark-bg overflow-auto max-h-[80vh]">
                  <div ref={printRef} className="bg-white shadow-lg mx-auto" style={{ maxWidth: '8.5in', minHeight: '11in' }}>
                    <PrelistingPrintForm />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ACM Consolidated Preview Area ── */}
          {activePreview === 'acm-consolidated' && (
            <div className="fade-in space-y-4">
              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-dark-panel rounded-xl p-4 border border-gray-200 dark:border-dark-border shadow-sm gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{t('print_acm_title')}</p>
                    <p className="text-[10px] text-gray-500">{t('print_ready_to_print')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {acmReports.length > 0 ? (
                    <select
                      value={selectedAcmId}
                      onChange={e => setSelectedAcmId(e.target.value)}
                      className="px-3 py-2 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-lg text-xs font-semibold max-w-xs outline-none"
                    >
                      {acmReports.map(r => (
                        <option key={r.id} value={r.id}>{r.property_address || 'Sin Dirección'} ({r.client_name || 'Sin Cliente'})</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">{t('dash_acm_empty')}</span>
                  )}
                  
                  <button
                    onClick={handleAcmPrint}
                    disabled={!selectedAcmReport}
                    className="bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    {t('print_btn_print')}
                  </button>
                </div>
              </div>

              {/* Print Preview */}
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-dark-bg dark:to-dark-panel px-4 py-2 flex items-center gap-2 border-b border-gray-200 dark:border-dark-border">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[9px] text-gray-400 ml-2 font-mono">{t('print_preview_label')}</span>
                </div>
                <div className="p-4 md:p-8 bg-slate-50 dark:bg-dark-bg overflow-auto max-h-[80vh]">
                  {selectedAcmReport ? (
                    <div ref={acmPrintRef} className="bg-white shadow-lg mx-auto" style={{ maxWidth: '8.5in', minHeight: '11in' }}>
                      <AcmPrintForm report={selectedAcmReport} />
                    </div>
                  ) : (
                    <div className="py-20 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                      {t('dash_acm_empty')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
