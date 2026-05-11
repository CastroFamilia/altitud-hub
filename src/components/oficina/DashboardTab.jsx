"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';

/* ═══════════════════════════════════════
   DASHBOARD TAB — Office Metrics & KPIs
   ═══════════════════════════════════════ */

const MONTH_NAMES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ label, value, color = 'text-slate-900 dark:text-white', subtitle, icon }) {
  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 shadow-sm border border-slate-200/60 dark:border-slate-700/50 group hover:shadow-lg hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">{label}</p>
          <h3 className={`text-2xl font-black italic mt-1.5 ${color} tabular-nums`}>{value}</h3>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 transition-colors">
            {icon}
          </div>
        )}
      </div>
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
  inquiries = [], 
  expenses = [], 
  categories = [], 
  commissions = [], 
  reservations = [], 
  selectedOffice, 
  loading 
}) {
  const { isBroker, user } = useAuth(); // Assume we can use context, though impersonation might just be a router redirect or local storage
  const lang = 'es'; // default for office dashboard
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthLabels = MONTH_NAMES_ES;

  // ── Agent Metrics ──
  const officeProfiles = profiles.filter(p => p.office === selectedOffice && p.role !== 'broker');
  const totalAgents = officeProfiles.length;

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

  // Impersonation Handler
  const handleImpersonate = (agentId) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('impersonated_id', agentId);
      // Optional: trigger a page reload or state update to apply impersonation globally
      window.location.reload(); 
    }
  };

  const handleStopImpersonate = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('impersonated_id');
      window.location.reload();
    }
  };

  const isImpersonating = typeof window !== 'undefined' ? !!localStorage.getItem('impersonated_id') : false;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      
      {/* ── Impersonation Bar ── */}
      {isBroker && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-4 shadow-lg border border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <div>
              <h3 className="text-sm font-black italic text-white">Modo Suplantación</h3>
              <p className="text-[10px] text-purple-200">Selecciona un agente para ver el CRM como ellos</p>
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
              {officeProfiles.map(p => (
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

      {/* ── Top Level KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Agentes" value={totalAgents} color="text-slate-900 dark:text-white" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
        <StatCard label="Facturación Mes" value={`$${monthBilling.toLocaleString()}`} color="text-emerald-500" />
        <StatCard label="Facturación YTD" value={`$${ytdBilling.toLocaleString()}`} color="text-nexus-blue" />
        <StatCard label="Pipeline LOI+SPA" value={`$${(loiTotal + spaTotal).toLocaleString()}`} color="text-amber-500" />
      </div>

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
                  <img src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}`} className="w-6 h-6 rounded-full" alt="" />
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
                  <img src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}`} className="w-6 h-6 rounded-full" alt="" />
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
                  <img src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}`} className="w-6 h-6 rounded-full" alt="" />
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
                  <img src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}`} className="w-6 h-6 rounded-full" alt="" />
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
