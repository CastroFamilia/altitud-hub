"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/context';

export default function DevelopmentAnalytics({ developmentId }) {
  const { lang } = useApp();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    views: 0,
    engagement: 0,
    intent: 0,
    leads: 0,
    byType: {}
  });
  const [funnelData, setFunnelData] = useState({
    inquiries: 0,
    siteVisits: 0,
    reservations: 0,
    sales: 0
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: eventsData }, { data: inquiriesData }, { data: propertiesData }] = await Promise.all([
        supabase.from('page_events').select('*').eq('development_id', developmentId),
        supabase.from('property_inquiries').select('status').eq('development_id', developmentId),
        supabase.from('properties').select('status').eq('development_id', developmentId)
      ]);

      const newStats = {
        views: 0,
        engagement: 0,
        intent: 0,
        leads: 0,
        byType: {}
      };

      (eventsData || []).forEach(ev => {
        newStats.byType[ev.event_type] = (newStats.byType[ev.event_type] || 0) + 1;
        
        switch(ev.event_type) {
          case 'page_view':
            newStats.views++;
            break;
          case 'listing_click':
          case 'gallery_view':
          case 'video_play':
          case 'faq_expand':
          case 'map_interact':
            newStats.engagement++;
            break;
          case 'whatsapp_click':
          case 'pdf_download':
          case 'social_click':
            newStats.intent++;
            break;
          case 'lead_submit':
            newStats.leads++;
            break;
        }
      });

      const inq = inquiriesData || [];
      const props = propertiesData || [];

      setEvents(eventsData || []);
      setStats(newStats);
      setFunnelData({
        inquiries: inq.length,
        siteVisits: inq.filter(i => ['site_visit', 'negotiation', 'converted'].includes(i.status)).length,
        reservations: props.filter(p => ['pending_approval', 'approved'].includes(p.status)).length,
        sales: props.filter(p => p.status === 'sold').length
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developmentId, fetchAnalytics]);

  useEffect(() => {
    if (!developmentId) return;
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const maxVal = Math.max(stats.views, 1); // Avoid div by zero

  const funnelStages = [
    { label: lang === 'en' ? 'Views' : 'Vistas', value: stats.views, color: 'bg-blue-500', desc: lang === 'en' ? 'Total Landing Page Views' : 'Vistas totales de la página', width: '100%' },
    { label: lang === 'en' ? 'Inquiries' : 'Consultas', value: funnelData.inquiries, color: 'bg-indigo-500', desc: lang === 'en' ? 'Total leads & inquiries' : 'Total de leads y consultas', width: `${Math.max((funnelData.inquiries / maxVal) * 100, 5)}%` },
    { label: lang === 'en' ? 'Site Visits' : 'Visitas Sitio', value: funnelData.siteVisits, color: 'bg-purple-500', desc: lang === 'en' ? 'Inquiries marked as site visit' : 'Consultas marcadas como visita al sitio', width: `${Math.max((funnelData.siteVisits / maxVal) * 100, 5)}%` },
    { label: lang === 'en' ? 'Reservations' : 'Reservas', value: funnelData.reservations, color: 'bg-amber-500', desc: lang === 'en' ? 'Active unit reservations' : 'Reservas de unidades activas', width: `${Math.max((funnelData.reservations / maxVal) * 100, 5)}%` },
    { label: lang === 'en' ? 'Closings' : 'Cierres', value: funnelData.sales, color: 'bg-emerald-500', desc: lang === 'en' ? 'Successfully sold units' : 'Unidades vendidas exitosamente', width: `${Math.max((funnelData.sales / maxVal) * 100, 5)}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {lang === 'en' ? 'Conversion Funnel' : 'Embudo de Conversión'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {lang === 'en' ? 'Real-time tracking of visitor behavior on the landing page.' : 'Seguimiento en tiempo real del comportamiento de los visitantes.'}
          </p>
        </div>
        <button onClick={fetchAnalytics} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Funnel Visualization */}
        <div className="glass-panel rounded-2xl p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
          <div className="space-y-4">
            {funnelStages.map((stage, idx) => (
              <div key={idx} className="relative flex flex-col items-center group">
                <div 
                  className={`h-12 rounded-lg flex items-center justify-between px-4 text-white font-bold shadow-md transition-all duration-1000 ease-out ${stage.color}`}
                  style={{ width: stage.width, minWidth: '150px' }}
                >
                  <span className="truncate mr-2">{stage.label}</span>
                  <span>{stage.value}</span>
                </div>
                {idx < funnelStages.length - 1 && (
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-gray-300 dark:border-t-slate-700 my-1"></div>
                )}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max max-w-xs bg-gray-900 text-white text-xs px-3 py-1.5 rounded shadow-lg z-10 pointer-events-none">
                  {stage.desc}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="glass-panel rounded-2xl p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
            {lang === 'en' ? 'Event Breakdown' : 'Desglose de Eventos'}
          </h3>
          <div className="space-y-3">
            {[
              { key: 'page_view', label: 'Page Views / Vistas', icon: '👁️' },
              { key: 'whatsapp_click', label: 'WhatsApp Clicks', icon: '💬' },
              { key: 'pdf_download', label: 'Brochure Downloads', icon: '📄' },
              { key: 'lead_submit', label: 'Form Submits', icon: '✉️' },
              { key: 'listing_click', label: 'Listing Clicks', icon: '🏠' },
              { key: 'gallery_view', label: 'Gallery Views', icon: '📸' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{stats.byType[item.key] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
