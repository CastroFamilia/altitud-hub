"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getOfficeBusinessPlans } from '@/lib/dal/office';
import Image from 'next/image';
import { useApp } from '@/lib/context';

/* ═══════════════════════════════════════
   DASHBOARD TAB — Office Metrics & KPIs
   ═══════════════════════════════════════ */

const MONTH_NAMES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ label, value, rawValue, target, color = 'text-slate-900 dark:text-white', subtitle, icon }) {
  const pct = target > 0 && rawValue !== undefined ? Math.min((Number(rawValue) / target) * 100, 100) : null;
  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 shadow-sm border border-slate-200/60 dark:border-slate-700/50 group hover:shadow-lg hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">{label}</p>
          <h3 className={`text-2xl font-black italic mt-1.5 ${color} tabular-nums`}>{value}</h3>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 transition-colors shrink-0 ml-2">
            {icon}
          </div>
        )}
      </div>
      {target > 0 && pct !== null && (
        <div className="mt-3">
          <div className="flex justify-between text-[9px] mb-1 font-bold">
            <span className="text-slate-400">Meta: ${(target).toLocaleString()}</span>
            <span className={pct >= 100 ? 'text-emerald-500' : 'text-slate-500'}>{Math.round(pct)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 100 ? 'bg-emerald-500' : 'bg-nexus-blue'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function MiniBarChart({ data, labels, lang, color = 'bg-nexus-blue' }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold text-slate-500 tabular-nums">${(val/1000).toFixed(1)}k</span>
          <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-t-md overflow-hidden flex-1 flex items-end">
            <div
              className={`w-full ${color} rounded-t-md transition-all duration-700 ease-out opacity-85 hover:opacity-100`}
              style={{ height: `${Math.max((val / max) * 100, 4)}%` }}
            />
          </div>
          <span className="text-[8px] font-bold text-slate-400 uppercase">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

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
  const { isBroker, user } = useAuth(); // Assume we can use context, though impersonation might just be a router redirect or local storage
  const { t, lang = 'es' } = useApp();
  
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthLabels = MONTH_NAMES_ES;

  // Helper formats
  const fmtCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  // ── Agent Metrics ──
  const officeProfiles = profiles.filter(p => p.office === selectedOffice && p.role !== 'broker');
  const totalAgents = officeProfiles.length;

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

  const agentPovertyStatusYTD = useMemo(() => {
    return officeProfiles.map(agent => {
      // Find agent commissions in the currentYear up to currentMonth (inclusive)
      const agentYearComms = (commissions || []).filter(c => {
        if (!c.closing_date) return false;
        const cd = new Date(c.closing_date + 'T12:00:00');
        return cd.getFullYear() === currentYear && cd.getMonth() <= currentMonth && (c.agent_id === agent.id || c.agent_id === agent.auth_user_id);
      });

      const splitPct = parseAgentSplitPct(agent.commission_split || '45/55');
      const grossYTDSum = agentYearComms.reduce((sum, c) => sum + (Number(c.gross_commission) || 0), 0);
      const agentNetYTDSum = agentYearComms.reduce((sum, c) => sum + ((Number(c.gross_commission) || 0) * splitPct), 0);

      const elapsedMonths = Math.max(1, currentMonth + 1);
      const avgMonthlyBilledGross = grossYTDSum / elapsedMonths;
      const avgMonthlyBilledNet = agentNetYTDSum / elapsedMonths;

      const povertyThreshold = povertyLine || 1000;
      const isAbove = avgMonthlyBilledNet >= povertyThreshold;

      return {
        agent,
        splitPct,
        grossYTDSum,
        agentNetYTDSum,
        avgMonthlyBilledGross,
        avgMonthlyBilledNet,
        isAbove,
        povertyThreshold
      };
    });
  }, [officeProfiles, commissions, currentYear, currentMonth, povertyLine]);

  // Filter properties by office
  const officeProperties = useMemo(() => {
    return properties.filter(p => {
      const propOffice = p.office_code?.toLowerCase()?.includes('cero') || p.office_code === 'R0700151' ? 'cero' : 'altitud';
      const agentProfile = profiles.find(prof => prof.auth_user_id === p.agent_id);
      const office = agentProfile ? agentProfile.office : propOffice;
      return office === selectedOffice;
    });
  }, [properties, selectedOffice, profiles]);

  // ── Office Plan (Goals) ──
  const [monthRevenueGoal, setMonthRevenueGoal] = useState(0);
  const [ytdRevenueGoal, setYtdRevenueGoal] = useState(0);

  useEffect(() => {
    async function loadGoals() {
      try {
        const data = await getOfficeBusinessPlans(selectedOffice, currentYear);
        if (data) {
        // Current month
        const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const currentMonthPlan = data.find(p => p.month.startsWith(currentMonthStr));
        if (currentMonthPlan) {
          setMonthRevenueGoal(Number(currentMonthPlan.revenue_goal) || 0);
        }
        
        // YTD sum
        let ytdSum = 0;
        data.forEach(p => {
          const m = parseInt(p.month.split('-')[1]) - 1;
          if (m <= currentMonth) {
            ytdSum += Number(p.revenue_goal) || 0;
          }
        });
        setYtdRevenueGoal(ytdSum);
      }
      } catch (err) {
        // Handle error
      }
    }
    loadGoals();
  }, [selectedOffice, currentYear, currentMonth]);

  // ── Billing (Facturacion) ──
  // Calculate this month and YTD
  const { monthBilling, ytdBilling, monthlyTrend } = useMemo(() => {
    let monthSum = 0;
    let ytdSum = 0;
    const trendData = [0,0,0,0,0,0];
    const trendLabels = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      trendLabels.push(monthLabels[d.getMonth()]);
    }

    commissions.forEach(c => {
      const d = new Date(c.closing_date + 'T12:00:00');
      if (d.getFullYear() === currentYear) {
        ytdSum += Number(c.gross_commission) || 0;
      }
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        monthSum += Number(c.gross_commission) || 0;
      }
      // trend
      for (let i = 5; i >= 0; i--) {
        const trendMonth = new Date(currentYear, currentMonth - i, 1);
        if (d.getFullYear() === trendMonth.getFullYear() && d.getMonth() === trendMonth.getMonth()) {
          trendData[5-i] += Number(c.gross_commission) || 0;
        }
      }
    });
    return { monthBilling: monthSum, ytdBilling: ytdSum, monthlyTrend: { data: trendData, labels: trendLabels } };
  }, [commissions, currentYear, currentMonth, monthLabels]);

  // ── Channels (Buyers vs Sellers) ──
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

  // ── Expenses (Gastos) ──
  const expensesByCategory = useMemo(() => {
    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
    const totals = {};
    let totalEx = 0;
    expenses.forEach(ex => {
      const d = new Date(ex.expense_date + 'T12:00:00');
      // Let's do YTD expenses
      if (d.getFullYear() === currentYear) {
        const amt = Number(ex.amount) || 0;
        const cname = catMap[ex.category_id] || 'Otros';
        totals[cname] = (totals[cname] || 0) + amt;
        totalEx += amt;
      }
    });
    return {
      total: totalEx,
      items: Object.entries(totals).map(([k,v]) => ({ name: k, amount: v })).sort((a,b)=>b.amount-a.amount)
    };
  }, [expenses, categories, currentYear]);

  // ── Reservometro ──
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

  // ── Top Agents (Month and Year) ──
  const { topMonth, topYear } = useMemo(() => {
    const agentMapMonth = {};
    const agentMapYear = {};
    
    commissions.forEach(c => {
      const d = new Date(c.closing_date + 'T12:00:00');
      const aid = c.agent_id;
      const isListing = c.side === 'listing' || c.side === 'both';
      const isSelling = c.side === 'selling' || c.side === 'both';
      const amt = Number(c.agent_amount) || 0;

      if (!agentMapYear[aid]) agentMapYear[aid] = { id: aid, name: c.profiles?.full_name, avatar: c.profiles?.avatar_url, listAmt: 0, sellAmt: 0 };
      if (!agentMapMonth[aid]) agentMapMonth[aid] = { id: aid, name: c.profiles?.full_name, avatar: c.profiles?.avatar_url, listAmt: 0, sellAmt: 0 };

      if (d.getFullYear() === currentYear) {
        if (isListing) agentMapYear[aid].listAmt += amt;
        if (isSelling) agentMapYear[aid].sellAmt += amt;
        
        if (d.getMonth() === currentMonth) {
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
  }, [commissions, currentYear, currentMonth]);

  // ── Portfolio Rotation (DOM) ──
  const { domOfficeAvg, domRecentTrend, agentDomList } = useMemo(() => {
    const soldProps = officeProperties.filter(p => p.status === 'sold');
    if (!soldProps.length) return { domOfficeAvg: 0, domRecentTrend: 0, agentDomList: [] };

    // Sort by sold_date or updated_at descending
    soldProps.sort((a, b) => new Date(b.sold_date || b.updated_at) - new Date(a.sold_date || a.updated_at));

    const doms = soldProps.map(p => ({
      ...p,
      dom: p.days_on_market !== null && p.days_on_market !== undefined 
        ? p.days_on_market 
        : Math.max(0, Math.floor((new Date(p.sold_date || p.updated_at) - new Date(p.created_at)) / 86400000))
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

  // ── Agent Onboarding Productivity (Ramp-up) ──
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

      // Find all commissions for this agent
      const agentComms = commissions.filter(c => c.agent_id === p.id);
      
      let firstOpDate = null;
      let daysToFirstOp = null;

      if (agentComms.length > 0) {
        // Sort commissions by closing_date or created_at ascending
        const sortedComms = [...agentComms].sort((a, b) => {
          const dateA = new Date(a.closing_date || a.created_at);
          const dateB = new Date(b.closing_date || b.created_at);
          return dateA - dateB;
        });

        firstOpDate = new Date(sortedComms[0].closing_date || sortedComms[0].created_at);
        
        // Calculate difference in days
        const diffTime = firstOpDate - joinDate;
        daysToFirstOp = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        
        totalRampDays += daysToFirstOp;
        countedAgents++;
      } else {
        // No operations yet. Calculate days active since join date
        const diffTime = now - joinDate;
        daysToFirstOp = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      return {
        id: p.id,
        name: p.full_name,
        avatar: p.avatar_url,
        daysToFirstOp,
        hasClosedOp: agentComms.length > 0,
        joinDateStr: joinDate.toLocaleDateString(),
        firstOpDateStr: firstOpDate ? firstOpDate.toLocaleDateString() : null
      };
    }).filter(Boolean);

    // Sort agents:
    // 1st: those with closed operations (sorted by fastest ramp days ascending)
    // 2nd: those without closed operations (sorted by days active descending, showing the ones waiting the longest at the top)
    const sortedRampList = list.sort((a, b) => {
      if (a.hasClosedOp && b.hasClosedOp) {
        return a.daysToFirstOp - b.daysToFirstOp;
      }
      if (a.hasClosedOp && !b.hasClosedOp) return -1;
      if (!a.hasClosedOp && b.hasClosedOp) return 1;
      // Both have no ops - sort by days active descending
      return b.daysToFirstOp - a.daysToFirstOp;
    });

    const avg = countedAgents > 0 ? Math.round(totalRampDays / countedAgents) : 0;

    return {
      avgRampDays: avg,
      agentRampList: sortedRampList
    };
  }, [officeProfiles, commissions, now]);


  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      

      {/* ── Top Level KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Agentes" value={totalAgents} rawValue={totalAgents} color="text-slate-900 dark:text-white" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
        <StatCard label="Facturación Mes" value={`$${monthBilling.toLocaleString()}`} rawValue={monthBilling} target={monthRevenueGoal} color="text-emerald-500" />
        <StatCard label="Facturación YTD" value={`$${ytdBilling.toLocaleString()}`} rawValue={ytdBilling} target={ytdRevenueGoal} color="text-nexus-blue" />
        <StatCard label="Pipeline LOI+SPA" value={`$${(loiTotal + spaTotal).toLocaleString()}`} rawValue={loiTotal + spaTotal} color="text-amber-500" />
        <StatCard 
          label={t('ofc_dash_avg_first_tx')} 
          value={avgRampDays > 0 ? `${avgRampDays} d` : 'N/A'} 
          rawValue={avgRampDays} 
          color="text-indigo-500" 
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
      </div>

      {/* Gráfico de Barras de Comisión de Bolsillo vs Línea de Pobreza */}
      {officeProfiles && officeProfiles.length > 0 && (
        <div className="bg-white dark:bg-slate-800/85 rounded-[32px] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4 mb-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>📊</span> Comisión Mensual de Bolsillo por Agente (YTD)
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                Ingreso neto mensual promedio de los agentes (bolsillo) vs. la línea de pobreza de <span className="text-nexus-blue">{fmtCurrency(povertyLine)}/mes</span>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Sobre</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500 inline-block" />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Bajo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Línea Pobreza</span>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="min-w-[650px] h-[340px] relative">
              {/* Render custom SVG bar chart */}
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
                      const isAbove = item.avgMonthlyBilledNet >= (povertyLine || 1000);
                      
                      // First name or short name for clarity
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
                            className="text-[8px] font-black fill-slate-750 dark:fill-slate-250 font-sans opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            {fmtCurrency(item.avgMonthlyBilledNet)}
                          </text>

                          {/* X-axis Label (tilted for readability) */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Trend & Channels ── */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ingresos Últimos 6 Meses</h4>
          <MiniBarChart data={monthlyTrend.data} labels={monthlyTrend.labels} lang={lang} color="bg-emerald-500" />
          
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Origen de Leads Convertidos (Canales)</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[9px] font-bold text-slate-500 mb-2">COMPRADORES</p>
                {buyerSources.length === 0 ? <p className="text-[10px] text-slate-400 italic">No hay datos</p> : buyerSources.map((s,i) => (
                  <div key={i} className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 capitalize">{s.name}</span>
                    <span className="text-[10px] font-black text-slate-900 dark:text-white">{s.count}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 mb-2">VENDEDORES</p>
                {sellerSources.length === 0 ? <p className="text-[10px] text-slate-400 italic">No hay datos</p> : sellerSources.map((s,i) => (
                  <div key={i} className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 capitalize">{s.name}</span>
                    <span className="text-[10px] font-black text-slate-900 dark:text-white">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Expenses & Reservometro ── */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between">
              <span>Gastos YTD</span>
              <span className="text-red-500">${expensesByCategory.total.toLocaleString()}</span>
            </h4>
            <div className="space-y-3">
              {expensesByCategory.items.length === 0 ? <p className="text-[10px] text-slate-400 italic">No hay gastos registrados</p> : expensesByCategory.items.map((ex,i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="font-bold text-slate-600 dark:text-slate-300">{ex.name}</span>
                    <span className="text-slate-500">${ex.amount.toLocaleString()} ({Math.round((ex.amount/expensesByCategory.total)*100)}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.max((ex.amount/expensesByCategory.total)*100, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Reservómetro</h4>
            <div className="space-y-3 mb-6">
              <GaugeBar label="LOI Firmadas" value={loiTotal} max={loiTotal + spaTotal || 1} color="bg-amber-500" />
              <GaugeBar label="SPA Firmadas" value={spaTotal} max={loiTotal + spaTotal || 1} color="bg-emerald-500" />
            </div>
            
            <h5 className="text-[9px] font-bold text-slate-500 uppercase mb-2">Próximos Cierres</h5>
            <div className="space-y-2">
              {upcomingClosings.length === 0 ? <p className="text-[10px] text-slate-400 italic">No hay cierres programados</p> : upcomingClosings.map(r => (
                <div key={r.id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                  <div className="truncate pr-2">
                    <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{r.property_address || 'Propiedad'}</p>
                    <p className="text-[9px] text-slate-500">{new Date(r.expected_sign_date).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs font-black text-nexus-blue">${r.reservation_amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── DOM & Onboarding Ramp-up side-by-side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Portfolio Rotation (DOM) ── */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50 flex flex-col justify-between">
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
              <span>⏳ Rotación de Cartera (Days on Market)</span>
              <div className="flex items-end gap-2 text-right">
                <span className="text-[10px] uppercase text-slate-400">Promedio Oficina</span>
                <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums leading-none">{domOfficeAvg}d</span>
              </div>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1 relative overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-700 flex flex-col justify-center min-h-[110px]">
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Tendencia Reciente</p>
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
                 {/* SVG Trendline background */}
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
                          <Image src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}`} className="w-7 h-7 rounded-full object-cover" alt="" width={28} height={28} />
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

        {/* ── Onboarding Ramp-up / Productividad de Agentes ── */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50 flex flex-col justify-between">
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
              <span>⚡ Tiempo Promedio para Primera Rendición</span>
              <div className="flex items-end gap-2 text-right">
                <span className="text-[10px] uppercase text-slate-400">Promedio Equipo</span>
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
                <h5 className="text-[9px] font-bold text-slate-500 uppercase mb-2">Ramp-Up por Agente</h5>
                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                  {agentRampList.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No hay agentes registrados</p>
                  ) : (
                    agentRampList.slice(0, 3).map((a, i) => (
                      <div key={a.id} className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/35 border border-slate-100 dark:border-slate-700/60">
                        <div className="relative">
                          <Image src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}`} className="w-7 h-7 rounded-full object-cover" alt="" width={28} height={28} />
                          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black border border-white dark:border-slate-800 ${a.hasClosedOp ? 'bg-indigo-500 text-white' : 'bg-slate-400 text-white'}`}>
                            {i+1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                          <p className="text-[8px] text-slate-400 uppercase tracking-wider">{a.hasClosedOp ? 'Primera Transacción' : 'En Ramp-up'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-black tabular-nums ${a.hasClosedOp ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-450 dark:text-slate-550'}`}>{a.daysToFirstOp}d</span>
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
              {topMonth.listers.filter(a=>a.listAmt>0).map((a,i) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 w-3">{i+1}.</span>
                  <Image src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}`} className="w-6 h-6 rounded-full" alt="" width={24} height={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                    <p className="text-[9px] text-slate-500">${a.listAmt.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Top Mes Cierres */}
          <div>
            <h5 className="text-[10px] font-bold text-emerald-600 uppercase mb-3 text-center bg-emerald-50 dark:bg-emerald-900/20 py-1.5 rounded-lg">Top Cierres (Mes)</h5>
            <div className="space-y-2">
              {topMonth.closers.filter(a=>a.sellAmt>0).map((a,i) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 w-3">{i+1}.</span>
                  <Image src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}`} className="w-6 h-6 rounded-full" alt="" width={24} height={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                    <p className="text-[9px] text-slate-500">${a.sellAmt.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Año Captadores */}
          <div>
            <h5 className="text-[10px] font-bold text-purple-600 uppercase mb-3 text-center bg-purple-50 dark:bg-purple-900/20 py-1.5 rounded-lg">Top Captadores (YTD)</h5>
            <div className="space-y-2">
              {topYear.listers.filter(a=>a.listAmt>0).map((a,i) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 w-3">{i+1}.</span>
                  <Image src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}`} className="w-6 h-6 rounded-full" alt="" width={24} height={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                    <p className="text-[9px] text-slate-500">${a.listAmt.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Año Cierres */}
          <div>
            <h5 className="text-[10px] font-bold text-amber-600 uppercase mb-3 text-center bg-amber-50 dark:bg-amber-900/20 py-1.5 rounded-lg">Top Cierres (YTD)</h5>
            <div className="space-y-2">
              {topYear.closers.filter(a=>a.sellAmt>0).map((a,i) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 w-3">{i+1}.</span>
                  <Image src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}`} className="w-6 h-6 rounded-full" alt="" width={24} height={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                    <p className="text-[9px] text-slate-500">${a.sellAmt.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
