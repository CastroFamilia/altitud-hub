"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════════
   DEVELOPMENT PERFORMANCE REPORT — Public shareable page
   URL: /reportes/[id]?period=month&sections=traffic,funnel,sales&lang=es&commentary=...
   ═══════════════════════════════════════════════════════════════ */

const LABELS = {
  es: {
    title: 'Reporte de Rendimiento', subtitle: 'Marketing y resultados comerciales',
    prepared: 'Preparado por', period: 'Período', generated: 'Generado',
    views: 'Vistas', unique: 'Visitantes Únicos', avgTime: 'Tiempo Prom.',
    funnelViews: 'Vistas Página', funnelInquiries: 'Consultas', funnelVisits: 'Visitas Sitio',
    funnelReservations: 'Reservas', funnelSales: 'Ventas', conversion: 'Conversión',
    topListings: 'Top Listados', trafficSources: 'Fuentes de Tráfico', devices: 'Dispositivos',
    resActive: 'Reservas Activas', resAmount: 'Monto Total', salesClosed: 'Ventas Cerradas',
    salesVolume: 'Volumen Total', property: 'Propiedad', date: 'Fecha', price: 'Precio',
    buyer: 'Comprador', commentary: 'Comentarios del Agente', noData: 'Sin datos para este período',
    confidential: 'Confidencial — RE/MAX Altitud', downloadPdf: '📄 Descargar PDF',
    week: 'Esta Semana', month: 'Este Mes', '30d': 'Últimos 30 días', ytd: 'Año (YTD)',
  },
  en: {
    title: 'Performance Report', subtitle: 'Marketing & commercial results',
    prepared: 'Prepared by', period: 'Period', generated: 'Generated',
    views: 'Views', unique: 'Unique Visitors', avgTime: 'Avg. Time',
    funnelViews: 'Page Views', funnelInquiries: 'Inquiries', funnelVisits: 'Site Visits',
    funnelReservations: 'Reservations', funnelSales: 'Sales', conversion: 'Conversion',
    topListings: 'Top Listings', trafficSources: 'Traffic Sources', devices: 'Devices',
    resActive: 'Active Reservations', resAmount: 'Total Amount', salesClosed: 'Closed Sales',
    salesVolume: 'Total Volume', property: 'Property', date: 'Date', price: 'Price',
    buyer: 'Buyer', commentary: 'Agent Commentary', noData: 'No data for this period',
    confidential: 'Confidential — RE/MAX Altitud', downloadPdf: '📄 Download PDF',
    week: 'This Week', month: 'This Month', '30d': 'Last 30 Days', ytd: 'Year to Date',
  },
};

function getPeriodRange(period) {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start;
  switch (period) {
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay()); // start of week (Sunday)
      start = d.toISOString().split('T')[0];
      break;
    }
    case 'month': {
      start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      break;
    }
    case '30d': {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
      break;
    }
    case 'ytd': {
      start = `${now.getFullYear()}-01-01`;
      break;
    }
    default: {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    }
  }
  return { start, end };
}

export default function ReportPage({ params }) {
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

  const [dev, setDev] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [rawViews, setRawViews] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [sales, setSales] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch development
        const { data: devData } = await supabase
          .from('developments').select('*').eq('id', id).single();
        setDev(devData);
        if (!devData) { setLoading(false); return; }

        // Fetch analytics
        const [{ data: daily }, { data: views }, { data: inq }, { data: props }] = await Promise.all([
          supabase.from('listing_daily_stats').select('*')
            .eq('development_id', id).gte('stat_date', start).lte('stat_date', end)
            .order('stat_date', { ascending: false }),
          supabase.from('listing_page_views').select('*')
            .eq('development_id', id).gte('viewed_at', start + 'T00:00:00Z')
            .order('viewed_at', { ascending: false }).limit(2000),
          supabase.from('property_inquiries').select('*')
            .eq('development_id', id).gte('created_at', start + 'T00:00:00Z')
            .order('created_at', { ascending: false }),
          supabase.from('properties').select('id, name, listing_title_es, listing_title_en, status, sold_price, sold_date, buyer_name, price')
            .eq('development_id', id),
        ]);

        setDailyStats(daily || []);
        setRawViews(views || []);
        setInquiries(inq || []);
        setProperties(props || []);

        // Split properties into reservations vs sales
        const allProps = props || [];
        setReservations(allProps.filter(p => p.status === 'pending_approval' || p.status === 'approved'));
        setSales(allProps.filter(p => p.status === 'sold' && p.sold_date >= start));
      } catch (err) {
        console.error('Report load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, start, end]);

  // ── Computed Metrics ──
  const metrics = useMemo(() => {
    const totalViews = dailyStats.reduce((s, d) => s + (d.total_views || 0), 0);
    const totalUnique = dailyStats.reduce((s, d) => s + (d.unique_visitors || 0), 0);
    const avgDuration = dailyStats.length > 0
      ? Math.round(dailyStats.reduce((s, d) => s + (d.avg_duration_seconds || 0), 0) / dailyStats.length) : 0;
    return { totalViews, totalUnique, avgDuration };
  }, [dailyStats]);

  const topListings = useMemo(() => {
    const counts = {};
    dailyStats.forEach(s => {
      if (!s.property_id) return;
      if (!counts[s.property_id]) counts[s.property_id] = { id: s.property_id, views: 0 };
      counts[s.property_id].views += s.total_views || 0;
    });
    return Object.values(counts).sort((a, b) => b.views - a.views).slice(0, 8).map(item => {
      const prop = properties.find(p => p.id === item.id);
      return { ...item, name: prop ? (lang === 'es' ? prop.listing_title_es || prop.name : prop.listing_title_en || prop.name) : 'Unknown' };
    });
  }, [dailyStats, properties, lang]);

  const topReferrers = useMemo(() => {
    const counts = {};
    rawViews.forEach(v => {
      if (!v.referrer) return;
      try { const host = new URL(v.referrer).hostname.replace('www.', ''); counts[host] = (counts[host] || 0) + 1; }
      catch { counts[v.referrer] = (counts[v.referrer] || 0) + 1; }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([source, count]) => ({ source, count, pct: Math.round((count / (rawViews.length || 1)) * 100) }));
  }, [rawViews]);

  const deviceBreakdown = useMemo(() => {
    const counts = { desktop: 0, mobile: 0, tablet: 0 };
    rawViews.forEach(v => { if (counts[v.device_type] !== undefined) counts[v.device_type]++; });
    const total = rawViews.length || 1;
    return Object.entries(counts).filter(([, c]) => c > 0)
      .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }));
  }, [rawViews]);

  const salesVolume = sales.reduce((s, p) => s + (Number(p.sold_price) || 0), 0);

  const formatDuration = (s) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  const formatDate = (d) => new Date(d).toLocaleDateString(lang === 'es' ? 'es-CR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatCurrency = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!dev) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-slate-400 text-lg">{L.noData}</p>
      </div>
    );
  }

  // Chart data
  const chartDays = [];
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    chartDays.push(d.toISOString().split('T')[0]);
  }
  const statsByDate = {};
  dailyStats.forEach(ds => {
    if (!statsByDate[ds.stat_date]) statsByDate[ds.stat_date] = 0;
    statsByDate[ds.stat_date] += ds.total_views || 0;
  });
  const chartData = chartDays.map(date => ({ date, views: statsByDate[date] || 0 }));
  const maxChart = Math.max(...chartData.map(d => d.views), 1);

  // Funnel data
  const funnelSteps = [
    { label: L.funnelViews, value: metrics.totalViews, color: '#003DA5' },
    { label: L.funnelInquiries, value: inquiries.length, color: '#2563eb' },
    { label: L.funnelReservations, value: reservations.length, color: '#f59e0b' },
    { label: L.funnelSales, value: sales.length, color: '#10b981' },
  ];
  const funnelMax = Math.max(...funnelSteps.map(s => s.value), 1);

  return (
    <div className="report-page min-h-screen bg-white text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Print Button (hidden in print) ── */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button onClick={() => window.print()}
          className="bg-[#003DA5] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-[#002d7a] transition-all">
          {L.downloadPdf}
        </button>
      </div>

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#001d52] text-white px-8 py-10 print:py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-black">
              RE
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wide">{L.title}</h1>
              <p className="text-blue-200 text-sm">{L.subtitle}</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-5 mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-300 text-[10px] uppercase font-bold tracking-widest">Desarrollo</p>
              <p className="font-black text-lg">{dev.name}</p>
            </div>
            <div>
              <p className="text-blue-300 text-[10px] uppercase font-bold tracking-widest">{L.period}</p>
              <p className="font-bold">{L[period] || period}</p>
              <p className="text-xs text-blue-200">{start} → {end}</p>
            </div>
            <div>
              <p className="text-blue-300 text-[10px] uppercase font-bold tracking-widest">{L.prepared}</p>
              <p className="font-bold">{agentName || 'RE/MAX Altitud'}</p>
            </div>
            <div>
              <p className="text-blue-300 text-[10px] uppercase font-bold tracking-widest">{L.generated}</p>
              <p className="font-bold">{formatDate(new Date())}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-8 print:space-y-6">

        {/* ── Traffic Overview ── */}
        {sections.includes('traffic') && (
          <section>
            <h2 className="text-lg font-black uppercase tracking-widest text-[#003DA5] mb-4 flex items-center gap-2">
              <span>📊</span> {L.views}
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: L.views, val: metrics.totalViews.toLocaleString(), color: 'text-slate-900' },
                { label: L.unique, val: metrics.totalUnique.toLocaleString(), color: 'text-blue-600' },
                { label: L.avgTime, val: formatDuration(metrics.avgDuration), color: 'text-emerald-600' },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
                  <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1">{s.label}</p>
                  <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            {chartData.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div className="flex items-end gap-[2px] h-28">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-[#003DA5] to-[#2563eb] rounded-sm"
                        style={{ height: `${Math.max((d.views / maxChart) * 100, 2)}%`, minHeight: '2px' }}
                        title={`${d.date}: ${d.views}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[8px] text-slate-400 font-bold">
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
            <h2 className="text-lg font-black uppercase tracking-widest text-[#003DA5] mb-4 flex items-center gap-2">
              <span>🔄</span> {L.conversion}
            </h2>
            <div className="space-y-3">
              {funnelSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-28 text-xs font-bold text-slate-600 text-right">{step.label}</span>
                  <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-3"
                      style={{ width: `${Math.max((step.value / funnelMax) * 100, 5)}%`, backgroundColor: step.color }}
                    >
                      <span className="text-xs font-black text-white drop-shadow-sm">{step.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {metrics.totalViews > 0 && inquiries.length > 0 && (
              <p className="text-sm text-slate-500 mt-3">
                {L.conversion}: <strong className="text-emerald-600">{((inquiries.length / metrics.totalViews) * 100).toFixed(1)}%</strong> ({L.funnelViews} → {L.funnelInquiries})
              </p>
            )}
          </section>
        )}

        {/* ── Top Listings ── */}
        {sections.includes('listings') && topListings.length > 0 && (
          <section>
            <h2 className="text-lg font-black uppercase tracking-widest text-[#003DA5] mb-4 flex items-center gap-2">
              <span>🏆</span> {L.topListings}
            </h2>
            <div className="space-y-2">
              {topListings.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className={`text-sm font-black w-6 text-right ${i < 3 ? 'text-amber-500' : 'text-slate-400'}`}>{i + 1}.</span>
                  <span className="flex-1 text-sm font-bold text-slate-700 truncate">{item.name}</span>
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                      style={{ width: `${(item.views / (topListings[0]?.views || 1)) * 100}%` }} />
                  </div>
                  <span className="text-sm font-black text-slate-900 w-12 text-right">{item.views}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Traffic Sources ── */}
        {sections.includes('sources') && topReferrers.length > 0 && (
          <section>
            <h2 className="text-lg font-black uppercase tracking-widest text-[#003DA5] mb-4 flex items-center gap-2">
              <span>🔗</span> {L.trafficSources}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {topReferrers.map((r, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-xs text-slate-500 truncate flex-1">{r.source}</span>
                  <span className="text-xs font-black text-slate-900">{r.pct}%</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Devices ── */}
        {sections.includes('devices') && deviceBreakdown.length > 0 && (
          <section>
            <h2 className="text-lg font-black uppercase tracking-widest text-[#003DA5] mb-4 flex items-center gap-2">
              <span>📱</span> {L.devices}
            </h2>
            <div className="flex gap-4">
              {deviceBreakdown.map((d, i) => (
                <div key={i} className="flex-1 bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
                  <p className="text-2xl mb-1">{d.type === 'mobile' ? '📱' : d.type === 'desktop' ? '🖥️' : '📋'}</p>
                  <p className="text-2xl font-black text-slate-900">{d.pct}%</p>
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">{d.type}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Reservations ── */}
        {sections.includes('reservations') && (
          <section className="page-break-before">
            <h2 className="text-lg font-black uppercase tracking-widest text-[#003DA5] mb-4 flex items-center gap-2">
              <span>📋</span> {L.resActive}
            </h2>
            {reservations.length === 0 ? (
              <p className="text-sm text-slate-400 italic">{L.noData}</p>
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
                    {reservations.map(r => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="p-3 font-bold text-slate-700">{lang === 'es' ? r.listing_title_es || r.name : r.listing_title_en || r.name}</td>
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
            <h2 className="text-lg font-black uppercase tracking-widest text-[#003DA5] mb-4 flex items-center gap-2">
              <span>💰</span> {L.salesClosed}
            </h2>
            {sales.length === 0 ? (
              <p className="text-sm text-slate-400 italic">{L.noData}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100">
                    <p className="text-[9px] uppercase font-black text-emerald-600 tracking-widest mb-1">{L.salesClosed}</p>
                    <p className="text-3xl font-black text-emerald-700">{sales.length}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100">
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
                      {sales.map(s => (
                        <tr key={s.id} className="border-t border-slate-100">
                          <td className="p-3 font-bold text-slate-700">{lang === 'es' ? s.listing_title_es || s.name : s.listing_title_en || s.name}</td>
                          <td className="p-3 text-right font-black text-emerald-700">{formatCurrency(s.sold_price || 0)}</td>
                          <td className="p-3 text-right text-slate-500">{s.sold_date ? formatDate(s.sold_date) : '—'}</td>
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
            <h2 className="text-lg font-black uppercase tracking-widest text-[#003DA5] mb-4 flex items-center gap-2">
              <span>💬</span> {L.commentary}
            </h2>
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
