"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import TopNav from '@/components/layout/TopNav';
import { useRouter } from 'next/navigation';

/* ═══════════════════════════════════════
   OFFICE PANEL — Broker Admin Dashboard
   ═══════════════════════════════════════ */

export default function OficinaPage() {
  const { profile, isBroker, supabase } = useAuth();
  const { t } = useApp();
  const router = useRouter();

  // State
  const [selectedOffice, setSelectedOffice] = useState('altitud');
  const [profiles, setProfiles] = useState([]);
  const [apiAgents, setApiAgents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    apiAgent: null,
    email: '',
    role: 'agent',
    team_id: '',
  });
  const [inviting, setInviting] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  // Redirect non-brokers
  useEffect(() => {
    if (profile && !isBroker) {
      router.push('/');
    }
  }, [profile, isBroker, router]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const profilesRes = await fetch('/api/profile?all=true');
      const profilesData = await profilesRes.json();
      setProfiles(profilesData.profiles || []);

      // Fetch teams
      const { data: teamsData } = await supabase.from('teams').select('*');
      setTeams(teamsData || []);

      // Fetch API agents
      const agentsRes = await fetch(`/api/agents-feed?office=${selectedOffice}`);
      const agentsData = await agentsRes.json();
      setApiAgents(agentsData.agents || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedOffice]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter profiles by office
  const officeProfiles = profiles.filter(p => p.office === selectedOffice);
  const activeProfiles = officeProfiles.filter(p => p.status === 'active');
  const invitedProfiles = officeProfiles.filter(p => p.status === 'invited');

  // Stats
  const totalAgents = officeProfiles.length;
  const activeCount = activeProfiles.length;
  const teamLeaders = officeProfiles.filter(p => p.role === 'team_leader').length;

  // Handle invite
  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.apiAgent) return;
    setInviting(true);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          full_name: inviteForm.apiAgent.name,
          role: inviteForm.role,
          team_id: inviteForm.team_id || null,
          remax_agent_id: inviteForm.apiAgent.id,
          remax_agent_name: inviteForm.apiAgent.name,
          office: selectedOffice,
          avatar_url: inviteForm.apiAgent.photo,
          phone: inviteForm.apiAgent.phone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowInviteModal(false);
        setInviteForm({ apiAgent: null, email: '', role: 'agent', team_id: '' });
        loadData();
      } else {
        alert(data.error || 'Error al invitar');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  // Handle role/team change
  const handleUpdateProfile = async (profileId, updates) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profileId, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
        setEditingProfile(null);
      }
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  // Already-invited agent emails
  const registeredEmails = new Set(profiles.map(p => p.remax_agent_id));

  // Filter API agents not yet invited
  const availableAgents = apiAgents.filter(a => !registeredEmails.has(a.id));

  if (!isBroker) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <TopNav title="Panel de Oficina" subtitle="Gestión de agentes, equipos e invitaciones" />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative z-0 bg-slate-50 dark:bg-dark-bg">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* ── Office Selector ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                {[
                  { key: 'altitud', label: 'RE/MAX Altitud' },
                  { key: 'cero', label: 'Altitud Cero' },
                ].map(o => (
                  <button
                    key={o.key}
                    onClick={() => setSelectedOffice(o.key)}
                    className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                      selectedOffice === o.key
                        ? 'bg-nexus-blue text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-nexus-blue hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Invitar Agente
            </button>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Agentes Registrados', val: totalAgents, color: 'text-slate-900 dark:text-white' },
              { label: 'Activos', val: activeCount, color: 'text-emerald-500' },
              { label: 'Invitados Pendientes', val: invitedProfiles.length, color: 'text-amber-500' },
              { label: 'Team Leaders', val: teamLeaders, color: 'text-nexus-blue' },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-200 dark:border-slate-700 group hover:shadow-lg transition-all">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">{s.label}</p>
                <h3 className={`text-3xl font-black italic mt-2 ${s.color}`}>{loading ? '—' : s.val}</h3>
              </div>
            ))}
          </div>

          {/* ── Agents Roster ── */}
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black italic text-slate-900 dark:text-white">Roster de Agentes</h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">
                  {selectedOffice === 'altitud' ? 'RE/MAX Altitud — Pérez Zeledón' : 'RE/MAX Altitud Cero'}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : officeProfiles.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 mx-auto mb-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin agentes registrados</p>
                <p className="text-[10px] text-slate-400 mt-1">Invita agentes para comenzar</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {officeProfiles.map(p => (
                  <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                    {/* Avatar */}
                    <img
                      src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=5a82bf&color=fff`}
                      alt={p.full_name}
                      className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-600 object-cover"
                    />

                    {/* Name & Email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.full_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                    </div>

                    {/* Role badge */}
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                      p.role === 'broker' 
                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                        : p.role === 'team_leader'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {p.role === 'broker' ? 'Broker' : p.role === 'team_leader' ? 'Team Leader' : 'Agente'}
                    </span>

                    {/* Status badge */}
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                      p.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : p.status === 'invited'
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-700'
                    }`}>
                      {p.status === 'active' ? 'Activo' : p.status === 'invited' ? 'Invitado' : 'Deshabilitado'}
                    </span>

                    {/* Team */}
                    <span className="text-[10px] text-slate-400 font-medium w-28 truncate text-right">
                      {p.teams?.name || '—'}
                    </span>

                    {/* Edit button */}
                    {p.role !== 'broker' && (
                      <button
                        onClick={() => setEditingProfile(p)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-nexus-blue transition-all p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Teams Section ── */}
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4">Equipos</h3>
            {teams.filter(t => t.office === selectedOffice).length === 0 ? (
              <p className="text-xs text-slate-400">No hay equipos configurados para esta oficina.</p>
            ) : (
              <div className="space-y-3">
                {teams.filter(team => team.office === selectedOffice).map(team => {
                  const leader = officeProfiles.find(p => p.id === team.leader_id);
                  const members = officeProfiles.filter(p => p.team_id === team.id && p.id !== team.leader_id);
                  return (
                    <div key={team.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{team.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Leader: {leader?.full_name || 'Sin asignar'} · {members.length} miembros
                          </p>
                        </div>
                      </div>
                      {members.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {members.map(m => (
                            <span key={m.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                              <img src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=5a82bf&color=fff&size=20`} className="w-5 h-5 rounded-full" alt="" />
                              {m.full_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ═══ INVITE MODAL ═══ */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-8 space-y-6"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-xl font-black italic text-slate-900 dark:text-white">Invitar Agente</h3>
              <p className="text-xs text-slate-400 mt-1">Selecciona un agente de la API RE/MAX y asígnale un email de acceso.</p>
            </div>

            {/* Agent Selector */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Agente RE/MAX</label>
              <select
                value={inviteForm.apiAgent?.id || ''}
                onChange={e => {
                  const agent = apiAgents.find(a => a.id === parseInt(e.target.value));
                  setInviteForm(prev => ({
                    ...prev,
                    apiAgent: agent,
                    email: agent?.email?.includes('@remax-altitud.cr') ? agent.email : '',
                  }));
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar agente...</option>
                {availableAgents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} — {a.officeName}</option>
                ))}
              </select>
            </div>

            {/* Selected agent preview */}
            {inviteForm.apiAgent && (
              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/30">
                <img
                  src={inviteForm.apiAgent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteForm.apiAgent.name)}&background=5a82bf&color=fff`}
                  className="w-12 h-12 rounded-full border-2 border-blue-200"
                  alt=""
                />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{inviteForm.apiAgent.name}</p>
                  <p className="text-[10px] text-slate-500">{inviteForm.apiAgent.titleEs || inviteForm.apiAgent.title} · {inviteForm.apiAgent.phone}</p>
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Email de Login</label>
              <input
                type="email"
                placeholder="nombre@remax-altitud.cr"
                value={inviteForm.email}
                onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
              />
            </div>

            {/* Role */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Rol</label>
              <div className="flex gap-2">
                {[
                  { key: 'agent', label: 'Agente' },
                  { key: 'team_leader', label: 'Team Leader' },
                ].map(r => (
                  <button
                    key={r.key}
                    onClick={() => setInviteForm(prev => ({ ...prev, role: r.key }))}
                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                      inviteForm.role === r.key
                        ? 'bg-nexus-blue text-white border-nexus-blue shadow-lg shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Team */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Equipo</label>
              <select
                value={inviteForm.team_id}
                onChange={e => setInviteForm(prev => ({ ...prev, team_id: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin equipo</option>
                {teams.filter(team => team.office === selectedOffice).map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteForm.email || !inviteForm.apiAgent || inviting}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-nexus-blue text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {inviting ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Enviar Invitación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT PROFILE MODAL ═══ */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditingProfile(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-8 space-y-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <img
                src={editingProfile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(editingProfile.full_name)}&background=5a82bf&color=fff`}
                className="w-14 h-14 rounded-full border-2 border-slate-200"
                alt=""
              />
              <div>
                <h3 className="text-lg font-black italic text-slate-900 dark:text-white">{editingProfile.full_name}</h3>
                <p className="text-xs text-slate-400">{editingProfile.email}</p>
              </div>
            </div>

            {/* Role selector */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Rol</label>
              <div className="flex gap-2">
                {['agent', 'team_leader'].map(r => (
                  <button
                    key={r}
                    onClick={() => handleUpdateProfile(editingProfile.id, { role: r })}
                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                      editingProfile.role === r
                        ? 'bg-nexus-blue text-white border-nexus-blue'
                        : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {r === 'agent' ? 'Agente' : 'Team Leader'}
                  </button>
                ))}
              </div>
            </div>

            {/* Team selector */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Equipo</label>
              <select
                value={editingProfile.team_id || ''}
                onChange={e => handleUpdateProfile(editingProfile.id, { team_id: e.target.value || null })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin equipo</option>
                {teams.filter(team => team.office === selectedOffice).map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Estado</label>
              <div className="flex gap-2">
                {['active', 'disabled'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleUpdateProfile(editingProfile.id, { status: s })}
                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                      editingProfile.status === s
                        ? s === 'active' 
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-red-500 text-white border-red-500'
                        : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {s === 'active' ? 'Activo' : 'Deshabilitado'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setEditingProfile(null)}
              className="w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
