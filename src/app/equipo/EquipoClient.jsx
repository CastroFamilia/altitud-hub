"use client";

import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import TopNav from '@/components/layout/TopNav';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function EquipoClient({ initialTeam, initialMembers, initialOkrLogs }) {
  const { profile, isTeamLeader } = useAuth();
  const { t } = useApp();
  const router = useRouter();

  // Redirect non-team leaders (BYPASSED FOR PREVIEW)
  useEffect(() => {
    if (profile && false /* !isTeamLeader */) {
      router.push('/');
    }
  }, [profile, isTeamLeader, router]);

  // BYPASSED FOR PREVIEW
  if (false /* !isTeamLeader */) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <TopNav title="Mi Equipo" subtitle={initialTeam ? initialTeam.name : "Gestión de equipo"} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative z-0 bg-slate-50 dark:bg-dark-bg">
        <div className="max-w-6xl mx-auto space-y-8">

          {!initialTeam ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] p-12 text-center shadow-xl border border-slate-200 dark:border-slate-700">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="text-xl font-black italic text-slate-900 dark:text-white mb-2">Sin Equipo Asignado</h3>
              <p className="text-slate-500 text-sm">Aún no eres líder de ningún equipo registrado. Por favor contacta al Broker.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* ── Miembros del Equipo ── */}
              <div className="lg:col-span-1 space-y-8">
                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white">Juniors / Agentes</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">
                      {initialMembers.length} miembros activos
                    </p>
                  </div>
                  
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {initialMembers.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">No hay agentes asignados a este equipo.</div>
                    ) : initialMembers.map(m => (
                      <div key={m.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                        <img
                          src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=5a82bf&color=fff`}
                          alt={m.full_name}
                          className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-600 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{m.full_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Actividad & OKRs ── */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black italic text-slate-900 dark:text-white">Logs de OKRs</h3>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">
                        Actividad reciente de los miembros
                      </p>
                    </div>
                  </div>

                  <div className="p-6">
                    {initialOkrLogs.length === 0 ? (
                      <div className="text-center py-12">
                        <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin Actividad</p>
                        <p className="text-[10px] text-slate-400 mt-1">Tus agentes no han reportado OKRs recientemente.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {initialOkrLogs.map(log => {
                          const agentName = log.profiles?.full_name || 'Agente Desconocido';
                          const agentAvatar = log.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agentName)}&background=5a82bf&color=fff`;
                          
                          // Parsing activities JSONB
                          // Usually contains things like { calls: 5, meetings: 2, listings: 1 }
                          const activities = log.activities || {};
                          
                          return (
                            <div key={log.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-3 mb-4">
                                <img src={agentAvatar} alt={agentName} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600" />
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{agentName}</h4>
                                  <p className="text-[10px] text-slate-400">Log del {new Date(log.log_date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {Object.entries(activities).map(([key, value]) => {
                                  // Max for the bar graph (e.g. 20)
                                  const maxVal = 20;
                                  const pct = Math.min((value / maxVal) * 100, 100);
                                  return (
                                    <div key={key} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">{key}</p>
                                      <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">{value}</p>
                                      {/* Simple CSS Bar Graph */}
                                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                        <div 
                                          className="bg-nexus-blue h-full rounded-full" 
                                          style={{ width: `${pct}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                })}
                                {Object.keys(activities).length === 0 && (
                                  <div className="col-span-full text-xs text-slate-400 italic">No reportó métricas específicas.</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
