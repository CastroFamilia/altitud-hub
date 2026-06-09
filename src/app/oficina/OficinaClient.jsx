"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import { getNewsletterSubscribers } from '@/lib/dal/contacts';
import TopNav from '@/components/layout/TopNav';
import { useRouter, useSearchParams } from 'next/navigation';
import PropertyApprovalTab from '@/components/oficina/PropertyApprovalTab';
import OfficePortfolioSection from '@/components/oficina/OfficePortfolioSection';
import ListingVelocityPanel from '@/components/oficina/ListingVelocityPanel';
import LeadManagementTab from '@/components/oficina/LeadManagementTab';
import AgentDataImportTab from '@/components/oficina/AgentDataImportTab';
import CommissionAnalyticsTab from '@/components/oficina/CommissionAnalyticsTab';
import WebsiteAnalyticsTab from '@/components/oficina/WebsiteAnalyticsTab';
import ReferralManagementTab from '@/components/oficina/ReferralManagementTab';
import OfficeFinanceTab from '@/components/oficina/OfficeFinanceTab';
import EstadoCuentaTab from '@/components/oficina/EstadoCuentaTab';
import EventsAttendanceTab from '@/components/oficina/EventsAttendanceTab';
import IntegrationSettingsTab from '@/components/oficina/IntegrationSettingsTab';
import PortalRegistryTab from '@/components/oficina/PortalRegistryTab';
import SyndicationDeskTab from '@/components/oficina/SyndicationDeskTab';
import ReConnectSyncTab from '@/components/oficina/ReConnectSyncTab';
import DashboardTab from '@/components/oficina/DashboardTab';
import OfficePlanTab from '@/components/oficina/OfficePlanTab';
import AgentEditModal from '@/components/oficina/AgentEditModal';
import Image from 'next/image';

/* ═══════════════════════════════════════
   OFFICE PANEL — Broker Admin Dashboard
   ═══════════════════════════════════════ */

export default function OficinaClient({ initialProfiles = [], initialTeams = [], initialMilestones = [], initialInquiries = [], initialLeadSources = [], initialCommunications = [], initialFollowUps = [], initialProperties = [], initialDevelopments = [], initialExpenses = [], initialCategories = [], initialFunds = [], initialTxs = [], initialSalaries = [], initialEvents = [], initialAttendance = [], initialCommissions = [], initialReservations = [], initialSyncLogs = [] }) {
  const { profile, isBroker, supabase } = useAuth();
  const { t, lang } = useApp();
  const router = useRouter();

  // State
  const [selectedOffice, setSelectedOffice] = useState('altitud');
  const [profiles, setProfiles] = useState(initialProfiles);
  const [apiAgents, setApiAgents] = useState([]);
  const [teams, setTeams] = useState(initialTeams);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [finanzasSubTab, setFinanzasSubTab] = useState('gastos');
  const [milestones, setMilestones] = useState(initialMilestones);
  const [events, setEvents] = useState(initialEvents);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [povertyLineVal, setPovertyLineVal] = useState(1000);
  const [savingPovertyLine, setSavingPovertyLine] = useState(false);
  const [splitTiers, setSplitTiers] = useState(['45/55', '60/40', '80/20']);
  const [savingSplits, setSavingSplits] = useState(false);
  const [newSplitAgentPct, setNewSplitAgentPct] = useState('');
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  
  const [inviteForm, setInviteForm] = useState({
    apiAgent: null,
    full_name: '',
    email: '',
    role: 'agent',
    team_id: '',
    team_name: '',
    start_date: '',
    birth_date: '',
    fee_start_date: '',
    monthly_fee: '',
  });
  const [inviting, setInviting] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [showDisabledSection, setShowDisabledSection] = useState(false);

  // Custom Sleek UI Notifications & Dialogs
  const [toast, setToast] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null); // { message: '', onConfirm: () => void }

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4500);
  };

  // Sync state when initial props update on server-side re-render
  useEffect(() => {
    setProfiles(initialProfiles);
  }, [initialProfiles]);

  useEffect(() => {
    setTeams(initialTeams);
  }, [initialTeams]);

  useEffect(() => {
    setMilestones(initialMilestones);
  }, [initialMilestones]);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    setAttendance(initialAttendance);
  }, [initialAttendance]);

  // Redirect unauthorized users to dashboard
  useEffect(() => {
    if (profile) {
      const isAuthorized = isBroker || profile.role === 'office_assistant' || profile.role === 'admin';
      if (!isAuthorized) {
        router.push('/');
      }
    }
  }, [profile, isBroker, router]);


  // Fetch API agents when office changes
  useEffect(() => {
    const fetchApiAgents = async () => {
      try {
        const agentsRes = await fetch(`/api/agents-feed?office=${selectedOffice}`);
        const agentsData = await agentsRes.json();
        setApiAgents(agentsData.agents || []);
      } catch (err) {
        console.error('Failed to load API agents', err);
      }
    };
    fetchApiAgents();
  }, [selectedOffice]);

  // Fetch configurations when office changes
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const { data: povertyData, error: povertyError } = await supabase
          .from('office_config')
          .select('config_value')
          .eq('office', selectedOffice)
          .eq('config_key', 'poverty_line')
          .maybeSingle();
        if (!povertyError && povertyData?.config_value?.amount) {
          setPovertyLineVal(Number(povertyData.config_value.amount));
        } else {
          setPovertyLineVal(1000);
        }

        const { data: splitData, error: splitError } = await supabase
          .from('office_config')
          .select('config_value')
          .eq('office', selectedOffice)
          .eq('config_key', 'split_tiers')
          .maybeSingle();
        if (!splitError && splitData?.config_value) {
          setSplitTiers(splitData.config_value);
        } else {
          setSplitTiers(['45/55', '60/40', '80/20']);
        }
      } catch (err) {
        console.error('Failed to load configs:', err);
      }
    };
    fetchConfigs();
  }, [selectedOffice, supabase]);

  const handleSavePovertyLine = async () => {
    setSavingPovertyLine(true);
    try {
      const response = await fetch('/api/office-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          office: selectedOffice,
          config_key: 'poverty_line',
          config_value: { amount: Number(povertyLineVal), currency: 'USD', description: 'Minimum monthly earnings target' }
        })
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to save via API');
      }

      triggerToast('Línea de pobreza guardada con éxito', 'success');
    } catch (err) {
      console.error(err);
      triggerToast('Error al guardar la línea de pobreza: ' + err.message, 'error');
    } finally {
      setSavingPovertyLine(false);
    }
  };

  const handleSaveSplits = async (newSplits) => {
    setSavingSplits(true);
    try {
      const response = await fetch('/api/office-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          office: selectedOffice,
          config_key: 'split_tiers',
          config_value: newSplits
        })
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to save via API');
      }

      setSplitTiers(newSplits);
      triggerToast('Tiers de split comisional guardados con éxito', 'success');
    } catch (err) {
      console.error(err);
      triggerToast('Error al guardar splits: ' + err.message, 'error');
    } finally {
      setSavingSplits(false);
    }
  };

  // Filter profiles by office and search query
  const officeProfiles = profiles.filter(p => p.office === selectedOffice);
  const activeProfiles = officeProfiles.filter(p => p.status === 'active');
  const invitedProfiles = officeProfiles.filter(p => p.status === 'invited');

  // Filter properties by office
  const officeProperties = useMemo(() => {
    return initialProperties.filter(p => {
      const propOffice = p.office_code?.toLowerCase()?.includes('cero') || p.office_code === 'R0700151' ? 'cero' : 'altitud';
      const agentProfile = profiles.find(prof => prof.auth_user_id === p.agent_id);
      const office = agentProfile ? agentProfile.office : propOffice;
      return office === selectedOffice;
    });
  }, [initialProperties, selectedOffice, profiles]);

  const activeAndInvitedProfiles = officeProfiles.filter(p => p.status !== 'disabled');
  const disabledProfiles = officeProfiles.filter(p => p.status === 'disabled');

  const filteredOfficeProfiles = activeAndInvitedProfiles.filter(p => 
    !agentSearchQuery || 
    p.full_name?.toLowerCase().includes(agentSearchQuery.toLowerCase()) || 
    p.email?.toLowerCase().includes(agentSearchQuery.toLowerCase())
  );

  const filteredDisabledProfiles = disabledProfiles.filter(p => 
    !agentSearchQuery || 
    p.full_name?.toLowerCase().includes(agentSearchQuery.toLowerCase()) || 
    p.email?.toLowerCase().includes(agentSearchQuery.toLowerCase())
  );

  // Stats
  const totalAgents = activeAndInvitedProfiles.length;
  const activeCount = activeProfiles.length;
  const teamLeaders = activeAndInvitedProfiles.filter(p => p.role === 'team_leader').length;

  // Handle Quick Approve / Save as Draft
  const handleApproveAgent = async (agent, status = 'invited') => {
    if (!agent.email) {
      triggerToast(t('ofc_agent_no_email'), 'error');
      return;
    }
    
    const isDraft = status === 'draft';
    const confirmMsg = isDraft 
      ? `¿Estás seguro de que deseas guardar a ${agent.name} (${agent.email}) como borrador silencioso?\n\nNo se enviará ningún correo y sus datos quedarán registrados.`
      : t('ofc_confirm_approve').replace('{name}', agent.name).replace('{email}', agent.email);

    setConfirmConfig({
      message: confirmMsg,
      onConfirm: async () => {
        setConfirmConfig(null);
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
              status,
            }),
          });
          const data = await res.json();
          if (data.success) {
            triggerToast(isDraft ? `Agente ${agent.name} guardado como borrador` : `Invitación enviada a ${agent.name}`, 'success');
            router.refresh();
          } else {
            triggerToast(data.error || (isDraft ? 'Error al guardar borrador' : t('ofc_approve_error')), 'error');
          }
        } catch (err) {
          triggerToast('Error: ' + err.message, 'error');
        } finally {
          setInviting(false);
        }
      }
    });
  };

  // Handle Manual Invite
  const handleManualInvite = async (status = 'invited') => {
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
          team_id: inviteForm.role === 'team_leader' ? null : (inviteForm.team_id || null),
          team_name: inviteForm.role === 'team_leader' ? inviteForm.team_name : null,
          remax_agent_id: null,
          remax_agent_name: null,
          office: selectedOffice,
          avatar_url: null,
          phone: null,
          status,
          start_date: inviteForm.start_date || null,
          birth_date: inviteForm.birth_date || null,
          fee_start_date: inviteForm.fee_start_date || null,
          monthly_fee: inviteForm.monthly_fee ? parseFloat(inviteForm.monthly_fee) : 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowInviteModal(false);
        setInviteForm({ apiAgent: null, full_name: '', email: '', role: 'agent', team_id: '', team_name: '', start_date: '', birth_date: '', fee_start_date: '', monthly_fee: '' });
        triggerToast(status === 'draft' ? `Agente guardado como borrador` : `Invitación enviada exitosamente`, 'success');
        router.refresh();
      } else {
        triggerToast(data.error || t('ofc_invite_error'), 'error');
      }
    } catch (err) {
      triggerToast('Error: ' + err.message, 'error');
    } finally {
      setInviting(false);
    }
  };

  // Handle Promote Draft Agent to Invited
  const handleInviteDraftAgent = async (agent) => {
    const confirmMsg = `¿Estás seguro de que deseas enviar la invitación de acceso oficial a ${agent.full_name} (${agent.email})?\n\nEsto enviará el correo electrónico de bienvenida de Supabase.`;
    
    setConfirmConfig({
      message: confirmMsg,
      onConfirm: async () => {
        setConfirmConfig(null);
        setInviting(true);
        try {
          const res = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: agent.email,
              full_name: agent.full_name,
              role: agent.role,
              team_id: agent.team_id || null,
              remax_agent_id: agent.remax_agent_id || null,
              remax_agent_name: agent.remax_agent_name || null,
              office: agent.office,
              avatar_url: agent.avatar_url || null,
              phone: agent.phone || null,
              status: 'invited', // Promote to invited & send email
            }),
          });
          const data = await res.json();
          if (data.success) {
            triggerToast(`¡Invitación oficial enviada exitosamente a ${agent.full_name}!`, 'success');
            router.refresh();
          } else {
            triggerToast(data.error || 'Error al enviar invitación', 'error');
          }
        } catch (err) {
          triggerToast('Error: ' + err.message, 'error');
        } finally {
          setInviting(false);
        }
      }
    });
  };

  // Download Newsletter CSV — all opted-in contacts across the office
  const handleExportNewsletterCSV = async () => {
    setNewsletterLoading(true);
    try {
      const data = await getNewsletterSubscribers(supabase);
      if (!data || data.length === 0) {
        alert('No hay contactos suscritos al newsletter todavía.');
        return;
      }

      const headers = ['Nombre', 'Apellidos', 'Correo', 'Telefono', 'Perfil', 'Idioma'];
      const csvRows = data.map(c => {
        const typeStr = Array.isArray(c.type) ? c.type.join(', ') : (c.type || '');
        return [
          c.first_name || '',
          c.last_name || '',
          c.email || '',
          c.phone || '',
          typeStr,
          c.primary_language || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Newsletter_ALTITUD_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Newsletter export error:', err);
      alert('Error al exportar el newsletter: ' + err.message);
    } finally {
      setNewsletterLoading(false);
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
        triggerToast('Perfil actualizado con éxito', 'success');
        setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ...data.profile } : p));
        router.refresh();
        setEditingProfile(null);
      } else {
        console.error('Update profile error:', data.error);
        triggerToast(data.error || 'Error al actualizar el perfil', 'error');
      }
    } catch (err) {
      console.error('Update error:', err);
      triggerToast('Error al actualizar el perfil: ' + err.message, 'error');
    }
  };

  // Impersonation Handlers
  const handleImpersonate = (agentId) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('impersonated_id', agentId);
      document.cookie = `impersonated_id=${agentId}; path=/; max-age=31536000; SameSite=Lax`;
      window.location.reload(); 
    }
  };

  const handleStopImpersonate = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('impersonated_id');
      document.cookie = 'impersonated_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      window.location.reload();
    }
  };

  const isImpersonating = typeof window !== 'undefined' ? !!localStorage.getItem('impersonated_id') : false;

  // Already-invited agent emails/IDs
  const registeredEmails = new Set(profiles.map(p => p.email.toLowerCase()));
  const registeredIds = new Set(profiles.map(p => p.remax_agent_id).filter(id => id));

  // Filter API agents not yet invited
  const pendingAgents = apiAgents.filter(a => !registeredIds.has(a.id) && !registeredEmails.has(a.email?.toLowerCase()));

  // Block non-broker/assistant access while redirecting
  if (!isBroker && !profile?.role === 'office_assistant') {
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
                { key: 'altitud', label: 'REMAX Altitud' },
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

          {/* ── Tab Navigation removed, moved to sidebar ── */}

          {activeTab === 'referidos' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>🔗</span> {t('ref_title')}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                {t('ref_desc')}
              </p>
              <ReferralManagementTab profiles={profiles} />
            </div>
          ) : activeTab === 'finanzas' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-black italic text-slate-900 dark:text-white flex items-center gap-2">
                    <span>💸</span> {t('ofc_fin_expenses_title') || 'Finanzas Oficina'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Gestión de gastos, rentabilidad y estados de cuenta.
                  </p>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setFinanzasSubTab('gastos')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      finanzasSubTab === 'gastos'
                        ? 'bg-white dark:bg-slate-700 text-nexus-blue shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                    }`}
                  >
                    Gastos de Oficina
                  </button>
                  <button
                    onClick={() => setFinanzasSubTab('estado')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      finanzasSubTab === 'estado'
                        ? 'bg-white dark:bg-slate-700 text-nexus-blue shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                    }`}
                  >
                    Estados de Cuenta
                  </button>
                </div>
              </div>

              {finanzasSubTab === 'gastos' ? (
                <OfficeFinanceTab 
                  expenses={initialExpenses} 
                  categories={initialCategories} 
                  funds={initialFunds} 
                  transactions={initialTxs} 
                  salaries={initialSalaries}
                  profiles={profiles}
                />
              ) : (
                <EstadoCuentaTab />
              )}
            </div>
          ) : activeTab === 'comisiones' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>💰</span> {t('ofc_comm_title')}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                {t('ofc_comm_desc')}
              </p>
              <CommissionAnalyticsTab profiles={profiles} />
            </div>
          ) : activeTab === 'analytics' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>📊</span> {t('ofc_wa_title')}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                {t('ofc_wa_desc')}
              </p>
              <WebsiteAnalyticsTab properties={initialProperties} developments={initialDevelopments} />
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
          ) : activeTab === 'eventos' ? (
            <EventsAttendanceTab 
              events={events} 
              attendance={attendance} 
              profiles={profiles} 
              setEvents={setEvents} 
              setAttendance={setAttendance} 
            />
          ) : activeTab === 'leads' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>📩</span> {t('ofc_leads_title')}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                {t('ofc_leads_desc')}
              </p>
              <LeadManagementTab profiles={profiles} initialLeads={initialInquiries} initialSources={initialLeadSources} initialCommunications={initialCommunications} initialFollowUps={initialFollowUps} properties={initialProperties} />
            </div>
          ) : activeTab === 'importar' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <AgentDataImportTab profiles={profiles} />
            </div>
          ) : activeTab === 'propiedades' ? (
            <div className="space-y-8">
              {/* Portfolio Intelligence — same view agents see but for all office properties */}
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
                <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📊</span> {t('auto_office_portfolio')}
                </h3>
                <OfficePortfolioSection properties={officeProperties} profiles={profiles} lang={lang} />
              </div>
              {/* Approval Workflow */}
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
                <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4">{t('ofc_property_approval')}</h3>
                <PropertyApprovalTab selectedOffice={selectedOffice} />
              </div>
            </div>
          ) : activeTab === 'integraciones' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <IntegrationSettingsTab officeId={selectedOffice} />
            </div>
          ) : activeTab === 'portales' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <PortalRegistryTab />
            </div>
          ) : activeTab === 'syndication' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <SyndicationDeskTab properties={initialProperties} profiles={profiles} />
            </div>
          ) : activeTab === 'reconnect-sync' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <ReConnectSyncTab properties={initialProperties} profiles={profiles} syncLogs={initialSyncLogs} />
            </div>
          ) : activeTab === 'newsletter' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6 lg:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-700 pb-6 mb-6">
                <div>
                  <h3 className="text-xl font-black italic text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📩</span> Newsletter de la Oficina
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">
                    Exporta la lista de contactos suscritos a campañas y boletines informativos.
                  </p>
                </div>
              </div>
              <div className="max-w-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/30 rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Exportar Suscriptores</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Genera un archivo CSV con todos los contactos de la oficina que tienen activa la opción de recibir el boletín de noticias de REMAX ALTITUD.
                  </p>
                </div>
                <button
                  id="btn-download-newsletter-tab"
                  onClick={handleExportNewsletterCSV}
                  disabled={newsletterLoading}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                >
                  {newsletterLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      Generando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Descargar CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : activeTab === 'equipo' ? (
            <div className="space-y-8">
              {/* ── Impersonation Bar ── */}
              {isBroker && (
                <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-4 shadow-lg border border-purple-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎭</span>
                    <div>
                      <h3 className="text-sm font-black italic text-white">{t('ofc_impersonate_mode')}</h3>
                      <p className="text-[10px] text-purple-200">{t('ofc_impersonate_desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select 
                      className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onChange={(e) => {
                        if(e.target.value) handleImpersonate(e.target.value);
                      }}
                      value={typeof window !== 'undefined' ? localStorage.getItem('impersonated_id') || "" : ""}
                    >
                      <option value="" disabled className="text-slate-900">Seleccionar Agente...</option>
                      {officeProfiles.filter(p => p.role !== 'broker').map(p => (
                        <option key={p.id} value={p.id} className="text-slate-900">{p.full_name}</option>
                      ))}
                    </select>
                    {isImpersonating && (
                      <button 
                        onClick={handleStopImpersonate}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
                      >
                        Detener
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                          <Image src={agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=f59e0b&color=fff`}
                            alt={agent.name}
                            className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-600 object-cover" width={40} height={40} />
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{agent.name}</p>
                            <p className="text-[10px] text-slate-400">{agent.email || t('ofc_no_email_label')}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveAgent(agent, 'draft')}
                            disabled={inviting || !agent.email}
                            className="bg-slate-500 dark:bg-slate-700 hover:bg-slate-600 dark:hover:bg-slate-600 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-1"
                            title="Guardar silenciosamente sin invitar"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                            Borrador
                          </button>
                          <button
                            onClick={() => handleApproveAgent(agent, 'invited')}
                            disabled={inviting || !agent.email}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5m0 0L12 12.75l-2.25 1.75m4.5 0L12 12.75"></path></svg>
                            {t('ofc_approve')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Roster de Agentes */}
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white">{t('ofc_registered_roster')}</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">
                      {t('ofc_all_members')}
                    </p>
                  </div>
                  
                  <div className="flex flex-1 max-w-sm w-full gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar agente..."
                        value={agentSearchQuery}
                        onChange={(e) => setAgentSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue transition-all"
                      />
                    </div>
                    
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t('ofc_manual_assign')}
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[600px] overflow-y-auto">
                  {filteredOfficeProfiles.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs uppercase tracking-widest font-bold">
                      No se encontraron agentes
                    </div>
                  ) : filteredOfficeProfiles.map(p => (
                    <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                      <Image src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=5a82bf&color=fff`}
                        alt={p.full_name}
                        className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-600 object-cover" width={40} height={40} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.full_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                        p.role === 'broker' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                        : p.role === 'team_leader' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : p.role === 'agent' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {p.role === 'broker' ? t('ofc_role_admin') 
                          : p.role === 'team_leader' ? t('ofc_role_leader') 
                          : p.role === 'agent' ? t('ofc_role_agent') 
                          : t('ofc_role_junior')}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                        p.status === 'active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : p.status === 'invited' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                        : p.status === 'disabled' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {p.status === 'active' ? 'Activo' 
                         : p.status === 'invited' ? 'Invitado' 
                         : p.status === 'disabled' ? 'Baja' 
                         : 'Borrador'}
                      </span>
                      {p.status === 'draft' && (
                        <button
                          onClick={() => handleInviteDraftAgent(p)}
                          className="bg-nexus-blue hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 transition-all flex items-center gap-1 shrink-0"
                          title="Enviar correo de invitación oficial de Supabase"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5m0 0L12 12.75l-2.25 1.75m4.5 0L12 12.75"></path></svg>
                          Invitar
                        </button>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium w-20 truncate text-right">
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

              {/* Collapsible Section: Agentes Dados de Baja */}
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDisabledSection(!showDisabledSection)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📁</span>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Agentes Dados de Baja
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Agentes inactivos e historial guardado
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-black">
                      {filteredDisabledProfiles.length}
                    </span>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                        showDisabledSection ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {showDisabledSection && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50 border-t border-slate-100 dark:border-slate-700 max-h-[400px] overflow-y-auto">
                    {filteredDisabledProfiles.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs uppercase tracking-widest font-bold">
                        No hay agentes dados de baja
                      </div>
                    ) : (
                      filteredDisabledProfiles.map(p => (
                        <div
                          key={p.id}
                          className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group opacity-75 hover:opacity-100"
                        >
                          <Image
                            src={
                              p.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=64748b&color=fff`
                            }
                            alt={p.full_name}
                            className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-600 object-cover grayscale"
                            width={40}
                            height={40}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-300 truncate line-through">
                              {p.full_name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                          </div>
                          <span
                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                              p.role === 'broker'
                                ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                : p.role === 'team_leader'
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                : p.role === 'agent'
                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {p.role === 'broker'
                              ? t('ofc_role_admin')
                              : p.role === 'team_leader'
                              ? t('ofc_role_leader')
                              : p.role === 'agent'
                              ? t('ofc_role_agent')
                              : t('ofc_role_junior')}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                            Baja
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium w-20 truncate text-right">
                            {p.teams?.name || t('ofc_manual_no_team')}
                          </span>
                          <button
                            onClick={() => setEditingProfile(p)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-nexus-blue transition-all p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* ── Right Column: Teams & Settings ── */}
            <div className="space-y-8">

              {/* ── Configuración de Línea de Pobreza ── */}
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-black italic text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📏</span> Línea de Pobreza
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Monto mensual fijo que los agentes necesitan para sobrevivir.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input 
                      type="number"
                      value={povertyLineVal}
                      onChange={(e) => setPovertyLineVal(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-3 text-lg font-black italic text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
                      placeholder="1000"
                    />
                  </div>
                  <button
                    onClick={handleSavePovertyLine}
                    disabled={savingPovertyLine}
                    className="bg-nexus-blue hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all whitespace-nowrap"
                  >
                    {savingPovertyLine ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>

              {/* ── Configuración de Splits de Comisión ── */}
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-black italic text-slate-900 dark:text-white flex items-center gap-2">
                    <span>⚖️</span> Splits de Comisión
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Define los tiers comisionales disponibles en tu oficina.
                  </p>
                </div>

                <div className="space-y-2">
                  {splitTiers.map(tier => {
                    const agentPct = tier.split('/')[0];
                    return (
                      <div key={tier} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Agentes {agentPct}% <span className="text-[10px] text-slate-400 font-normal">({tier})</span>
                        </span>
                        <button
                          onClick={() => {
                            const updated = splitTiers.filter(t => t !== tier);
                            handleSaveSplits(updated);
                          }}
                          className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 transition-colors p-1"
                          title="Eliminar split"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="relative flex-1">
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={newSplitAgentPct}
                      onChange={(e) => setNewSplitAgentPct(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
                      placeholder="Ej. 70"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">% Agente</span>
                  </div>
                  <button
                    onClick={() => {
                      const pct = Number(newSplitAgentPct);
                      if (isNaN(pct) || pct < 0 || pct > 100 || newSplitAgentPct === '') {
                        triggerToast('Por favor introduce un porcentaje válido entre 0 y 100', 'error');
                        return;
                      }
                      const newSplitStr = `${pct}/${100 - pct}`;
                      if (splitTiers.includes(newSplitStr)) {
                        triggerToast('Este split ya existe', 'error');
                        return;
                      }
                      const updated = [...splitTiers, newSplitStr];
                      updated.sort((a, b) => Number(b.split('/')[0]) - Number(a.split('/')[0]));
                      handleSaveSplits(updated);
                      setNewSplitAgentPct('');
                    }}
                    disabled={savingSplits}
                    className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-950 dark:hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* ── Teams card ── */}
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
                                <Image src={leader.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(leader.full_name)}&background=5a82bf&color=fff`} className="w-8 h-8 rounded-full" alt="" width={32} height={32} />
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
                                  <Image src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=5a82bf&color=fff`} className="w-6 h-6 rounded-full" alt="" width={24} height={24} />
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
          </div>
          ) : (activeTab === 'plan' || activeTab === 'plan-vs-logrado') ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6 lg:p-8">
              <OfficePlanTab 
                t={t}
                profiles={profiles}
                properties={initialProperties}
                reservations={initialReservations}
                commissions={initialCommissions}
                inquiries={initialInquiries}
                communications={initialCommunications}
                selectedOffice={selectedOffice}
                milestones={milestones}
                editMode={activeTab === 'plan'}
                povertyLine={povertyLineVal}
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6 lg:p-8">
               <DashboardTab 
                 profiles={profiles}
                 teams={teams}
                 properties={initialProperties}
                 inquiries={initialInquiries}
                 expenses={initialExpenses}
                 categories={initialCategories}
                 commissions={initialCommissions}
                 reservations={initialReservations}
                 selectedOffice={selectedOffice}
                 loading={loading}
                 povertyLine={povertyLineVal}
               />
            </div>
          )}

        </div>
      </div>

      {/* ═══ MANUAL ASSIGN/INVITE MODAL ═══ */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-8 space-y-6 max-h-[90vh] overflow-y-auto"
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
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'agent', label: t('ofc_role_agent') },
                  { key: 'junior', label: t('ofc_role_junior') },
                  { key: 'team_leader', label: t('ofc_role_leader') },
                  { key: 'broker', label: t('ofc_role_admin') },
                ].map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setInviteForm(prev => ({ ...prev, role: r.key }))}
                    className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
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
                {inviteForm.role === 'team_leader' ? (
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nombre del Equipo que Lidera</label>
                    <input
                      type="text"
                      placeholder="Ej. Equipo Debra"
                      value={inviteForm.team_name || ''}
                      onChange={e => setInviteForm(prev => ({ ...prev, team_name: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      required
                    />
                  </div>
                ) : (
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
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Fecha de Ingreso</label>
                <input
                  type="date"
                  value={inviteForm.start_date}
                  onChange={e => setInviteForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Fecha de Cumpleaños</label>
                <input
                  type="date"
                  value={inviteForm.birth_date}
                  onChange={e => setInviteForm(prev => ({ ...prev, birth_date: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Inicio de Pago de Fee</label>
                <input
                  type="date"
                  value={inviteForm.fee_start_date}
                  onChange={e => setInviteForm(prev => ({ ...prev, fee_start_date: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Monto Fee Mensual ($)</label>
                <input
                  type="number"
                  placeholder="Ej. 150"
                  value={inviteForm.monthly_fee}
                  onChange={e => setInviteForm(prev => ({ ...prev, monthly_fee: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                {t('ofc_manual_cancel')}
              </button>
              <button
                onClick={() => handleManualInvite('draft')}
                disabled={!inviteForm.email || !inviteForm.full_name || inviting}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-slate-500 hover:bg-slate-600 text-white shadow-xl shadow-slate-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                Guardar Borrador
              </button>
              <button
                onClick={() => handleManualInvite('invited')}
                disabled={!inviteForm.email || !inviteForm.full_name || inviting}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-nexus-blue text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5m0 0L12 12.75l-2.25 1.75m4.5 0L12 12.75"></path></svg>
                Invitar Agente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT PROFILE MODAL ═══ */}
      {editingProfile && (
        <AgentEditModal 
          profile={editingProfile}
          profiles={profiles}
          teams={teams}
          selectedOffice={selectedOffice}
          onClose={() => setEditingProfile(null)}
          onUpdateProfile={handleUpdateProfile}
          onOffboardComplete={() => {
            setEditingProfile(null);
            router.refresh();
          }}
          t={t}
          splitTiers={splitTiers}
        />
      )}

      {/* ═══ CUSTOM SLEEK TOAST NOTIFICATION ═══ */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-fade-in transition-all duration-300 max-w-sm border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100">
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
            ) : toast.type === 'error' ? (
              <div className="w-8 h-8 rounded-full bg-red-500/10 dark:bg-red-500/25 flex items-center justify-center text-red-600 dark:text-red-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            )}
            <p className="text-xs font-bold tracking-wide leading-relaxed uppercase">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-auto p-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}

      {/* ═══ CUSTOM PREMIUM CONFIRMATION MODAL ═══ */}
      {confirmConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmConfig(null)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-8 space-y-6 animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{t('ofc_confirm_action')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed font-semibold uppercase tracking-wide px-2">
                {confirmConfig.message}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmConfig(null)}
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmConfig.onConfirm}
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-nexus-blue text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
