"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getOfficeBusinessPlans } from '@/lib/dal/office';
import Image from 'next/image';
import { useApp } from '@/lib/context';

/* ═══════════════════════════════════════
   PREMIUM DASHBOARD TAB — Office Metrics & KPIs
   ═══════════════════════════════════════ */

const MONTH_NAMES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function GaugeBar({ label, value, max, color = 'bg-emerald-500', prefix = '$' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{prefix}{value.toLocaleString()}</span>
      </div>
      <div className="w-full h-3 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardTab({ 
  profiles = [], 
  teams = [], 
  properties = [],
  inquiries = [], 
  expenses = [], 
  categories = [], 
  commissions = [], 
  reservations = [], 
  selectedOffice, 
  loading,
  povertyLine = 1000
}) {
  const { supabase } = useAuth();
  const { t, lang = 'es' } = useApp();
  
  const now = useMemo(() => new Date(), []);
  const actualYear = now.getFullYear();
  const [selectedYear, setSelectedYear] = useState(actualYear);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [timeframeMode, setTimeframeMode] = useState('mensual'); // 'mensual' | 'acumulado'

  const fmtCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const fmtPercent = (v) => `${Math.round(v)}%`;

  // ── Helper Splits parser ──
  const parseAgentSplitPct = (splitStr) => {
    if (!splitStr) return 0.45; // default fallback 45% agent split
    const parts = splitStr.split('/');
    if (parts.length === 2) {
      const val = parseFloat(parts[0]);
      if (!isNaN(val)) return val / 100;
    }
    const numeric = parseFloat(splitStr);
    if (!isNaN(numeric)) {
      if (numeric > 1) return numeric / 100;
      return numeric;
    }
    return 0.45; // default fallback
  };

  // ── Agent Classification Helper ──
  const getAgentCategory = (p) => {
    const fee = Number(p.monthly_fee) || 0;
    const split = (p.commission_split || '').toUpperCase();
    const splitPct = parseAgentSplitPct(p.commission_split);
    
    if (fee > 0 || split.includes('RAPP') || split.includes('RAP')) {
      return 'RAPP';
    }
    if (split.includes('EQUIPO') || p.role === 'team_member' || p.team_id) {
      return 'EQUIPO';
    }
    if (split === '100/0' || split.includes('100%') || splitPct === 1.0) {
      return '100%';
    }
    if (split === '80/20' || split.includes('80%') || splitPct >= 0.8) {
      return 'ALTO';
    }
    return 'PURO';
  };

  // ── Base Office Profiles (excluding brokers) ──
  const officeProfiles = useMemo(() => {
    return profiles.filter(p => p.office === selectedOffice && p.role !== 'broker');
  }, [profiles, selectedOffice]);

  // ── Active Profiles ──
  const activeProfiles = useMemo(() => {
    return officeProfiles.filter(p => p.status !== 'disabled');
  }, [officeProfiles]);

  // ── Period Boundaries matching ──
  const isDateInPeriod = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr.slice(0, 10) + 'T12:00:00');
    const y = d.getFullYear();
    const m = d.getMonth();
    if (timeframeMode === 'mensual') {
      return y === selectedYear && m === selectedMonth;
    } else {
      return y === selectedYear && m <= selectedMonth;
    }
  };

  // ── Business Plans goals load ──
  const [businessPlans, setBusinessPlans] = useState([]);
  const [monthRevenueGoal, setMonthRevenueGoal] = useState(0);
  const [ytdRevenueGoal, setYtdRevenueGoal] = useState(0);

  useEffect(() => {
    async function loadGoals() {
      try {
        const data = await getOfficeBusinessPlans(selectedOffice, selectedYear);
        if (data) {
          setBusinessPlans(data);
          const currentMonthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
          const currentMonthPlan = data.find(p => p.month.startsWith(currentMonthStr));
          if (currentMonthPlan) {
            setMonthRevenueGoal(Number(currentMonthPlan.revenue_goal) || 0);
          }
          
          let ytdSum = 0;
          data.forEach(p => {
            const m = parseInt(p.month.split('-')[1]) - 1;
            if (m <= selectedMonth) {
              ytdSum += Number(p.revenue_goal) || 0;
            }
          });
          setYtdRevenueGoal(ytdSum);
        } else {
          setBusinessPlans([]);
        }
      } catch (err) {
        setBusinessPlans([]);
      }
    }
    loadGoals();
  }, [selectedOffice, selectedYear, selectedMonth]);

  // ── Active properties by office ──
  const officeProperties = useMemo(() => {
    return properties.filter(p => {
      const propOffice = p.office_code?.toLowerCase()?.includes('cero') || p.office_code === 'R0700151' ? 'cero' : 'altitud';
      const agentProfile = profiles.find(prof => prof.auth_user_id === p.agent_id);
      const office = agentProfile ? agentProfile.office : propOffice;
      return office === selectedOffice;
    });
  }, [properties, selectedOffice, profiles]);

  // ── Split Distribution Count ──
  const splitCounts = useMemo(() => {
    let rapp = 0, alto = 0, puro = 0, pct100 = 0, equipo = 0;
    activeProfiles.forEach(p => {
      const cat = getAgentCategory(p);
      if (cat === 'RAPP') rapp++;
      else if (cat === 'ALTO') alto++;
      else if (cat === '100%') pct100++;
      else if (cat === 'EQUIPO') equipo++;
      else puro++;
    });
    return { rapp, alto, puro, pct100, equipo };
  }, [activeProfiles]);

  // ── Onboarding / Offboarding Rotación ──
  const rotationMetrics = useMemo(() => {
    let altas = 0;
    let bajas = 0;
    officeProfiles.forEach(p => {
      const joinDate = p.start_date 
        ? new Date(p.start_date + 'T12:00:00') 
        : p.created_at 
          ? new Date(p.created_at) 
          : p.invited_at 
            ? new Date(p.invited_at) 
            : null;
            
      const offboardDate = p.updated_at ? new Date(p.updated_at) : null;
      
      if (joinDate) {
        const joinY = joinDate.getFullYear();
        const joinM = joinDate.getMonth();
        if (timeframeMode === 'mensual') {
          if (joinY === selectedYear && joinM === selectedMonth) altas++;
        } else {
          if (joinY === selectedYear && joinM <= selectedMonth) altas++;
        }
      }
      
      if (p.status === 'disabled' && offboardDate) {
        const offboardY = offboardDate.getFullYear();
        const offboardM = offboardDate.getMonth();
        if (timeframeMode === 'mensual') {
          if (offboardY === selectedYear && offboardM === selectedMonth) bajas++;
        } else {
          if (offboardY === selectedYear && offboardM <= selectedMonth) bajas++;
        }
      }
    });
    return { altas, bajas, neto: altas - bajas };
  }, [officeProfiles, selectedYear, selectedMonth, timeframeMode]);

  // ── Period Commissions & Properties ──
  const periodCommissions = useMemo(() => {
    return commissions.filter(c => {
      const agentProfile = profiles.find(prof => prof.id === c.agent_id || prof.auth_user_id === c.agent_id);
      const office = agentProfile ? agentProfile.office : (c.office_code === 'R0700151' ? 'cero' : 'altitud');
      return office === selectedOffice && isDateInPeriod(c.closing_date);
    });
  }, [commissions, profiles, selectedOffice, selectedYear, selectedMonth, timeframeMode]);

  const periodProperties = useMemo(() => {
    return officeProperties.filter(p => isDateInPeriod(p.listing_contract_date || p.created_at));
  }, [officeProperties, selectedYear, selectedMonth, timeframeMode]);

  const periodReservations = useMemo(() => {
    return reservations.filter(r => {
      const agentProfile = profiles.find(prof => prof.id === r.agent_id || prof.auth_user_id === r.agent_id);
      const office = agentProfile ? agentProfile.office : 'altitud';
      return office === selectedOffice && isDateInPeriod(r.created_at || r.expected_sign_date);
    });
  }, [reservations, profiles, selectedOffice, selectedYear, selectedMonth, timeframeMode]);

  // ── HR Promedios (Normalized per active agent) ──
  const hrPromedios = useMemo(() => {
    const activeCount = Math.max(1, activeProfiles.length);

    // Antigüedad (Tenure in years)
    const periodEnd = new Date(selectedYear, selectedMonth + 1, 0);
    let totalTenureDays = 0;
    let tenureCount = 0;
    activeProfiles.forEach(p => {
      const joinDate = p.start_date 
        ? new Date(p.start_date + 'T12:00:00') 
        : p.created_at 
          ? new Date(p.created_at) 
          : p.invited_at 
            ? new Date(p.invited_at) 
            : null;
      if (joinDate && joinDate <= periodEnd) {
        const diffTime = periodEnd - joinDate;
        const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        totalTenureDays += days;
        tenureCount++;
      }
    });
    const avgTenureYears = tenureCount > 0 ? (totalTenureDays / 365) / tenureCount : 0;

    // Averages per active agent
    const captacionesPerAgent = periodProperties.length / activeCount;
    const transaccionesPerAgent = periodCommissions.length / activeCount;
    const netAgentAmount = periodCommissions.reduce((sum, c) => sum + (Number(c.agent_amount) || 0), 0);
    const ingresoPerAgent = netAgentAmount / activeCount;
    const reservasPerAgent = periodReservations.length / activeCount;

    return {
      tenure: avgTenureYears,
      captaciones: captacionesPerAgent,
      transacciones: transaccionesPerAgent,
      ingreso: ingresoPerAgent,
      reservas: reservasPerAgent
    };
  }, [activeProfiles, periodProperties, periodCommissions, periodReservations, selectedYear, selectedMonth]);

  // ── Cartera Activa, Rotación & Exclusividad ──
  const activeInPeriod = useMemo(() => {
    const periodEnd = new Date(selectedYear, selectedMonth + 1, 0);
    return officeProperties.filter(p => 
      (p.status === 'active' || p.status === 'published' || p.standard_status_id === 1) && 
      new Date(p.listing_contract_date || p.created_at) <= periodEnd
    );
  }, [officeProperties, selectedYear, selectedMonth]);

  const soldInPeriod = useMemo(() => {
    return officeProperties.filter(p => p.status === 'sold' && isDateInPeriod(p.sold_date || p.updated_at));
  }, [officeProperties, selectedYear, selectedMonth, timeframeMode]);

  const carteraMetrics = useMemo(() => {
    const activeCount = activeInPeriod.length;
    const soldCount = soldInPeriod.length;
    const exclusiveCount = activeInPeriod.filter(p => p.listing_agreement === true || p.listing_type === 'exclusive').length;

    const rotacionVentas = activeCount > 0 ? (soldCount / activeCount) * 100 : 0;
    const exclusivityPct = activeCount > 0 ? (exclusiveCount / activeCount) * 100 : 0;

    return {
      activa: activeCount,
      rotacion: rotacionVentas,
      exclusividad: exclusivityPct
    };
  }, [activeInPeriod, soldInPeriod]);

  // ── Nuevas Captaciones rolling 7 months trend ──
  const chartData7Months = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth();

      const monthProps = officeProperties.filter(p => {
        const pd = new Date(p.listing_contract_date || p.created_at);
        return pd.getFullYear() === yr && pd.getMonth() === mo;
      });

      const exclusives = monthProps.filter(p => p.listing_agreement === true || p.listing_type === 'exclusive').length;
      const canceladas = monthProps.filter(p => p.status === 'canceled' || p.status === 'cancelada').length;
      const noExclusives = monthProps.filter(p => 
        !(p.listing_agreement === true || p.listing_type === 'exclusive') && 
        !(p.status === 'canceled' || p.status === 'cancelada')
      ).length;

      list.push({
        label: MONTH_NAMES_ES[mo],
        exclusives,
        noExclusives,
        canceladas
      });
    }

    const avgExclusives = list.reduce((sum, item) => sum + item.exclusives, 0) / list.length;

    return {
      points: list,
      avgExclusives
    };
  }, [officeProperties, selectedYear, selectedMonth]);

  // ── P&L Calculations ──
  const plMetrics = useMemo(() => {
    // 1. Comisiones cobradas (GCI)
    const comisionesCobradas = periodCommissions.reduce((sum, c) => sum + (Number(c.gross_commission) || 0), 0);
    
    // 2. Comisiones pagadas (Agent amount)
    const comisionesPagadas = periodCommissions.reduce((sum, c) => sum + (Number(c.agent_amount) || 0), 0);
    
    // 3. Resultado por ventas
    const resultadoVentas = comisionesCobradas - comisionesPagadas;

    // 4. Ingreso por agente + otros
    const periodIncomes = expenses.filter(e => 
      e.transaction_type === 'income' && 
      e.status === 'received' && 
      isDateInPeriod(e.paid_date || e.due_date)
    );
    const databaseIncomes = periodIncomes.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const expectedFees = activeProfiles.reduce((sum, p) => {
      const fee = Number(p.monthly_fee) || 0;
      if (timeframeMode === 'mensual') {
        return sum + fee;
      } else {
        return sum + (fee * (selectedMonth + 1));
      }
    }, 0);

    const ingresoAgenteOtros = databaseIncomes > 0 ? databaseIncomes : expectedFees;

    // 5. Gastos variables
    const totalRccaFees = periodCommissions.reduce((sum, c) => sum + (Number(c.rcca_fee_amount) || 0), 0);
    const estimatedRcca = comisionesCobradas * 0.06;
    const gastosVariables = totalRccaFees > 0 ? totalRccaFees : estimatedRcca;

    // 6. Gastos operativos
    const periodExpenses = expenses.filter(e => 
      (e.transaction_type === 'expense' || !e.transaction_type) && 
      e.status === 'paid' && 
      isDateInPeriod(e.paid_date || e.due_date)
    );
    const gastosOperativos = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 7. Resultado neto
    const resultadoNeto = resultadoVentas + ingresoAgenteOtros - gastosVariables - gastosOperativos;

    // 8. Rentabilidad
    const totalRevenue = comisionesCobradas + ingresoAgenteOtros;
    const rentabilidad = totalRevenue > 0 ? (resultadoNeto / totalRevenue) * 100 : 0;

    return {
      comisionesCobradas,
      comisionesPagadas,
      resultadoVentas,
      ingresoAgenteOtros,
      gastosVariables,
      gastosOperativos,
      resultadoNeto,
      rentabilidad,
      facturado: comisionesCobradas
    };
  }, [periodCommissions, expenses, activeProfiles, selectedMonth, timeframeMode]);

  // ── Agent pocket commission net per month (YTD) ──
  const agentPovertyStatusYTD = useMemo(() => {
    const filteredProfiles = officeProfiles.filter(agent => {
      const name = (agent.full_name || '').toUpperCase();
      return name !== 'OTROS' && name !== 'AGENTE DESVINCULADO';
    });

    const mapped = filteredProfiles.map(agent => {
      const joinDate = agent.start_date 
        ? new Date(agent.start_date + 'T12:00:00') 
        : agent.created_at 
          ? new Date(agent.created_at) 
          : agent.invited_at 
            ? new Date(agent.invited_at) 
            : null;

      const agentYearComms = (commissions || []).filter(c => {
        if (!c.closing_date) return false;
        const cd = new Date(c.closing_date + 'T12:00:00');
        return cd.getFullYear() === selectedYear && cd.getMonth() <= selectedMonth && (c.agent_id === agent.id || c.agent_id === agent.auth_user_id);
      });

      const splitPct = parseAgentSplitPct(agent.commission_split || '45/55');
      const grossYTDSum = agentYearComms.reduce((sum, c) => sum + (Number(c.gross_commission) || 0), 0);
      const agentNetYTDSum = agentYearComms.reduce((sum, c) => sum + (Number(c.agent_amount) || ((Number(c.gross_commission) || 0) * splitPct)), 0);

      const activeMonths = (() => {
        if (joinDate && joinDate.getFullYear() > selectedYear) {
          if (grossYTDSum > 0) return Math.max(1, selectedMonth + 1);
          return 0;
        }
        if (!joinDate) return Math.max(1, selectedMonth + 1);
        if (joinDate.getFullYear() < selectedYear) {
          return Math.max(1, selectedMonth + 1);
        }
        if (joinDate.getFullYear() === selectedYear) {
          return Math.max(0, selectedMonth - joinDate.getMonth() + 1);
        }
        return 0;
      })();

      const avgMonthlyBilledNet = activeMonths > 0 ? agentNetYTDSum / activeMonths : 0;
      const isAbove = avgMonthlyBilledNet >= povertyLine;

      return {
        agent,
        joinDate,
        splitPct,
        agentNetYTDSum,
        avgMonthlyBilledNet,
        isAbove,
        povertyThreshold: povertyLine
      };
    });

    // Sort by join date ascending
    return mapped.sort((a, b) => {
      const timeA = a.joinDate ? a.joinDate.getTime() : Infinity;
      const timeB = b.joinDate ? b.joinDate.getTime() : Infinity;
      return timeA - timeB;
    });
  }, [officeProfiles, commissions, selectedYear, selectedMonth, povertyLine]);

  // ── Reservometro aggregations ──
  const { loiTotal, spaTotal, upcomingClosings } = useMemo(() => {
    let loi = 0;
    let spa = 0;
    const upcoming = [];
    reservations.filter(r => r.status === 'pending' || r.status === 'signed').forEach(r => {
      if (r.type === 'LOI') loi += Number(r.reservation_amount) || 0;
      if (r.type === 'SPA') spa += Number(r.reservation_amount) || 0;
      
      const ed = r.expected_sign_date ? new Date(r.expected_sign_date + 'T12:00:00') : null;
      if (ed && ed >= now) {
        upcoming.push(r);
      }
    });
    upcoming.sort((a,b) => new Date(a.expected_sign_date) - new Date(b.expected_sign_date));
    return { loiTotal: loi, spaTotal: spa, upcomingClosings: upcoming.slice(0, 5) };
  }, [reservations, now]);

  // ── Lead channels ──
  const { buyerSources, sellerSources } = useMemo(() => {
    const bSources = {};
    const sSources = {};
    inquiries.filter(i => i.status === 'converted').forEach(i => {
      const source = i.source || 'manual';
      if (i.lead_type === 'comprar' || i.lead_type === 'alquiler') {
        bSources[source] = (bSources[source] || 0) + 1;
      } else if (i.lead_type === 'vender' || i.lead_type === 'propiedad_especifica') {
        sSources[source] = (sSources[source] || 0) + 1;
      }
    });
    return { 
      buyerSources: Object.entries(bSources).map(([k,v]) => ({ name: k, count: v })).sort((a,b)=>b.count-a.count),
      sellerSources: Object.entries(sSources).map(([k,v]) => ({ name: k, count: v })).sort((a,b)=>b.count-a.count)
    };
  }, [inquiries]);

  // ── Portfolio rotation DOM average ──
  const { domOfficeAvg, domRecentTrend, agentDomList } = useMemo(() => {
    const soldProps = officeProperties.filter(p => p.status === 'sold');
    if (!soldProps.length) return { domOfficeAvg: 0, domRecentTrend: 0, agentDomList: [] };

    soldProps.sort((a, b) => new Date(b.sold_date || b.updated_at) - new Date(a.sold_date || a.updated_at));

    const doms = soldProps.map(p => ({
      ...p,
      dom: p.days_on_market !== null && p.days_on_market !== undefined 
        ? p.days_on_market 
        : Math.max(0, Math.floor((new Date(p.sold_date || p.updated_at) - new Date(p.listing_contract_date || p.created_at)) / 86400000))
    }));

    const avgDom = Math.round(doms.reduce((a, b) => a + b.dom, 0) / doms.length);
    
    let recentTrend = 0;
    if (doms.length > 3) {
      const recentAvg = Math.round(doms.slice(0, 3).reduce((a, b) => a + b.dom, 0) / 3);
      const olderAvg = Math.round(doms.slice(3).reduce((a, b) => a + b.dom, 0) / (doms.length - 3));
      recentTrend = recentAvg - olderAvg;
    }

    const agentMap = {};
    doms.forEach(p => {
      if (!p.agent_id) return;
      if (!agentMap[p.agent_id]) agentMap[p.agent_id] = { id: p.agent_id, doms: [] };
      agentMap[p.agent_id].doms.push(p.dom);
    });

    const agentDomList = Object.values(agentMap).map(a => {
      const profile = officeProfiles.find(prof => prof.id === a.id);
      return {
        id: a.id,
        name: profile ? profile.full_name : 'Desconocido',
        avatar: profile ? profile.avatar_url : null,
        avgDom: Math.round(a.doms.reduce((sum, val) => sum + val, 0) / a.doms.length),
        count: a.doms.length
      };
    }).sort((a, b) => a.avgDom - b.avgDom);

    return { domOfficeAvg: avgDom, domRecentTrend: recentTrend, agentDomList };
  }, [officeProperties, officeProfiles]);

  // ── Onboarding Ramp-up Productivity ──
  const { avgRampDays, agentRampList } = useMemo(() => {
    const officeAgents = officeProfiles.filter(p => p.role !== 'broker');
    if (!officeAgents.length) return { avgRampDays: 0, agentRampList: [] };

    let totalRampDays = 0;
    let countedAgents = 0;

    const list = officeAgents.map(p => {
      const joinDate = p.start_date 
        ? new Date(p.start_date + 'T12:00:00') 
        : p.created_at 
          ? new Date(p.created_at) 
          : p.invited_at 
            ? new Date(p.invited_at) 
            : null;

      if (!joinDate) return null;
      if (joinDate.getFullYear() > selectedYear) return null;

      const agentAllComms = commissions.filter(c => c.agent_id === p.id || c.agent_id === p.auth_user_id);
      
      let firstOpDate = null;
      let daysToFirstOp = null;
      let hasClosedOp = false;

      if (agentAllComms.length > 0) {
        const sortedComms = [...agentAllComms].sort((a, b) => {
          const dateA = new Date(a.closing_date || a.created_at);
          const dateB = new Date(b.closing_date || b.created_at);
          return dateA - dateB;
        });

        firstOpDate = new Date(sortedComms[0].closing_date || sortedComms[0].created_at);
        
        if (firstOpDate.getFullYear() === selectedYear) {
          const diffTime = firstOpDate - joinDate;
          daysToFirstOp = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          totalRampDays += daysToFirstOp;
          countedAgents++;
          hasClosedOp = true;
        } else if (firstOpDate.getFullYear() < selectedYear) {
          const diffTime = firstOpDate - joinDate;
          daysToFirstOp = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          hasClosedOp = true;
        } else {
          const endDate = new Date(selectedYear, selectedMonth, 28);
          const diffTime = endDate - joinDate;
          daysToFirstOp = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          hasClosedOp = false;
        }
      } else {
        const endDate = selectedYear === actualYear ? now : new Date(selectedYear, selectedMonth, 28);
        const diffTime = endDate - joinDate;
        daysToFirstOp = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        hasClosedOp = false;
      }

      return {
        id: p.id,
        name: p.full_name,
        avatar: p.avatar_url,
        daysToFirstOp,
        hasClosedOp,
        joinDateStr: joinDate.toLocaleDateString(),
        firstOpDateStr: firstOpDate ? firstOpDate.toLocaleDateString() : null
      };
    }).filter(Boolean);

    const sortedRampList = list.sort((a, b) => {
      if (a.hasClosedOp && b.hasClosedOp) return a.daysToFirstOp - b.daysToFirstOp;
      if (a.hasClosedOp && !b.hasClosedOp) return -1;
      if (!a.hasClosedOp && b.hasClosedOp) return 1;
      return b.daysToFirstOp - a.daysToFirstOp;
    });

    const avg = countedAgents > 0 ? Math.round(totalRampDays / countedAgents) : 0;

    return {
      avgRampDays: avg,
      agentRampList: sortedRampList
    };
  }, [officeProfiles, commissions, selectedYear, selectedMonth, actualYear, now]);

  // ── Top agent lists ──
  const { topMonth, topYear } = useMemo(() => {
    const agentMapMonth = {};
    const agentMapYear = {};
    
    commissions.forEach(c => {
      const d = new Date(c.closing_date + 'T12:00:00');
      const aid = c.agent_id;
      const isListing = c.side === 'listing' || c.side === 'both';
      const isSelling = c.side === 'selling' || c.side === 'both';
      const amt = Number(c.side_amount || c.gross_commission) || 0;

      if (!agentMapYear[aid]) agentMapYear[aid] = { id: aid, name: c.profiles?.full_name, avatar: c.profiles?.avatar_url, status: c.profiles?.status, listAmt: 0, sellAmt: 0 };
      if (!agentMapMonth[aid]) agentMapMonth[aid] = { id: aid, name: c.profiles?.full_name, avatar: c.profiles?.avatar_url, status: c.profiles?.status, listAmt: 0, sellAmt: 0 };

      if (d.getFullYear() === selectedYear) {
        if (isListing) agentMapYear[aid].listAmt += amt;
        if (isSelling) agentMapYear[aid].sellAmt += amt;
        
        if (d.getMonth() === selectedMonth) {
          if (isListing) agentMapMonth[aid].listAmt += amt;
          if (isSelling) agentMapMonth[aid].sellAmt += amt;
        }
      }
    });

    const sortAgents = (map, key) => Object.values(map).sort((a,b) => b[key] - a[key]).slice(0,3);

    return {
      topMonth: {
        listers: sortAgents(agentMapMonth, 'listAmt'),
        closers: sortAgents(agentMapMonth, 'sellAmt')
      },
      topYear: {
        listers: sortAgents(agentMapYear, 'listAmt'),
        closers: sortAgents(agentMapYear, 'sellAmt')
      }
    };
  }, [commissions, selectedYear, selectedMonth]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in text-slate-800 dark:text-slate-100">
      
      {/* ── Top Header Controls ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-50 dark:bg-slate-900/60 p-5 rounded-[32px] border border-slate-200/50 dark:border-slate-700/40 gap-4 shadow-sm backdrop-blur-sm">
        <div>
          <h2 className="text-sm font-black italic uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <span>📊</span> Panel de Rendimiento y Rendición
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Analítica de Oficina, Recursos Humanos, P&L de Cartera e Ingresos
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          {/* Year select */}
          <div className="flex bg-slate-200/60 dark:bg-slate-800 rounded-xl p-1 shadow-inner border border-slate-300/40 dark:border-slate-700/50">
            {[2025, 2026].map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedYear === yr
                    ? 'bg-white dark:bg-slate-700 text-nexus-blue shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Month select dropdown */}
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-nexus-blue"
          >
            {MONTH_NAMES_ES.map((lbl, idx) => (
              <option key={idx} value={idx}>{lbl.toUpperCase()}</option>
            ))}
          </select>

          {/* Timeframe pill toggle */}
          <div className="flex bg-slate-250 dark:bg-slate-800 rounded-xl p-1 shadow-inner border border-slate-300/40 dark:border-slate-700/50">
            <button
              onClick={() => setTimeframeMode('mensual')}
              className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                timeframeMode === 'mensual'
                  ? 'bg-nexus-blue text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setTimeframeMode('acumulado')}
              className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                timeframeMode === 'acumulado'
                  ? 'bg-nexus-blue text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              Acumulado
            </button>
          </div>
        </div>
      </div>

      {/* ── Two-Column Row (HR Block & Nuevas Captaciones Block) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Recursos Humanos Block (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div className="bg-white dark:bg-slate-800/80 rounded-[32px] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700/50 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  👥 Recursos Humanos
                </h3>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                  {timeframeMode === 'mensual' ? 'Mes' : 'Acumulado'}
                </span>
              </div>

              {/* Total Agents Large number */}
              <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-700/40">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total de agentes</p>
                  <h4 className="text-3xl font-black italic text-slate-900 dark:text-white leading-none mt-0.5">{activeProfiles.length}</h4>
                </div>
              </div>

              {/* Split Distribution Row */}
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Composición de Splits activos</p>
              <div className="grid grid-cols-5 gap-1.5 mb-5 text-center">
                <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-700/40">
                  <h5 className="text-[8px] font-bold text-slate-400 tracking-wider">RAPP</h5>
                  <p className="text-base font-black text-blue-500 tabular-nums">{splitCounts.rapp}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-700/40">
                  <h5 className="text-[8px] font-bold text-slate-400 tracking-wider">ALTO</h5>
                  <p className="text-base font-black text-indigo-500 tabular-nums">{splitCounts.alto}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-700/40">
                  <h5 className="text-[8px] font-bold text-slate-400 tracking-wider">PURO</h5>
                  <p className="text-base font-black text-slate-700 dark:text-slate-300 tabular-nums">{splitCounts.puro}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-700/40">
                  <h5 className="text-[8px] font-bold text-slate-400 tracking-wider">100%</h5>
                  <p className="text-base font-black text-emerald-500 tabular-nums">{splitCounts.pct100}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-700/40">
                  <h5 className="text-[8px] font-bold text-slate-400 tracking-wider">EQUIPO</h5>
                  <p className="text-base font-black text-purple-500 tabular-nums">{splitCounts.equipo}</p>
                </div>
              </div>

              {/* Rotación Box */}
              <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4.5 border border-slate-150 dark:border-slate-700/50 mb-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Tendencia de Rotación</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <h5 className="text-[8px] font-black uppercase text-emerald-500 tracking-wider">Altas</h5>
                    <p className="text-lg font-black text-emerald-500 leading-none mt-0.5 tabular-nums">+{rotationMetrics.altas}</p>
                  </div>
                  <div className="border-l border-r border-slate-200 dark:border-slate-700">
                    <h5 className="text-[8px] font-black uppercase text-red-500 tracking-wider">Bajas</h5>
                    <p className="text-lg font-black text-red-500 leading-none mt-0.5 tabular-nums">-{rotationMetrics.bajas}</p>
                  </div>
                  <div>
                    <h5 className="text-[8px] font-black uppercase text-nexus-blue tracking-wider">Crecimiento</h5>
                    <p className={`text-lg font-black leading-none mt-0.5 tabular-nums ${rotationMetrics.neto >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {rotationMetrics.neto >= 0 ? '+' : ''}{rotationMetrics.neto}
                    </p>
                  </div>
                </div>
              </div>

              {/* Promedios */}
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Promedios de Equipo (por agente)</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10 p-2 rounded-xl border border-slate-100 dark:border-slate-700/30 text-xs">
                  <span className="text-slate-400 font-medium">Antigüedad REMAX</span>
                  <span className="font-black text-slate-800 dark:text-white tabular-nums bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{hrPromedios.tenure.toFixed(1)} a</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10 p-2 rounded-xl border border-slate-100 dark:border-slate-700/30 text-xs">
                  <span className="text-slate-400 font-medium">Captaciones</span>
                  <span className="font-black text-slate-800 dark:text-white tabular-nums bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{hrPromedios.captaciones.toFixed(1)} / ag</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10 p-2 rounded-xl border border-slate-100 dark:border-slate-700/30 text-xs">
                  <span className="text-slate-400 font-medium">Transacciones</span>
                  <span className="font-black text-slate-800 dark:text-white tabular-nums bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{hrPromedios.transacciones.toFixed(1)} / ag</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10 p-2 rounded-xl border border-slate-100 dark:border-slate-700/30 text-xs">
                  <span className="text-slate-400 font-medium">Ingreso promedio</span>
                  <span className="font-black text-emerald-500 tabular-nums bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{fmtCurrency(hrPromedios.ingreso)} / ag</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10 p-2 rounded-xl border border-slate-100 dark:border-slate-700/30 text-xs">
                  <span className="text-slate-400 font-medium">Reservas</span>
                  <span className="font-black text-amber-500 tabular-nums bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{hrPromedios.reservas.toFixed(1)} / ag</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Nuevas Captaciones Block (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <div className="bg-white dark:bg-slate-800/80 rounded-[32px] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700/50 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  📈 Nuevas Captaciones (Últimos 7 meses)
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500" />
                    <span className="text-[8px] font-bold text-slate-450 uppercase">Excl.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                    <span className="text-[8px] font-bold text-slate-450 uppercase">No Excl.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-red-500" />
                    <span className="text-[8px] font-bold text-slate-450 uppercase">Canc.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-4 h-0.5 border-t border-dashed border-slate-400" />
                    <span className="text-[8px] font-bold text-slate-450 uppercase">Promedio</span>
                  </div>
                </div>
              </div>

              {/* Inline SVG Chart for trend */}
              <div className="w-full h-52 relative">
                {(() => {
                  const data = chartData7Months.points;
                  const maxVal = Math.max(
                    ...data.map(d => Math.max(d.exclusives, d.noExclusives, d.canceladas)),
                    5
                  ) * 1.15;

                  const svgW = 600;
                  const svgH = 200;
                  const padL = 40;
                  const padR = 20;
                  const padT = 20;
                  const padB = 40;

                  const chartW = svgW - padL - padR;
                  const chartH = svgH - padT - padB;

                  const getX = (idx) => padL + (idx * (chartW / (data.length - 1)));
                  const getY = (val) => svgH - padB - ((val / maxVal) * chartH);

                  // Create path definitions
                  const exclusivePoints = data.map((d, i) => `${getX(i)},${getY(d.exclusives)}`).join(' ');
                  const noExclusivePoints = data.map((d, i) => `${getX(i)},${getY(d.noExclusives)}`).join(' ');
                  const canceladasPoints = data.map((d, i) => `${getX(i)},${getY(d.canceladas)}`).join(' ');

                  const exclusiveArea = `${getX(0)},${svgH - padB} ${exclusivePoints} ${getX(data.length - 1)},${svgH - padB}`;
                  const noExclusiveArea = `${getX(0)},${svgH - padB} ${noExclusivePoints} ${getX(data.length - 1)},${svgH - padB}`;

                  const ticks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

                  return (
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="100%" className="overflow-visible select-none font-sans">
                      <defs>
                        <linearGradient id="exclAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="noExclAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.10" />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      {ticks.map((tick, i) => {
                        const y = getY(tick);
                        return (
                          <g key={i} className="opacity-30 dark:opacity-10">
                            <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="currentColor" strokeWidth="1" strokeDasharray="3" className="text-slate-350 dark:text-slate-650" />
                            <text x={padL - 10} y={y + 3} textAnchor="end" className="text-[9px] font-bold fill-slate-400 dark:fill-slate-500 tabular-nums">{Math.round(tick)}</text>
                          </g>
                        );
                      })}

                      {/* Areas */}
                      <polygon points={exclusiveArea} fill="url(#exclAreaGrad)" />
                      <polygon points={noExclusiveArea} fill="url(#noExclAreaGrad)" />

                      {/* Lines */}
                      <polyline points={exclusivePoints} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points={noExclusivePoints} fill="none" stroke="#f59e0b" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points={canceladasPoints} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Promedio Line */}
                      <line x1={padL} y1={getY(chartData7Months.avgExclusives)} x2={svgW - padR} y2={getY(chartData7Months.avgExclusives)} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" />

                      {/* X labels & Dots */}
                      {data.map((item, idx) => {
                        const x = getX(idx);
                        return (
                          <g key={idx}>
                            <text x={x} y={svgH - 12} textAnchor="middle" className="text-[9px] font-black uppercase tracking-wider fill-slate-400 dark:fill-slate-500">{item.label}</text>
                            
                            {/* Interactive Data Dots */}
                            <circle cx={x} cy={getY(item.exclusives)} r="3" className="fill-blue-500 hover:r-5 cursor-pointer transition-all" />
                            <circle cx={x} cy={getY(item.noExclusives)} r="3" className="fill-amber-500 hover:r-5 cursor-pointer transition-all" />
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>

              {/* Información de cartera */}
              <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-4.5 border border-slate-100 dark:border-slate-700/50 mt-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Información de cartera</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <h5 className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Cartera activa</h5>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-none tabular-nums">{carteraMetrics.activa}</p>
                    <p className="text-[8px] text-slate-400 mt-1 uppercase">Propiedades activas</p>
                  </div>
                  <div className="border-l border-r border-slate-200 dark:border-slate-700">
                    <h5 className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Rotación de ventas</h5>
                    <p className="text-xl font-black text-emerald-500 mt-1 leading-none tabular-nums">{fmtPercent(carteraMetrics.rotacion)}</p>
                    <p className="text-[8px] text-slate-400 mt-1 uppercase">Vendidas vs Activas</p>
                  </div>
                  <div>
                    <h5 className="text-[8px] font-black uppercase text-slate-450 tracking-wider">% de exclusividad</h5>
                    <p className="text-xl font-black text-blue-500 mt-1 leading-none tabular-nums">{fmtPercent(carteraMetrics.exclusividad)}</p>
                    <p className="text-[8px] text-slate-400 mt-1 uppercase">Exclusivas totales</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* ── Profit & Loss (P&L) Block ── */}
      <div className="bg-white dark:bg-slate-800/85 rounded-[32px] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3 mb-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
            📊 Profit & Loss (P&L) de Operación
          </h3>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-700/60 px-2.5 py-0.5 rounded">
            {timeframeMode === 'mensual' ? 'Mensual' : 'Acumulado'} YTD
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Ingresos (+) */}
          <div className="bg-slate-50/40 dark:bg-slate-900/10 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/40">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-3.5 flex justify-between items-center">
              <span>🟢 Ingresos de Oficina</span>
              <span className="text-xs tabular-nums font-black">+{fmtCurrency(plMetrics.comisionesCobradas + plMetrics.ingresoAgenteOtros)}</span>
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-550 dark:text-slate-400 font-medium">Comisiones Cobradas (GCI)</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">+{fmtCurrency(plMetrics.comisionesCobradas)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-150/40 dark:border-slate-700/40 pt-2.5">
                <span className="text-slate-550 dark:text-slate-400 font-medium">Fee Mensual por Agente</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">+{fmtCurrency(plMetrics.ingresoAgenteOtros)}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Egresos (-) */}
          <div className="bg-slate-50/40 dark:bg-slate-900/10 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/40">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-3.5 flex justify-between items-center">
              <span>🔴 Gastos y Repartos</span>
              <span className="text-xs tabular-nums font-black">-{fmtCurrency(plMetrics.comisionesPagadas + plMetrics.gastosVariables + plMetrics.gastosOperativos)}</span>
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-550 dark:text-slate-400 font-medium">Comisiones Pagadas (Split)</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">-{fmtCurrency(plMetrics.comisionesPagadas)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-150/40 dark:border-slate-700/40 pt-2.5">
                <span className="text-slate-550 dark:text-slate-400 font-medium">Gastos Variables (RCCA)</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">-{fmtCurrency(plMetrics.gastosVariables)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-150/40 dark:border-slate-700/40 pt-2.5">
                <span className="text-slate-550 dark:text-slate-400 font-medium">Gastos Operativos (Fijos)</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">-{fmtCurrency(plMetrics.gastosOperativos)}</span>
              </div>
            </div>
          </div>

          {/* Column 3: Highlighted Result Cards */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl p-4 border border-blue-100/50 dark:border-blue-900/30">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none">Resultado de ventas</p>
              <h4 className="text-base font-black italic text-nexus-blue mt-1.5 leading-none tabular-nums">
                {fmtCurrency(plMetrics.resultadoVentas)}
              </h4>
              <p className="text-[7.5px] text-slate-400 mt-1 uppercase font-semibold">GCI neto de Splits</p>
            </div>
            
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-100/50 dark:border-emerald-900/30">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none">Resultado Neto</p>
              <h4 className="text-base font-black italic text-emerald-500 mt-1.5 leading-none tabular-nums">
                {fmtCurrency(plMetrics.resultadoNeto)}
              </h4>
              <p className="text-[7.5px] text-slate-400 mt-1 uppercase font-semibold">Ingreso real neto de oficina</p>
            </div>

            <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl p-4 border border-purple-100/50 dark:border-purple-900/30">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none">Rentabilidad</p>
              <h4 className="text-base font-black italic text-purple-500 mt-1.5 leading-none tabular-nums">
                {fmtPercent(plMetrics.rentabilidad)}
              </h4>
              <p className="text-[7.5px] text-slate-400 mt-1 uppercase font-semibold">Neto / total ingresos</p>
            </div>

            <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-100/50 dark:border-amber-900/30">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none">Facturado total</p>
              <h4 className="text-base font-black italic text-amber-500 mt-1.5 leading-none tabular-nums">
                {fmtCurrency(plMetrics.facturado)}
              </h4>
              <p className="text-[7.5px] text-slate-400 mt-1 uppercase font-semibold">GCI bruto total</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ingreso Bolsillo por Agente por Mes Bar Chart ── */}
      {officeProfiles && officeProfiles.length > 0 && (
        <div className="bg-white dark:bg-slate-800/85 rounded-[32px] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4 mb-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>📊</span> Ingreso Bolsillo por Agente por Mes ({selectedYear === actualYear ? 'YTD' : selectedYear})
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                Ingreso neto promedio mensual de bolsillo (según split) vs. la línea de pobreza de <span className="text-nexus-blue">{fmtCurrency(povertyLine)}/mes</span>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Vive de esto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500 inline-block" />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Bajo la línea</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Línea Pobreza</span>
              </div>
            </div>
          </div>
 
          <div className="w-full overflow-x-auto">
            <div className="min-w-[650px] h-[340px] relative">
              {(() => {
                const data = agentPovertyStatusYTD;
                const maxY = Math.max(
                  ...data.map(d => d.avgMonthlyBilledNet),
                  povertyLine,
                  1000
                ) * 1.15; // Give 15% headroom at the top

                const svgW = 800;
                const svgH = 320;
                const padL = 65;
                const padR = 40;
                const padT = 30;
                const padB = 75;

                const chartW = svgW - padL - padR;
                const chartH = svgH - padT - padB;

                const getY = (val) => svgH - padB - ((val / maxY) * chartH);
                const getX = (idx) => padL + (idx * (chartW / data.length)) + ((chartW / data.length) - barW) / 2;

                const barW = Math.max(12, Math.min(32, (chartW / data.length) * 0.55));
                
                // Y axis ticks (0, 25%, 50%, 75%, 100% of maxY)
                const ticks = [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY];

                return (
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="100%" className="overflow-visible select-none">
                    <defs>
                      <linearGradient id="aboveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="belowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid Lines & Y-axis Labels */}
                    {ticks.map((tick, i) => {
                      const y = getY(tick);
                      return (
                        <g key={i} className="opacity-40 dark:opacity-20">
                          <line 
                            x1={padL} 
                            y1={y} 
                            x2={svgW - padR} 
                            y2={y} 
                            stroke="currentColor" 
                            strokeWidth="1" 
                            strokeDasharray={tick === 0 ? "0" : "4"}
                            className="text-slate-300 dark:text-slate-650"
                          />
                          <text 
                            x={padL - 10} 
                            y={y + 4} 
                            textAnchor="end" 
                            className="text-[9px] font-bold fill-slate-400 dark:fill-slate-500 font-sans tabular-nums"
                          >
                            {tick === 0 ? '$0' : `$${Math.round(tick).toLocaleString()}`}
                          </text>
                        </g>
                      );
                    })}

                    {/* Poverty Line (Grey dashed line) */}
                    {povertyLine > 0 && (
                      <g>
                        <line 
                          x1={padL} 
                          y1={getY(povertyLine)} 
                          x2={svgW - padR} 
                          y2={getY(povertyLine)} 
                          stroke="#94a3b8" 
                          strokeWidth="2" 
                          strokeDasharray="6 4"
                        />
                        <text 
                          x={svgW - padR - 5} 
                          y={getY(povertyLine) - 6} 
                          textAnchor="end" 
                          className="text-[9px] font-black fill-slate-500 dark:fill-slate-400 font-sans uppercase tracking-widest"
                        >
                          Línea de Pobreza: {fmtCurrency(povertyLine)}
                        </text>
                      </g>
                    )}

                    {/* Bars & X-axis Agent Labels */}
                    {data.map((item, idx) => {
                      const x = getX(idx);
                      const y = getY(item.avgMonthlyBilledNet);
                      const height = svgH - padB - y;
                      const isAbove = item.avgMonthlyBilledNet >= povertyLine;
                      
                      const fullName = item.agent?.full_name || 'Agente';
                      const displayName = fullName.length > 15 ? fullName.slice(0, 13) + '...' : fullName;

                      return (
                        <g key={item.agent?.id || idx} className="group cursor-pointer">
                          {/* Bar */}
                          <rect
                            x={x}
                            y={y}
                            width={barW}
                            height={Math.max(2, height)}
                            rx="4"
                            fill={isAbove ? "url(#aboveGrad)" : "url(#belowGrad)"}
                            className="transition-all duration-300 hover:brightness-105"
                          />

                          {/* Value label on top of bar */}
                          <text
                            x={x + barW / 2}
                            y={y - 6}
                            textAnchor="middle"
                            className="text-[8px] font-black fill-slate-755 dark:fill-slate-205 font-sans opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            {fmtCurrency(item.avgMonthlyBilledNet)}
                          </text>

                          {/* X-axis Label */}
                          <text
                            x={x + barW / 2}
                            y={svgH - padB + 16}
                            textAnchor="end"
                            transform={`rotate(-28, ${x + barW / 2}, ${svgH - padB + 16})`}
                            className="text-[9px] font-black fill-slate-650 dark:fill-slate-350 uppercase tracking-wider font-sans"
                          >
                            {displayName}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Reservoir, channels, onboarding productivity, dom averages, ranking rankings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Leads Convertidos & Reservómetro */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Origen de Leads Convertidos (Canales)</h4>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[9px] font-bold text-slate-505 mb-2 uppercase tracking-wide">Compradores</p>
              {buyerSources.length === 0 ? <p className="text-[10px] text-slate-400 italic">No hay datos</p> : buyerSources.map((s,i) => (
                <div key={i} className="flex justify-between items-center mb-1 text-xs">
                  <span className="text-slate-600 dark:text-slate-300 capitalize">{s.name}</span>
                  <span className="font-black text-slate-900 dark:text-white">{s.count}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-505 mb-2 uppercase tracking-wide">Vendedores</p>
              {sellerSources.length === 0 ? <p className="text-[10px] text-slate-400 italic">No hay datos</p> : sellerSources.map((s,i) => (
                <div key={i} className="flex justify-between items-center mb-1 text-xs">
                  <span className="text-slate-600 dark:text-slate-300 capitalize">{s.name}</span>
                  <span className="font-black text-slate-900 dark:text-white">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Reservómetro</h4>
            <div className="space-y-3">
              <GaugeBar label="LOI Firmadas" value={loiTotal} max={loiTotal + spaTotal || 1} color="bg-amber-500" />
              <GaugeBar label="SPA Firmadas" value={spaTotal} max={loiTotal + spaTotal || 1} color="bg-emerald-500" />
            </div>
          </div>
        </div>

        {/* Expenses & Upcoming Closings */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between">
              <span>Gastos del periodo</span>
              <span className="text-red-500 font-bold">${plMetrics.gastosOperativos.toLocaleString()}</span>
            </h4>
            <div className="space-y-3">
              {expenses.filter(e => (e.transaction_type === 'expense' || !e.transaction_type) && e.status === 'paid' && isDateInPeriod(e.paid_date || e.due_date)).length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No hay gastos registrados en el periodo</p>
              ) : expenses.filter(e => (e.transaction_type === 'expense' || !e.transaction_type) && e.status === 'paid' && isDateInPeriod(e.paid_date || e.due_date)).slice(0, 4).map((ex, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-350 truncate pr-2">{ex.description}</span>
                  <span className="font-bold text-slate-800 dark:text-white tabular-nums">${Number(ex.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
            <h5 className="text-[9px] font-bold text-slate-500 uppercase mb-2.5">Próximos Cierres</h5>
            <div className="space-y-2">
              {upcomingClosings.length === 0 ? <p className="text-[10px] text-slate-400 italic">No hay cierres programados</p> : upcomingClosings.map(r => (
                <div key={r.id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30 text-xs">
                  <div className="truncate pr-2">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{r.property_address || 'Propiedad'}</p>
                    <p className="text-[9px] text-slate-500">{new Date(r.expected_sign_date).toLocaleDateString()}</p>
                  </div>
                  <span className="font-black text-nexus-blue tabular-nums">${r.reservation_amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Days on Market & Ramp Up ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DOM averaged card */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50 flex flex-col justify-between">
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
              <span>⏳ Rotación de Cartera (Days on Market)</span>
              <div className="flex items-end gap-2 text-right">
                <span className="text-[10px] uppercase text-slate-450">Promedio Oficina</span>
                <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums leading-none">{domOfficeAvg}d</span>
              </div>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1 relative overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-700 flex flex-col justify-center min-h-[110px]">
                 <p className="text-[9px] font-bold text-slate-505 uppercase tracking-widest mb-1 relative z-10">Tendencia</p>
                 <div className="flex items-end gap-2 relative z-10">
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                     {domOfficeAvg}
                     <span className="text-xs font-normal text-slate-500 ml-1">días</span>
                   </h3>
                   {agentDomList.length > 0 && (
                     <span className={`text-[10px] font-bold mb-0.5 ${domRecentTrend <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                       {domRecentTrend <= 0 ? '↓' : '↑'} {Math.abs(domRecentTrend)}d
                     </span>
                   )}
                 </div>
                 <div className="absolute bottom-0 left-0 right-0 h-14 opacity-20 pointer-events-none">
                   <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                     <polyline points={domRecentTrend <= 0 ? "0,25 25,20 50,22 75,10 100,5" : "0,5 25,10 50,8 75,20 100,25"} fill="none" stroke={domRecentTrend <= 0 ? "#10b981" : "#ef4444"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                   </svg>
                 </div>
              </div>

              <div className="sm:col-span-2">
                <h5 className="text-[9px] font-bold text-slate-500 uppercase mb-2">Promedio por Agente</h5>
                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                  {agentDomList.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No hay propiedades vendidas</p>
                  ) : (
                    agentDomList.slice(0, 3).map((a, i) => (
                      <div key={a.id} className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/35 border border-slate-100 dark:border-slate-700/60">
                        <div className="relative">
                          <Image src={a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}`} className="w-7 h-7 rounded-full object-cover" alt="" width={28} height={28} />
                          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black border border-white dark:border-slate-800 ${a.avgDom <= 90 ? 'bg-emerald-500 text-white' : a.avgDom <= 180 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
                            {i+1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                          <p className="text-[8px] text-slate-400 uppercase tracking-wider">{a.count} ventas</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-black tabular-nums ${a.avgDom <= 90 ? 'text-emerald-600 dark:text-emerald-400' : a.avgDom <= 180 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{a.avgDom}d</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ramp Up card */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50 flex flex-col justify-between">
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
              <span>⚡ Tiempo Promedio para Primera Rendición</span>
              <div className="flex items-end gap-2 text-right">
                <span className="text-[10px] uppercase text-slate-450">Promedio Equipo</span>
                <span className="text-sm font-black text-indigo-650 dark:text-indigo-400 tabular-nums leading-none">{avgRampDays}d</span>
              </div>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1 relative overflow-hidden rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 p-4 border border-indigo-100/50 dark:border-indigo-900/30 flex flex-col justify-center min-h-[110px]">
                 <p className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1 relative z-10">Promedio Equipo</p>
                 <div className="flex items-baseline gap-1 relative z-10">
                   <h3 className="text-2xl font-black text-indigo-650 dark:text-indigo-400 tabular-nums leading-none">
                     {avgRampDays}
                   </h3>
                   <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase">días</span>
                 </div>
                 <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-2 uppercase font-semibold leading-tight relative z-10">
                   Desde ingreso hasta primera transacción.
                 </p>
              </div>

              <div className="sm:col-span-2">
                <h5 className="text-[9px] font-bold text-slate-505 uppercase mb-2">Ramp-Up por Agente</h5>
                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                  {agentRampList.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No hay agentes registrados</p>
                  ) : (
                    agentRampList.slice(0, 3).map((a, i) => (
                      <div key={a.id} className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/35 border border-slate-100 dark:border-slate-700/60">
                        <div className="relative">
                          <Image src={a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}`} className="w-7 h-7 rounded-full object-cover" alt="" width={28} height={28} />
                          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black border border-white dark:border-slate-800 ${a.hasClosedOp ? 'bg-indigo-500 text-white' : 'bg-slate-400 text-white'}`}>
                            {i+1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                          <p className="text-[8px] text-slate-400 uppercase tracking-wider">{a.hasClosedOp ? 'Primera Transacción' : 'En Ramp-up'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-black tabular-nums ${a.hasClosedOp ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-450'}`}>{a.daysToFirstOp}d</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Top Agents Rankings ── */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">🏆 Ranking de Agentes</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Top Mes Captadores */}
          <div>
            <h5 className="text-[10px] font-bold text-nexus-blue uppercase mb-3 text-center bg-blue-50 dark:bg-blue-900/20 py-1.5 rounded-lg">Top Captadores (Mes)</h5>
            <div className="space-y-2">
              {topMonth.listers.filter(a=>a.listAmt>0).length > 0 ? (
                topMonth.listers.filter(a=>a.listAmt>0).map((a,i) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 w-3">{i+1}.</span>
                    <Image src={a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}`} className="w-6 h-6 rounded-full" alt="" width={24} height={24} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                        {a.status === 'disabled' && (
                          <span className="px-1 py-0.2 rounded text-[7px] font-black bg-red-150 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex-shrink-0">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-505 font-bold">${a.listAmt.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-2">No hay registros</p>
              )}
            </div>
          </div>
          
          {/* Top Mes Cierres */}
          <div>
            <h5 className="text-[10px] font-bold text-emerald-600 uppercase mb-3 text-center bg-emerald-50 dark:bg-emerald-900/20 py-1.5 rounded-lg">Top Cierres (Mes)</h5>
            <div className="space-y-2">
              {topMonth.closers.filter(a=>a.sellAmt>0).length > 0 ? (
                topMonth.closers.filter(a=>a.sellAmt>0).map((a,i) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 w-3">{i+1}.</span>
                    <Image src={a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}`} className="w-6 h-6 rounded-full" alt="" width={24} height={24} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                        {a.status === 'disabled' && (
                          <span className="px-1 py-0.2 rounded text-[7px] font-black bg-red-150 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex-shrink-0">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-550 font-bold">${a.sellAmt.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-2">No hay registros</p>
              )}
            </div>
          </div>
 
          {/* Top Año Captadores */}
          <div>
            <h5 className="text-[10px] font-bold text-purple-600 uppercase mb-3 text-center bg-purple-50 dark:bg-purple-900/20 py-1.5 rounded-lg">
              {selectedYear === actualYear ? "Top Captadores (YTD)" : `Top Captadores (${selectedYear})`}
            </h5>
            <div className="space-y-2">
              {topYear.listers.filter(a=>a.listAmt>0).length > 0 ? (
                topYear.listers.filter(a=>a.listAmt>0).map((a,i) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 w-3">{i+1}.</span>
                    <Image src={a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}`} className="w-6 h-6 rounded-full" alt="" width={24} height={24} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                        {a.status === 'disabled' && (
                          <span className="px-1 py-0.2 rounded text-[7px] font-black bg-red-150 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex-shrink-0">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-550 font-bold">${a.listAmt.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-2">No hay registros</p>
              )}
            </div>
          </div>
 
          {/* Top Año Cierres */}
          <div>
            <h5 className="text-[10px] font-bold text-amber-600 uppercase mb-3 text-center bg-amber-50 dark:bg-amber-900/20 py-1.5 rounded-lg">
              {selectedYear === actualYear ? "Top Cierres (YTD)" : `Top Cierres (${selectedYear})`}
            </h5>
            <div className="space-y-2">
              {topYear.closers.filter(a=>a.sellAmt>0).length > 0 ? (
                topYear.closers.filter(a=>a.sellAmt>0).map((a,i) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 w-3">{i+1}.</span>
                    <Image src={a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}`} className="w-6 h-6 rounded-full" alt="" width={24} height={24} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                        {a.status === 'disabled' && (
                          <span className="px-1 py-0.2 rounded text-[7px] font-black bg-red-150 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex-shrink-0">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-550 font-bold">${a.sellAmt.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-2">No hay registros</p>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
