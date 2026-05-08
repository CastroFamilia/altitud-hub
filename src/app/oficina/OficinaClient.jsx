"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import TopNav from '@/components/layout/TopNav';
import { useRouter } from 'next/navigation';
import PropertyApprovalTab from '@/components/oficina/PropertyApprovalTab';
import ListingVelocityPanel from '@/components/oficina/ListingVelocityPanel';
import LeadManagementTab from '@/components/oficina/LeadManagementTab';
import AgentDataImportTab from '@/components/oficina/AgentDataImportTab';
import CommissionAnalyticsTab from '@/components/oficina/CommissionAnalyticsTab';

/* ═══════════════════════════════════════
   OFFICE PANEL — Broker Admin Dashboard
   ═══════════════════════════════════════ */

export default function OficinaClient({ initialProfiles = [], initialTeams = [], initialMilestones = [], initialInquiries = [], initialLeadSources = [], initialCommunications = [], initialFollowUps = [] }) {
  const { profile, isBroker, supabase } = useAuth();
  const { t, lang } = useApp();
  const router = useRouter();

  // State
  const [selectedOffice, setSelectedOffice] = useState('altitud');
  const [profiles, setProfiles] = useState(initialProfiles);
  const [apiAgents, setApiAgents] = useState([]);
  const [teams, setTeams] = useState(initialTeams);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('equipo');
  const [milestones, setMilestones] = useState(initialMilestones);
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  
  const [inviteForm, setInviteForm] = useState({
    apiAgent: null,
    email: '',
    role: 'agent',
    team_id: '',
  });
  const [inviting, setInviting] = useState(false);

  // Redirect non-brokers (BYPASSED FOR PREVIEW)
  useEffect(() => {
    if (profile && false /* !isBroker */) {
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
      let loadedProfiles = profilesData.profiles || [];
      
      // MOCK DATA FOR PREVIEW IF EMPTY
      if (loadedProfiles.length === 0) {
        loadedProfiles = [
          { id: 'mock1', full_name: 'Alejandra Castro', role: 'broker', email: 'acastro@remax-altitud.cr', office: 'altitud', status: 'active' },
          { id: 'mock2', full_name: 'César', role: 'broker', email: 'cesar@remax-altitud.cr', office: 'altitud', status: 'invited' },
          { id: 'mock3', full_name: 'Agente de Prueba', role: 'agent', email: 'prueba@remax.cr', office: 'altitud', status: 'active', teams: { name: 'Equipo Principal' } }
        ];
      }
      setProfiles(loadedProfiles);

      // Fetch teams
      const { data: teamsData } = await supabase.from('teams').select('*');
      let loadedTeams = teamsData || [];
      if (loadedTeams.length === 0) {
        loadedTeams = [{ id: 'team1', name: 'Equipo Principal', leader_id: 'mock2', office: 'altitud' }];
      }
      setTeams(loadedTeams);

      // Fetch API agents
      const agentsRes = await fetch(`/api/agents-feed?office=${selectedOffice}`);
      const agentsData = await agentsRes.json();
      setApiAgents(agentsData.agents || []);

      // Fetch listing milestones for velocity analytics
      const { data: msData } = await supabase
        .from('listing_milestones')
        .select('*');
      setMilestones(msData || []);
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

  // Handle Quick Approve
  const handleApproveAgent = async (agent) => {
    if (!agent.email) {
      alert(t('ofc_agent_no_email'));
      return;
    }
    
    // Check if it's a valid remax-altitud.cr email or prompt
    const confirmEmail = confirm(t('ofc_confirm_approve').replace('{name}', agent.name).replace('{email}', agent.email));
    if (!confirmEmail) return;

    setInviting(true);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: agent.email,
          full_name: agent.name,
          role: 'agent', // Default role is agent/junior
          team_id: null,
          remax_agent_id: agent.id,
          remax_agent_name: agent.name,
          office: selectedOffice,
          avatar_url: agent.photo,
          phone: agent.phone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert(data.error || t('ofc_approve_error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  // Handle Manual Invite
  const handleManualInvite = async () => {
    if (!inviteForm.email || !inviteForm.full_name) return;
    setInviting(true);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          full_name: inviteForm.full_name,
          role: inviteForm.role,
          team_id: inviteForm.team_id || null,
          remax_agent_id: null,
          remax_agent_name: null,
          office: selectedOffice,
          avatar_url: null,
          phone: null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowInviteModal(false);
        setInviteForm({ full_name: '', email: '', role: 'agent', team_id: '' });
        loadData();
      } else {
        alert(data.error || t('ofc_invite_error'));
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

  // Already-invited agent emails/IDs
  const registeredEmails = new Set(profiles.map(p => p.email.toLowerCase()));
  const registeredIds = new Set(profiles.map(p => p.remax_agent_id).filter(id => id));

  // Filter API agents not yet invited
  const pendingAgents = apiAgents.filter(a => !registeredIds.has(a.id) && !registeredEmails.has(a.email?.toLowerCase()));

  // BYPASSED FOR PREVIEW
  if (false /* !isBroker */) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <TopNav title={t('ofc_title')} subtitle={t('ofc_subtitle')} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative z-0 bg-slate-50 dark:bg-dark-bg">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* ── Office Selector & Actions ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('ofc_manual_assign')}
            </button>
          </div>

          {/* ── Tab Navigation ── */}
          <div className="flex bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-slate-700 w-fit mb-6">
            {[
              { key: 'equipo', label: t('ofc_team'), icon: '👥' },
              { key: 'propiedades', label: t('ofc_properties'), icon: '🏠' },
              { key: 'leads', label: 'Leads', icon: '📩' },
              { key: 'importar', label: lang === 'en' ? 'Import' : 'Importar', icon: '📥' },
              { key: 'comisiones', label: t('neg_tab_comisiones'), icon: '💰' },
              { key: 'velocidad', label: t('ofc_velocity'), icon: '⏱️' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.key ? 'bg-nexus-blue text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}>
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'comisiones' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>💰</span> {t('ofc_comm_title')}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                {t('ofc_comm_desc')}
              </p>
              <CommissionAnalyticsTab profiles={profiles} />
            </div>
          ) : activeTab === 'velocidad' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>⏱️</span> {t('ofc_velocity_title')}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                {t('ofc_velocity_desc')}
              </p>
              <ListingVelocityPanel t={t} lang={lang} milestones={milestones} profiles={profiles} />
            </div>
          ) : activeTab === 'leads' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>📩</span> {t('ofc_leads_title')}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                {t('ofc_leads_desc')}
              </p>
              <LeadManagementTab profiles={profiles} initialLeads={initialInquiries} initialSources={initialLeadSources} initialCommunications={initialCommunications} initialFollowUps={initialFollowUps} />
            </div>
          ) : activeTab === 'importar' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <AgentDataImportTab profiles={profiles} />
            </div>
          ) : activeTab === 'propiedades' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4">{t('ofc_property_approval')}</h3>
              <PropertyApprovalTab />
            </div>
          ) : (
          <>
          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('ofc_total_registered'), val: totalAgents, color: 'text-slate-900 dark:text-white' },
              { label: t('ofc_active_agents'), val: activeCount, color: 'text-emerald-500' },
              { label: t('ofc_team_leaders'), val: teamLeaders, color: 'text-nexus-blue' },
              { label: t('ofc_pending_api'), val: pendingAgents.length, color: 'text-amber-500' },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-200 dark:border-slate-700 group hover:shadow-lg transition-all">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">{s.label}</p>
                <h3 className={`text-3xl font-black italic mt-2 ${s.color}`}>{loading ? '—' : s.val}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* ── Left Column: Approvals & Roster ── */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Pendientes de Aprobación */}
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-amber-50/50 dark:bg-amber-900/10">
                  <div>
                    <h3 className="text-lg font-black italic text-amber-600 dark:text-amber-500">{t('ofc_pending_approval')}</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                      {t('ofc_agents_found')}
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-black">
                    {pendingAgents.length}
                  </span>
                </div>

                {loading ? (
                  <div className="p-8 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full"></div></div>
                ) : pendingAgents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs uppercase tracking-widest font-bold">
                    {t('ofc_no_new_agents')}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[400px] overflow-y-auto">
                    {pendingAgents.map(agent => (
                      <div key={agent.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <img
                            src={agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=f59e0b&color=fff`}
                            alt={agent.name}
                            className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-600 object-cover"
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{agent.name}</p>
                            <p className="text-[10px] text-slate-400">{agent.email || t('ofc_no_email_label')}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleApproveAgent(agent)}
                          disabled={inviting || !agent.email}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                        >
                          {t('ofc_approve')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Roster de Agentes */}
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white">{t('ofc_registered_roster')}</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">
                      {t('ofc_all_members')}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[600px] overflow-y-auto">
                  {officeProfiles.map(p => (
                    <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                      <img
                        src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=5a82bf&color=fff`}
                        alt={p.full_name}
                        className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-600 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.full_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                        p.role === 'broker' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                        : p.role === 'team_leader' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {p.role === 'broker' ? t('ofc_role_admin') : p.role === 'team_leader' ? t('ofc_role_leader') : t('ofc_role_junior')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium w-24 truncate text-right">
                        {p.teams?.name || t('ofc_manual_no_team')}
                      </span>
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
              </div>

            </div>

            {/* ── Right Column: Teams ── */}
            <div className="space-y-8">
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4">{t('ofc_teams_title')}</h3>
                {teams.filter(t => t.office === selectedOffice).length === 0 ? (
                  <p className="text-xs text-slate-400">{t('ofc_no_teams_configured')}</p>
                ) : (
                  <div className="space-y-4">
                    {teams.filter(team => team.office === selectedOffice).map(team => {
                      const leader = officeProfiles.find(p => p.id === team.leader_id);
                      const members = officeProfiles.filter(p => p.team_id === team.id && p.id !== team.leader_id);
                      
                      return (
                        <div key={team.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{team.name}</h4>
                          
                          {/* Team Leader */}
                          <div className="mb-3">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2">{t('ofc_leader')}</p>
                            {leader ? (
                              <div className="flex items-center gap-3">
                                <img src={leader.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(leader.full_name)}&background=5a82bf&color=fff`} className="w-8 h-8 rounded-full" alt="" />
                                <div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">{leader.full_name}</p>
                                  <p className="text-[9px] text-nexus-blue">Team Leader</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">{t('ofc_unassigned')}</p>
                            )}
                          </div>

                          {/* Members / Juniors */}
                          <div>
                            <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2">{t('ofc_agents_juniors')} ({members.length})</p>
                            <div className="flex flex-col gap-2">
                              {members.map(m => (
                                <div key={m.id} className="flex items-center gap-2">
                                  <img src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=5a82bf&color=fff`} className="w-6 h-6 rounded-full" alt="" />
                                  <p className="text-[11px] text-slate-700 dark:text-slate-300">{m.full_name}</p>
                                </div>
                              ))}
                              {members.length === 0 && <p className="text-[10px] text-slate-400 italic">{t('ofc_no_agents')}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
          </>
          )}

        </div>
      </div>

      {/* ═══ MANUAL ASSIGN/INVITE MODAL ═══ */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-8 space-y-6"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-xl font-black italic text-slate-900 dark:text-white">{t('ofc_manual_assign')}</h3>
              <p className="text-xs text-slate-400 mt-1">{t('ofc_manual_assign_desc')}</p>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('ofc_manual_fullname')}</label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={inviteForm.full_name}
                onChange={e => setInviteForm(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('ofc_manual_email')}</label>
              <input
                type="email"
                placeholder="correo@remax-altitud.cr"
                value={inviteForm.email}
                onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('ofc_manual_role')}</label>
              <div className="flex gap-2">
                {[
                  { key: 'agent', label: t('ofc_role_junior') },
                  { key: 'team_leader', label: t('ofc_role_leader') },
                  { key: 'broker', label: t('ofc_role_admin') },
                ].map(r => (
                  <button
                    key={r.key}
                    onClick={() => setInviteForm(prev => ({ ...prev, role: r.key }))}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      inviteForm.role === r.key
                        ? 'bg-nexus-blue text-white border-nexus-blue'
                        : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {inviteForm.role !== 'broker' && (
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('ofc_manual_team')}</label>
                <select
                  value={inviteForm.team_id}
                  onChange={e => setInviteForm(prev => ({ ...prev, team_id: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('ofc_manual_no_team')}</option>
                  {teams.filter(team => team.office === selectedOffice).map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t('ofc_manual_cancel')}
              </button>
              <button
                onClick={handleManualInvite}
                disabled={!inviteForm.email || !inviteForm.full_name || inviting}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-nexus-blue text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {inviting ? t('ofc_manual_processing') : t('ofc_manual_create')}
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

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('ofc_manual_role')}</label>
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
                    {r === 'agent' ? t('ofc_role_junior') : t('ofc_role_leader')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('ofc_manual_team')}</label>
              <select
                value={editingProfile.team_id || ''}
                onChange={e => handleUpdateProfile(editingProfile.id, { team_id: e.target.value || null })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('ofc_manual_no_team')}</option>
                {teams.filter(team => team.office === selectedOffice).map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setEditingProfile(null)}
              className="w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
            >
              {t('ofc_done')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
