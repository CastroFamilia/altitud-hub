"use client";

import { useState, useMemo } from 'react';
import TopNav from '@/components/layout/TopNav';
import { useApp } from '@/lib/context';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   REPORT GENERATOR — Internal Hub Page
   /reportes  (auth-gated via app layout)
   
   Lets agents & brokers build a shareable report URL for any
   development, then open/copy it.
   ═══════════════════════════════════════════════════════════════ */

const SECTIONS = [
  { key: 'traffic',      icon: '📊', label_es: 'Tráfico & Alcance',       label_en: 'Traffic & Reach' },
  { key: 'funnel',       icon: '🔄', label_es: 'Embudo de Conversión',     label_en: 'Conversion Funnel' },
  { key: 'listings',     icon: '🏆', label_es: 'Top Propiedades',          label_en: 'Top Properties' },
  { key: 'sources',      icon: '🔗', label_es: 'Fuentes de Tráfico',       label_en: 'Traffic Sources' },
  { key: 'devices',      icon: '📱', label_es: 'Dispositivos',             label_en: 'Devices' },
  { key: 'reservations', icon: '📋', label_es: 'Reservas Activas',         label_en: 'Active Reservations' },
  { key: 'sales',        icon: '💰', label_es: 'Ventas Cerradas',          label_en: 'Closed Sales' },
  { key: 'commentary',   icon: '💬', label_es: 'Comentarios del Agente',   label_en: 'Agent Commentary' },
];

const PERIODS = [
  { key: 'week',  label_es: 'Esta Semana',     label_en: 'This Week' },
  { key: 'month', label_es: 'Este Mes',         label_en: 'This Month' },
  { key: '30d',   label_es: 'Últimos 30 días', label_en: 'Last 30 Days' },
  { key: 'ytd',   label_es: 'Año (YTD)',        label_en: 'Year to Date' },
];

export default function ReportGeneratorClient({ developments }) {
  const { t, lang } = useApp();

  const [selectedDev, setSelectedDev] = useState('');
  const [period, setPeriod] = useState('month');
  const [selectedSections, setSelectedSections] = useState(
    new Set(['traffic', 'funnel', 'listings', 'sources', 'devices', 'reservations', 'sales'])
  );
  const [reportLang, setReportLang] = useState('es');
  const [agentName, setAgentName] = useState('');
  const [commentary, setCommentary] = useState('');
  const [copied, setCopied] = useState(false);

  const toggleSection = (key) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const reportUrl = useMemo(() => {
    if (!selectedDev) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      period,
      sections: [...selectedSections].join(','),
      lang: reportLang,
    });
    if (agentName.trim()) params.set('agent', agentName.trim());
    if (commentary.trim()) params.set('commentary', encodeURIComponent(commentary.trim()));
    return `${base}/reportes/${selectedDev}?${params.toString()}`;
  }, [selectedDev, period, selectedSections, reportLang, agentName, commentary]);

  const handleCopy = () => {
    if (!reportUrl) return;
    navigator.clipboard.writeText(reportUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const sLabel = (s) => lang === 'en' ? s.label_en : s.label_es;
  const pLabel = (p) => lang === 'en' ? p.label_en : p.label_es;

  const devLabel = (d) => {
    const badge = d.status === 'active' ? '' : ` (${d.status})`;
    return `${d.name}${badge}`;
  };

  return (
    <>
      <TopNav
        title={lang === 'en' ? 'Report Generator' : 'Generador de Reportes'}
        subtitle={lang === 'en' ? 'Build & share development performance reports' : 'Crea y comparte reportes de rendimiento de desarrollos'}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-dark-bg">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* ── Intro ── */}
          <div className="bg-gradient-to-br from-[#003DA5] to-[#001d52] rounded-[28px] p-8 text-white shadow-2xl shadow-blue-900/30">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center text-3xl shrink-0 border border-white/20">
                📊
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-wide mb-1">
                  {lang === 'en' ? 'Performance Report Builder' : 'Constructor de Reportes'}
                </h2>
                <p className="text-blue-200 text-sm leading-relaxed max-w-lg">
                  {lang === 'en'
                    ? 'Configure a shareable development report. Select a development, period, and sections — then share the link with your client or print it as PDF.'
                    : 'Configura un reporte compartible de rendimiento de desarrollo. Elige el proyecto, período y secciones — luego comparte el link con tu cliente o imprímelo como PDF.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── Left: Config Panel ── */}
            <div className="lg:col-span-3 space-y-5">

              {/* Development Selector */}
              <Card>
                <CardTitle icon="🏗️" label={lang === 'en' ? 'Select Development' : 'Seleccionar Desarrollo'} />
                {developments.length === 0 ? (
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-100 dark:border-amber-900/20">
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                      {lang === 'en' ? 'No developments found. Create one first.' : 'No hay desarrollos. Crea uno primero.'}
                    </p>
                    <Link href="/propiedades/desarrollos" className="inline-block mt-2 text-xs font-bold text-amber-600 hover:underline">
                      {lang === 'en' ? '→ Go to Developments' : '→ Ir a Desarrollos'}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {developments.map(dev => (
                      <button
                        key={dev.id}
                        onClick={() => setSelectedDev(dev.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                          selectedDev === dev.id
                            ? 'border-[#003DA5] bg-blue-50 dark:bg-blue-900/20 text-[#003DA5] dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dev.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-sm font-bold truncate">{devLabel(dev)}</span>
                        {selectedDev === dev.id && (
                          <svg className="ml-auto w-4 h-4 text-[#003DA5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {/* Period */}
              <Card>
                <CardTitle icon="📅" label={lang === 'en' ? 'Time Period' : 'Período'} />
                <div className="grid grid-cols-2 gap-2">
                  {PERIODS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setPeriod(p.key)}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                        period === p.key
                          ? 'bg-[#003DA5] text-white border-[#003DA5] shadow-lg shadow-blue-500/20'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                      }`}
                    >
                      {pLabel(p)}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Sections */}
              <Card>
                <CardTitle icon="📑" label={lang === 'en' ? 'Report Sections' : 'Secciones del Reporte'} />
                <div className="grid grid-cols-2 gap-2">
                  {SECTIONS.map(s => {
                    const active = selectedSections.has(s.key);
                    return (
                      <button
                        key={s.key}
                        onClick={() => toggleSection(s.key)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                          active
                            ? 'border-[#003DA5] bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'
                        }`}
                      >
                        <span className="text-base leading-none">{s.icon}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wide truncate ${active ? 'text-[#003DA5] dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {sLabel(s)}
                        </span>
                        <div className={`ml-auto w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${active ? 'bg-[#003DA5] border-[#003DA5]' : 'border-slate-300 dark:border-slate-600'}`}>
                          {active && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Language & Agent */}
              <Card>
                <CardTitle icon="⚙️" label={lang === 'en' ? 'Options' : 'Opciones'} />
                <div className="space-y-4">
                  {/* Language toggle */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">
                      {lang === 'en' ? 'Report Language' : 'Idioma del Reporte'}
                    </label>
                    <div className="flex gap-2">
                      {[{ key: 'es', label: '🇨🇷 Español' }, { key: 'en', label: '🇺🇸 English' }].map(l => (
                        <button
                          key={l.key}
                          onClick={() => setReportLang(l.key)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                            reportLang === l.key ? 'bg-[#003DA5] text-white border-[#003DA5]' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Agent name */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">
                      {lang === 'en' ? 'Prepared By' : 'Preparado Por'}
                    </label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={e => setAgentName(e.target.value)}
                      placeholder={lang === 'en' ? 'Agent name (optional)' : 'Nombre del agente (opcional)'}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                    />
                  </div>

                  {/* Commentary */}
                  {selectedSections.has('commentary') && (
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">
                        {lang === 'en' ? 'Agent Commentary' : 'Comentarios del Agente'}
                      </label>
                      <textarea
                        value={commentary}
                        onChange={e => setCommentary(e.target.value)}
                        rows={4}
                        placeholder={lang === 'en' ? 'Add notes or context for your client...' : 'Agrega notas o contexto para tu cliente...'}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 resize-none"
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* ── Right: Preview & Actions ── */}
            <div className="lg:col-span-2 space-y-5">
              <div className="lg:sticky lg:top-6 space-y-5">

                {/* Live URL Preview */}
                <Card>
                  <CardTitle icon="🔗" label={lang === 'en' ? 'Report Link' : 'Link del Reporte'} />
                  {!selectedDev ? (
                    <div className="bg-slate-100 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                      <p className="text-slate-400 text-xs font-medium">
                        {lang === 'en' ? 'Select a development to generate the link' : 'Selecciona un desarrollo para generar el link'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <p className="text-[10px] text-slate-400 font-mono break-all leading-relaxed">{reportUrl}</p>
                      </div>

                      <button
                        onClick={handleCopy}
                        className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                          copied
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                            : 'bg-white dark:bg-slate-800 text-[#003DA5] dark:text-blue-400 border-[#003DA5] dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        {copied ? `✓ ${lang === 'en' ? 'Copied!' : '¡Copiado!'}` : `🔗 ${lang === 'en' ? 'Copy Link' : 'Copiar Link'}`}
                      </button>

                      <Link
                        href={reportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-center bg-[#003DA5] text-white shadow-xl shadow-blue-500/25 hover:bg-[#002d7a] transition-all"
                      >
                        👁️ {lang === 'en' ? 'Preview Report' : 'Ver Reporte'}
                      </Link>
                    </div>
                  )}
                </Card>

                {/* Summary */}
                {selectedDev && (
                  <Card>
                    <CardTitle icon="📋" label={lang === 'en' ? 'Summary' : 'Resumen'} />
                    <div className="space-y-2 text-sm">
                      <SummaryRow
                        label={lang === 'en' ? 'Development' : 'Desarrollo'}
                        value={developments.find(d => d.id === selectedDev)?.name || '—'}
                      />
                      <SummaryRow
                        label={lang === 'en' ? 'Period' : 'Período'}
                        value={pLabel(PERIODS.find(p => p.key === period))}
                      />
                      <SummaryRow
                        label={lang === 'en' ? 'Sections' : 'Secciones'}
                        value={`${selectedSections.size} / ${SECTIONS.length}`}
                      />
                      <SummaryRow
                        label={lang === 'en' ? 'Language' : 'Idioma'}
                        value={reportLang === 'es' ? '🇨🇷 Español' : '🇺🇸 English'}
                      />
                    </div>
                  </Card>
                )}

                {/* Tips */}
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/20">
                  <p className="text-[10px] font-black text-[#003DA5] dark:text-blue-400 uppercase tracking-widest mb-2">
                    💡 {lang === 'en' ? 'Tips' : 'Consejos'}
                  </p>
                  <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 leading-relaxed">
                    <li>• {lang === 'en' ? 'The link is public — anyone with it can view' : 'El link es público — cualquiera con él puede verlo'}</li>
                    <li>• {lang === 'en' ? 'Use Print → Save as PDF to get a branded PDF' : 'Usa Imprimir → Guardar como PDF para obtener un PDF con marca'}</li>
                    <li>• {lang === 'en' ? 'Toggle sections to hide irrelevant data' : 'Desactiva secciones para ocultar datos innecesarios'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ── */
function Card({ children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      {children}
    </div>
  );
}

function CardTitle({ icon, label }) {
  return (
    <h3 className="flex items-center gap-2 text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest mb-4">
      <span>{icon}</span>
      {label}
    </h3>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 text-right truncate max-w-[120px]">{value}</span>
    </div>
  );
}
