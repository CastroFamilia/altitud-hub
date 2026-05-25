"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import TopNav from '@/components/layout/TopNav';
import Image from 'next/image';
import Link from 'next/link';

export default function LiderClient({
  currentProfile,
  initialProfiles,
  initialTeams,
  initialOkrEntries,
  initialProperties,
  initialSyndications,
  initialReservations,
  initialCommissions
}) {
  const { t, lang } = useApp();
  const { isBroker } = useAuth();
  
  // Custom translation helper
  const tLocal = (key, fallback) => {
    const val = t(key);
    return val && val !== key ? val : fallback;
  };

  // --- Date & Period Filters ---
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'ytd'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'members' | 'okr' | 'portfolio' | 'deals'

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // --- Authorization & Team Logic ---
  const userRole = currentProfile?.role || 'agent';
  const isAuthorized = ['team_leader', 'broker', 'admin'].includes(userRole);

  // If user is a team leader, identify the team they lead
  const ledTeam = useMemo(() => {
    return initialTeams.find(t => t.leader_id === currentProfile?.id) || 
           initialTeams.find(t => t.id === currentProfile?.team_id);
  }, [initialTeams, currentProfile]);

  // Selected Team State (Brokers can select any team, leaders are locked)
  const [selectedTeamId, setSelectedTeamId] = useState(
    isBroker ? (initialTeams[0]?.id || '') : (ledTeam?.id || '')
  );

  const activeTeam = useMemo(() => {
    return initialTeams.find(t => t.id === selectedTeamId);
  }, [initialTeams, selectedTeamId]);

  // Profiles belonging to the active team
  const teamMembers = useMemo(() => {
    if (!selectedTeamId) return [];
    return initialProfiles.filter(p => p.team_id === selectedTeamId);
  }, [initialProfiles, selectedTeamId]);

  const teamMemberIds = useMemo(() => teamMembers.map(m => m.id), [teamMembers]);
  const teamMemberAuthUserIds = useMemo(() => teamMembers.map(m => m.auth_user_id).filter(Boolean), [teamMembers]);

  // --- OKRs Filtered for Active Team ---
  const teamOkrEntries = useMemo(() => {
    return initialOkrEntries.filter(entry => teamMemberIds.includes(entry.profile_id));
  }, [initialOkrEntries, teamMemberIds]);

  // --- Properties Filtered for Active Team ---
  const teamProperties = useMemo(() => {
    return initialProperties.map(p => {
      // Map syndication portal statuses
      const syncs = initialSyndications.filter(s => s.property_id === p.id);
      return {
        ...p,
        main_image_url: p.property_images?.sort((a, b) => a.priority - b.priority)?.[0]?.image_url || null,
        image_count: p.property_images?.length || 0,
        portal_links: syncs
          .filter(s => s.status === 'synced' && s.portal_listing_url)
          .map(s => ({ name: s.portal_name, url: s.portal_listing_url })),
        syndication: syncs
      };
    }).filter(p => teamMemberAuthUserIds.includes(p.agent_id));
  }, [initialProperties, initialSyndications, teamMemberAuthUserIds]);

  // --- Reservations / Deals Filtered for Active Team ---
  const teamReservations = useMemo(() => {
    return initialReservations.filter(r => teamMemberIds.includes(r.profile_id));
  }, [initialReservations, teamMemberIds]);

  // --- Commissions Filtered for Active Team ---
  const teamCommissions = useMemo(() => {
    return initialCommissions.filter(c => teamMemberIds.includes(c.agent_id));
  }, [initialCommissions, teamMemberIds]);

  // --- METRICS CALCULATION (Filtered by Period) ---
  const stats = useMemo(() => {
    const defaultStats = () => ({
      llamadas: 0, prelistings: 0, acm: 0, exclusivas: 0, no_exclusivas: 0,
      totales: 0, consultas: 0, muestras: 0, reservas: 0, cierres: 0, facturacion: 0
    });

    const monthly = defaultStats();
    const ytd = defaultStats();

    // Sum OKR activities
    teamOkrEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      const eYear = entryDate.getFullYear();
      const eMonth = entryDate.getMonth() + 1;

      if (eYear === selectedYear) {
        ytd.llamadas += entry.llamadas || 0;
        ytd.prelistings += entry.prelistings || 0;
        ytd.acm += entry.acm || 0;
        ytd.exclusivas += entry.captaciones || 0;
        ytd.no_exclusivas += entry.listings || 0;
        ytd.totales += (entry.captaciones || 0) + (entry.listings || 0);
        ytd.consultas += entry.consultas || 0;
        ytd.muestras += entry.muestras || 0;
        ytd.reservas += entry.reservas || 0;
        ytd.cierres += entry.cierres || 0;

        if (eMonth === selectedMonth) {
          monthly.llamadas += entry.llamadas || 0;
          monthly.prelistings += entry.prelistings || 0;
          monthly.acm += entry.acm || 0;
          monthly.exclusivas += entry.captaciones || 0;
          monthly.no_exclusivas += entry.listings || 0;
          monthly.totales += (entry.captaciones || 0) + (entry.listings || 0);
          monthly.consultas += entry.consultas || 0;
          monthly.muestras += entry.muestras || 0;
          monthly.reservas += entry.reservas || 0;
          monthly.cierres += entry.cierres || 0;
        }
      }
    });

    // Sum commissions
    teamCommissions.forEach(c => {
      if (c.closing_date) {
        const cDate = new Date(c.closing_date);
        const cYear = cDate.getFullYear();
        const cMonth = cDate.getMonth() + 1;

        if (cYear === selectedYear) {
          ytd.facturacion += c.gross_commission || 0;

          if (cMonth === selectedMonth) {
            monthly.facturacion += c.gross_commission || 0;
          }
        }
      }
    });

    return { monthly, ytd };
  }, [teamOkrEntries, teamCommissions, selectedMonth, selectedYear]);

  const activeStats = viewMode === 'ytd' ? stats.ytd : stats.monthly;

  // --- INDIVIDUAL AGENT RANKINGS & TABLE DATA ---
  const agentRankingList = useMemo(() => {
    const createTemplate = () => ({
      llamadas: 0, prelistings: 0, acm: 0, exclusivas: 0, no_exclusivas: 0,
      totales: 0, consultas: 0, muestras: 0, reservas: 0, cierres: 0, facturacion: 0
    });

    const map = {};
    teamMembers.forEach(m => {
      map[m.id] = {
        profile: m,
        monthly: createTemplate(),
        ytd: createTemplate()
      };
    });

    // Sum OKR activities per agent
    teamOkrEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      const eYear = entryDate.getFullYear();
      const eMonth = entryDate.getMonth() + 1;
      const ag = map[entry.profile_id];

      if (eYear === selectedYear && ag) {
        ag.ytd.llamadas += entry.llamadas || 0;
        ag.ytd.prelistings += entry.prelistings || 0;
        ag.ytd.acm += entry.acm || 0;
        ag.ytd.exclusivas += entry.captaciones || 0;
        ag.ytd.no_exclusivas += entry.listings || 0;
        ag.ytd.totales += (entry.captaciones || 0) + (entry.listings || 0);
        ag.ytd.consultas += entry.consultas || 0;
        ag.ytd.muestras += entry.muestras || 0;
        ag.ytd.reservas += entry.reservas || 0;
        ag.ytd.cierres += entry.cierres || 0;

        if (eMonth === selectedMonth) {
          ag.monthly.llamadas += entry.llamadas || 0;
          ag.monthly.prelistings += entry.prelistings || 0;
          ag.monthly.acm += entry.acm || 0;
          ag.monthly.exclusivas += entry.captaciones || 0;
          ag.monthly.no_exclusivas += entry.listings || 0;
          ag.monthly.totales += (entry.captaciones || 0) + (entry.listings || 0);
          ag.monthly.consultas += entry.consultas || 0;
          ag.monthly.muestras += entry.muestras || 0;
          ag.monthly.reservas += entry.reservas || 0;
          ag.monthly.cierres += entry.cierres || 0;
        }
      }
    });

    // Sum commissions per agent
    teamCommissions.forEach(c => {
      if (c.closing_date && map[c.agent_id]) {
        const cDate = new Date(c.closing_date);
        const cYear = cDate.getFullYear();
        const cMonth = cDate.getMonth() + 1;
        const ag = map[c.agent_id];

        if (cYear === selectedYear) {
          ag.ytd.facturacion += c.gross_commission || 0;

          if (cMonth === selectedMonth) {
            ag.monthly.facturacion += c.gross_commission || 0;
          }
        }
      }
    });

    return Object.values(map);
  }, [teamMembers, teamOkrEntries, teamCommissions, selectedMonth, selectedYear]);

  // Sort agents by closed deals (cierres) or billings (facturacion) for gamification leaderboard
  const leaderboard = useMemo(() => {
    return [...agentRankingList].sort((a, b) => {
      const srcA = viewMode === 'ytd' ? a.ytd : a.monthly;
      const srcB = viewMode === 'ytd' ? b.ytd : b.monthly;
      // Primary sort by closings, secondary by volume
      if (srcB.cierres !== srcA.cierres) return srcB.cierres - srcA.cierres;
      return srcB.facturacion - srcA.facturacion;
    });
  }, [agentRankingList, viewMode]);

  // --- WHATSAPP PRE-FILLED TEMPLATE ACTIONS ---
  const sendWhatsAppCheckin = (member) => {
    const text = `Hola ${member.full_name}, espero que todo vaya excelente hoy. Estuve revisando tu plan de actividades en el panel de Altitud Hub. ¿Cómo va tu semana con las llamadas y captaciones? Avísame si necesitas apoyo para cerrar algún negocio o firmar una exclusiva. ¡Abrazo!`;
    const encodedText = encodeURIComponent(text);
    const phone = member.phone ? member.phone.replace(/[^0-9]/g, '') : '';
    window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
  };

  // --- CSV EXPORTER ---
  const exportOkrCSV = () => {
    const headers = [
      "Agente", "Split", "Llamadas", "Prelistings", "ACM", 
      "Exclusivas", "No Exclusivas", "Totales", "Muestras", "Reservas", "Cierres", "Facturacion"
    ];
    
    const rows = agentRankingList.map(ag => {
      const src = viewMode === 'ytd' ? ag.ytd : ag.monthly;
      return [
        ag.profile.full_name,
        ag.profile.commission_split || '45/55',
        src.llamadas,
        src.prelistings,
        src.acm,
        src.exclusivas,
        src.no_exclusivas,
        src.totales,
        src.muestras,
        src.reservas,
        src.cierres,
        `$${src.facturacion}`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `okr_equipo_${activeTeam?.name || 'mi_equipo'}_${viewMode}_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render unauthorized view ---
  if (!isAuthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 text-center min-h-screen">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mb-6 text-red-600 dark:text-red-400">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black italic text-slate-950 dark:text-white mb-2">Acceso No Autorizado</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm mb-6">El Panel del Team Leader está reservado para líderes de equipo configurados y directivos de la oficina.</p>
        <Link href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-indigo-500/20">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <>
      <TopNav title="PANEL TEAM LEADER" subtitle={`Gestión, analíticas y conversión del equipo: ${activeTeam?.name || 'Mi Equipo'}`} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 transition-colors duration-200 pt-20 lg:pt-8 w-full">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── STUNNING GLASS CONTROLS PANEL ── */}
          <div className="glass-panel p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Tab selector */}
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 flex-wrap gap-1">
              {[
                { id: 'overview', label: 'Vista General' },
                { id: 'members', label: 'Miembros' },
                { id: 'okr', label: 'Métricas OKR' },
                { id: 'portfolio', label: 'Propiedades' },
                { id: 'deals', label: 'Cierres (Pipeline)' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                    activeTab === t.id 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Selector de Periodo y Selector de Equipo */}
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Dynamic Team Selector for Brokers */}
              {isBroker && (
                <div className="flex flex-col">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">🏢 Seleccionar Equipo</label>
                  <select 
                    value={selectedTeamId} 
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="bg-white dark:bg-slate-800 px-4 py-2 text-xs font-black rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 text-brand-600 dark:text-white"
                  >
                    {initialTeams.map(t => (
                      <option key={t.id} value={t.id}>TEAM: {t.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* View Mode Toggle: Mensual vs YTD */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Tipo de Vista</label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button onClick={() => setViewMode('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${viewMode === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-slate-950 dark:text-gray-400 dark:hover:text-white'}`}>
                    Mensual
                  </button>
                  <button onClick={() => setViewMode('ytd')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${viewMode === 'ytd' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-slate-950 dark:text-gray-400 dark:hover:text-white'}`}>
                    YTD Acum.
                  </button>
                </div>
              </div>

              {/* Month Dropdown (disabled in YTD view) */}
              <div className={`flex flex-col transition-opacity duration-200 ${viewMode === 'ytd' ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Mes</label>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500">
                  {monthNames.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Año</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500">
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              TAB 1: VISTA GENERAL (KPI CARDS & CONVERSION EMBUDO)
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* KPIs Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                
                {[
                  { label: 'Llamadas Realizadas', val: activeStats.llamadas, icon: '📞', color: 'border-blue-500/35 bg-blue-500/5' },
                  { label: 'Pre-listings Generados', val: activeStats.prelistings, icon: '📄', color: 'border-indigo-500/35 bg-indigo-500/5' },
                  { label: 'Informes ACM (CMA)', val: activeStats.acm, icon: '📊', color: 'border-purple-500/35 bg-purple-500/5' },
                  { label: 'Exclusivas Captadas', val: activeStats.exclusivas, icon: '🔒', color: 'border-pink-500/35 bg-pink-500/5' },
                  { label: 'Cierres de Ventas', val: activeStats.cierres, icon: '🤝', color: 'border-emerald-500/35 bg-emerald-500/5' },
                  { label: 'Comisión Facturada', val: `$${activeStats.facturacion.toLocaleString()}`, icon: '💰', color: 'border-amber-500/35 bg-amber-500/5 text-amber-500' }
                ].map((kpi, idx) => (
                  <div key={idx} className={`glass-panel border p-5 rounded-[22px] shadow flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${kpi.color}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{kpi.icon}</span>
                      <span className="text-[9px] uppercase font-black bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400">
                        {viewMode === 'ytd' ? 'YTD' : 'MES'}
                      </span>
                    </div>
                    <div className="mt-4">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider leading-none">{kpi.label}</p>
                      <p className="text-xl font-black tracking-tight text-slate-950 dark:text-white mt-1.5">{kpi.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Embudo de Conversión & Leaderboard Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Visual Conversion Funnel */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 shadow-xl">
                  <div className="mb-4">
                    <h3 className="text-base font-black italic tracking-wide text-indigo-600 dark:text-indigo-400 uppercase">Embudo de Conversión del Equipo</h3>
                    <p className="text-xs text-slate-450 mt-0.5">Tasas de conversión y pasos de actividad de tu equipo para cerrar propiedades.</p>
                  </div>

                  <div className="flex flex-col gap-3 mt-6">
                    {[
                      { label: 'Llamadas de Prospección', count: activeStats.llamadas, color: 'bg-gradient-to-r from-blue-600 to-blue-500', width: 'w-full' },
                      { label: 'Presentaciones Pre-listing', count: activeStats.prelistings, color: 'bg-gradient-to-r from-indigo-600 to-indigo-500', width: 'w-[85%]', conv: activeStats.llamadas ? `${Math.round((activeStats.prelistings / activeStats.llamadas) * 100)}%` : '0%' },
                      { label: 'Comparativos del Mercado (ACM)', count: activeStats.acm, color: 'bg-gradient-to-r from-purple-600 to-purple-500', width: 'w-[70%]', conv: activeStats.prelistings ? `${Math.round((activeStats.acm / activeStats.prelistings) * 100)}%` : '0%' },
                      { label: 'Propiedades Captadas (Exclusivas)', count: activeStats.exclusivas, color: 'bg-gradient-to-r from-pink-600 to-pink-500', width: 'w-[55%]', conv: activeStats.acm ? `${Math.round((activeStats.exclusivas / activeStats.acm) * 100)}%` : '0%' },
                      { label: 'Visitas y Muestras', count: activeStats.muestras, color: 'bg-gradient-to-r from-rose-600 to-rose-500', width: 'w-[40%]', conv: activeStats.exclusivas ? `${Math.round((activeStats.muestras / activeStats.exclusivas) * 100)}%` : '0%' },
                      { label: 'Reservas y Cierres de Trato', count: activeStats.cierres, color: 'bg-gradient-to-r from-emerald-600 to-emerald-500', width: 'w-[25%]', conv: activeStats.muestras ? `${Math.round((activeStats.cierres / activeStats.muestras) * 100)}%` : '0%' }
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="w-40 text-[10px] font-black uppercase text-slate-450 tracking-wider text-right">{step.label}</div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-8 flex overflow-hidden shadow-inner relative border border-slate-200/30 dark:border-slate-800">
                          <div className={`h-full ${step.color} rounded-full flex items-center pl-4 transition-all duration-700 ease-out`} style={{ width: step.count ? step.width.replace('w-[', '').replace('%]', '') + '%' : '4%' }}>
                            <span className="text-[10px] font-black text-white">{step.count}</span>
                          </div>
                          {step.conv && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              Ratio: {step.conv}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Gamified Leaderboard */}
                <div className="lg:col-span-1 bg-gradient-to-br from-indigo-950 to-slate-900 border border-slate-200/10 dark:border-slate-800 rounded-[28px] p-6 shadow-2xl text-white">
                  <div className="mb-4">
                    <h3 className="text-base font-black italic tracking-wide uppercase text-indigo-300">🏆 Podio de Rendimiento</h3>
                    <p className="text-xs text-indigo-200/80 mt-0.5">Ranking de asesores del equipo según cierres y facturación en el período.</p>
                  </div>

                  <div className="mt-6 space-y-4">
                    {leaderboard.slice(0, 3).map((agent, index) => {
                      const places = [
                        { color: 'border-yellow-400 bg-yellow-400/10 text-yellow-400', badge: '🥇' },
                        { color: 'border-slate-300 bg-slate-300/10 text-slate-300', badge: '🥈' },
                        { color: 'border-amber-600 bg-amber-600/10 text-amber-600', badge: '🥉' }
                      ];
                      const currentPlace = places[index] || { color: 'border-slate-600 bg-slate-600/10 text-slate-400', badge: `${index + 1}º` };
                      const agStats = viewMode === 'ytd' ? agent.ytd : agent.monthly;

                      return (
                        <div key={agent.profile.id} className={`flex items-center gap-3 p-3 border rounded-2xl ${currentPlace.color} transition-all hover:scale-[1.02]`}>
                          <span className="text-2xl font-black">{currentPlace.badge}</span>
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 relative">
                            <Image 
                              src={agent.profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.profile.full_name)}&background=5a82bf&color=fff`} 
                              alt="Avatar" 
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate text-white">{agent.profile.full_name.toUpperCase()}</p>
                            <p className="text-[9px] text-indigo-200 uppercase tracking-widest mt-0.5">
                              {agStats.cierres} Cierres • ${agStats.facturacion.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {leaderboard.length === 0 && (
                      <div className="text-center text-xs py-8 text-indigo-200/50">No hay asesores asignados a este equipo.</div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 2: MIEMBROS DE EQUIPO (DETAILED GRID & COMMUNICATIONS)
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'members' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black italic tracking-wide text-slate-950 dark:text-white uppercase">Asesores del Equipo</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Miembros vinculados al equipo {activeTeam?.name}.</p>
                </div>
                <div className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">
                  Total: {teamMembers.length} Asesores
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamMembers.map(member => (
                  <div key={member.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                    
                    {/* Header: avatar + name */}
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-500 relative flex-shrink-0">
                        <Image 
                          src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=5a82bf&color=fff`} 
                          alt={member.full_name} 
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest leading-none ${
                          member.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-amber-100 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}>
                          {member.status === 'active' ? 'Activo' : 'Invitado'}
                        </span>
                        <h4 className="text-sm font-black text-slate-950 dark:text-white truncate uppercase tracking-tight mt-1">{member.full_name}</h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{member.email}</p>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="grid grid-cols-2 gap-4 my-6 p-4 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block leading-none">Comisión Split</span>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 block">{member.commission_split || '45/55'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block leading-none">Fecha de Ingreso</span>
                        <span className="text-xs font-black text-slate-700 dark:text-white mt-1 block">
                          {member.start_date ? new Date(member.start_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => sendWhatsAppCheckin(member)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
                      >
                        💬 WhatsApp
                      </button>
                      <a
                        href={`mailto:${member.email}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-95 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 dark:border-slate-700"
                      >
                        ✉️ Correo
                      </a>
                    </div>

                  </div>
                ))}

                {teamMembers.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-400">Este equipo no tiene asesores asignados actualmente.</div>
                )}
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 3: RENDIMIENTO OKR DEL EQUIPO (LEADERBOARD & EXPORTS)
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'okr' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-black italic tracking-wide text-slate-950 dark:text-white uppercase">Métricas de Actividad OKR</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Registro de llamadas, prelistings, muestras, exclusivas y cierres por asesor.</p>
                </div>
                <button
                  onClick={exportOkrCSV}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md w-full sm:w-auto"
                >
                  📥 Exportar CSV
                </button>
              </div>

              {/* Leaderboard Grid */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Agente</th>
                        <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">📞 Llamadas</th>
                        <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">📄 Prelistings</th>
                        <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">📊 ACM</th>
                        <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">🔒 Exclusivas</th>
                        <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">🏠 No Excl.</th>
                        <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">👀 Muestras</th>
                        <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">📝 Reservas</th>
                        <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">🤝 Cierres</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">💰 Facturación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {agentRankingList.map(ag => {
                        const agStats = viewMode === 'ytd' ? ag.ytd : ag.monthly;
                        return (
                          <tr key={ag.profile.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 relative flex-shrink-0">
                                <Image 
                                  src={ag.profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(ag.profile.full_name)}&background=5a82bf&color=fff`} 
                                  alt="Avatar" 
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-850 dark:text-white uppercase truncate">{ag.profile.full_name}</p>
                                <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                                  Split: {ag.profile.commission_split || '45/55'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs font-black text-slate-700 dark:text-slate-300 text-center">{agStats.llamadas}</td>
                            <td className="px-4 py-4 text-xs font-black text-slate-700 dark:text-slate-300 text-center">{agStats.prelistings}</td>
                            <td className="px-4 py-4 text-xs font-black text-slate-700 dark:text-slate-300 text-center">{agStats.acm}</td>
                            <td className="px-4 py-4 text-xs font-black text-emerald-600 dark:text-emerald-400 text-center">{agStats.exclusivas}</td>
                            <td className="px-4 py-4 text-xs font-black text-slate-700 dark:text-slate-300 text-center">{agStats.no_exclusivas}</td>
                            <td className="px-4 py-4 text-xs font-black text-slate-700 dark:text-slate-300 text-center">{agStats.muestras}</td>
                            <td className="px-4 py-4 text-xs font-black text-purple-600 dark:text-purple-400 text-center">{agStats.reservas}</td>
                            <td className="px-4 py-4 text-xs font-black text-indigo-600 dark:text-indigo-400 text-center">{agStats.cierres}</td>
                            <td className="px-6 py-4 text-xs font-black text-slate-900 dark:text-white text-right font-mono">${agStats.facturacion.toLocaleString()}</td>
                          </tr>
                        );
                      })}

                      {agentRankingList.length === 0 && (
                        <tr>
                          <td colSpan="10" className="px-6 py-12 text-center text-xs text-slate-400">Este equipo no tiene asesores o no se encontraron actividades registradas.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 4: PORTAFOLIO PROPIEDADES DE EQUIPO & PORTALES
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black italic tracking-wide text-slate-950 dark:text-white uppercase">Portafolio del Equipo</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Propiedades captadas por los asesores del equipo y su estado de aprobación / sindicación.</p>
                </div>
                <div className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">
                  Total: {teamProperties.length} Propiedades
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamProperties.map(property => {
                  const statusColors = {
                    draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                    pending_approval: 'bg-amber-100 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 animate-pulse border border-amber-500/20',
                    needs_changes: 'bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400',
                    approved: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400',
                    published: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 font-bold'
                  }[property.status] || 'bg-slate-100 text-slate-600';

                  const agentProfile = teamMembers.find(m => m.auth_user_id === property.agent_id);

                  return (
                    <div key={property.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                      
                      {/* Property Image Banner */}
                      <div className="h-44 relative bg-slate-200 dark:bg-slate-800 flex-shrink-0">
                        {property.main_image_url ? (
                          <Image 
                            src={property.main_image_url} 
                            alt={property.name} 
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-black uppercase tracking-wider">
                            Sin Fotos
                          </div>
                        )}
                        <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${statusColors}`}>
                          {property.status.replace('_', ' ')}
                        </span>
                        
                        {property.list_price && (
                          <span className="absolute bottom-3 right-3 px-3 py-1.5 bg-slate-950/80 backdrop-blur-md rounded-xl text-[10px] font-black text-white">
                            ${property.list_price.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Info & Agent Meta */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">
                            {property.listing_title_es || property.name || 'Propiedad sin Título'}
                          </h4>
                          <p className="text-[10px] text-slate-400 leading-tight line-clamp-1 flex items-center gap-1">
                            📍 {property.unparsed_address || 'Dirección no configurada'}
                          </p>
                        </div>

                        {/* Syndication status badge */}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-2">Sindicalización Portal Feeds</span>
                          <div className="flex gap-2 flex-wrap">
                            {property.portal_links.map(link => (
                              <a
                                key={link.name}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors border border-indigo-200/20"
                              >
                                🌐 {link.name}
                              </a>
                            ))}
                            {property.portal_links.length === 0 && (
                              <span className="text-[9px] text-slate-400 font-medium">Sin portales activos (Falta aprobación o sincronización)</span>
                            )}
                          </div>
                        </div>

                        {/* Agent footer info */}
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden relative border border-slate-200 dark:border-slate-700">
                            <Image 
                              src={agentProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agentProfile?.full_name || 'Agente')}&background=5a82bf&color=fff`} 
                              alt="Agent Avatar" 
                              fill
                              className="object-cover"
                            />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 truncate">
                            Asesor: {agentProfile?.full_name || 'Desconocido'}
                          </span>
                        </div>

                      </div>

                    </div>
                  );
                })}

                {teamProperties.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-400">No se encontraron propiedades captadas por este equipo.</div>
                )}
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 5: NEGOCIOS Y PIPELINE DE CIERRES (RESERVAS & DUE DILIGENCE)
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'deals' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black italic tracking-wide text-slate-950 dark:text-white uppercase">Pipeline de Cierres de Equipo</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Seguimiento de ofertas, reservas, LOIs y auditoría del proceso de Due Diligence.</p>
                </div>
                <div className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">
                  Activos: {teamReservations.length} Negocios
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamReservations.map(deal => {
                  const stageColors = {
                    reserve: 'border-yellow-500 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400',
                    loi_signed: 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400',
                    due_diligence: 'border-purple-500 bg-purple-500/5 text-purple-600 dark:text-purple-400 animate-pulse',
                    spa_signed: 'border-pink-500 bg-pink-500/5 text-pink-600 dark:text-pink-400',
                    closed: 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold'
                  }[deal.stage] || 'border-slate-200 bg-slate-50 text-slate-600';

                  const agentProfile = teamMembers.find(m => m.id === deal.profile_id);

                  // Calculate Due Diligence progress
                  const ddItems = deal.due_diligence_items || [];
                  const completedDd = ddItems.filter(item => item.completed).length;
                  const totalDd = ddItems.length;
                  const ddProgress = totalDd ? Math.round((completedDd / totalDd) * 100) : 0;

                  return (
                    <div key={deal.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full">
                      
                      <div>
                        {/* Header: client + stage */}
                        <div className="flex justify-between items-start">
                          <span className={`px-2.5 py-1 border rounded-lg text-[9px] font-black uppercase tracking-wider ${stageColors}`}>
                            {deal.stage.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 font-mono">
                            {deal.closing_date ? new Date(deal.closing_date).toLocaleDateString() : 'Sin fecha'}
                          </span>
                        </div>

                        {/* Deal name / details */}
                        <div className="my-4 space-y-1">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Comprador: {deal.buyer_name || 'N/A'}
                          </h4>
                          <p className="text-[10px] text-slate-450 leading-tight">
                            Propiedad: <span className="font-bold text-slate-700 dark:text-slate-300">{deal.property_name || 'Asociada'}</span>
                          </p>
                          <p className="text-[11px] font-bold text-slate-950 dark:text-white mt-2">
                            Precio Venta: <span className="font-black text-indigo-600 dark:text-indigo-400">${deal.sale_price?.toLocaleString() || 'N/A'}</span>
                          </p>
                        </div>

                        {/* Due Diligence Checklist Tracker */}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-400">
                            <span>Auditoría Due Diligence</span>
                            <span>{completedDd}/{totalDd} ({ddProgress}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-200/30 dark:border-slate-800">
                            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${ddProgress}%` }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Agent footer info */}
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden relative border border-slate-200 dark:border-slate-700">
                            <Image 
                              src={agentProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agentProfile?.full_name || 'Agente')}&background=5a82bf&color=fff`} 
                              alt="Agent Avatar" 
                              fill
                              className="object-cover"
                            />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 truncate">
                            Asesor: {agentProfile?.full_name || 'Desconocido'}
                          </span>
                        </div>
                        {agentProfile && (
                          <button
                            onClick={() => sendWhatsAppCheckin(agentProfile)}
                            className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-90 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest"
                            title="Apoyar cierre via WhatsApp"
                          >
                            💬 Apoyar
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}

                {teamReservations.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-400">No se encontraron negocios o reservas activas para este equipo.</div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </>
  );
}
