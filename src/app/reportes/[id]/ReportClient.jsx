"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

/* ═══════════════════════════════════════════════════════════════
   DEVELOPMENT PERFORMANCE REPORT — Public shareable page
   URL: /reportes/[id]?period=month&sections=traffic,funnel,sales&lang=es&commentary=...&agent=...
   Data: fetched from /api/reportes/[id] (no client-side Supabase key exposed)
   ═══════════════════════════════════════════════════════════════ */

const LABELS = {
  es: {
    title: 'Reporte de Rendimiento', subtitle: 'Marketing y resultados comerciales',
    prepared: 'Preparado por', period: 'Período', generated: 'Generado',
    views: 'Vistas Totales', unique: 'Visitantes Únicos', funnelViews: 'Vistas Página',
    funnelInquiries: 'Consultas', funnelVisits: 'Visitas Sitio',
    funnelReservations: 'Reservas', funnelSales: 'Ventas', conversion: 'Conversión',
    topListings: 'Propiedades Más Vistas', trafficSources: 'Fuentes de Tráfico',
    devices: 'Dispositivos', resActive: 'Reservas Activas', salesClosed: 'Ventas Cerradas',
    salesVolume: 'Volumen Total', property: 'Propiedad', date: 'Fecha', price: 'Precio',
    buyer: 'Comprador', commentary: 'Comentarios del Agente', noData: 'Sin datos para este período',
    confidential: 'Confidencial — RE/MAX Altitud', downloadPdf: 'Descargar PDF',
    shareLink: 'Copiar Link', linkCopied: '¡Copiado!',
    week: 'Esta Semana', month: 'Este Mes', '30d': 'Últimos 30 días', ytd: 'Año (YTD)',
    loading: 'Cargando reporte...', notFound: 'Desarrollo no encontrado.',
    trafficTitle: 'Tráfico y Alcance', funnelTitle: 'Embudo de Conversión',
  },
  en: {
    title: 'Performance Report', subtitle: 'Marketing & commercial results',
    prepared: 'Prepared by', period: 'Period', generated: 'Generated',
    views: 'Total Views', unique: 'Unique Visitors', funnelViews: 'Page Views',
    funnelInquiries: 'Inquiries', funnelVisits: 'Site Visits',
    funnelReservations: 'Reservations', funnelSales: 'Sales', conversion: 'Conversion',
    topListings: 'Top Viewed Properties', trafficSources: 'Traffic Sources',
    devices: 'Devices', resActive: 'Active Reservations', salesClosed: 'Closed Sales',
    salesVolume: 'Total Volume', property: 'Property', date: 'Date', price: 'Price',
    buyer: 'Buyer', commentary: 'Agent Commentary', noData: 'No data for this period',
    confidential: 'Confidential — RE/MAX Altitud', downloadPdf: 'Download PDF',
    shareLink: 'Copy Link', linkCopied: 'Copied!',
    week: 'This Week', month: 'This Month', '30d': 'Last 30 Days', ytd: 'Year to Date',
    loading: 'Loading report...', notFound: 'Development not found.',
    trafficTitle: 'Traffic & Reach', funnelTitle: 'Conversion Funnel',
  },
};

function getPeriodRange(period) {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start;
  switch (period) {
    case 'week': {
      const d = new Date(now); d.setDate(d.getDate() - d.getDay());
      start = d.toISOString().split('T')[0]; break;
    }
    case 'month':
      start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`; break;
    case '30d': {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0]; break;
    }
    case 'ytd':
      start = `${now.getFullYear()}-01-01`; break;
    default: {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    }
  }
  return { start, end };
}

export default function ReportClient({ params }) {
  const { id } = params;
  const searchParams = useSearchParams();
  const lang = searchParams.get('lang') || 'es';
  const period = searchParams.get('period') || 'month';
  const sectionsParam = searchParams.get('sections') || 'traffic,funnel,listings,sources,devices,reservations,sales';
  const commentary = searchParams.get('commentary') || '';
  const agentName = searchParams.get('agent') || '';
  const sections = sectionsParam.split(',');
  const L = LABELS[lang] || LABELS.es;
  const { start, end } = getPeriodRange(period);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/reportes/${id}?start=${start}&end=${end}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error('Report load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, start, end]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Chart data
  const chartData = useMemo(() => {
    if (!data) return [];
    const days = [];
    const s = new Date(start + 'T12:00:00');
    const e = new Date(end + 'T12:00:00');
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, views: data.dailyMap?.[dateStr] || 0 });
    }
    return days;
  }, [data, start, end]);

  const maxChart = useMemo(() => Math.max(...chartData.map(d => d.views), 1), [chartData]);

  const formatDate = (d) => new Date(d).toLocaleDateString(lang === 'es' ? 'es-CR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatCurrency = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#003DA5] flex items-center justify-center animate-pulse">
          <span className="text-white text-xs font-black">RE</span>
        </div>
        <p className="text-slate-400 text-sm font-medium">{L.loading}</p>
      </div>
    );
  }

  if (!data?.dev) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-slate-400 text-lg">{L.notFound}</p>
      </div>
    );
  }

  const { dev, metrics, topReferrers, deviceBreakdown, topListings, inquiries, reservations, sales, salesVolume } = data;

  const siteVisitsCount = (inquiries || []).filter(i => ['site_visit', 'negotiation', 'converted'].includes(i.status)).length;
  const funnelSteps = [
    { label: L.funnelViews, value: metrics.totalViews, color: '#003DA5' },
    { label: L.funnelInquiries, value: (inquiries || []).length, color: '#2563eb' },
    { label: L.funnelVisits, value: siteVisitsCount, color: '#8b5cf6' },
    { label: L.funnelReservations, value: (reservations || []).length, color: '#f59e0b' },
    { label: L.funnelSales, value: (sales || []).length, color: '#10b981' },
  ];
  const funnelMax = Math.max(...funnelSteps.map(s => s.value), 1);

  return (
    <div className="report-page min-h-screen bg-white text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        @media print {
          .no-print { display: none !important; }
          .page-break-before { page-break-before: always; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,61,165,0.1); }
      `}</style>

      {/* ── Action Buttons (hidden in print) ── */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={handleCopyLink}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg transition-all border ${copied ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-700 border-slate-200 hover:border-[#003DA5] hover:text-[#003DA5]'}`}
        >
          {copied ? `✓ ${L.linkCopied}` : `🔗 ${L.shareLink}`}
        </button>
        <button
          onClick={() => window.print()}
          className="bg-[#003DA5] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-[#002d7a] transition-all"
        >
          📄 {L.downloadPdf}
        </button>
      </div>

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#003DA5] via-[#004fcf] to-[#001d52] text-white px-8 py-12 print:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center text-2xl font-black border border-white/20">
              RE
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wide">{L.title}</h1>
              <p className="text-blue-200 text-sm mt-0.5">{L.subtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Desarrollo', value: dev.name },
              { label: L.period, value: L[period] || period, sub: `${start} → ${end}` },
              { label: L.prepared, value: agentName || 'RE/MAX Altitud' },
              { label: L.generated, value: formatDate(new Date()) },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15">
                <p className="text-blue-300 text-[9px] uppercase font-black tracking-widest mb-1">{item.label}</p>
                <p className="font-black text-base leading-tight">{item.value}</p>
                {item.sub && <p className="text-blue-200 text-[10px] mt-0.5">{item.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10 print:space-y-6">

        {/* ── Traffic Overview ── */}
        {sections.includes('traffic') && (
          <section>
            <SectionTitle icon="📊" label={L.trafficTitle} />
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: L.views, val: metrics.totalViews.toLocaleString(), color: 'text-[#003DA5]', bg: 'bg-blue-50', border: 'border-blue-100' },
                { label: L.unique, val: metrics.uniqueVisitors.toLocaleString(), color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
              ].map((s, i) => (
                <div key={i} className={`stat-card ${s.bg} rounded-2xl p-6 text-center border ${s.border}`}>
                  <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-2">{s.label}</p>
                  <p className={`text-4xl font-black ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Bar Chart */}
            {chartData.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="flex items-end gap-[2px] h-32">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-[#003DA5] to-[#4f8ef7] rounded-sm transition-all duration-500"
                        style={{ height: `${Math.max((d.views / maxChart) * 100, 2)}%`, minHeight: '2px', opacity: d.views === 0 ? 0.15 : 1 }}
                        title={`${d.date}: ${d.views}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[9px] text-slate-400 font-bold">
                  <span>{chartData[0]?.date?.slice(5)}</span>
                  <span>{chartData[chartData.length - 1]?.date?.slice(5)}</span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Lead Funnel ── */}
        {sections.includes('funnel') && (
          <section className="page-break-before">
            <SectionTitle icon="🔄" label={L.funnelTitle} />
            <div className="space-y-3">
              {funnelSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-32 text-xs font-bold text-slate-600 text-right shrink-0">{step.label}</span>
                  <div className="flex-1 h-9 bg-slate-100 rounded-xl overflow-hidden relative">
                    <div
                      className="h-full rounded-xl transition-all duration-700 flex items-center justify-end pr-3"
                      style={{ width: `${Math.max((step.value / funnelMax) * 100, 5)}%`, backgroundColor: step.color }}
                    >
                      <span className="text-xs font-black text-white drop-shadow-sm">{step.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {metrics.totalViews > 0 && (inquiries || []).length > 0 && (
              <p className="text-sm text-slate-500 mt-4">
                {L.conversion}: <strong className="text-emerald-600">{(((inquiries || []).length / metrics.totalViews) * 100).toFixed(1)}%</strong>
              </p>
            )}
          </section>
        )}

        {/* ── Top Listings ── */}
        {sections.includes('listings') && (topListings || []).length > 0 && (
          <section>
            <SectionTitle icon="🏆" label={L.topListings} />
            <div className="space-y-2">
              {(topListings || []).map((item, i) => (
                <div key={item.id} className="flex items-center gap-3 py-2">
                  <span className={`text-sm font-black w-7 text-right shrink-0 ${i < 3 ? 'text-amber-500' : 'text-slate-300'}`}>{i + 1}.</span>
                  <span className="flex-1 text-sm font-semibold text-slate-700 truncate">
                    {lang === 'es' ? item.title_es : item.title_en}
                  </span>
                  <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                      style={{ width: `${((topListings[0]?.views || 1) > 0 ? (item.views / topListings[0].views) : 0) * 100}%` }} />
                  </div>
                  <span className="text-sm font-black text-slate-900 w-10 text-right shrink-0">{item.views}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Traffic Sources ── */}
        {sections.includes('sources') && (topReferrers || []).length > 0 && (
          <section>
            <SectionTitle icon="🔗" label={L.trafficSources} />
            <div className="grid grid-cols-2 gap-2">
              {(topReferrers || []).map((r, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-xs text-slate-600 truncate flex-1 font-medium">{r.source}</span>
                  <span className="text-xs font-black text-slate-900">{r.pct}%</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Devices ── */}
        {sections.includes('devices') && (deviceBreakdown || []).length > 0 && (
          <section>
            <SectionTitle icon="📱" label={L.devices} />
            <div className="flex gap-4">
              {(deviceBreakdown || []).map((d, i) => (
                <div key={i} className="flex-1 bg-slate-50 rounded-2xl p-5 text-center border border-slate-100 stat-card">
                  <p className="text-3xl mb-2">{d.type === 'mobile' ? '📱' : d.type === 'desktop' ? '🖥️' : d.type === 'tablet' ? '📋' : '❓'}</p>
                  <p className="text-2xl font-black text-slate-900">{d.pct}%</p>
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mt-1">{d.type}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Reservations ── */}
        {sections.includes('reservations') && (
          <section className="page-break-before">
            <SectionTitle icon="📋" label={L.resActive} />
            {(reservations || []).length === 0 ? (
              <EmptyState label={L.noData} />
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 text-[10px] uppercase font-black text-slate-400 tracking-widest">{L.property}</th>
                      <th className="text-right p-3 text-[10px] uppercase font-black text-slate-400 tracking-widest">{L.price}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reservations || []).map(r => (
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-700">{lang === 'es' ? r.name_es : r.name_en}</td>
                        <td className="p-3 text-right font-black text-slate-900">{formatCurrency(r.price || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Sales ── */}
        {sections.includes('sales') && (
          <section>
            <SectionTitle icon="💰" label={L.salesClosed} />
            {(sales || []).length === 0 ? (
              <EmptyState label={L.noData} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100 stat-card">
                    <p className="text-[9px] uppercase font-black text-emerald-600 tracking-widest mb-1">{L.salesClosed}</p>
                    <p className="text-4xl font-black text-emerald-700">{(sales || []).length}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100 stat-card">
                    <p className="text-[9px] uppercase font-black text-emerald-600 tracking-widest mb-1">{L.salesVolume}</p>
                    <p className="text-3xl font-black text-emerald-700">{formatCurrency(salesVolume)}</p>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 text-[10px] uppercase font-black text-slate-400 tracking-widest">{L.property}</th>
                        <th className="text-right p-3 text-[10px] uppercase font-black text-slate-400 tracking-widest">{L.price}</th>
                        <th className="text-right p-3 text-[10px] uppercase font-black text-slate-400 tracking-widest">{L.date}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sales || []).map(s => (
                        <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-semibold text-slate-700">{lang === 'es' ? s.name_es : s.name_en}</td>
                          <td className="p-3 text-right font-black text-emerald-700">{formatCurrency(s.sold_price || 0)}</td>
                          <td className="p-3 text-right text-slate-500 text-xs">{s.sold_date ? formatDate(s.sold_date) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Commentary ── */}
        {sections.includes('commentary') && commentary && (
          <section className="page-break-before">
            <SectionTitle icon="💬" label={L.commentary} />
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {decodeURIComponent(commentary)}
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <footer className="border-t border-slate-200 pt-6 mt-8 text-center">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{L.confidential}</p>
          <p className="text-[9px] text-slate-300 mt-1">{L.generated}: {new Date().toISOString().split('T')[0]}</p>
        </footer>
      </div>
    </div>
  );
}

/* ── Sub-components ── */
function SectionTitle({ icon, label }) {
  return (
    <h2 className="text-base font-black uppercase tracking-widest text-[#003DA5] mb-5 flex items-center gap-2.5">
      <span className="text-xl">{icon}</span>
      {label}
      <div className="flex-1 h-px bg-blue-100 ml-2" />
    </h2>
  );
}

function EmptyState({ label }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-100">
      <p className="text-sm text-slate-400 italic">{label}</p>
    </div>
  );
}
