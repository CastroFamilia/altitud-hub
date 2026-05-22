"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { insertOfficeEvent, upsertEventAttendance } from '@/lib/dal/office';

export default function EventsAttendanceTab({ events, attendance, profiles, setEvents, setAttendance }) {
  const { t, lang } = useApp();
  const { profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Event Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    event_time: '',
    event_type: 'training',
    is_mandatory: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Parse event types from translations
  const eventTypesRaw = t('ofc_hr_event_types');
  let eventTypes = {};
  try {
    eventTypes = JSON.parse(eventTypesRaw);
  } catch(e) {
    eventTypes = {
      training: 'Capacitación',
      meeting: 'Reunión Mensual',
      convention: 'Convención',
      open_house: 'Open House',
      social: 'Social',
      other: 'Otro'
    };
  }

  const activeAgents = useMemo(() => {
    return profiles.filter(p => p.status === 'active' && p.role !== 'broker').sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [profiles]);

  const handleSaveEvent = async () => {
    if (!formData.title || !formData.event_date) return;
    setIsSaving(true);
    
    try {
      const payload = {
        ...formData,
        created_by: profile?.id,
        office: profile?.office || 'altitud'
      };

      const data = await insertOfficeEvent(payload);
      
      setEvents(prev => [data, ...prev].sort((a, b) => new Date(b.event_date) - new Date(a.event_date)));
      setIsModalOpen(false);
      setFormData({
        title: '', description: '', event_date: new Date().toISOString().split('T')[0],
        event_time: '', event_type: 'training', is_mandatory: true
      });
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Error saving event');
    } finally {
      setIsSaving(false);
    }
  };

  const updateAttendance = async (eventId, profileId, newStatus) => {
    // Optimistic UI update
    setAttendance(prev => {
      const existing = prev.find(a => a.event_id === eventId && a.profile_id === profileId);
      if (existing) {
        return prev.map(a => a.id === existing.id ? { ...a, status: newStatus } : a);
      } else {
        return [...prev, { id: `temp-${Date.now()}`, event_id: eventId, profile_id: profileId, status: newStatus }];
      }
    });

    try {
      await upsertEventAttendance({
        eventId,
        profileId,
        status: newStatus,
        markedBy: profile?.id
      });
      
      // We could re-fetch attendance here to get real IDs, but optimistic update is usually fine
    } catch (err) {
      console.error('Error updating attendance:', err);
    }
  };

  const getEventStats = (eventId) => {
    const eventAtts = attendance.filter(a => a.event_id === eventId);
    let presentCount = 0;
    
    // We only count people who have a status assigned, OR we can calculate out of all active agents.
    // For simplicity, let's just show Presentes vs Ausentes from the marked list.
    let markedCount = 0;
    eventAtts.forEach(a => {
      if (a.status !== 'no_obligatoria') markedCount++;
      if (a.status === 'presente') presentCount++;
    });

    return { presentCount, totalMarked: markedCount, rate: markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0 };
  };

  return (
    <div className="fade-in max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center">
            📅 {t('ofc_hr_events_title') || 'Eventos y Asistencia'}
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona eventos de la oficina y registra la asistencia del equipo.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 w-full md:w-auto justify-center"
        >
          {t('ofc_hr_create_event') || '+ Nuevo Evento'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Events List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
            Próximos y Pasados
          </h3>
          
          {events.length === 0 ? (
            <div className="bg-white dark:bg-dark-panel rounded-xl p-8 text-center border border-gray-100 dark:border-dark-border">
              <span className="text-3xl mb-2 block">📅</span>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('ofc_hr_no_events') || 'No hay eventos'}</p>
            </div>
          ) : (
            events.map(ev => {
              const stats = getEventStats(ev.id);
              const isSelected = selectedEvent?.id === ev.id;
              
              return (
                <div 
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-800 shadow-sm' 
                      : 'bg-white dark:bg-dark-panel border-gray-200 dark:border-dark-border hover:border-brand-300 dark:hover:border-brand-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-bold text-sm ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-white'}`}>
                      {ev.title}
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-400 shrink-0 ml-2">
                      {eventTypes[ev.event_type] || ev.event_type}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3 gap-3">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      {new Date(ev.event_date + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-CR' : 'en-US')}
                    </span>
                    {ev.event_time && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        {ev.event_time}
                      </span>
                    )}
                  </div>
                  
                  {/* Mini Stats */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-dark-bg rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${stats.rate}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                      {stats.rate}% Asistencia
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Attendance Roster */}
        <div className="lg:col-span-8">
          {!selectedEvent ? (
            <div className="bg-gray-50 dark:bg-dark-panel/50 rounded-xl border border-gray-100 dark:border-dark-border h-full min-h-[300px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-6 text-center">
              <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <p className="text-sm font-medium">Selecciona un evento para registrar asistencia</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-dark-panel rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
              <div className="p-4 md:p-5 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg/50">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{selectedEvent.title}</h3>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${selectedEvent.is_mandatory ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-dark-bg dark:text-gray-400'}`}>
                    {selectedEvent.is_mandatory ? 'Obligatorio' : 'Opcional'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('ofc_hr_mark_attendance') || 'Marcar asistencia para los agentes activos.'}</p>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-dark-border max-h-[600px] overflow-y-auto">
                {activeAgents.map(agent => {
                  const att = attendance.find(a => a.event_id === selectedEvent.id && a.profile_id === agent.id);
                  const status = att?.status || 'ausente';
                  
                  return (
                    <div key={agent.id} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {agent.full_name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{agent.full_name}</p>
                          {agent.teams && <p className="text-[10px] text-gray-500">{agent.teams.name}</p>}
                        </div>
                      </div>
                      
                      <div className="flex gap-1.5 shrink-0 self-start sm:self-auto">
                        <button
                          onClick={() => updateAttendance(selectedEvent.id, agent.id, 'presente')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            status === 'presente' 
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-sm ring-1 ring-emerald-500' 
                              : 'bg-white dark:bg-dark-panel text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-bg border-gray-200 dark:border-dark-border'
                          }`}
                        >
                          ✓ {t('ofc_hr_status_presente') || 'Presente'}
                        </button>
                        
                        <button
                          onClick={() => updateAttendance(selectedEvent.id, agent.id, 'ausente')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            status === 'ausente' 
                              ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 shadow-sm ring-1 ring-red-500' 
                              : 'bg-white dark:bg-dark-panel text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-bg border-gray-200 dark:border-dark-border'
                          }`}
                        >
                          × {t('ofc_hr_status_ausente') || 'Ausente'}
                        </button>
                        
                        <button
                          onClick={() => updateAttendance(selectedEvent.id, agent.id, 'ausente_aviso')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                            status === 'ausente_aviso' 
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-sm ring-1 ring-amber-500' 
                              : 'bg-white dark:bg-dark-panel text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-bg border-gray-200 dark:border-dark-border'
                          }`}
                        >
                          {t('ofc_hr_status_ausente_aviso') || 'Con Aviso'}
                        </button>
                        
                        <button
                          onClick={() => updateAttendance(selectedEvent.id, agent.id, 'no_obligatoria')}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                            status === 'no_obligatoria' 
                              ? 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 shadow-sm ring-1 ring-gray-400' 
                              : 'bg-white dark:bg-dark-panel text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-bg border-gray-200 dark:border-dark-border'
                          }`}
                          title="No Obligatoria"
                        >
                          N/A
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-dark-panel rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-dark-border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg/50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {t('ofc_hr_create_event') || '+ Nuevo Evento'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{t('ofc_hr_event_name') || 'Nombre del Evento'} *</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500"
                  placeholder="Ej. Capacitación Mensual, Onboarding..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{t('ofc_hr_event_date') || 'Fecha'} *</label>
                  <input 
                    type="date" 
                    value={formData.event_date} 
                    onChange={e => setFormData({...formData, event_date: e.target.value})}
                    className="w-full text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{t('ofc_hr_event_time') || 'Hora'}</label>
                  <input 
                    type="time" 
                    value={formData.event_time} 
                    onChange={e => setFormData({...formData, event_time: e.target.value})}
                    className="w-full text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{t('ofc_hr_event_type') || 'Tipo de Evento'}</label>
                <select 
                  value={formData.event_type} 
                  onChange={e => setFormData({...formData, event_type: e.target.value})}
                  className="w-full text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500"
                >
                  {Object.entries(eventTypes).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="is_mandatory" 
                  checked={formData.is_mandatory} 
                  onChange={e => setFormData({...formData, is_mandatory: e.target.checked})}
                  className="rounded text-brand-500 focus:ring-brand-500 dark:bg-dark-bg border-gray-300 dark:border-dark-border w-4 h-4"
                />
                <label htmlFor="is_mandatory" className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {t('ofc_hr_event_mandatory') || 'Evento Obligatorio'}
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {t('ofc_hr_cancel') || 'Cancelar'}
              </button>
              <button 
                onClick={handleSaveEvent}
                disabled={!formData.title || !formData.event_date || isSaving}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md transition-all"
              >
                {isSaving ? 'Guardando...' : (t('ofc_hr_save_event') || 'Guardar Evento')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
