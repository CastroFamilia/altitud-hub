"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/context';

/* ═══════════════════════════════════════════════════════════════
   SyndicationPanel — Shows portal syndication status
   
   Displays which portals a property is published on,
   with status indicators and inquiry counts.
   ═══════════════════════════════════════════════════════════════ */

const PORTAL_CONFIG = {
  reconnect: {
    name: 'RE/MAX RECONNECT',
    icon: '🔵',
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    urlBase: 'https://remax-centralamerica.com',
  },
  encuentra24: {
    name: 'Encuentra24',
    icon: '🟢',
    color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    urlBase: 'https://encuentra24.com',
  },
  chozi: {
    name: 'Chozi.com',
    icon: '🟠',
    color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    urlBase: 'https://chozi.com',
  },
  listglobally: {
    name: 'ListGlobally / Properstar',
    icon: '🌍',
    color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    urlBase: 'https://properstar.com',
  },
};

const STATUS_LABELS = {
  pending: { es: 'Pendiente', en: 'Pending', color: 'text-amber-500' },
  synced: { es: 'Sincronizado', en: 'Synced', color: 'text-green-500' },
  error: { es: 'Error', en: 'Error', color: 'text-red-500' },
  removed: { es: 'Removido', en: 'Removed', color: 'text-gray-400' },
};

export default function SyndicationPanel({ propertyId, propertyStatus, onPublish }) {
  const { lang } = useApp();
  const [syndications, setSyndications] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!propertyId) return;
    const fetch = async () => {
      setLoading(true);
      const [synRes, inqRes] = await Promise.all([
        supabase.from('property_syndication').select('*').eq('property_id', propertyId),
        supabase.from('property_inquiries').select('id, portal_name, status').eq('property_id', propertyId),
      ]);
      setSyndications(synRes.data || []);
      setInquiries(inqRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [propertyId]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await window.fetch('/api/properties/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      const data = await res.json();
      if (data.success) {
        if (onPublish) onPublish();
        // Refresh syndication data
        const { data: synData } = await supabase.from('property_syndication').select('*').eq('property_id', propertyId);
        setSyndications(synData || []);
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Count inquiries per portal
  const inquiryCountByPortal = {};
  inquiries.forEach(inq => {
    const portal = inq.portal_name || 'unknown';
    inquiryCountByPortal[portal] = (inquiryCountByPortal[portal] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        {lang === 'en' ? 'Portal Syndication' : 'Sindicación a Portales'}
      </h3>

      {/* Publish button for approved properties */}
      {(propertyStatus === 'approved') && (
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="w-full mb-4 px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {publishing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          )}
          {lang === 'en' ? 'Publish to RECONNECT' : 'Publicar en RECONNECT'}
        </button>
      )}

      {/* Portal list */}
      <div className="space-y-2">
        {Object.entries(PORTAL_CONFIG).map(([key, portal]) => {
          const syn = syndications.find(s => s.portal_name === key);
          const inqCount = inquiryCountByPortal[key] || 0;
          const status = syn ? STATUS_LABELS[syn.status] : null;

          return (
            <div key={key} className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors ${
              syn ? 'bg-gray-50 dark:bg-white/5' : 'opacity-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="text-base">{portal.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white">{portal.name}</p>
                  {syn && status && (
                    <p className={`text-[10px] font-medium ${status.color}`}>
                      {lang === 'en' ? status.en : status.es}
                      {syn.last_synced_at && (
                        <span className="text-gray-400 ml-1">
                          · {new Date(syn.last_synced_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}
                  {!syn && (
                    <p className="text-[10px] text-gray-400">{lang === 'en' ? 'Not connected' : 'No conectado'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {inqCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold">
                    {inqCount} {lang === 'en' ? 'leads' : 'leads'}
                  </span>
                )}
                {syn?.portal_listing_url && (
                  <a href={syn.portal_listing_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-500 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total inquiries */}
      {inquiries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border">
          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {lang === 'en' ? `${inquiries.length} total inquiries` : `${inquiries.length} consultas totales`}
          </p>
        </div>
      )}
    </div>
  );
}
