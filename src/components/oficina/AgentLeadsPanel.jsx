"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/context';

export default function AgentLeadsPanel() {
  const { lang, t } = useApp();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalLead, setRejectModalLead] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchMyLeads();
  }, []);

  const fetchMyLeads = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('property_inquiries')
      .select('*, properties(listing_title_es, listing_title_en, name)')
      .eq('assigned_agent_id', user.id)
      .in('status', ['new', 'contacted', 'prelisting', 'cma'])
      .order('assigned_at', { ascending: false });

    setLeads(data || []);
    setLoading(false);
  };

  const handleStatusUpdate = async (id, status, reason = null) => {
    const updatePayload = { status };
    if (reason) updatePayload.rejection_reason = reason;

    await supabase.from('property_inquiries').update(updatePayload).eq('id', id);
    
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status, rejection_reason: reason || l.rejection_reason } : l));
    
    if (status === 'rejected') {
      setRejectModalLead(null);
      setRejectionReason('');
    }
  };

  const handleContactAction = async (id, channel, destination) => {
    if (!destination) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Log the communication
      await supabase.from('lead_communications').insert({
        inquiry_id: id,
        agent_id: user.id,
        channel: channel,
        direction: 'outbound',
        summary: `SLA Initial contact initiated via ${channel}`
      });

      // Optimistic update so the UI changes immediately
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: 'contacted', first_contact_at: new Date().toISOString() } : l));
      
      // Fetch fresh data in background to ensure sync
      fetchMyLeads();
    }

    // Open WhatsApp or Email
    if (channel === 'whatsapp') {
      // Clean phone number to ensure wa.me works properly
      const cleanPhone = destination.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    } else if (channel === 'email') {
      window.location.href = `mailto:${destination}`;
    }
  };

  const formatTimeLeft = (assignedAt) => {
    if (!assignedAt) return null;
    const now = new Date();
    const assigned = new Date(assignedAt);
    const diffMs = (assigned.getTime() + 48 * 60 * 60 * 1000) - now.getTime();
    
    if (diffMs <= 0) return { expired: true, text: 'SLA Vencido' };
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    return { expired: false, text: `${hours}h restantes` };
  };

  if (loading) return <div className="animate-pulse h-24 bg-gray-100 dark:bg-dark-panel rounded-xl"></div>;
  if (leads.length === 0) return null; // Only show if there are assigned leads

  return (
    <div className="bg-white dark:bg-dark-panel rounded-xl shadow-xl border border-blue-200 dark:border-blue-900/30 p-4 md:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-xl">🎯</span> Leads Asignados (Acción Requerida)
        </h3>
        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold">
          {leads.length} Activos
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.map(lead => {
          const timeLeft = formatTimeLeft(lead.assigned_at);
          const needsContact = lead.status === 'new' && !lead.first_contact_at;
          const isBreached = timeLeft?.expired && needsContact;

          return (
            <div key={lead.id} className={`p-4 rounded-xl border ${isBreached ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-gray-50 dark:bg-[#161a22] border-gray-100 dark:border-dark-border'} flex flex-col`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">{lead.lead_name || 'Sin Nombre'}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{lead.lead_email || lead.lead_phone}</p>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-1 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-gray-500">
                  {lead.source || 'Lead'}
                </span>
              </div>
              
              <div className="mb-4">
                {lead.properties && (
                  <p className="text-[10px] text-brand-600 dark:text-brand-400 font-medium mb-1 line-clamp-1">
                    🏠 {lang === 'es' ? lead.properties.listing_title_es : lead.properties.listing_title_en}
                  </p>
                )}
                {needsContact && timeLeft && (
                  <p className={`text-[11px] font-bold ${isBreached ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-amber-600 dark:text-amber-400'}`}>
                    ⏱️ {timeLeft.text} para el primer contacto
                  </p>
                )}
              </div>

              <div className="mt-auto space-y-2">
                {needsContact ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleContactAction(lead.id, 'whatsapp', lead.lead_phone)} 
                      disabled={!lead.lead_phone}
                      className="bg-[#25D366] hover:bg-[#1DA851] text-white text-[10px] font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-lg shadow-[#25D366]/20"
                    >
                      <span>💬</span> WhatsApp
                    </button>
                    <button 
                      onClick={() => handleContactAction(lead.id, 'email', lead.lead_email)} 
                      disabled={!lead.lead_email}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-lg shadow-blue-500/20"
                    >
                      <span>✉️</span> Email
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleStatusUpdate(lead.id, 'cma')} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 text-[10px] font-bold py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors">
                      A CMA
                    </button>
                    <button onClick={() => handleStatusUpdate(lead.id, 'prelisting')} className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-[10px] font-bold py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors">
                      A Pre-List
                    </button>
                    <button onClick={() => handleStatusUpdate(lead.id, 'listed')} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-[10px] font-bold py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors">
                      Listed
                    </button>
                  </div>
                )}
                <button onClick={() => setRejectModalLead(lead)} className="w-full bg-white dark:bg-dark-panel hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400 text-[10px] font-bold py-1.5 rounded-lg border border-gray-200 dark:border-dark-border hover:border-red-200 dark:hover:border-red-900/30 transition-colors">
                  Rechazar Lead
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {rejectModalLead && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-panel rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Rechazar Lead</h3>
            <p className="text-sm text-gray-500 mb-4">Por favor, indica el motivo por el cual no tomarás este lead. El broker será notificado.</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej: Fuera de mi zona, presupuesto muy bajo, número equivocado..."
              className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none mb-4 resize-none h-24 text-gray-900 dark:text-white"
            ></textarea>
            <div className="flex gap-3">
              <button onClick={() => setRejectModalLead(null)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-dark-border text-sm font-bold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button 
                onClick={() => handleStatusUpdate(rejectModalLead.id, 'rejected', rejectionReason)}
                disabled={!rejectionReason.trim()}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
