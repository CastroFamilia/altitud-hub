"use client";

import { useState } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';

/* ═══════════════════════════════════════════════════════════════
   REPORT BUILDER — Modal for agents to configure reports
   Used in development detail pages.
   ═══════════════════════════════════════════════════════════════ */

const PERIODS = [
  { key: 'week', icon: '📅' },
  { key: 'month', icon: '🗓️' },
  { key: '30d', icon: '📊' },
  { key: 'ytd', icon: '📈' },
];

const SECTIONS = [
  { key: 'traffic', icon: '📊' },
  { key: 'funnel', icon: '🔄' },
  { key: 'listings', icon: '🏆' },
  { key: 'sources', icon: '🔗' },
  { key: 'devices', icon: '📱' },
  { key: 'reservations', icon: '📋' },
  { key: 'sales', icon: '💰' },
  { key: 'commentary', icon: '💬' },
];

export default function ReportBuilder({ developmentId, developmentName, onClose }) {
  const { t, lang } = useApp();
  const { profile } = useAuth();
  const [period, setPeriod] = useState('month');
  const [activeSections, setActiveSections] = useState(
    new Set(['traffic', 'funnel', 'listings', 'sources', 'devices', 'reservations', 'sales'])
  );
  const [commentary, setCommentary] = useState('');
  const [copied, setCopied] = useState(false);

  const toggleSection = (key) => {
    setActiveSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildUrl = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const sections = [...activeSections].join(',');
    const agentName = profile?.full_name || '';
    const params = new URLSearchParams({
      period,
      sections,
      lang,
      agent: agentName,
    });
    if (activeSections.has('commentary') && commentary.trim()) {
      params.set('commentary', encodeURIComponent(commentary.trim()));
    }
    return `${base}/reportes/${developmentId}?${params.toString()}`;
  };

  const handlePreview = () => {
    window.open(buildUrl(), '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const handleWhatsApp = () => {
    const url = buildUrl();
    const msg = lang === 'es'
      ? `Hola, te comparto el reporte de rendimiento de ${developmentName}: ${url}`
      : `Hi, here's the performance report for ${developmentName}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#001d52] text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest">{t('rpt_builder_title')}</h2>
              <p className="text-blue-200 text-xs mt-1">{developmentName}</p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Period */}
          <div>
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">
              {t('rpt_period')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={`p-3 rounded-xl text-center transition-all border ${
                    period === p.key
                      ? 'bg-[#003DA5] text-white border-[#003DA5] shadow-lg shadow-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}>
                  <span className="text-lg block mb-1">{p.icon}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">{t(`rpt_period_${p.key}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div>
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">
              {t('rpt_sections')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map(s => (
                <button key={s.key} onClick={() => toggleSection(s.key)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl transition-all border text-left ${
                    activeSections.has(s.key)
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}>
                  <span className="text-base">{s.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{t(`rpt_section_${s.key}`)}</span>
                  {activeSections.has(s.key) && <span className="ml-auto text-blue-500">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Commentary */}
          {activeSections.has('commentary') && (
            <div>
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">
                {t('rpt_section_commentary')}
              </label>
              <textarea
                value={commentary}
                onChange={e => setCommentary(e.target.value)}
                placeholder={t('rpt_commentary_placeholder')}
                rows={4}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handlePreview}
              className="bg-[#003DA5] hover:bg-[#002d7a] text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex flex-col items-center gap-1">
              <span className="text-lg">👁️</span>
              {t('rpt_preview')}
            </button>
            <button onClick={handleCopyLink}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1">
              <span className="text-lg">{copied ? '✅' : '🔗'}</span>
              {copied ? t('rpt_link_copied') : t('rpt_copy_link')}
            </button>
            <button onClick={handleWhatsApp}
              className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex flex-col items-center gap-1">
              <span className="text-lg">💬</span>
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
