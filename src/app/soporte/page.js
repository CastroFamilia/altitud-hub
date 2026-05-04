"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase-browser';
import TopNav from '@/components/layout/TopNav';
import TicketForm from './components/TicketForm';

export default function SoportePage() {
  const { profile } = useAuth();
  const { t } = useApp();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchTickets();
    }
  }, [profile]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('agent_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSubmitted = () => {
    setShowForm(false);
    fetchTickets();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{t('sup_status_resolved') || 'Resuelto'}</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t('sup_status_in_progress') || 'En Proceso'}</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{t('sup_status_pending') || 'Pendiente'}</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors">
      <TopNav title={t('sup_title') || 'Soporte y Errores'} subtitle={t('sup_subtitle') || 'Reporta problemas o solicita ayuda al equipo'} />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-dark-panel p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                {t('sup_title') || 'Soporte Técnico'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Historial de tus solicitudes</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
            >
              {t('sup_new_ticket') || '+ Nuevo Ticket'}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-dark-panel rounded-2xl border border-dashed border-gray-200 dark:border-dark-border">
              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('sup_empty') || 'No has enviado ningún ticket.'}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Si encuentras algún error en la plataforma, repórtalo aquí.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map(ticket => (
                <div key={ticket.id} className="bg-white dark:bg-dark-panel rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-dark-border hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{ticket.title}</h3>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
                      
                      {ticket.image_url && (
                        <div className="mt-4">
                          <a href={ticket.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-brand-600 dark:text-brand-400 hover:underline bg-brand-50 dark:bg-brand-900/10 px-3 py-1.5 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            Ver Captura Adjunta
                          </a>
                        </div>
                      )}
                      
                      {ticket.admin_notes && (
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                          <p className="text-xs font-bold text-amber-800 dark:text-amber-500 mb-1">{t('sup_admin_notes') || 'Notas del administrador'}:</p>
                          <p className="text-sm text-amber-900 dark:text-amber-200">{ticket.admin_notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 md:text-right shrink-0">
                      {new Date(ticket.created_at).toLocaleDateString()} {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <TicketForm 
          onClose={() => setShowForm(false)} 
          onSuccess={handleTicketSubmitted} 
        />
      )}
    </div>
  );
}
