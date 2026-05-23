"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════════
   PROPERTY INQUIRIES PANEL
   Shows all leads/inquiries linked to a specific property.
   Displayed prominently on the property detail page so agents
   can clearly see who has inquired about their listing.
   ═══════════════════════════════════════════════════════════════ */

const STATUS_COLORS = {
  new: 'bg-green-500',
  contacted: 'bg-blue-500',
  prelisting: 'bg-indigo-500',
  cma: 'bg-violet-500',
  listed: 'bg-emerald-500',
  converted: 'bg-purple-500',
  rejected: 'bg-red-500',
  dismissed: 'bg-gray-400',
};

const STATUS_LABELS = {
  new: { es: 'Nuevo', en: 'New' },
  contacted: { es: 'Contactado', en: 'Contacted' },
  prelisting: { es: 'Pre-Listing', en: 'Pre-Listing' },
  cma: { es: 'CMA', en: 'CMA' },
  listed: { es: 'Listado', en: 'Listed' },
  converted: { es: 'Convertido', en: 'Converted' },
  rejected: { es: 'Rechazado', en: 'Rejected' },
  dismissed: { es: 'Descartado', en: 'Dismissed' },
};

export default function PropertyInquiriesPanel({ propertyId }) {
  const { t, lang } = useApp();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return;
    const fetchInquiries = async () => {
      try {
        const { data, error } = await supabase
          .from('property_inquiries')
          .select('id, lead_name, lead_email, lead_phone, lead_language, source, status, notes, created_at, portal_name')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false });
        if (!error && data) setInquiries(data);
      } catch (err) {
        console.error('Error loading property inquiries:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInquiries();
  }, [propertyId]);

  if (loading) return null;
  if (inquiries.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-slate-400">{t('auto_no_inquiries_yet')}</p>
      </div>
    );
  }

  const timeAgo = (d) => {
    const mins = Math.floor((Date.now() - new Date(d)) / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d`;
    return `${Math.floor(days / 30)}mo`;
  };

  const langFlag = (l) => l === 'es' ? '🇪🇸' : l === 'en' ? '🇺🇸' : '🌐';

  return (
    <div className="space-y-2">
      {/* Summary */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-black">
            {inquiries.length}
          </span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('auto_total_inquiries')}
          </span>
        </div>
        <div className="flex gap-1">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {inquiries.filter(i => i.status === 'new').length} {t('auto_new_1')}
          </span>
        </div>
      </div>

      {/* Inquiry Cards */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {inquiries.map(inq => (
          <div key={inq.id} className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[inq.status] || STATUS_COLORS.new} ${inq.status === 'new' ? 'animate-pulse' : ''}`} />
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {inq.lead_name || (t('auto_anonymous'))}
                  </p>
                  <span className="text-xs flex-shrink-0">{langFlag(inq.lead_language)}</span>
                </div>
                
                {/* Contact details */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 ml-4">
                  {inq.lead_phone && (
                    <a href={`https://wa.me/${inq.lead_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-green-600 transition-colors">
                      <span className="text-[10px]">💬</span> {inq.lead_phone}
                    </a>
                  )}
                  {inq.lead_email && (
                    <a href={`mailto:${inq.lead_email}`} className="flex items-center gap-1 hover:text-blue-600 transition-colors truncate max-w-[200px]">
                      <span className="text-[10px]">✉️</span> {inq.lead_email}
                    </a>
                  )}
                </div>

                {/* Notes */}
                {inq.notes && (
                  <p className="text-[10px] text-slate-400 mt-1.5 ml-4 line-clamp-2 italic">
                    &ldquo;{inq.notes}&rdquo;
                  </p>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  inq.status === 'new' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : inq.status === 'contacted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : inq.status === 'converted' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {STATUS_LABELS[inq.status]?.[lang] || inq.status}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">{timeAgo(inq.created_at)}</span>
                {inq.source && inq.source !== 'manual' && (
                  <span className="text-[8px] text-slate-400 font-medium uppercase">{inq.portal_name || inq.source}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
