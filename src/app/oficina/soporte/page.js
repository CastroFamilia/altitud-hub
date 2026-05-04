"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';

export default function AdminSoportePage() {
  const { profile, isBroker, isTeamLeader, supabase } = useAuth();
  const { t } = useApp();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (profile?.id && (isBroker || isTeamLeader)) {
      fetchTickets();
    }
  }, [profile, isBroker, isTeamLeader]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles:agent_id (full_name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedTicket) return;
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status, 
          admin_notes: adminNote,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      
      // Update local state
      setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status, admin_notes: adminNote } : t));
      setSelectedTicket(null);
      setAdminNote('');
    } catch (err) {
      console.error('Error updating ticket:', err);
      alert('Error al actualizar el ticket');
    } finally {
      setUpdating(false);
    }
  };

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setAdminNote(ticket.admin_notes || '');
  };

  if (!isBroker && !isTeamLeader) {
    return <div className="p-8 text-center text-red-500">Acceso denegado.</div>;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Resuelto</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">En Proceso</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Pendiente</span>;
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('sup_admin_title') || 'Tickets de Soporte'}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('sup_admin_subtitle') || 'Gestión de errores reportados por los agentes'}</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Lista de Tickets */}
            <div className="lg:col-span-2 bg-white dark:bg-dark-panel rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-200 dark:border-dark-border">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agente</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No hay tickets registrados.
                        </td>
                      </tr>
                    ) : (
                      tickets.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={ticket.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(ticket.profiles?.full_name || 'Agente')}`} className="w-8 h-8 rounded-full" alt="avatar" />
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {ticket.profiles?.full_name || 'Usuario'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{ticket.title}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{ticket.description}</div>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(ticket.status)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button 
                              onClick={() => openTicket(ticket)}
                              className="text-brand-600 dark:text-brand-400 hover:text-brand-800 font-medium"
                            >
                              Ver Detalle
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detalle del Ticket */}
            <div className="lg:col-span-1">
              {selectedTicket ? (
                <div className="bg-white dark:bg-dark-panel rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-5 sticky top-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detalle del Ticket</h3>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Agente</p>
                    <div className="flex items-center gap-2">
                      <img src={selectedTicket.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTicket.profiles?.full_name || 'Agente')}`} className="w-6 h-6 rounded-full" alt="avatar" />
                      <span className="text-sm font-medium dark:text-white">{selectedTicket.profiles?.full_name}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Asunto</p>
                    <p className="text-sm font-medium dark:text-white">{selectedTicket.title}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Descripción</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-bg p-3 rounded-lg border border-gray-100 dark:border-dark-border whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>

                  {selectedTicket.image_url && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Captura de pantalla</p>
                      <a href={selectedTicket.image_url} target="_blank" rel="noopener noreferrer" className="block w-full h-24 bg-gray-100 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden group relative">
                        <img src={selectedTicket.image_url} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" alt="Captura adjunta" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">Abrir imagen</span>
                        </div>
                      </a>
                    </div>
                  )}

                  <hr className="my-4 border-gray-100 dark:border-dark-border" />

                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-1">{t('sup_admin_notes') || 'Notas del administrador'}</label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Respuesta o resolución interna..."
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-dark-bg dark:border-dark-border dark:text-white resize-none h-24"
                    ></textarea>
                  </div>

                  <div className="flex flex-col gap-2">
                    {selectedTicket.status !== 'resolved' && (
                      <button
                        onClick={() => handleUpdateStatus('resolved')}
                        disabled={updating}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {updating ? 'Actualizando...' : t('sup_admin_mark_resolved') || 'Marcar como Resuelto'}
                      </button>
                    )}
                    {selectedTicket.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus('in_progress')}
                        disabled={updating}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {updating ? 'Actualizando...' : t('sup_admin_mark_progress') || 'Marcar En Proceso'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-dark-bg rounded-2xl border border-dashed border-gray-200 dark:border-dark-border p-8 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                  <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Selecciona un ticket de la lista para ver los detalles y actualizar su estado.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
