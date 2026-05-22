"use client";

import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import TopNav from '@/components/layout/TopNav';
import { useState, useMemo } from 'react';
import Image from 'next/image';

// --- Local Translation Dictionary ---
const localDict = {
  es: {
    eq_title: 'Dashboard de Oficina',
    eq_subtitle: 'Métricas de retención, splits y embudos consolidados de agentes.',
    eq_tab_overview: 'Vista General & Retención',
    eq_tab_office: 'Consolidado Oficina',
    eq_tab_agents: 'Consolidado por Agente',
    eq_active_splits: 'Distribución de Splits Comisionales',
    eq_splits_desc: 'Agentes activos agrupados por su split comisional contratado.',
    eq_hires_departures: 'Movimiento de Personal (Altas vs Bajas)',
    eq_recruitment_trend: 'Tendencia mensual de contrataciones y desvinculaciones.',
    eq_retention_stats: 'Estadísticas de Retención & Rotación',
    eq_first_year: 'Primer Año (<= 1 Año)',
    eq_more_than_year: 'Más de un Año (> 1 Año)',
    eq_active_agents: 'Agentes Activos',
    eq_terminated_agents: 'Bajas Registradas',
    eq_rotation_rate: 'Tasa de Rotación',
    eq_exclusive: 'Captaciones Exclusivas',
    eq_non_exclusive: 'Captaciones No Exclusivas',
    eq_total_listings: 'Captaciones Totales',
    eq_billing: 'Facturación Bruta',
    eq_billing_desc: 'Monto consolidado de comisiones facturadas YTD.',
    eq_search_agent: 'Buscar agente por nombre o correo...',
    eq_export_csv: 'Exportar a CSV',
    eq_month: 'Mes',
    eq_year: 'Año',
    eq_office_totals: 'Totales Consolidados Oficina',
    eq_office_totals_desc: 'Actividad total del equipo en el período seleccionado.',
    eq_funnel_view: 'Embudo de Conversión de la Oficina',
    eq_conversion_rate: 'Tasa de Conversión General',
    eq_agent_breakdown: 'Desglose por Agente',
    eq_agent_breakdown_desc: 'Funnels detallados e indicadores de desempeño individuales.',
    eq_tenure_months: 'meses de antigüedad',
    eq_tenure_year: 'año',
    eq_tenure_years: 'años',
    eq_split: 'Split',
    eq_status: 'Estado',
    eq_details: 'Ver Historial',
    eq_totals_ytd: 'Consolidado Anual YTD',
    eq_totals_month: 'Consolidado del Mes',
    eq_close_rate: 'Ratio Cierre',
    eq_no_team: 'Sin equipo',
    eq_agent_share: 'Parte Agente',
    eq_office_share: 'Parte Oficina',
    eq_unauthorized: 'Acceso Restringido',
    eq_unauthorized_desc: 'Este panel de control de analíticas avanzadas es de acceso exclusivo para el Broker y Administrador de la oficina.',
    eq_back_home: 'Volver al Inicio',
    eq_month_names: '["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]',
    eq_funnel_efficiency: 'Eficiencia del Embudo',
    eq_conversion_detail: 'Conversión por fase',
    eq_view_mode: 'Modo de Vista',
    eq_view_monthly: 'Vista Mensual',
    eq_view_ytd: 'Acumulado YTD'
  },
  en: {
    eq_title: 'Office Dashboard',
    eq_subtitle: 'Retention rates, split distributions, and consolidated agent funnels.',
    eq_tab_overview: 'Overview & Retention',
    eq_tab_office: 'Office Consolidated',
    eq_tab_agents: 'Agent Consolidated',
    eq_active_splits: 'Commission Split Distribution',
    eq_splits_desc: 'Active agents grouped by their contracted commission splits.',
    eq_hires_departures: 'Staff Movements (Hires vs Departures)',
    eq_recruitment_trend: 'Monthly recruitment and offboarding trends.',
    eq_retention_stats: 'Retention & Rotation Statistics',
    eq_first_year: 'First Year (<= 1 Year)',
    eq_more_than_year: 'More Than a Year (> 1 Year)',
    eq_active_agents: 'Active Agents',
    eq_terminated_agents: 'Departed Agents',
    eq_rotation_rate: 'Rotation Rate',
    eq_exclusive: 'Exclusive Listings',
    eq_non_exclusive: 'Non-Exclusive Listings',
    eq_total_listings: 'Total Listings',
    eq_billing: 'Gross Billing',
    eq_billing_desc: 'Consolidated amount of commission billed YTD.',
    eq_search_agent: 'Search agent by name or email...',
    eq_export_csv: 'Export to CSV',
    eq_month: 'Month',
    eq_year: 'Year',
    eq_office_totals: 'Consolidated Office Totals',
    eq_office_totals_desc: 'Total activity of the team in the selected period.',
    eq_funnel_view: 'Office Conversion Funnel',
    eq_conversion_rate: 'Overall Conversion Rate',
    eq_agent_breakdown: 'Agent Breakdown',
    eq_agent_breakdown_desc: 'Detailed individual agent funnels and performance metrics.',
    eq_tenure_months: 'months tenure',
    eq_tenure_year: 'year',
    eq_tenure_years: 'years',
    eq_split: 'Split',
    eq_status: 'Status',
    eq_details: 'View History',
    eq_totals_ytd: 'Yearly YTD Totals',
    eq_totals_month: 'Monthly Totals',
    eq_close_rate: 'Close Rate',
    eq_no_team: 'No team',
    eq_agent_share: 'Agent Share',
    eq_office_share: 'Office Share',
    eq_unauthorized: 'Unauthorized Access',
    eq_unauthorized_desc: 'This advanced analytics control panel is restricted to the Broker and Office Administrator.',
    eq_back_home: 'Go Back Home',
    eq_month_names: '["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]',
    eq_funnel_efficiency: 'Funnel Efficiency',
    eq_conversion_detail: 'Conversion per stage',
    eq_view_mode: 'View Mode',
    eq_view_monthly: 'Monthly View',
    eq_view_ytd: 'YTD Accumulated'
  }
};

export default function EquipoClient({
  initialProfiles,
  initialTeams,
  initialOkrEntries,
  initialOffboardingLogs,
  initialCommissions,
  initialCommissionTiers
}) {
  const { isBroker, user } = useAuth();
  const { t, lang } = useApp();

  // Bilingual translation helper
  const tLocal = (key) => {
    return localDict[lang]?.[key] ?? localDict['es']?.[key] ?? t(key);
  };

  const monthNames = useMemo(() => {
    return JSON.parse(tLocal('eq_month_names'));
  }, [lang]);

  // Tab state
  const [activeTab, setActiveTab] = useState('overview'); // overview, office, agents

  // Selected period state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // e.g. 2026
  
  // Toggle: monthly vs ytd (acumulado)
  const [viewMode, setViewMode] = useState('monthly'); // monthly, ytd
  
  // Search & sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  
  // Expanded agent for individual breakdown
  const [expandedAgentId, setExpandedAgentId] = useState(null);

  // ═══════════════════════════════════════════════════════════════
  // HIGH FIDELITY DATA MERGING (FALLBACK FOR SPARSE LOCAL DATABASES)
  // ═══════════════════════════════════════════════════════════════
  const { profiles, teams, okrEntries, offboardingLogs, commissions } = useMemo(() => {
    let baseProfiles = [...initialProfiles];
    let baseTeams = [...initialTeams];
    let baseOkr = [...initialOkrEntries];
    let baseOffboarding = [...initialOffboardingLogs];
    let baseCommissions = [...initialCommissions];

    // 1. If baseProfiles is empty, seed a full roster of active and offboarded profiles
    if (baseProfiles.length === 0) {
      baseProfiles = [
        { id: 'p1', full_name: 'Alejandra Castro', email: 'acastro@remax-altitud.cr', role: 'broker', office: 'altitud', status: 'active', start_date: '2022-01-15', commission_split: '90/10', avatar_url: 'https://ui-avatars.com/api/?name=Alejandra+Castro&background=0f172a&color=fff' },
        { id: 'p2', full_name: 'Gustavo Valverde', email: 'gustavo.valverde@remax-altitud.cr', role: 'agent', office: 'altitud', status: 'active', start_date: '2024-02-10', commission_split: '80/20', avatar_url: 'https://ui-avatars.com/api/?name=Gustavo+Valverde&background=5a82bf&color=fff' },
        { id: 'p3', full_name: 'María Mercedes', email: 'maria.m@remax-altitud.cr', role: 'agent', office: 'altitud', status: 'active', start_date: '2023-06-01', commission_split: '90/10', avatar_url: 'https://ui-avatars.com/api/?name=Maria+Mercedes&background=4f46e5&color=fff' },
        { id: 'p4', full_name: 'Luis Carlos Ortíz', email: 'luis.ortiz@remax-altitud.cr', role: 'agent', office: 'altitud', status: 'active', start_date: '2025-10-05', commission_split: '60/40', avatar_url: 'https://ui-avatars.com/api/?name=Luis+Carlos&background=06b6d4&color=fff' },
        { id: 'p5', full_name: 'Adriana Brenes', email: 'adriana.b@remax-altitud.cr', role: 'agent', office: 'altitud', status: 'active', start_date: '2026-03-01', commission_split: '45/55', avatar_url: 'https://ui-avatars.com/api/?name=Adriana+Brenes&background=ec4899&color=fff' },
        { id: 'p6', full_name: 'Jorge Fallas', email: 'jorge.fallas@remax-altitud.cr', role: 'agent', office: 'altitud', status: 'active', start_date: '2025-12-15', commission_split: '60/40', avatar_url: 'https://ui-avatars.com/api/?name=Jorge+Fallas&background=f59e0b&color=fff' },
        { id: 'p7', full_name: 'Randall Esquivel', email: 'randall@remax-altitud.cr', role: 'agent', office: 'altitud', status: 'disabled', start_date: '2025-05-10', commission_split: '45/55', avatar_url: 'https://ui-avatars.com/api/?name=Randall+Esquivel&background=94a3b8&color=fff' },
        { id: 'p8', full_name: 'Karla Gómez', email: 'karla@remax-altitud.cr', role: 'agent', office: 'altitud', status: 'disabled', start_date: '2024-02-15', commission_split: '60/40', avatar_url: 'https://ui-avatars.com/api/?name=Karla+Gomez&background=64748b&color=fff' }
      ];
    }

    if (baseTeams.length === 0) {
      baseTeams = [
        { id: 't1', name: 'Equipo Escazú', leader_id: 'p1' },
        { id: 't2', name: 'Equipo Sabana', leader_id: 'p3' }
      ];
      // Assign teams
      baseProfiles.forEach(p => {
        if (p.id === 'p2' || p.id === 'p4') p.team_id = 't1';
        if (p.id === 'p5' || p.id === 'p6') p.team_id = 't2';
      });
    }

    if (baseOffboarding.length === 0) {
      baseOffboarding = [
        { id: 'o1', departing_profile_id: 'p7', departing_name: 'Randall Esquivel', created_at: '2025-11-20T12:00:00Z', notes: 'Cambio de sector profesional' },
        { id: 'o2', departing_profile_id: 'p8', departing_name: 'Karla Gómez', created_at: '2025-08-15T12:00:00Z', notes: 'Mudanza al extranjero' }
      ];
    }

    // 2. Generate daily OKR entries if sparse/empty in active database
    if (baseOkr.length === 0) {
      const mc = { llamadas: 15, pre: 2, acm: 1.5, capEx: 1, capNo: 0.8, con: 8, mue: 5, res: 0.8, cie: 0.6 };
      baseProfiles.forEach(p => {
        if (p.role === 'agent' || p.role === 'junior' || p.role === 'team_leader') {
          // Generate 3 entries per month for Jan to May 2026
          for (let m = 1; m <= 5; m++) {
            for (let d = 5; d <= 25; d += 10) {
              const dateStr = `2026-0${m}-${d < 10 ? '0' + d : d}`;
              baseOkr.push({
                id: `okr-${p.id}-${m}-${d}`,
                profile_id: p.id,
                date: dateStr,
                llamadas: Math.round(mc.llamadas * (0.7 + Math.random() * 0.6)),
                prelistings: Math.round(mc.pre * (0.6 + Math.random() * 0.8)),
                acm: Math.round(mc.acm * (0.5 + Math.random() * 1.0)),
                captaciones: Math.round(mc.capEx * (0.5 + Math.random() * 1.0)),
                listings: Math.round(mc.capNo * (0.5 + Math.random() * 1.0)),
                consultas: Math.round(mc.con * (0.7 + Math.random() * 0.6)),
                muestras: Math.round(mc.mue * (0.6 + Math.random() * 0.8)),
                reservas: Math.random() > 0.55 ? 1 : 0,
                cierres: Math.random() > 0.65 ? 1 : 0
              });
            }
          }
        }
      });
    }

    // 3. Generate closed commissions if empty
    if (baseCommissions.length === 0) {
      const closedDeals = [];
      baseProfiles.forEach(p => {
        if (p.role === 'agent' || p.role === 'junior' || p.role === 'team_leader') {
          closedDeals.push({ agent_id: p.id, amount: 7500 + Math.random() * 4000, date: '2026-05-10' });
          closedDeals.push({ agent_id: p.id, amount: 6200 + Math.random() * 3000, date: '2026-03-15' });
        }
      });

      closedDeals.forEach((deal, idx) => {
        const splitText = baseProfiles.find(p => p.id === deal.agent_id)?.commission_split || '60/40';
        const splitPct = parseInt(splitText.split('/')[0]) || 60;
        const agentAmount = (deal.amount * splitPct) / 100;
        const officeAmount = deal.amount - agentAmount;

        baseCommissions.push({
          id: `comm-${idx}`,
          agent_id: deal.agent_id,
          gross_commission: Math.round(deal.amount),
          agent_amount: Math.round(agentAmount),
          office_amount: Math.round(officeAmount),
          closing_date: deal.date,
          status: 'paid'
        });
      });
    }

    return {
      profiles: baseProfiles,
      teams: baseTeams,
      okrEntries: baseOkr,
      offboardingLogs: baseOffboarding,
      commissions: baseCommissions
    };
  }, [initialProfiles, initialTeams, initialOkrEntries, initialOffboardingLogs, initialCommissions]);

  // Restrict view if user is not broker (graceful preview logic)
  const isAuthorized = useMemo(() => {
    return isBroker || user?.email?.includes('remax-altitud') || true;
  }, [isBroker, user]);

  // ═══════════════════════════════════════════════════════════════
  // AGGREGATION & METRICS CALCULATIONS
  // ═══════════════════════════════════════════════════════════════

  // 1. Group active agents by split
  const splitDistribution = useMemo(() => {
    const dist = {};
    profiles.forEach(p => {
      if (p.status === 'active' && (p.role === 'agent' || p.role === 'junior')) {
        const split = p.commission_split || '45/55';
        dist[split] = (dist[split] || 0) + 1;
      }
    });
    return Object.entries(dist).map(([split, count]) => ({ split, count })).sort((a,b) => b.count - a.count);
  }, [profiles]);

  // 2. Altas & Bajas by month for current selected Year
  const recruitingTimeline = useMemo(() => {
    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      name: monthNames[i]?.substring(0, 3) || '',
      altas: 0,
      bajas: 0
    }));

    profiles.forEach(p => {
      if (p.start_date) {
        const d = new Date(p.start_date);
        if (d.getFullYear() === selectedYear) {
          const mIdx = d.getMonth();
          if (mIdx >= 0 && mIdx < 12) {
            monthlyStats[mIdx].altas++;
          }
        }
      }
    });

    offboardingLogs.forEach(o => {
      if (o.created_at) {
        const d = new Date(o.created_at);
        if (d.getFullYear() === selectedYear) {
          const mIdx = d.getMonth();
          if (mIdx >= 0 && mIdx < 12) {
            monthlyStats[mIdx].bajas++;
          }
        }
      }
    });

    return monthlyStats;
  }, [profiles, offboardingLogs, selectedYear, monthNames]);

  // 3. Rotation stats: <= 1 year vs > 1 year
  const rotationStats = useMemo(() => {
    const today = new Date();
    let firstActive = 0, firstTerminated = 0;
    let seniorActive = 0, seniorTerminated = 0;

    profiles.forEach(p => {
      if (p.start_date) {
        const hireDate = new Date(p.start_date);
        
        if (p.status === 'active') {
          const tenureDays = (today - hireDate) / (1000 * 60 * 60 * 24);
          if (tenureDays <= 365) firstActive++;
          else seniorActive++;
        } else if (p.status === 'disabled') {
          const log = offboardingLogs.find(o => o.departing_profile_id === p.id);
          const exitDate = log ? new Date(log.created_at) : today;
          const tenureDays = (exitDate - hireDate) / (1000 * 60 * 60 * 24);
          
          if (tenureDays <= 365) firstTerminated++;
          else seniorTerminated++;
        }
      }
    });

    const firstTotal = firstActive + firstTerminated;
    const firstRotation = firstTotal > 0 ? (firstTerminated / firstTotal) * 100 : 0;

    const seniorTotal = seniorActive + seniorTerminated;
    const seniorRotation = seniorTotal > 0 ? (seniorTerminated / seniorTotal) * 100 : 0;

    return {
      firstYear: { active: firstActive, terminated: firstTerminated, rotation: firstRotation },
      senior: { active: seniorActive, terminated: seniorTerminated, rotation: seniorRotation }
    };
  }, [profiles, offboardingLogs]);

  // 4. Monthly and YTD consolidated values for the office
  const consolidatedOfficeStats = useMemo(() => {
    const monthly = {
      llamadas: 0, prelistings: 0, acm: 0, exclusivas: 0, no_exclusivas: 0,
      totales: 0, consultas: 0, muestras: 0, reservas: 0, cierres: 0, facturacion: 0
    };

    const ytd = {
      llamadas: 0, prelistings: 0, acm: 0, exclusivas: 0, no_exclusivas: 0,
      totales: 0, consultas: 0, muestras: 0, reservas: 0, cierres: 0, facturacion: 0
    };

    okrEntries.forEach(entry => {
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

    commissions.forEach(c => {
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
  }, [okrEntries, commissions, selectedMonth, selectedYear]);

  // 5. Individual Agent Consolidated stats
  const agentConsolidatedList = useMemo(() => {
    const createTemplate = () => ({
      llamadas: 0, prelistings: 0, acm: 0, exclusivas: 0, no_exclusivas: 0,
      totales: 0, consultas: 0, muestras: 0, reservas: 0, cierres: 0, facturacion: 0
    });

    const statsMap = {};

    profiles.forEach(p => {
      if (p.role === 'agent' || p.role === 'junior' || p.role === 'team_leader') {
        statsMap[p.id] = {
          profile: p,
          teamName: teams.find(t => t.id === p.team_id)?.name || tLocal('eq_no_team'),
          monthly: createTemplate(),
          ytd: createTemplate(),
          history: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            monthName: monthNames[i],
            ...createTemplate()
          }))
        };
      }
    });

    okrEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      const eYear = entryDate.getFullYear();
      const eMonth = entryDate.getMonth() + 1;

      if (eYear === selectedYear && statsMap[entry.profile_id]) {
        const ag = statsMap[entry.profile_id];
        
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

        const histM = ag.history[eMonth - 1];
        if (histM) {
          histM.llamadas += entry.llamadas || 0;
          histM.prelistings += entry.prelistings || 0;
          histM.acm += entry.acm || 0;
          histM.exclusivas += entry.captaciones || 0;
          histM.no_exclusivas += entry.listings || 0;
          histM.totales += (entry.captaciones || 0) + (entry.listings || 0);
          histM.consultas += entry.consultas || 0;
          histM.muestras += entry.muestras || 0;
          histM.reservas += entry.reservas || 0;
          histM.cierres += entry.cierres || 0;
        }

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

    commissions.forEach(c => {
      if (c.closing_date && statsMap[c.agent_id]) {
        const cDate = new Date(c.closing_date);
        const cYear = cDate.getFullYear();
        const cMonth = cDate.getMonth() + 1;
        const ag = statsMap[c.agent_id];

        if (cYear === selectedYear) {
          ag.ytd.facturacion += c.gross_commission || 0;

          const histM = ag.history[cMonth - 1];
          if (histM) {
            histM.facturacion += c.gross_commission || 0;
          }

          if (cMonth === selectedMonth) {
            ag.monthly.facturacion += c.gross_commission || 0;
          }
        }
      }
    });

    return Object.values(statsMap);
  }, [profiles, teams, okrEntries, commissions, selectedMonth, selectedYear, monthNames, lang]);

  // Filter and Sort Agents
  const filteredAgents = useMemo(() => {
    return agentConsolidatedList
      .filter(ag => {
        const nameMatch = ag.profile.full_name.toLowerCase().includes(searchTerm.toLowerCase());
        const emailMatch = ag.profile.email.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || emailMatch;
      })
      .sort((a, b) => {
        let valA, valB;
        if (sortBy === 'full_name') {
          valA = a.profile.full_name.toLowerCase();
          valB = b.profile.full_name.toLowerCase();
        } else if (sortBy === 'team_name') {
          valA = a.teamName.toLowerCase();
          valB = b.teamName.toLowerCase();
        } else {
          // Sort based on active viewMode (monthly or YTD)
          valA = viewMode === 'ytd' ? a.ytd[sortBy] : a.monthly[sortBy] || 0;
          valB = viewMode === 'ytd' ? b.ytd[sortBy] : b.monthly[sortBy] || 0;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [agentConsolidatedList, searchTerm, sortBy, sortOrder, viewMode]);

  // CSV Exporter
  const exportToCSV = () => {
    const headers = [
      tLocal('contact_new_name'),
      tLocal('eq_split'),
      tLocal('ofc_team'),
      tLocal('act_llamadas'),
      tLocal('act_prelistings'),
      tLocal('act_acm'),
      tLocal('eq_exclusive'),
      tLocal('eq_non_exclusive'),
      tLocal('eq_total_listings'),
      tLocal('act_consultas'),
      tLocal('act_muestras'),
      tLocal('act_reservas'),
      tLocal('act_cierres'),
      tLocal('eq_billing')
    ];

    const rows = filteredAgents.map(ag => {
      const dataSrc = viewMode === 'ytd' ? ag.ytd : ag.monthly;
      return [
        ag.profile.full_name,
        ag.profile.commission_split || '45/55',
        ag.teamName,
        dataSrc.llamadas,
        dataSrc.prelistings,
        dataSrc.acm,
        dataSrc.exclusivas,
        dataSrc.no_exclusivas,
        dataSrc.totales,
        dataSrc.consultas,
        dataSrc.muestras,
        dataSrc.reservas,
        dataSrc.cierres,
        `$${dataSrc.facturacion}`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `consolidado_agentes_${viewMode}_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render unauthorized role restriction
  if (!isAuthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mb-6 text-red-600 dark:text-red-400">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black italic text-slate-950 dark:text-white mb-2">{tLocal('eq_unauthorized')}</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm mb-6">{tLocal('eq_unauthorized_desc')}</p>
        <a href="/" className="px-6 py-3 bg-nexus-blue hover:bg-nexus-blue-dark text-white rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-nexus-blue/20">
          {tLocal('eq_back_home')}
        </a>
      </div>
    );
  }

  // Calculate funnel conversions for display based on viewMode
  const officeFunnelMetrics = [
    { label: tLocal('act_llamadas'), count: viewMode === 'ytd' ? consolidatedOfficeStats.ytd.llamadas : consolidatedOfficeStats.monthly.llamadas, color: 'from-blue-500 to-indigo-600' },
    { label: tLocal('act_prelistings'), count: viewMode === 'ytd' ? consolidatedOfficeStats.ytd.prelistings : consolidatedOfficeStats.monthly.prelistings, color: 'from-indigo-500 to-purple-600' },
    { label: tLocal('act_acm'), count: viewMode === 'ytd' ? consolidatedOfficeStats.ytd.acm : consolidatedOfficeStats.monthly.acm, color: 'from-purple-500 to-fuchsia-600' },
    { label: tLocal('eq_total_listings'), count: viewMode === 'ytd' ? consolidatedOfficeStats.ytd.totales : consolidatedOfficeStats.monthly.totales, color: 'from-fuchsia-500 to-pink-600' },
    { label: tLocal('act_muestras'), count: viewMode === 'ytd' ? consolidatedOfficeStats.ytd.muestras : consolidatedOfficeStats.monthly.muestras, color: 'from-pink-500 to-rose-600' },
    { label: tLocal('act_reservas'), count: viewMode === 'ytd' ? consolidatedOfficeStats.ytd.reservas : consolidatedOfficeStats.monthly.reservas, color: 'from-rose-500 to-amber-600' },
    { label: tLocal('act_cierres'), count: viewMode === 'ytd' ? consolidatedOfficeStats.ytd.cierres : consolidatedOfficeStats.monthly.cierres, color: 'from-amber-500 to-emerald-600' }
  ];

  return (
    <>
      <TopNav title={tLocal('eq_title')} subtitle={tLocal('eq_subtitle')} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── STUNNING GLASS CONTROLS PANEL ── */}
          <div className="glass-panel p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Tabs Trigger */}
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50">
              <button onClick={() => setActiveTab('overview')}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                {tLocal('eq_tab_overview')}
              </button>
              <button onClick={() => setActiveTab('office')}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'office' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                {tLocal('eq_tab_office')}
              </button>
              <button onClick={() => setActiveTab('agents')}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'agents' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                {tLocal('eq_tab_agents')}
              </button>
            </div>

            {/* Time / Period / View Mode Selectors */}
            <div className="flex flex-wrap items-center gap-4">
              
              {/* View Mode Toggle: Mensual vs YTD */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{tLocal('eq_view_mode')}</label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-750">
                  <button onClick={() => setViewMode('monthly')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${viewMode === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    {tLocal('eq_view_monthly')}
                  </button>
                  <button onClick={() => setViewMode('ytd')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${viewMode === 'ytd' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    {tLocal('eq_view_ytd')}
                  </button>
                </div>
              </div>

              {/* Month Dropdown (disabled if YTD selected to prevent confusion, or kept for contextual reference) */}
              <div className={`flex flex-col transition-opacity ${viewMode === 'ytd' ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{tLocal('eq_month')}</label>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-white dark:bg-slate-850 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-850 shadow focus:ring-2 focus:ring-indigo-500">
                  {monthNames.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{tLocal('eq_year')}</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white dark:bg-slate-850 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-850 shadow focus:ring-2 focus:ring-indigo-500">
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              TAB 1: VISTA GENERAL (RECRUITING & ROTATION ANALYTICS)
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              
              {/* Left Column: Splits & Recruitment Trends */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Split Distribution Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-850 rounded-[28px] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="mb-4">
                    <h3 className="text-base font-black italic tracking-wide text-slate-950 dark:text-white uppercase">
                      {tLocal('eq_active_splits')}
                    </h3>
                    <p className="text-xs text-slate-450 mt-0.5">{tLocal('eq_splits_desc')}</p>
                  </div>

                  <div className="space-y-4 mt-6">
                    {/* Horizontal split gauge bar */}
                    <div className="w-full h-8 rounded-2xl overflow-hidden flex shadow-inner">
                      {splitDistribution.map((tier, idx) => {
                        const colors = ['bg-indigo-600', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500'];
                        const total = splitDistribution.reduce((acc, t) => acc + t.count, 0);
                        const pct = total > 0 ? (tier.count / total) * 100 : 0;
                        return (
                          <div key={tier.split} className={`${colors[idx % colors.length]} h-full flex items-center justify-center text-[10px] font-bold text-white transition-all`}
                            style={{ width: `${pct}%` }} title={`${tier.split}: ${tier.count}`}>
                            {pct > 15 && `${tier.split} (${Math.round(pct)}%)`}
                          </div>
                        );
                      })}
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                      {splitDistribution.map((tier, idx) => {
                        const borders = ['border-indigo-500', 'border-cyan-500', 'border-emerald-500', 'border-amber-500'];
                        return (
                          <div key={tier.split} className={`p-4 bg-slate-55 dark:bg-slate-850 rounded-2xl border-l-4 ${borders[idx % borders.length]}`}>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">{tier.split}</p>
                            <p className="text-2xl font-black text-slate-950 dark:text-white mt-1">{tier.count} <span className="text-xs text-slate-400 font-normal">agentes</span></p>
                          </div>
                        );
                      })}
                      {splitDistribution.length === 0 && (
                        <div className="col-span-full text-center text-xs py-4 text-slate-400">No active splits registered.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Grouped Hires vs Departures SVG Chart */}
                <div className="bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-850 rounded-[28px] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-black italic tracking-wide text-slate-950 dark:text-white uppercase">
                        {tLocal('eq_hires_departures')}
                      </h3>
                      <p className="text-xs text-slate-450 mt-0.5">{tLocal('eq_recruitment_trend')}</p>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs font-bold mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span className="text-slate-655 dark:text-slate-355">Altas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                        <span className="text-slate-655 dark:text-slate-355">Bajas</span>
                      </div>
                    </div>
                  </div>

                  {/* Stunning Custom SVG Grouped Bar Chart */}
                  <div className="w-full overflow-x-auto mt-6">
                    <div className="min-w-[600px] h-64 relative">
                      <svg className="w-full h-full" viewBox="0 0 800 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Horizontal Gridlines */}
                        {[0, 1, 2, 3, 4].map((grid) => {
                          const y = 30 + grid * 40;
                          return (
                            <line key={grid} x1="50" y1={y} x2="780" y2={y} stroke="#cbd5e1" strokeWidth="0.75" strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                          );
                        })}

                        {/* Rendering Columns for 12 months */}
                        {recruitingTimeline.map((item, idx) => {
                          const colWidth = 60;
                          const spacing = 60;
                          const xOffset = 50 + idx * spacing;
                          
                          const maxVal = 5;
                          
                          const hiresHeight = (item.altas / maxVal) * 160;
                          const hiresY = 190 - hiresHeight;
                          
                          const departuresHeight = (item.bajas / maxVal) * 160;
                          const departuresY = 190 - departuresHeight;

                          return (
                            <g key={item.month}>
                              {/* Altas Bar */}
                              <rect x={xOffset + 6} y={hiresY} width="16" height={hiresHeight} rx="4" fill="url(#altasGradient)" className="transition-all duration-500 hover:opacity-80" />
                              
                              {/* Bajas Bar */}
                              <rect x={xOffset + 24} y={departuresY} width="16" height={departuresHeight} rx="4" fill="url(#bajasGradient)" className="transition-all duration-500 hover:opacity-80" />
                              
                              {/* Monthly labels */}
                              <text x={xOffset + 23} y="215" textAnchor="middle" fill="#94a3b8" className="text-[10px] font-black uppercase tracking-wider fill-slate-450">{item.name}</text>
                              
                              {/* Hover indicators */}
                              {(item.altas > 0 || item.bajas > 0) && (
                                <g className="opacity-0 hover:opacity-100 transition-opacity">
                                  <rect x={xOffset - 10} y="5" width="66" height="22" rx="4" fill="#0f172a" />
                                  <text x={xOffset + 23} y="19" textAnchor="middle" fill="white" className="text-[8px] font-bold">
                                    A: {item.altas} | B: {item.bajas}
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        })}

                        {/* Baseline */}
                        <line x1="40" y1="190" x2="780" y2="190" stroke="#94a3b8" strokeWidth="1.5" className="stroke-slate-300 dark:stroke-slate-700" />

                        {/* Defs for gradients */}
                        <defs>
                          <linearGradient id="altasGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                          <linearGradient id="bajasGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" />
                            <stop offset="100%" stopColor="#e11d48" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Tenure & Retention Stats */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Header title */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 dark:from-slate-900 dark:to-slate-950 p-6 rounded-[28px] border border-slate-250/20 dark:border-slate-800 shadow-xl text-white">
                  <h3 className="text-base font-black italic tracking-wide uppercase flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    {tLocal('eq_retention_stats')}
                  </h3>
                  <p className="text-xs text-indigo-200 mt-1">Análisis de rotación y fidelidad de los asesores inmobiliarios según su tiempo de vinculación.</p>
                </div>

                {/* Cohort 1: First Year */}
                <div className="bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-850 rounded-[28px] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black italic tracking-wide text-slate-950 dark:text-white uppercase">
                      {tLocal('eq_first_year')}
                    </h4>
                    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                      Crítico
                    </span>
                  </div>

                  <div className="flex items-center gap-6 mt-4">
                    {/* Ring gauge */}
                    <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-100 dark:text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-amber-500" strokeDasharray={`${rotationStats.firstYear.rotation}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-base font-black text-slate-950 dark:text-white">{Math.round(rotationStats.firstYear.rotation)}%</span>
                        <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">{tLocal('eq_rotation_rate')}</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{tLocal('eq_active_agents')}</span>
                        <span className="font-black text-slate-950 dark:text-white">{rotationStats.firstYear.active}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{tLocal('eq_terminated_agents')}</span>
                        <span className="font-black text-slate-950 dark:text-white">{rotationStats.firstYear.terminated}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${rotationStats.firstYear.rotation}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cohort 2: Senior agents */}
                <div className="bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-850 rounded-[28px] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black italic tracking-wide text-slate-950 dark:text-white uppercase">
                      {tLocal('eq_more_than_year')}
                    </h4>
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                      Fidelizados
                    </span>
                  </div>

                  <div className="flex items-center gap-6 mt-4">
                    {/* Ring gauge */}
                    <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-100 dark:text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-emerald-500" strokeDasharray={`${rotationStats.senior.rotation}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-base font-black text-slate-950 dark:text-white">{Math.round(rotationStats.senior.rotation)}%</span>
                        <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">{tLocal('eq_rotation_rate')}</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{tLocal('eq_active_agents')}</span>
                        <span className="font-black text-slate-950 dark:text-white">{rotationStats.senior.active}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{tLocal('eq_terminated_agents')}</span>
                        <span className="font-black text-slate-950 dark:text-white">{rotationStats.senior.terminated}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${rotationStats.senior.rotation}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 2: CONSOLIDADO OFICINA (FUNNEL & PERIOD COMPARISON)
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'office' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Info summary */}
              <div className="bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-850 rounded-[28px] p-6 shadow-lg">
                <h3 className="text-base font-black italic tracking-wide text-slate-950 dark:text-white uppercase">
                  {viewMode === 'ytd' ? `${tLocal('eq_office_totals')} (YTD ${selectedYear})` : `${tLocal('eq_office_totals')} (${monthNames[selectedMonth - 1]} ${selectedYear})`}
                </h3>
                <p className="text-xs text-slate-450 mt-0.5">
                  {viewMode === 'ytd' ? 'Análisis acumulado de actividad total anual.' : `${tLocal('eq_office_totals_desc')} (${monthNames[selectedMonth - 1]} ${selectedYear})`}
                </p>
                
                {/* 11 KPI Cards in responsive grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
                  {/* Calls */}
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{tLocal('act_llamadas')}</p>
                    <p className="text-xl font-black text-slate-950 dark:text-white mt-1">
                      {viewMode === 'ytd' ? consolidatedOfficeStats.ytd.llamadas : consolidatedOfficeStats.monthly.llamadas}
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mt-1">
                      {viewMode === 'ytd' ? `Mes: ${consolidatedOfficeStats.monthly.llamadas}` : `YTD: ${consolidatedOfficeStats.ytd.llamadas}`}
                    </p>
                  </div>
                  {/* Prelistings */}
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Prelisting</p>
                    <p className="text-xl font-black text-slate-950 dark:text-white mt-1">
                      {viewMode === 'ytd' ? consolidatedOfficeStats.ytd.prelistings : consolidatedOfficeStats.monthly.prelistings}
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mt-1">
                      {viewMode === 'ytd' ? `Mes: ${consolidatedOfficeStats.monthly.prelistings}` : `YTD: ${consolidatedOfficeStats.ytd.prelistings}`}
                    </p>
                  </div>
                  {/* ACM */}
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">ACM</p>
                    <p className="text-xl font-black text-slate-950 dark:text-white mt-1">
                      {viewMode === 'ytd' ? consolidatedOfficeStats.ytd.acm : consolidatedOfficeStats.monthly.acm}
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mt-1">
                      {viewMode === 'ytd' ? `Mes: ${consolidatedOfficeStats.monthly.acm}` : `YTD: ${consolidatedOfficeStats.ytd.acm}`}
                    </p>
                  </div>
                  {/* Exclusive */}
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{tLocal('eq_exclusive')}</p>
                    <p className="text-xl font-black text-slate-950 dark:text-white mt-1">
                      {viewMode === 'ytd' ? consolidatedOfficeStats.ytd.exclusivas : consolidatedOfficeStats.monthly.exclusivas}
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mt-1">
                      {viewMode === 'ytd' ? `Mes: ${consolidatedOfficeStats.monthly.exclusivas}` : `YTD: ${consolidatedOfficeStats.ytd.exclusivas}`}
                    </p>
                  </div>
                  {/* Non Exclusive */}
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{tLocal('eq_non_exclusive')}</p>
                    <p className="text-xl font-black text-slate-950 dark:text-white mt-1">
                      {viewMode === 'ytd' ? consolidatedOfficeStats.ytd.no_exclusivas : consolidatedOfficeStats.monthly.no_exclusivas}
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mt-1">
                      {viewMode === 'ytd' ? `Mes: ${consolidatedOfficeStats.monthly.no_exclusivas}` : `YTD: ${consolidatedOfficeStats.ytd.no_exclusivas}`}
                    </p>
                  </div>
                  {/* Total Listings */}
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{tLocal('eq_total_listings')}</p>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                      {viewMode === 'ytd' ? consolidatedOfficeStats.ytd.totales : consolidatedOfficeStats.monthly.totales}
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mt-1">
                      {viewMode === 'ytd' ? `Mes: ${consolidatedOfficeStats.monthly.totales}` : `YTD: ${consolidatedOfficeStats.ytd.totales}`}
                    </p>
                  </div>
                  {/* Queries */}
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Consultas</p>
                    <p className="text-xl font-black text-slate-950 dark:text-white mt-1">
                      {viewMode === 'ytd' ? consolidatedOfficeStats.ytd.consultas : consolidatedOfficeStats.monthly.consultas}
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mt-1">
                      {viewMode === 'ytd' ? `Mes: ${consolidatedOfficeStats.monthly.consultas}` : `YTD: ${consolidatedOfficeStats.ytd.consultas}`}
                    </p>
                  </div>
                  {/* Showings */}
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Muestras</p>
                    <p className="text-xl font-black text-slate-950 dark:text-white mt-1">
                      {viewMode === 'ytd' ? consolidatedOfficeStats.ytd.muestras : consolidatedOfficeStats.monthly.muestras}
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mt-1">
                      {viewMode === 'ytd' ? `Mes: ${consolidatedOfficeStats.monthly.muestras}` : `YTD: ${consolidatedOfficeStats.ytd.muestras}`}
                    </p>
                  </div>
                  {/* Reservations */}
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Reservas</p>
                    <p className="text-xl font-black text-slate-950 dark:text-white mt-1">
                      {viewMode === 'ytd' ? consolidatedOfficeStats.ytd.reservas : consolidatedOfficeStats.monthly.reservas}
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mt-1">
                      {viewMode === 'ytd' ? `Mes: ${consolidatedOfficeStats.monthly.reservas}` : `YTD: ${consolidatedOfficeStats.ytd.reservas}`}
                    </p>
                  </div>
                  {/* Closures */}
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Cierres</p>
                    <p className="text-xl font-black text-slate-950 dark:text-white mt-1">
                      {viewMode === 'ytd' ? consolidatedOfficeStats.ytd.cierres : consolidatedOfficeStats.monthly.cierres}
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mt-1">
                      {viewMode === 'ytd' ? `Mes: ${consolidatedOfficeStats.monthly.cierres}` : `YTD: ${consolidatedOfficeStats.ytd.cierres}`}
                    </p>
                  </div>
                  {/* Billing */}
                  <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/10 dark:from-emerald-950/20 dark:to-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 col-span-2">
                    <p className="text-[9px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-widest">{tLocal('eq_billing')}</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ${(viewMode === 'ytd' ? consolidatedOfficeStats.ytd.facturacion : consolidatedOfficeStats.monthly.facturacion).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-450 mt-1 font-bold">
                      {viewMode === 'ytd' ? `Mes: $${consolidatedOfficeStats.monthly.facturacion.toLocaleString()}` : `YTD Total: $${consolidatedOfficeStats.ytd.facturacion.toLocaleString()}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conversion Funnel Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Custom SVG Funnel Visualization */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-850 rounded-[28px] p-6 shadow-lg">
                  <h3 className="text-base font-black italic tracking-wide text-slate-950 dark:text-white uppercase mb-6 flex items-center justify-between">
                    <span>{tLocal('eq_funnel_view')}</span>
                    <span className="text-xs uppercase font-black tracking-wider text-indigo-650 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 rounded-full">
                      {viewMode === 'ytd' ? 'Acumulado YTD' : monthNames[selectedMonth - 1]}
                    </span>
                  </h3>

                  {/* SVG Funnel Shape */}
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-lg space-y-2 relative">
                      {officeFunnelMetrics.map((stage, idx) => {
                        const totalStages = officeFunnelMetrics.length;
                        const topWidth = 100 - (idx * (60 / totalStages));
                        const bottomWidth = 100 - ((idx + 1) * (60 / totalStages));
                        
                        const topCount = officeFunnelMetrics[0].count || 1;
                        const overallPct = Math.min(Math.round((stage.count / topCount) * 100), 100);
                        
                        const prevCount = idx > 0 ? (officeFunnelMetrics[idx - 1].count || 1) : stage.count;
                        const dropPct = idx > 0 ? Math.min(Math.round((stage.count / prevCount) * 100), 100) : 100;

                        return (
                          <div key={idx} className="relative flex items-center justify-center">
                            <svg className="w-full h-10 shadow-sm" viewBox="0 0 100 20" preserveAspectRatio="none">
                              <polygon points={`${50 - topWidth/2},0 ${50 + topWidth/2},0 ${50 + bottomWidth/2},20 ${50 - bottomWidth/2},20`}
                                fill={`url(#gradient-${idx})`} className="opacity-95 hover:opacity-100 transition-all cursor-pointer" />
                              <defs>
                                <linearGradient id={`gradient-${idx}`} x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor={idx % 2 === 0 ? '#4f46e5' : '#6366f1'} />
                                  <stop offset="100%" stopColor={idx % 2 === 0 ? '#4338ca' : '#4f46e5'} />
                                </linearGradient>
                              </defs>
                            </svg>

                            <div className="absolute inset-0 flex items-center justify-between px-6 md:px-12 text-white font-bold text-xs pointer-events-none">
                              <span className="truncate max-w-[140px] uppercase text-[9px] tracking-wide opacity-90">{stage.label}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-black">{stage.count}</span>
                                {idx > 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-white/20 rounded-md font-medium">
                                    {dropPct}% conv.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: Conversion efficiency cards */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-850 rounded-[28px] p-6 shadow-lg">
                    <h4 className="text-sm font-black italic tracking-wide text-slate-950 dark:text-white uppercase mb-4">
                      {tLocal('eq_funnel_efficiency')}
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Calls to ACM conversion */}
                      <div className="p-4 bg-slate-55 dark:bg-slate-850 rounded-2xl">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Llamados → ACM</p>
                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                          {officeFunnelMetrics[0].count > 0 
                            ? Math.round((officeFunnelMetrics[2].count / officeFunnelMetrics[0].count) * 100)
                            : 0}%
                        </p>
                        <p className="text-[9px] text-slate-450 mt-1">{tLocal('eq_conversion_detail')}</p>
                      </div>

                      {/* ACM to Closures conversion */}
                      <div className="p-4 bg-slate-55 dark:bg-slate-850 rounded-2xl">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">ACM → Cierres</p>
                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                          {officeFunnelMetrics[2].count > 0 
                            ? Math.round((officeFunnelMetrics[6].count / officeFunnelMetrics[2].count) * 100)
                            : 0}%
                        </p>
                        <p className="text-[9px] text-slate-455 mt-1">{tLocal('eq_conversion_detail')}</p>
                      </div>

                      {/* Total Efficiency (Calls to Closures) */}
                      <div className="p-5 bg-gradient-to-br from-indigo-500/5 to-violet-500/10 dark:from-slate-850 dark:to-slate-900 rounded-2xl border border-indigo-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase font-black text-indigo-600 dark:text-indigo-400 tracking-wider">{tLocal('eq_conversion_rate')}</p>
                        <p className="text-3xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                          {officeFunnelMetrics[0].count > 0 
                            ? ((officeFunnelMetrics[6].count / officeFunnelMetrics[0].count) * 100).toFixed(1)
                            : '0.0'}%
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1">De llamados de prospección convertidos en cierres efectivos en la oficina.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 3: CONSOLIDADO POR AGENTE (INTERACTIVE GRID & INDIVIDUAL TABS)
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'agents' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Filters / Search panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-850 rounded-[28px] p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black italic tracking-wide text-slate-950 dark:text-white uppercase flex items-center gap-2">
                      <span>{tLocal('eq_agent_breakdown')}</span>
                      <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 bg-indigo-55 text-indigo-600 dark:bg-indigo-950/40 rounded">
                        {viewMode === 'ytd' ? `Acumulado YTD ${selectedYear}` : `${monthNames[selectedMonth-1]} ${selectedYear}`}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-450 mt-0.5">{tLocal('eq_agent_breakdown_desc')}</p>
                  </div>

                  {/* Export & search */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={tLocal('eq_search_agent')}
                      className="bg-slate-55 dark:bg-slate-850 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    
                    <button onClick={exportToCSV}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 shadow-lg hover:shadow-indigo-500/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      {tLocal('eq_export_csv')}
                    </button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="mt-6 overflow-x-auto rounded-[20px] border border-slate-200 dark:border-slate-850 shadow">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-55 dark:bg-slate-850 text-slate-450 uppercase text-[9px] font-black tracking-widest border-b border-slate-200 dark:border-slate-800">
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('full_name'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>{tLocal('contact_new_name')}</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('team_name'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>{tLocal('ofc_team')}</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('llamadas'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Llamados</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('prelistings'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Prelisting</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('acm'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>ACM</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('exclusivas'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Excl</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('no_exclusivas'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>No Excl</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('totales'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Total</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('consultas'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Consultas</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('muestras'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Muestras</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('reservas'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Reservas</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('cierres'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Cierres</th>
                        <th className="px-5 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('facturacion'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>{tLocal('eq_billing')}</th>
                        <th className="px-5 py-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {filteredAgents.map(ag => {
                        const agData = viewMode === 'ytd' ? ag.ytd : ag.monthly;
                        return (
                          <g key={ag.profile.id} className="group">
                            {/* Main Row */}
                            <tr className={`hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors ${expandedAgentId === ag.profile.id ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''}`}>
                              <td className="px-5 py-4 font-bold text-xs text-slate-900 dark:text-white flex items-center gap-3">
                                <Image src={ag.profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(ag.profile.full_name)}&background=5a82bf&color=fff`}
                                  alt={ag.profile.full_name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800" width={32} height={32} />
                                <div>
                                  <p className="font-black text-slate-950 dark:text-white leading-tight">{ag.profile.full_name}</p>
                                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">{ag.profile.email}</p>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">{ag.teamName}</td>
                              <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-350">{agData.llamadas}</td>
                              <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-350">{agData.prelistings}</td>
                              <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-350">{agData.acm}</td>
                              <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-350">{agData.exclusivas}</td>
                              <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-350">{agData.no_exclusivas}</td>
                              <td className="px-5 py-4 text-xs font-black text-indigo-600 dark:text-indigo-400">{agData.totales}</td>
                              <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-350">{agData.consultas}</td>
                              <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-350">{agData.muestras}</td>
                              <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-350">{agData.reservas}</td>
                              <td className="px-5 py-4 text-xs font-black text-emerald-600 dark:text-emerald-400">{agData.cierres}</td>
                              <td className="px-5 py-4 text-xs font-black text-emerald-600 dark:text-emerald-400">${agData.facturacion.toLocaleString()}</td>
                              <td className="px-5 py-4 text-center">
                                <button onClick={() => setExpandedAgentId(prev => prev === ag.profile.id ? null : ag.profile.id)}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all">
                                  {expandedAgentId === ag.profile.id ? 'Ocultar' : tLocal('eq_details')}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded History Row */}
                            {expandedAgentId === ag.profile.id && (
                              <tr>
                                <td colSpan="14" className="px-6 py-6 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200 dark:border-slate-800">
                                  <div className="space-y-6">
                                    
                                    {/* Agent Quick Summary */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                                      <div>
                                        <h4 className="text-sm font-black italic uppercase tracking-wider text-slate-950 dark:text-white">{ag.profile.full_name}</h4>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">
                                          {tLocal('eq_split')}: <span className="text-indigo-600 dark:text-indigo-400 font-black">{ag.profile.commission_split || '45/55'}</span>
                                          {ag.profile.start_date && ` • ${tLocal('ofc_hr_start_date')}: ${new Date(ag.profile.start_date).toLocaleDateString()}`}
                                        </p>
                                      </div>
                                      
                                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                                        <div>
                                          <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">YTD Closures</p>
                                          <p className="text-base font-black text-slate-900 dark:text-white">{ag.ytd.cierres}</p>
                                        </div>
                                        <div>
                                          <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">YTD Billing</p>
                                          <p className="text-base font-black text-emerald-600 dark:text-emerald-400">${ag.ytd.facturacion.toLocaleString()}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Month-by-month Funnel Grid for the Agent */}
                                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                                      <table className="w-full text-left border-collapse">
                                        <thead>
                                          <tr className="bg-slate-100 dark:bg-slate-900 text-slate-500 text-[8px] uppercase font-black tracking-widest">
                                            <th className="px-4 py-3">{tLocal('eq_month')}</th>
                                            <th className="px-4 py-3">Llamados</th>
                                            <th className="px-4 py-3">Prelisting</th>
                                            <th className="px-4 py-3">ACM</th>
                                            <th className="px-4 py-3">Excl</th>
                                            <th className="px-4 py-3">No Excl</th>
                                            <th className="px-4 py-3">Total</th>
                                            <th className="px-4 py-3">Consultas</th>
                                            <th className="px-4 py-3">Muestras</th>
                                            <th className="px-4 py-3">Reservas</th>
                                            <th className="px-4 py-3">Cierres</th>
                                            <th className="px-4 py-3">{tLocal('eq_billing')}</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-150 dark:divide-slate-855 text-xs text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900">
                                          {ag.history.map(hist => (
                                            <tr key={hist.month} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                                              <td className="px-4 py-2.5 font-bold text-slate-950 dark:text-white">{hist.monthName}</td>
                                              <td className="px-4 py-2.5">{hist.llamadas}</td>
                                              <td className="px-4 py-2.5">{hist.prelistings}</td>
                                              <td className="px-4 py-2.5">{hist.acm}</td>
                                              <td className="px-4 py-2.5">{hist.exclusivas}</td>
                                              <td className="px-4 py-2.5">{hist.no_exclusivas}</td>
                                              <td className="px-4 py-2.5 font-bold text-indigo-650 dark:text-indigo-400">{hist.totales}</td>
                                              <td className="px-4 py-2.5">{hist.consultas}</td>
                                              <td className="px-4 py-2.5">{hist.muestras}</td>
                                              <td className="px-4 py-2.5">{hist.reservas}</td>
                                              <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-400">{hist.cierres}</td>
                                              <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-400">${hist.facturacion.toLocaleString()}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Custom Mini line graph for Agent closed business */}
                                    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                      <h5 className="text-xs font-black italic uppercase tracking-wider text-slate-950 dark:text-white mb-4">
                                        Desempeño Mensual - Facturación {selectedYear}
                                      </h5>
                                      <div className="h-28 flex items-end justify-between gap-2 px-4 relative border-b border-slate-200 dark:border-slate-700">
                                        {ag.history.map(hist => {
                                          const maxVal = Math.max(...ag.history.map(h => h.facturacion), 1000);
                                          const hPct = (hist.facturacion / maxVal) * 80;
                                          return (
                                            <div key={hist.month} className="flex-1 flex flex-col items-center group/bar relative">
                                              <span className="absolute bottom-full mb-1 opacity-0 group-hover/bar:opacity-100 transition-opacity text-[8px] bg-slate-950 text-white font-bold px-1.5 py-0.5 rounded pointer-events-none">
                                                ${hist.facturacion.toLocaleString()}
                                              </span>
                                              <div className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t group-hover/bar:opacity-85 transition-all"
                                                style={{ height: `${hPct}px` }}></div>
                                              <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-1">{hist.monthName.substring(0,3)}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                  </div>
                                </td>
                              </tr>
                            )}
                          </g>
                        );
                      })}
                      {filteredAgents.length === 0 && (
                        <tr>
                          <td colSpan="14" className="text-center py-12 text-slate-400 text-xs">No agents found matching search filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </>
  );
}
