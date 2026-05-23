import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

/* ═══════════════════════════════════════════════════
   PLAN VS ACHIEVED — Premium Office Reporting Tab
   Story 9.2 & Yearly Agent Plans Desk
   ═══════════════════════════════════════════════════ */

// --- Progress Ring SVG ---
function ProgressRing({ pct, size = 64, stroke = 5, color = '#3b82f6' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.min(Math.max(pct, 0), 100);
  const offset = circ - (p / 100) * circ;
  const fill = p >= 100 ? '#10b981' : p >= 50 ? color : '#f59e0b';
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-200 dark:text-slate-700" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={fill} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

// --- Horizontal comparison bar ---
function ComparisonBar({ goal, actual, type, inverse, t }) {
  const max = Math.max(goal, actual, 1);
  const goalW = (goal / max) * 100;
  const actW = (actual / max) * 100;
  const pct = goal > 0 ? (actual / goal) * 100 : actual > 0 ? 100 : 0;
  
  let barColor = '';
  let textClass = '';
  if (inverse) {
    barColor = pct <= 100 ? 'bg-emerald-500' : pct <= 150 ? 'bg-amber-500' : 'bg-red-500';
    textClass = pct <= 100 ? 'text-emerald-500' : 'text-slate-700 dark:text-white';
  } else {
    barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-nexus-blue' : 'bg-amber-500';
    textClass = pct >= 100 ? 'text-emerald-500' : 'text-slate-700 dark:text-white';
  }

  const fmt = (v) => {
    if (type === 'currency') return '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (type === 'percent') return Number(v).toFixed(1) + '%';
    return v;
  };
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-400 font-bold">{t('plan_goal')}: {fmt(goal)}</span>
        <span className={`font-black ${textClass}`}>{fmt(actual)} ({Math.round(pct)}%)</span>
      </div>
      <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
        {goal > 0 && <div className="absolute inset-y-0 left-0 bg-slate-200 dark:bg-slate-600/50 rounded-full" style={{ width: `${goalW}%` }} />}
        <div className={`absolute inset-y-0 left-0 ${barColor} rounded-full transition-all duration-700 ease-out`} style={{ width: `${actW}%` }} />
      </div>
    </div>
  );
}

// --- Section Card ---
function SectionCard({ icon, title, children }) {
  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-[32px] shadow-sm border border-slate-200/60 dark:border-slate-700/50 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span className="text-base">{icon}</span> {title}
        </h4>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

// --- KPI Row ---
function KpiRow({ label, goalKey, plan, actual, type, inverse, onChange, t, editMode, isEditingLocal = true, fullWidth }) {
  const fmt = (v) => {
    if (type === 'currency') return '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (type === 'percent') return Number(v).toFixed(1) + '%';
    return v;
  };

  const goal = Number(plan[goalKey]) || 0;
  const pct = goal > 0 ? (actual / goal) * 105 - 5 : actual > 0 ? 100 : 0; // standard safety offset for division
  const realPct = goal > 0 ? (actual / goal) * 100 : actual > 0 ? 100 : 0;

  let badgeColor = '';
  if (inverse) {
    badgeColor = realPct <= 100 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
               : realPct <= 150 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
               : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  } else {
    badgeColor = realPct >= 100 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
               : realPct >= 50 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
               : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  }

  if (!editMode) {
    return (
      <div className={`bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full hover:border-slate-300 dark:hover:border-slate-700/80 hover:shadow-md transition-all duration-300 relative group overflow-hidden ${fullWidth ? 'sm:col-span-2' : ''}`}>
        {/* Subtle hover background highlight */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-100/30 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 line-clamp-2">
              {label}
            </span>
            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badgeColor} shrink-0`}>
              {Math.round(realPct)}%
            </span>
          </div>

          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tight tabular-nums">
              {fmt(actual)}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-150 dark:border-slate-800/85 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
          <span>{t('plan_goal') || 'Meta'}: <span className="text-slate-700 dark:text-slate-300 font-black">{fmt(goal)}</span></span>
          <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-75">
            {realPct >= 100 ? '✓ Logrado' : 'En progreso'}
          </span>
        </div>
      </div>
    );
  }

  // Configuration Mode: Show label and sleek input field (no progress bars)
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-slate-750 dark:text-slate-300">{label}</span>
      </div>
      <div className="relative">
        {type === 'currency' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 dark:text-slate-500 text-xs font-bold">$</span>}
        <input
          type="number"
          value={plan[goalKey] || ''}
          onChange={(e) => onChange(goalKey, e.target.value)}
          disabled={!isEditingLocal}
          className={`w-full ${type === 'currency' ? 'pl-7' : 'pl-3'} ${!isEditingLocal ? 'pr-8' : 'pr-3'} py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black italic text-slate-900 dark:text-white focus:ring-2 focus:ring-nexus-blue outline-none tabular-nums transition-all disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/60 dark:disabled:bg-slate-900/40`}
          placeholder="0"
        />
        {!isEditingLocal && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs select-none" title="Campo bloqueado. Haz clic en el lápiz superior para editar.">
            🔒
          </span>
        )}
      </div>
    </div>
  );
}

export default function OfficePlanTab({ t: tProp, profiles = [], properties = [], reservations = [], commissions = [], inquiries = [], communications = [], selectedOffice, milestones = [], editMode = false, povertyLine: passedPovertyLine }) {
  const { t: tCtx } = useApp();
  const t = (k) => tCtx(k) || tProp?.(k) || k;

  // Sub-tab: 'office', 'agents' or 'analytics'
  const [subTab, setSubTab] = useState('office');
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState(null);
  const [hoveredAgingIdx, setHoveredAgingIdx] = useState(null);
  const MONTH_NAMES_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];
  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [timeframe, setTimeframe] = useState('monthly'); // 'monthly' or 'cumulative'

  // Local editing and saving states
  const [isEditingLocal, setIsEditingLocal] = useState(editMode);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    if (editMode) {
      setIsEditingLocal(true);
    } else {
      setIsEditingLocal(false);
    }
  }, [editMode, monthStr, selectedOffice]);

  useEffect(() => {
    setSubTab('office');
  }, [editMode]);


  const yearFromMonthStr = useMemo(() => {
    return parseInt(monthStr.split('-')[0]) || 2026;
  }, [monthStr]);

  const monthFromMonthStr = useMemo(() => {
    return parseInt(monthStr.split('-')[1]) - 1;
  }, [monthStr]);

  const handleYearChange = (yr) => {
    const mm = String(monthFromMonthStr + 1).padStart(2, '0');
    setMonthStr(`${yr}-${mm}`);
    setSelectedYear(yr);
  };

  const handleMonthChange = (mo) => {
    const mm = String(mo + 1).padStart(2, '0');
    setMonthStr(`${yearFromMonthStr}-${mm}`);
  };

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- Segment Filter for Broker vs Team Stats ---
  const [segmentFilter, setSegmentFilter] = useState('all'); // 'all', 'team', 'broker'

  // Distribution style states (linear vs seasonal)
  const [distributionMode, setDistributionMode] = useState('linear'); // 'linear' or 'season'
  const [seasonStart, setSeasonStart] = useState(10); // November (0-indexed, so 10)
  const [seasonEnd, setSeasonEnd] = useState(3); // April (0-indexed, so 3)

  // --- Premium Modeler / Simulator States ---
  const [planningView, setPlanningView] = useState('kpis'); // 'kpis' or 'simulator'
  const [kpisSubTab, setKpisSubTab] = useState('annual_plan'); // 'annual_plan', 'matrix', 'coach'
  const [simulatorSubTab, setSimulatorSubTab] = useState('expenses'); // 'expenses', 'matrix', 'coach'
  const [loadingSim, setLoadingSim] = useState(false);
  const [savingSim, setSavingSim] = useState(false);

  const [simulator, setSimulator] = useState({
    office_expenses: { alquiler: 1200, salarios: 1500, plataformas: 350, marketing: 250, otros: 500 },
    rcca_rules: { royalty_pct: 6, mkt_fee_per_agent: 12, platform_fee_per_agent: 60, agent_churn_rate: 15 },
    agent_tiers: {
      tier_100_rap_count: 2,
      tier_100_rap_desk_fee: 450,
      tier_80_count: 3,
      tier_60_count: 5,
      tier_45_count: 3,
      broker_agent_count: 1,
      broker_expected_sales: 25000
    },
    production_weights: {
      rap: 20,
      tier80: 30,
      tier60: 25,
      tier45: 15,
      broker: 10
    },
    monthly_distribution: {
      ene: { cartera: 300, agentes: 13, agentes_nuevos: 0, captaciones: 26, ticket_prom: 250000, reservas: 6, comision_prom: 4500, transacciones: 6, facturacion: 25000 },
      feb: { cartera: 315, agentes: 13, agentes_nuevos: 1, captaciones: 26, ticket_prom: 250000, reservas: 6, comision_prom: 4500, transacciones: 6, facturacion: 25000 },
      mar: { cartera: 331, agentes: 13, agentes_nuevos: 0, captaciones: 26, ticket_prom: 250000, reservas: 6, comision_prom: 4500, transacciones: 6, facturacion: 25000 },
      abr: { cartera: 250, agentes: 14, agentes_nuevos: 1, captaciones: 28, ticket_prom: 250000, reservas: 6, comision_prom: 4500, transacciones: 6, facturacion: 25000 },
      may: { cartera: 263, agentes: 14, agentes_nuevos: 0, captaciones: 28, ticket_prom: 250000, reservas: 5, comision_prom: 4500, transacciones: 5, facturacion: 20000 },
      jun: { cartera: 276, agentes: 14, agentes_nuevos: 1, captaciones: 28, ticket_prom: 250000, reservas: 5, comision_prom: 4500, transacciones: 5, facturacion: 20000 },
      jul: { cartera: 289, agentes: 15, agentes_nuevos: 0, captaciones: 30, ticket_prom: 250000, reservas: 5, comision_prom: 4500, transacciones: 5, facturacion: 20000 },
      ago: { cartera: 304, agentes: 15, agentes_nuevos: 1, captaciones: 30, ticket_prom: 250000, reservas: 5, comision_prom: 4500, transacciones: 5, facturacion: 20000 },
      sept: { cartera: 319, agentes: 15, agentes_nuevos: 0, captaciones: 30, ticket_prom: 250000, reservas: 5, comision_prom: 4500, transacciones: 5, facturacion: 20000 },
      oct: { cartera: 335, agentes: 16, agentes_nuevos: 1, captaciones: 32, ticket_prom: 250000, reservas: 8, comision_prom: 4500, transacciones: 8, facturacion: 28000 },
      nov: { cartera: 352, agentes: 16, agentes_nuevos: 0, captaciones: 32, ticket_prom: 250000, reservas: 8, comision_prom: 4500, transacciones: 8, facturacion: 28000 },
      dic: { cartera: 369, agentes: 16, agentes_nuevos: 1, captaciones: 32, ticket_prom: 250000, reservas: 8, comision_prom: 4500, transacciones: 8, facturacion: 28000 }
    }
  });

  const defaultPlan = {
    new_agents_goal: 0, team_size_goal: 0, active_properties_goal: 0,
    exclusivity_pct_goal: 0, days_on_market_goal: 0,
    new_listings_total_goal: 0, new_listings_casa_goal: 0,
    new_listings_lote_goal: 0, new_listings_finca_goal: 0,
    new_listings_comercial_goal: 0, avg_ticket_goal: 0,
    avg_commission_pct_goal: 0, avg_commission_amount_goal: 0,
    reservations_goal: 0, transactions_goal: 0, revenue_goal: 0,
    portfolio_rotation_goal: 0, poverty_line: 0,
    new_contacts_goal: 0, showings_goal: 0,
  };

  const [dbPlan, setDbPlan] = useState(defaultPlan);

  const matrixMonthKey = useMemo(() => {
    if (!monthStr) return null;
    const parts = monthStr.split('-');
    if (parts.length < 2) return null;
    const mVal = parseInt(parts[1], 10);
    const keys = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
    return keys[mVal - 1] || null;
  }, [monthStr]);

  const plan = useMemo(() => {
    const basePlan = { ...dbPlan };
    if (!isEditingLocal && matrixMonthKey && simulator?.monthly_distribution?.[matrixMonthKey]) {
      const row = simulator.monthly_distribution[matrixMonthKey];
      if (row.agentes !== undefined && row.agentes !== null && row.agentes !== '') basePlan.team_size_goal = Number(row.agentes);
      if (row.agentes_nuevos !== undefined && row.agentes_nuevos !== null && row.agentes_nuevos !== '') basePlan.new_agents_goal = Number(row.agentes_nuevos);
      if (row.cartera !== undefined && row.cartera !== null && row.cartera !== '') basePlan.active_properties_goal = Number(row.cartera);
      if (row.captaciones !== undefined && row.captaciones !== null && row.captaciones !== '') basePlan.new_listings_total_goal = Number(row.captaciones);
      if (row.ticket_prom !== undefined && row.ticket_prom !== null && row.ticket_prom !== '') basePlan.avg_ticket_goal = Number(row.ticket_prom);
      if (row.reservas !== undefined && row.reservas !== null && row.reservas !== '') basePlan.reservations_goal = Number(row.reservas);
      if (row.comision_prom !== undefined && row.comision_prom !== null && row.comision_prom !== '') basePlan.avg_commission_amount_goal = Number(row.comision_prom);
      if (row.transacciones !== undefined && row.transacciones !== null && row.transacciones !== '') basePlan.transactions_goal = Number(row.transacciones);
      if (row.facturacion !== undefined && row.facturacion !== null && row.facturacion !== '') basePlan.revenue_goal = Number(row.facturacion);
    }
    return basePlan;
  }, [dbPlan, matrixMonthKey, simulator, isEditingLocal]);

  const periodPlan = useMemo(() => {
    if (timeframe === 'monthly' || isEditingLocal) {
      return plan;
    }
    
    const cumulative = { ...plan };
    const keysToSum = [
      'new_agents_goal',
      'new_listings_total_goal',
      'new_listings_casa_goal',
      'new_listings_lote_goal',
      'new_listings_finca_goal',
      'new_listings_comercial_goal',
      'reservations_goal',
      'transactions_goal',
      'revenue_goal',
      'new_contacts_goal',
      'showings_goal'
    ];
    
    keysToSum.forEach(k => { cumulative[k] = 0; });
    
    const monthKeys = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
    for (let i = 0; i <= monthFromMonthStr; i++) {
      const mKey = monthKeys[i];
      const row = simulator?.monthly_distribution?.[mKey] || {};
      cumulative.new_agents_goal += Number(row.agentes_nuevos) || 0;
      cumulative.new_listings_total_goal += Number(row.captaciones) || 0;
      
      cumulative.new_listings_casa_goal += Number(row.captaciones_casa || dbPlan.new_listings_casa_goal || 0);
      cumulative.new_listings_lote_goal += Number(row.captaciones_lote || dbPlan.new_listings_lote_goal || 0);
      cumulative.new_listings_finca_goal += Number(row.captaciones_finca || dbPlan.new_listings_finca_goal || 0);
      cumulative.new_listings_comercial_goal += Number(row.captaciones_comercial || dbPlan.new_listings_comercial_goal || 0);
      
      cumulative.reservations_goal += Number(row.reservas) || 0;
      cumulative.transactions_goal += Number(row.transacciones) || 0;
      cumulative.revenue_goal += Number(row.facturacion) || 0;
      
      cumulative.new_contacts_goal += Number(dbPlan.new_contacts_goal || 0);
      cumulative.showings_goal += Number(dbPlan.showings_goal || 0);
    }
    
    return cumulative;
  }, [plan, timeframe, monthFromMonthStr, simulator, dbPlan, isEditingLocal]);


  const [historicalPlans, setHistoricalPlans] = useState([]);
  const [globalPovertyLine, setGlobalPovertyLine] = useState(1000);
  const [customOfficeExpense, setCustomOfficeExpense] = useState(null);
  const [officeRetentionPct, setOfficeRetentionPct] = useState(49);
  const [splitTiers, setSplitTiers] = useState(['45/55', '60/40', '80/20']);

  // Fetch split tiers config on selectedOffice change
  useEffect(() => {
    const fetchSplits = async () => {
      try {
        const { data, error } = await supabase
          .from('office_config')
          .select('config_value')
          .eq('office', selectedOffice)
          .eq('config_key', 'split_tiers')
          .maybeSingle();
        if (!error && data?.config_value) {
          setSplitTiers(data.config_value);
        } else {
          setSplitTiers(['45/55', '60/40', '80/20']);
        }
      } catch (err) {
        console.error('Failed to load split tiers in OfficePlanTab:', err);
      }
    };
    fetchSplits();
  }, [selectedOffice]);

  // Load simulator from database on selectOffice change
  useEffect(() => {
    const fetchSimulator = async () => {
      setLoadingSim(true);
      try {
        const { data, error } = await supabase
          .from('office_config')
          .select('config_value')
          .eq('office', selectedOffice)
          .eq('config_key', 'business_simulator')
          .maybeSingle();
        if (!error && data?.config_value) {
          const cfg = data.config_value;
          setSimulator(prev => ({
            ...prev,
            ...cfg,
            office_expenses: { ...prev.office_expenses, ...cfg.office_expenses },
            rcca_rules: { ...prev.rcca_rules, ...cfg.rcca_rules },
            agent_tiers: { ...prev.agent_tiers, ...cfg.agent_tiers },
            production_weights: { ...prev.production_weights, ...cfg.production_weights },
            monthly_distribution: { ...prev.monthly_distribution, ...cfg.monthly_distribution }
          }));
          if (cfg.distributionMode) setDistributionMode(cfg.distributionMode);
          if (cfg.seasonStart !== undefined) setSeasonStart(cfg.seasonStart);
          if (cfg.seasonEnd !== undefined) setSeasonEnd(cfg.seasonEnd);
        }
      } catch (err) {
        console.error('Failed to load business simulator config:', err);
      } finally {
        setLoadingSim(false);
      }
    };
    fetchSimulator();
  }, [selectedOffice]);

  const handleSaveSimulator = async (updatedSim = simulator, silent = false) => {
    // Validate weights sum
    const bWeight = Number(updatedSim.production_weights?.broker || 0);
    const sWeightsSum = splitTiers.reduce((sum, tier) => {
      const wKey = getWeightKey(tier);
      return sum + Number(updatedSim.production_weights?.[wKey] || 0);
    }, 0);
    const totalWeightsSum = bWeight + sWeightsSum;

    if (totalWeightsSum !== 100) {
      alert(`La suma de pesos de participación en la distribución de facturación debe ser exactamente 100% (actualmente es ${totalWeightsSum}%). Por favor, ajusta los controles antes de guardar.`);
      return;
    }

    setSavingSim(true);
    try {
      const finalSim = {
        ...updatedSim,
        distributionMode,
        seasonStart,
        seasonEnd
      };

      const response = await fetch('/api/office-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          office: selectedOffice,
          config_key: 'business_simulator',
          config_value: finalSim
        })
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'No se pudo guardar la configuración a través de la API');
      }

      if (!silent) alert('Plan simulador de negocio guardado exitosamente.');
    } catch (err) {
      alert('Error al guardar el plan de oficina: ' + err.message);
    } finally {
      setSavingSim(false);
    }
  };

  // --- Live Math & State Handlers for Simulator Modeler ---
  const handleUpdateSimulator = (section, key, value) => {
    const numericValue = Number(value) || 0;
    setSimulator(prev => {
      const updated = {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: numericValue
        }
      };
      return updated;
    });
  };

  const handleUpdateMatrix = (monthKey, fieldKey, value) => {
    const numericValue = Number(value) || 0;
    setSimulator(prev => {
      const updated = {
        ...prev,
        monthly_distribution: {
          ...prev.monthly_distribution,
          [monthKey]: {
            ...prev.monthly_distribution[monthKey],
            [fieldKey]: numericValue
          }
        }
      };
      return updated;
    });
  };

  const getCountKey = (splitStr) => {
    if (splitStr === '100/0' || splitStr === '100') return 'tier_100_rap_count';
    const match = splitStr.match(/^(\d+)/);
    if (match) {
      const pct = match[1];
      return `tier_${pct}_count`;
    }
    return `tier_${splitStr.replace(/[^a-zA-Z0-9]/g, '_')}_count`;
  };

  const getWeightKey = (splitStr) => {
    if (splitStr === '100/0' || splitStr === '100') return 'rap';
    const match = splitStr.match(/^(\d+)/);
    if (match) {
      const pct = match[1];
      return `tier${pct}`;
    }
    return `tier${splitStr.replace(/[^a-zA-Z0-9]/g, '_')}`;
  };

  const getDisplayName = (splitStr) => {
    if (splitStr === 'Broker') return 'Broker';
    const match = splitStr.match(/^(\d+)/);
    if (match) {
      const pct = match[1];
      return `Agentes ${pct}%`;
    }
    return `Agentes ${splitStr}`;
  };

  const parseAgentPct = (splitStr) => {
    const match = splitStr.match(/^(\d+)/);
    return match ? Number(match[1]) : 45;
  };

  const totalFixedExpenses = Object.values(simulator.office_expenses || {}).reduce((a, b) => a + b, 0);
  const totalAgents = splitTiers.reduce((sum, tier) => {
    const key = getCountKey(tier);
    return sum + Number(simulator.agent_tiers?.[key] || 0);
  }, 0);
  
  const mktFee = Number(simulator.rcca_rules?.mkt_fee_per_agent || 0);
  const platFee = Number(simulator.rcca_rules?.platform_fee_per_agent || 0);
  const royaltyPct = Number(simulator.rcca_rules?.royalty_pct || 0);
  
  const totalAgentCostsRCCA = totalAgents * (mktFee + platFee);
  const totalOutgoings = totalFixedExpenses + totalAgentCostsRCCA;
  
  const rapTier = splitTiers.find(t => t.startsWith('100'));
  const rapCount = rapTier ? Number(simulator.agent_tiers?.[getCountKey(rapTier)] || 0) : 0;
  const RAPDeskFee = Number(simulator.agent_tiers?.tier_100_rap_desk_fee || 0);

  // User's specific office rule:
  // - RAP (100%) pays RAPDeskFee monthly (12 months).
  // - Splits pay starting from month 6 (so 7 months out of 12 average):
  //   - 45% agents pay $75/mo
  //   - 60% agents pay $200/mo
  //   - 80% agents pay $500/mo
  let yearlyDeskFees = rapCount * RAPDeskFee * 12;
  
  splitTiers.forEach(tier => {
    const count = Number(simulator.agent_tiers?.[getCountKey(tier)] || 0);
    const agentPct = parseAgentPct(tier);
    
    if (tier.startsWith('100')) {
      return;
    } else if (agentPct === 45) {
      yearlyDeskFees += count * 75 * 7;
    } else if (agentPct === 60) {
      yearlyDeskFees += count * 200 * 7;
    } else if (agentPct === 80) {
      yearlyDeskFees += count * 500 * 7;
    }
  });

  const totalDeskFees = yearlyDeskFees / 12; // Average monthly desk fee income!
  const netDeficit = Math.max(0, totalOutgoings - totalDeskFees);
  
  const wBroker = Number(simulator.production_weights?.broker || 0);
  let totalWeights = wBroker;
  let weightedMarginSum = wBroker * 1.00;
  
  splitTiers.forEach(tier => {
    const wKey = getWeightKey(tier);
    const weight = Number(simulator.production_weights?.[wKey] || 0);
    const agentPct = parseAgentPct(tier);
    const officeMargin = (100 - agentPct) / 100;
    
    totalWeights += weight;
    weightedMarginSum += weight * officeMargin;
  });
  
  const finalTotalWeights = totalWeights || 1;
  const weightedOfficeMarginPct = weightedMarginSum / finalTotalWeights;
  
  const marginAfterRoyalty = weightedOfficeMarginPct * (1 - (royaltyPct / 100));
  
  const monthlyBreakEvenGCI = marginAfterRoyalty > 0 ? (netDeficit / marginAfterRoyalty) : 0;
  const yearlyBreakEvenGCI = monthlyBreakEvenGCI * 12;

  const handleAutoDistribute = () => {
    const valStr = prompt("Ingrese la meta de facturación anual a distribuir (GCI $):", Math.round(yearlyBreakEvenGCI) || 300000);
    if (!valStr) return;
    const targetGCI = Number(valStr);
    if (isNaN(targetGCI) || targetGCI <= 0) {
      alert("Ingrese un monto válido.");
      return;
    }
    
    const monthlyGCI = targetGCI / 12;
    setSimulator(prev => {
      const updatedMonths = { ...prev.monthly_distribution };
      Object.keys(updatedMonths).forEach(m => {
        updatedMonths[m] = {
          ...updatedMonths[m],
          facturacion: Math.round(monthlyGCI),
          transacciones: Math.round(monthlyGCI / (updatedMonths[m].comision_prom || 4500)) || 6,
          reservas: Math.round(monthlyGCI / (updatedMonths[m].comision_prom || 4500)) || 6
        };
      });
      return {
        ...prev,
        monthly_distribution: updatedMonths
      };
    });
    alert("Metas de GCI y transacciones distribuidas en la matriz de ENE-DIC.");
  };

  const handleReverseEngineering = () => {
    // 1. Get targets from the annual plan (Metas Generales)
    const targetAgents = Number(dbPlan.team_size_goal) || 20;
    const targetPortfolio = Number(dbPlan.active_properties_goal) || 300;
    
    // 2. Get current starting values from the active system
    const currentAgents = Number(actuals.team_size) || 13;
    const currentPortfolio = Number(actuals.active_properties) || 250;
    
    const proceed = confirm(
      `🔄 INGENIERÍA INVERSA ENE-DIC\n\n` +
      `Se calculará una progresión mensual óptima desde tus datos reales actuales hasta las metas de Diciembre:\n` +
      `• Agentes: De ${currentAgents} (Actual) ➔ a ${targetAgents} (Meta Dic)\n` +
      `• Cartera Activa: De ${currentPortfolio} (Actual) ➔ a ${targetPortfolio} (Meta Dic)\n\n` +
      `¿Deseas sobreescribir la matriz con estos objetivos calculados?`
    );
    if (!proceed) return;

    setSimulator(prev => {
      const updatedMonths = { ...prev.monthly_distribution };
      const monthKeys = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
      
      let prevAgents = currentAgents;
      let prevPortfolio = currentPortfolio;
      
      monthKeys.forEach((mKey, idx) => {
        const step = idx + 1;
        
        // Linear growth interpolation for agents count
        const calculatedAgents = currentAgents + Math.round((targetAgents - currentAgents) * (step / 12));
        // New agents recruited this month is the growth step
        const calculatedNewAgents = Math.max(0, calculatedAgents - prevAgents);
        
        // Linear growth interpolation for active properties in portfolio
        const calculatedPortfolio = currentPortfolio + Math.round((targetPortfolio - currentPortfolio) * (step / 12));
        // New listings (Captaciones) needed: Growth step + 2.5% churn replacement
        const growthStepPortfolio = calculatedPortfolio - prevPortfolio;
        const churnReplacement = Math.round(calculatedPortfolio * 0.025);
        const calculatedCaptaciones = Math.max(0, growthStepPortfolio + churnReplacement);
        
        // Distribute GCI, transactions, and reservations goals evenly
        const calculatedRevenue = Math.round((Number(dbPlan.revenue_goal) || 300000) / 12);
        const calculatedTransactions = Math.max(1, Math.round((Number(dbPlan.transactions_goal) || 72) / 12));
        const calculatedReservas = Math.max(1, Math.round((Number(dbPlan.reservations_goal) || 72) / 12));

        // Update the monthly matrix row
        updatedMonths[mKey] = {
          ...updatedMonths[mKey],
          agentes: calculatedAgents,
          agentes_nuevos: calculatedNewAgents,
          cartera: calculatedPortfolio,
          captaciones: calculatedCaptaciones,
          facturacion: calculatedRevenue,
          transacciones: calculatedTransactions,
          reservas: calculatedReservas,
        };
        
        // Save previous for next month's delta calculations
        prevAgents = calculatedAgents;
        prevPortfolio = calculatedPortfolio;
      });
      
      return {
        ...prev,
        monthly_distribution: updatedMonths
      };
    });
    
    alert(
      `¡Ingeniería Inversa calculada exitosamente!\n\n` +
      `La matriz de ENE-DIC se ha configurado con un crecimiento mensual progresivo para alcanzar tus objetivos anuales.`
    );
  };

  const syncMatrix = (currentPlan = dbPlan, mode = distributionMode, start = seasonStart, end = seasonEnd) => {
    // 1. Get targets from the annual plan
    const targetAgents = Number(currentPlan.team_size_goal) || 0;
    const targetPortfolio = Number(currentPlan.active_properties_goal) || 0;
    const targetRevenue = Number(currentPlan.revenue_goal) || 0;
    const targetTransactions = Number(currentPlan.transactions_goal) || 0;
    const targetReservations = Number(currentPlan.reservations_goal) || 0;
    
    // 2. Get current starting values from the active system
    const currentAgents = Number(actuals.team_size) || 13;
    const currentPortfolio = Number(actuals.active_properties) || 250;
    
    setSimulator(prev => {
      const updatedMonths = { ...prev.monthly_distribution };
      const monthKeys = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
      
      let prevAgents = currentAgents;
      let prevPortfolio = currentPortfolio;
      
      // Calculate total weights for seasonal distribution (3:1 ratio for peak vs low season)
      let totalWeights = 0;
      const isMonthInSeason = (idx) => {
        if (start <= end) return idx >= start && idx <= end;
        return idx >= start || idx <= end;
      };
      
      for (let i = 0; i < 12; i++) {
        if (mode === 'linear') {
          totalWeights += 1;
        } else {
          totalWeights += isMonthInSeason(i) ? 3 : 1;
        }
      }

      monthKeys.forEach((mKey, idx) => {
        const step = idx + 1;
        
        // Linear growth interpolation for agents count
        const calculatedAgents = currentAgents + Math.round((targetAgents - currentAgents) * (step / 12));
        const calculatedNewAgents = Math.max(0, calculatedAgents - prevAgents);
        
        // Linear growth interpolation for active properties in portfolio
        const calculatedPortfolio = currentPortfolio + Math.round((targetPortfolio - currentPortfolio) * (step / 12));
        const growthStepPortfolio = calculatedPortfolio - prevPortfolio;
        const churnReplacement = Math.round(calculatedPortfolio * 0.025);
        const calculatedCaptaciones = Math.max(0, growthStepPortfolio + churnReplacement);
        
        // Season vs Linear GCI, transactions, and reservations distribution (3:1 weight ratio)
        const weight = mode === 'linear' ? 1 : (isMonthInSeason(idx) ? 3 : 1);
        const calculatedRevenue = Math.round(targetRevenue * (weight / totalWeights));
        const calculatedTransactions = Math.max(1, Math.round(targetTransactions * (weight / totalWeights)));
        const calculatedReservas = Math.max(1, Math.round(targetReservations * (weight / totalWeights)));

        // Update the monthly matrix row
        updatedMonths[mKey] = {
          ...updatedMonths[mKey],
          agentes: calculatedAgents,
          agentes_nuevos: calculatedNewAgents,
          cartera: calculatedPortfolio,
          captaciones: calculatedCaptaciones,
          facturacion: calculatedRevenue,
          transacciones: calculatedTransactions,
          reservas: calculatedReservas,
        };
        
        // Save previous for next month's delta calculations
        prevAgents = calculatedAgents;
        prevPortfolio = calculatedPortfolio;
      });
      
      return {
        ...prev,
        monthly_distribution: updatedMonths
      };
    });
  };

  const getMonthlyNetIncome = (row) => {
    const monthlyAgents = Number(row.agentes) || 0;
    const monthlyGCI = Number(row.facturacion) || 0;
    
    // 1. Fixed Expenses
    const fixedExp = totalFixedExpenses;
    
    // 2. RCCA agent costs
    const rccaCosts = monthlyAgents * (mktFee + platFee);
    const totalExp = fixedExp + rccaCosts;
    
    // 3. Desk fee income proportional to team size
    const avgDeskFee = totalAgents > 0 ? (yearlyDeskFees / 12) / totalAgents : 0;
    const deskIncome = monthlyAgents * avgDeskFee;
    
    // 4. Net GCI kept by office (after agent splits and RE/MAX royalty)
    const netGCIKeep = monthlyGCI * marginAfterRoyalty;
    
    // 5. Net Income
    return Math.round((netGCIKeep + deskIncome) - totalExp);
  };

  // Run syncMatrix in real-time when the distribution mode, season months, edit state, or yearly plan changes
  useEffect(() => {
    if (isEditingLocal) {
      syncMatrix(dbPlan, distributionMode, seasonStart, seasonEnd);
    }
  }, [distributionMode, seasonStart, seasonEnd, isEditingLocal, dbPlan]);

  // --- Olympia Coach Panel States & Handlers ---
  const [coachMessages, setCoachMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy Olympia, tu Asesora Experta de Negocios de RE/MAX Altitud. Puedo analizar tu modelo financiero, gastos fijos, cantidad de agentes y tu plan de ENE-DIC para ayudarte a evaluar la sostenibilidad y rentabilidad de la oficina.'
    }
  ]);
  const [coachInput, setCoachInput] = useState('');
  const [sendingCoach, setSendingCoach] = useState(false);

  const handleSendCoach = async (customPrompt = null) => {
    const textToSend = customPrompt || coachInput;
    if (!textToSend.trim()) return;
    
    const newMsg = { role: 'user', content: textToSend };
    setCoachMessages(prev => [...prev, newMsg]);
    setCoachInput('');
    setSendingCoach(true);
    
    try {
      const res = await fetch('/api/olympia/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleType: 'office',
          prompt: textToSend,
          context: {
            selectedOffice,
            simulator: {
              office_expenses: simulator.office_expenses,
              rcca_rules: simulator.rcca_rules,
              agent_tiers: simulator.agent_tiers,
              production_weights: simulator.production_weights,
              total_fixed_expenses: totalFixedExpenses,
              total_agents: totalAgents,
              monthly_break_even_gci: monthlyBreakEvenGCI,
              yearly_break_even_gci: yearlyBreakEvenGCI,
              monthly_distribution: simulator.monthly_distribution
            }
          }
        })
      });
      const data = await res.json();
      if (data.reply) {
        setCoachMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setCoachMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, no pude procesar la solicitud en este momento.' }]);
      }
    } catch (err) {
      console.error(err);
      setCoachMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error de red al consultar con Olympia AI.' }]);
    } finally {
      setSendingCoach(false);
    }
  };

  useEffect(() => {
    const fetchPovertyLine = async () => {
      try {
        const { data, error } = await supabase
          .from('office_config')
          .select('config_value')
          .eq('office', selectedOffice)
          .eq('config_key', 'poverty_line')
          .maybeSingle();
        if (!error && data?.config_value?.amount) {
          setGlobalPovertyLine(Number(data.config_value.amount));
        } else {
          setGlobalPovertyLine(1000); // Default fallback
        }
      } catch (err) {
        console.error('Failed to load global poverty line in OfficePlanTab:', err);
      }
    };
    fetchPovertyLine();
  }, [selectedOffice]);

  // --- Agent Yearly Plans State ---
  const [agentPlans, setAgentPlans] = useState([]);
  const [loadingAgentPlans, setLoadingAgentPlans] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [activePlanningYear, setActivePlanningYear] = useState(null);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState(null);

  const loadPlan = async (month) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/office-plan?office=${selectedOffice}&month=${month}-01`);
      const data = await res.json();
      setDbPlan(data.plan ? { ...defaultPlan, ...data.plan } : { ...defaultPlan });
      
      const histRes = await fetch(`/api/office-plan?office=${selectedOffice}`);
      const histData = await histRes.json();
      setHistoricalPlans(histData.plans || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadAgentPlans = async () => {
    setLoadingAgentPlans(true);
    try {
      const { data, error } = await supabase
        .from('business_plans')
        .select('*')
        .eq('plan_year', selectedYear);
      if (!error) {
        setAgentPlans(data || []);
      }
    } catch (err) {
      console.error('Failed to load agent plans:', err);
    } finally {
      setLoadingAgentPlans(false);
    }
  };

  const loadActivePlanningYear = async () => {
    try {
      const { data, error } = await supabase
        .from('office_config')
        .select('*')
        .eq('office', selectedOffice)
        .eq('config_key', 'active_planning_year')
        .maybeSingle();
      if (!error && data?.config_value?.year) {
        setActivePlanningYear(data.config_value.year);
      } else {
        setActivePlanningYear(null);
      }
    } catch (err) {
      console.error('Failed to load active planning year:', err);
    }
  };

  useEffect(() => {
    if (subTab === 'office') {
      loadPlan(monthStr);
    } else if (subTab === 'agents') {
      loadAgentPlans();
      loadActivePlanningYear();
    } else if (subTab === 'analytics') {
      loadPlan(monthStr);
      loadAgentPlans();
      loadActivePlanningYear();
    }
  }, [monthStr, selectedOffice, subTab, selectedYear]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id, created_at, updated_at, ...goals } = dbPlan;
      const res = await fetch('/api/office-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ office: selectedOffice, month: `${monthStr}-01`, ...goals }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      // Auto-save the monthly simulator distribution in the background silently
      await handleSaveSimulator(simulator, true);

      // Lock editing mode locally only if not in editMode, and trigger success feedback
      if (!editMode) {
        setIsEditingLocal(false);
      }
      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 4000);

      // Force-reload the plan to ensure all calculated and loaded values match perfectly
      await loadPlan(monthStr);
    } catch (err) { 
      alert(t('plan_save_error') + ': ' + err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleChange = (field, value) => {
    const numericVal = value === '' ? '' : (Number(value) || 0);
    setDbPlan(prev => {
      const updatedPlan = { ...prev, [field]: numericVal };
      if (['revenue_goal', 'team_size_goal', 'avg_ticket_goal', 'avg_commission_pct_goal'].includes(field)) {
        const ticket = Number(updatedPlan.avg_ticket_goal) || 0;
        const commPct = Number(updatedPlan.avg_commission_pct_goal) || 0;
        const revenue = Number(updatedPlan.revenue_goal) || 0;
        const decAgents = Number(updatedPlan.team_size_goal) || 0;
        
        // 1. pocket commission amount
        const commAmt = Math.round(ticket * (commPct / 100));
        updatedPlan.avg_commission_amount_goal = commAmt;
        
        // 2. annual transactions needed
        const txs = commAmt > 0 ? Math.round(revenue / commAmt) : 0;
        updatedPlan.transactions_goal = txs;
        
        // 3. reservations (15% drop fallback rate)
        updatedPlan.reservations_goal = Math.round(txs * 1.15);
        
        // 4. active listings in December (15 active listings per agent)
        updatedPlan.active_properties_goal = decAgents * 15;
        
        // 5. annual recruited agents (linear growth from current agents)
        const currentAgents = Number(actuals.team_size) || 13;
        updatedPlan.new_agents_goal = Math.max(0, decAgents - currentAgents);
      }
      
      // Sync matrix in real-time as the user types
      syncMatrix(updatedPlan, distributionMode, seasonStart, seasonEnd);
      return updatedPlan;
    });
  };

  // --- Broker Planning Invitation Actions ---
  const handleStartPlanningSession = async (year) => {
    const proceed = confirm(`¿Estás seguro de que deseas iniciar la sesión de planificación para el año ${year}?\n\nEsto actualizará la configuración de la oficina y enviará una alerta a todos los agentes activos.`);
    if (!proceed) return;

    setSaving(true);
    try {
      // 1. Upsert active planning year key
      const { error: configError } = await supabase
        .from('office_config')
        .upsert({
          office: selectedOffice,
          config_key: 'active_planning_year',
          config_value: { year: parseInt(year, 10) }
        }, { onConflict: 'office,config_key' });

      if (configError) throw configError;
      setActivePlanningYear(year);

      // 2. Fetch active office profiles (excluding brokers)
      const officeProfiles = profiles.filter(p => p.office === selectedOffice && p.status === 'active' && p.role !== 'broker');
      if (officeProfiles.length > 0) {
        const notifications = officeProfiles.map(agent => ({
          user_id: agent.auth_user_id || agent.id,
          title: `📅 Sesión de Planificación ${year} abierta`,
          message: `El broker te invita a preparar tu plan de negocios para el año ${year}. Haz clic aquí para comenzar.`,
          link: `/plan?year=${year}`,
          type: 'planning_invite'
        })).filter(n => n.user_id);

        if (notifications.length > 0) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);
          if (notifError) throw notifError;
        }
      }

      alert(`¡Sesión de planificación para el año ${year} iniciada con éxito!`);
    } catch (err) {
      alert(`Error al iniciar sesión: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendReminder = async (agent, year) => {
    const targetUserId = agent.auth_user_id || agent.id;
    if (!targetUserId) {
      alert('El agente no tiene una cuenta de usuario autenticada vinculada.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          title: `⚠️ Recordatorio: Plan de Negocio ${year}`,
          message: `Por favor completa tu plan de negocios para el año ${year} con el broker.`,
          link: `/plan?year=${year}`,
          type: 'planning_reminder'
        });

      if (error) throw error;
      alert(`Recordatorio de plan enviado exitosamente a ${agent.full_name}.`);
    } catch (err) {
      alert(`Error al enviar recordatorio: ${err.message}`);
    }
  };

  // --- Compute Actuals ---
  const [year, month] = monthStr.split('-');
  const y = parseInt(year), m = parseInt(month) - 1;
  const isThisMonth = useMemo(() => {
    return (dateStr) => {
      if (!dateStr) return false;
      // Append T12:00:00 for date-only strings (YYYY-MM-DD) to prevent timezone backward shift
      const d = new Date(dateStr.length <= 10 ? dateStr + 'T12:00:00' : dateStr);
      if (timeframe === 'cumulative') {
        return d.getFullYear() === y && d.getMonth() <= m;
      }
      return d.getFullYear() === y && d.getMonth() === m;
    };
  }, [y, m, timeframe]);


  const officeProfiles = profiles.filter(p => p.office === selectedOffice);
  const officeProperties = useMemo(() => {
    return (properties || []).filter(p => {
      const propOffice = p.office_code?.toLowerCase()?.includes('cero') || p.office_code === 'R0700151' ? 'cero' : 'altitud';
      const agentProfile = profiles.find(prof => prof.auth_user_id === p.agent_id);
      const office = agentProfile ? agentProfile.office : propOffice;
      return office === selectedOffice;
    });
  }, [properties, selectedOffice, profiles]);

  // --- Segmented Filters based on segmentFilter ('all', 'team', 'broker') ---
  const filteredProfiles = useMemo(() => {
    const list = officeProfiles;
    if (segmentFilter === 'team') return list.filter(p => p.role !== 'broker');
    if (segmentFilter === 'broker') return list.filter(p => p.role === 'broker');
    return list;
  }, [officeProfiles, segmentFilter]);

  const filteredProperties = useMemo(() => {
    return officeProperties.filter(p => {
      const agent = profiles.find(prof => prof.auth_user_id === p.agent_id);
      if (!agent) return segmentFilter === 'all' || segmentFilter === 'team';
      if (segmentFilter === 'team') return agent.role !== 'broker';
      if (segmentFilter === 'broker') return agent.role === 'broker';
      return true;
    });
  }, [officeProperties, profiles, segmentFilter]);

  const officeResCreatedThisMonth = (reservations || []).filter(r => r.office === selectedOffice && isThisMonth(r.created_at));
  const officeResClosedThisMonth = (reservations || []).filter(r => r.office === selectedOffice && r.status === 'closed' && isThisMonth(r.updated_at));
  
  const filteredNewReservations = useMemo(() => {
    return officeResCreatedThisMonth.filter(r => {
      const agent = profiles.find(prof => prof.auth_user_id === r.agent_id || prof.id === r.agent_id);
      if (!agent) return segmentFilter === 'all' || segmentFilter === 'team';
      if (segmentFilter === 'team') return agent.role !== 'broker';
      if (segmentFilter === 'broker') return agent.role === 'broker';
      return true;
    });
  }, [officeResCreatedThisMonth, profiles, segmentFilter]);

  const filteredClosedTransactions = useMemo(() => {
    return officeResClosedThisMonth.filter(r => {
      const agent = profiles.find(prof => prof.auth_user_id === r.agent_id || prof.id === r.agent_id);
      if (!agent) return segmentFilter === 'all' || segmentFilter === 'team';
      if (segmentFilter === 'team') return agent.role !== 'broker';
      if (segmentFilter === 'broker') return agent.role === 'broker';
      return true;
    });
  }, [officeResClosedThisMonth, profiles, segmentFilter]);

  const filteredCommissions = useMemo(() => {
    return (commissions || []).filter(c => {
      const agent = profiles.find(prof => prof.auth_user_id === c.agent_id || prof.full_name === c.agent_name);
      if (!agent) return segmentFilter === 'all' || segmentFilter === 'team';
      if (segmentFilter === 'team') return agent.role !== 'broker';
      if (segmentFilter === 'broker') return agent.role === 'broker';
      return true;
    });
  }, [commissions, profiles, segmentFilter]);

  const filteredCommissionsThisMonth = useMemo(() => {
    return filteredCommissions.filter(c => isThisMonth(c.closing_date));
  }, [filteredCommissions, isThisMonth]);

  const activeProperties = filteredProperties.filter(p => p.status === 'active' || p.status === 'published' || p.standard_status_id === 1);
  const propertiesListedThisMonth = filteredProperties.filter(p => isThisMonth(p.created_at));
  const exclusiveProperties = activeProperties.filter(p => p.listing_agreement === true);
  const listPrices = activeProperties.map(p => Number(p.list_price) || 0).filter(v => v > 0);
  const commsArr = activeProperties.map(p => (Number(p.listing_side_comm) || 0) + (Number(p.selling_side_comm) || 0)).filter(v => v > 0);

  const activeDomSum = activeProperties.reduce((acc, p) => acc + Math.max(0, Math.floor((new Date() - new Date(p.created_at)) / 86400000)), 0);

  const officeInquiriesThisMonth = (inquiries || []).filter(i => {
    if (!isThisMonth(i.created_at)) return false;
    if (!i.assigned_agent_id) return true;
    return filteredProfiles.some(p => p.id === i.assigned_agent_id);
  });
  const officeShowingsThisMonth = (communications || []).filter(c => {
    if (!isThisMonth(c.created_at)) return false;
    if (c.type !== 'showing' && c.type !== 'visita' && c.type !== 'tour') return false;
    return filteredProfiles.some(p => p.id === c.agent_id);
  });

  const actuals = useMemo(() => ({
    new_agents: filteredProfiles.filter(p => isThisMonth(p.created_at)).length,
    team_size: periodPlan.actual_team_size !== null && periodPlan.actual_team_size !== undefined ? Number(periodPlan.actual_team_size) : filteredProfiles.filter(p => p.status === 'active').length,
    active_properties: activeProperties.length,
    exclusivity_pct: activeProperties.length ? Math.round((exclusiveProperties.length / activeProperties.length) * 100) : 0,
    days_on_market: activeProperties.length ? Math.round(activeDomSum / activeProperties.length) : 0,
    new_listings_total: propertiesListedThisMonth.length,
    new_listings_casa: propertiesListedThisMonth.filter(p => p.property_type_id === 1).length,
    new_listings_lote: propertiesListedThisMonth.filter(p => p.property_type_id === 3).length,
    new_listings_finca: propertiesListedThisMonth.filter(p => p.property_type_id === 4).length,
    new_listings_comercial: propertiesListedThisMonth.filter(p => [5, 6, 7].includes(p.property_type_id)).length,
    avg_ticket: listPrices.length ? listPrices.reduce((a, b) => a + b, 0) / listPrices.length : 0,
    avg_commission_pct: commsArr.length ? commsArr.reduce((a, b) => a + b, 0) / commsArr.length : 0,
    avg_commission_amount: (() => { const t = listPrices.length ? listPrices.reduce((a,b)=>a+b,0)/listPrices.length : 0; const c = commsArr.length ? commsArr.reduce((a,b)=>a+b,0)/commsArr.length : 0; return t*(c/100); })(),
    reservations: filteredNewReservations.length,
    transactions: filteredCommissionsThisMonth.length,
    revenue: periodPlan.actual_revenue !== null && periodPlan.actual_revenue !== undefined ? Number(periodPlan.actual_revenue) : filteredCommissionsThisMonth.reduce((a, c) => a + (Number(c.gross_commission) || 0), 0),
    portfolio_rotation: (() => {
      const soldThisMonth = filteredProperties.filter(p => p.status === 'sold' && isThisMonth(p.updated_at));
      if (!soldThisMonth.length) return 0;
      const doms = soldThisMonth.map(p => Math.max(0, Math.floor((new Date(p.updated_at) - new Date(p.created_at)) / 86400000)));
      return Math.round(doms.reduce((a, b) => a + b, 0) / doms.length);
    })(),
    new_contacts: officeInquiriesThisMonth.length,
    showings: officeShowingsThisMonth.length,
  }), [monthStr, selectedOffice, filteredProfiles, filteredProperties, filteredNewReservations, filteredCommissionsThisMonth, inquiries, communications, periodPlan, timeframe]);

  // --- KPI Definitions ---
  const sections = [
    { icon: '👥', titleKey: 'plan_section_team', kpis: [
      { label: t('plan_new_agents'), key: 'new_agents_goal', actualKey: 'new_agents', type: 'number' },
      { label: t('plan_team_size'), key: 'team_size_goal', actualKey: 'team_size', type: 'number' },
    ]},
    { icon: '🏠', titleKey: 'plan_section_portfolio', kpis: [
      { label: t('plan_active_portfolio'), key: 'active_properties_goal', actualKey: 'active_properties', type: 'number', fullWidth: true },
      { label: t('plan_exclusivity'), key: 'exclusivity_pct_goal', actualKey: 'exclusivity_pct', type: 'percent' },
      { label: t('plan_dom'), key: 'days_on_market_goal', actualKey: 'days_on_market', type: 'number', inverse: true },
      { label: t('plan_new_listings'), key: 'new_listings_total_goal', actualKey: 'new_listings_total', type: 'number' },
      { label: t('plan_listings_casa'), key: 'new_listings_casa_goal', actualKey: 'new_listings_casa', type: 'number' },
      { label: t('plan_listings_lote'), key: 'new_listings_lote_goal', actualKey: 'new_listings_lote', type: 'number' },
      { label: t('plan_listings_finca'), key: 'new_listings_finca_goal', actualKey: 'new_listings_finca', type: 'number' },
      { label: t('plan_listings_comercial'), key: 'new_listings_comercial_goal', actualKey: 'new_listings_comercial', type: 'number' },
      { label: t('plan_rotation'), key: 'portfolio_rotation_goal', actualKey: 'portfolio_rotation', type: 'number', inverse: true },
    ]},
    { icon: '📩', titleKey: 'plan_section_leads', kpis: [
      { label: t('plan_new_contacts'), key: 'new_contacts_goal', actualKey: 'new_contacts', type: 'number' },
      { label: t('plan_showings'), key: 'showings_goal', actualKey: 'showings', type: 'number' },
    ]},
    { icon: '💰', titleKey: 'plan_section_financial', kpis: [
      { label: t('plan_avg_ticket'), key: 'avg_ticket_goal', actualKey: 'avg_ticket', type: 'currency' },
      { label: t('plan_avg_comm_pct'), key: 'avg_commission_pct_goal', actualKey: 'avg_commission_pct', type: 'percent' },
      { label: t('plan_avg_comm_amt'), key: 'avg_commission_amount_goal', actualKey: 'avg_commission_amount', type: 'currency' },
      { label: t('plan_reservations'), key: 'reservations_goal', actualKey: 'reservations', type: 'number' },
      { label: t('plan_transactions'), key: 'transactions_goal', actualKey: 'transactions', type: 'number', fullWidth: true },
      { label: t('plan_revenue'), key: 'revenue_goal', actualKey: 'revenue', type: 'currency', fullWidth: true },
    ]},
  ];

  // --- Overall Score ---
  const allKpis = sections.flatMap(s => s.kpis);
  const scored = allKpis.filter(k => (Number(periodPlan[k.key]) || 0) > 0);
  const overallPct = scored.length > 0
    ? scored.reduce((sum, k) => sum + Math.min((actuals[k.actualKey] / (Number(periodPlan[k.key]) || 1)) * 100, 100), 0) / scored.length
    : 0;
  const metAt100 = scored.filter(k => actuals[k.actualKey] >= (Number(periodPlan[k.key]) || 0)).length;

  const povertyLine = passedPovertyLine || globalPovertyLine || Number(periodPlan.poverty_line) || 0;
  const revenueActual = actuals.revenue;
  const abovePoverty = revenueActual >= povertyLine;


  const soldProperties = officeProperties.filter(p => p.status === 'sold' && isThisMonth(p.updated_at));
  const fmtCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  const activeAgentsList = useMemo(() => {
    return filteredProfiles;
  }, [filteredProfiles]);

  const STAGE_PAIRS = useMemo(() => [
    { from: 'contact_created_at', to: 'prelisting_at', labelKey: 'lpt_stage_prelisting', icon: '📋', color: 'bg-violet-500' },
    { from: 'prelisting_at', to: 'cma_created_at', labelKey: 'lpt_stage_cma', icon: '📊', color: 'bg-blue-500' },
    { from: 'cma_created_at', to: 'listing_created_at', labelKey: 'lpt_stage_listing', icon: '🏠', color: 'bg-cyan-500' },
    { from: 'listing_created_at', to: 'photos_requested_at', labelKey: 'lpt_stage_photos_req', icon: '📸', color: 'bg-amber-500' },
    { from: 'photos_requested_at', to: 'photos_ready_at', labelKey: 'lpt_stage_photos_ready', icon: '✅', color: 'bg-emerald-500' },
    { from: 'photos_ready_at', to: 'authorization_signed_at', labelKey: 'lpt_stage_auth', icon: '✍️', color: 'bg-teal-500' },
    { from: 'authorization_signed_at', to: 'submitted_at', labelKey: 'lpt_stage_submitted', icon: '📤', color: 'bg-orange-500' },
    { from: 'submitted_at', to: 'broker_approved_at', labelKey: 'lpt_stage_approved', icon: '🔎', color: 'bg-green-500' },
    { from: 'broker_approved_at', to: 'published_at', labelKey: 'lpt_stage_published', icon: '🚀', color: 'bg-indigo-500' },
  ], []);

  const revenueTrendData = useMemo(() => {
    const months = [];
    const MONTH_NAMES_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - i, 1);
      const yearVal = d.getFullYear();
      const monthVal = d.getMonth();
      const monthPrefix = `${yearVal}-${String(monthVal + 1).padStart(2, '0')}`;
      
      let actualComm = 0;
      let actualClosedDeals = 0;
      filteredCommissions.forEach(c => {
        if (!c.closing_date) return;
        const cd = new Date(c.closing_date + 'T12:00:00');
        if (cd.getFullYear() === yearVal && cd.getMonth() === monthVal) {
          actualComm += Number(c.gross_commission) || 0;
          actualClosedDeals += 1;
        }
      });

      const planForMonth = (historicalPlans || []).find(hp => hp.month && hp.month.startsWith(monthPrefix));
      const planComm = planForMonth ? Number(planForMonth.revenue_goal) || 0 : 0;

      months.push({
        label: monthPrefix,
        displayName: `${MONTH_NAMES_ES[monthVal]} ${String(yearVal).slice(-2)}`,
        plan: planComm,
        actual: actualComm,
        closes: actualClosedDeals
      });
    }
    return months;
  }, [monthStr, filteredCommissions, historicalPlans, y, m]);

  const activePropertiesDoms = useMemo(() => {
    return activeProperties.map(p => {
      const dom = p.days_on_market !== null && p.days_on_market !== undefined
        ? p.days_on_market
        : Math.max(0, Math.floor((new Date() - new Date(p.created_at)) / 86400000));
      return { ...p, dom };
    });
  }, [activeProperties]);

  const agingTiers = useMemo(() => {
    let fresh = 0, standard = 0, warning = 0, critical = 0;
    activePropertiesDoms.forEach(p => {
      if (p.dom < 30) fresh++;
      else if (p.dom < 90) standard++;
      else if (p.dom < 180) warning++;
      else critical++;
    });
    const total = activePropertiesDoms.length || 1;
    return [
      { name: 'Fresco (< 30d)', count: fresh, pct: Math.round((fresh / total) * 100), color: '#10b981', hoverColor: '#059669', desc: 'Captaciones recientes en promoción activa.' },
      { name: 'Estándar (30-90d)', count: standard, pct: Math.round((standard / total) * 100), color: '#3b82f6', hoverColor: '#2563eb', desc: 'Rotación esperada de inventario sano.' },
      { name: 'Estancamiento (90-180d)', count: warning, pct: Math.round((warning / total) * 100), color: '#f59e0b', hoverColor: '#d97706', desc: 'Requiere revisión de precio o mercadeo.' },
      { name: 'Crítico (180d+)', count: critical, pct: Math.round((critical / total) * 100), color: '#ef4444', hoverColor: '#dc2626', desc: 'Inventario vencido. Riesgo alto de pérdida.' },
    ];
  }, [activePropertiesDoms]);

  const velocityByPropertyType = useMemo(() => {
    const types = [
      { id: 1, name: 'Casas' },
      { id: 3, name: 'Lotes' },
      { id: 4, name: 'Fincas' },
      { id: 5, name: 'Comercial' }
    ];
    return types.map(t => {
      const props = activePropertiesDoms.filter(p => {
        if (t.id === 5) return [5, 6, 7].includes(p.property_type_id);
        return p.property_type_id === t.id;
      });
      const avgDom = props.length > 0
        ? Math.round(props.reduce((sum, p) => sum + p.dom, 0) / props.length)
        : 0;
      return { name: t.name, avgDom, count: props.length };
    });
  }, [activePropertiesDoms]);

  const agentPerformanceList = useMemo(() => {
    return activeAgentsList.map(agent => {
      const planDetails = (agentPlans || []).find(ap => ap.agent_email === agent.email);
      
      const targetCloses = planDetails ? Number(planDetails.closes_needed_monthly) || 1.2 : 1.2;
      const targetCaptures = planDetails ? Number(planDetails.target_portfolio_size) / 12 || 2 : 2;
      
      const agentComms = (commissions || []).filter(c => {
        if (!c.closing_date) return false;
        const cd = new Date(c.closing_date + 'T12:00:00');
        return cd.getFullYear() === y && cd.getMonth() === m && (c.agent_id === agent.id || c.agent_id === agent.auth_user_id);
      });
      const closesAchieved = agentComms.length;
      
      const listingsCaptured = propertiesListedThisMonth.filter(p => p.agent_id === agent.id || p.agent_id === agent.auth_user_id).length;
      
      const agentActiveProps = activePropertiesDoms.filter(p => p.agent_id === agent.id || p.agent_id === agent.auth_user_id);
      const avgDom = agentActiveProps.length > 0
        ? Math.round(agentActiveProps.reduce((sum, p) => sum + p.dom, 0) / agentActiveProps.length)
        : 0;
        
      return {
        agent,
        targetCloses,
        targetCaptures,
        closesAchieved,
        listingsCaptured,
        avgDom,
        activeCount: agentActiveProps.length
      };
    });
  }, [activeAgentsList, agentPlans, commissions, propertiesListedThisMonth, activePropertiesDoms, y, m]);

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
    return activeAgentsList.map(agent => {
      // Find agent commissions in the selected year `y` up to current selected month `m`
      const agentYearComms = (commissions || []).filter(c => {
        if (!c.closing_date) return false;
        const cd = new Date(c.closing_date + 'T12:00:00');
        return cd.getFullYear() === y && (cd.getMonth() + 1) <= m && (c.agent_id === agent.id || c.agent_id === agent.auth_user_id);
      });

      const splitPct = parseAgentSplitPct(agent.commission_split || '45/55');
      const grossYTDSum = agentYearComms.reduce((sum, c) => sum + (Number(c.gross_commission) || 0), 0);
      const agentNetYTDSum = agentYearComms.reduce((sum, c) => sum + ((Number(c.gross_commission) || 0) * splitPct), 0);

      const elapsedMonths = Math.max(1, m);
      const avgMonthlyBilledGross = grossYTDSum / elapsedMonths;
      const avgMonthlyBilledNet = agentNetYTDSum / elapsedMonths;

      const povertyThreshold = passedPovertyLine || globalPovertyLine || 1000;
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
  }, [activeAgentsList, commissions, y, m, globalPovertyLine, passedPovertyLine]);

  const computedMilestoneVelocity = useMemo(() => {
    if (!milestones || milestones.length === 0) return [];
    return STAGE_PAIRS.map(pair => {
      const deltas = milestones
        .map(m => {
          if (!m[pair.from] || !m[pair.to]) return null;
          return Math.max(0, Math.round((new Date(m[pair.to]) - new Date(m[pair.from])) / 86400000));
        })
        .filter(d => d !== null);
      const avg = deltas.length > 0 ? (deltas.reduce((a, b) => a + b, 0) / deltas.length) : 0;
      return {
        label: pair.labelKey,
        icon: pair.icon,
        color: pair.color,
        avg: Math.round(avg * 10) / 10,
        count: deltas.length
      };
    });
  }, [milestones, STAGE_PAIRS]);

  const formatCurrency = (val) => {
    return '$' + (Number(val) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  };
  const formatNumber = (val) => {
    return (Number(val) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  };
  const gciPerAgent = dbPlan.team_size_goal > 0 ? Math.round(dbPlan.revenue_goal / dbPlan.team_size_goal) : 0;

  const desiredMonthlyGCI = dbPlan.revenue_goal > 0 ? dbPlan.revenue_goal / 12 : 0;
  const activeOfficeExpense = customOfficeExpense !== null ? customOfficeExpense : totalFixedExpenses;
  const officeMonthlyIncome = desiredMonthlyGCI * (officeRetentionPct / 100);
  const officeMonthlyNetProfit = officeMonthlyIncome - activeOfficeExpense;

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-nexus-blue border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* ── PREMIUM SAVE SUCCESS TOAST ── */}
      {showSaveSuccess && (
        <div className="fixed top-6 right-6 z-[9999] animate-bounce-short">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-650 text-white rounded-2xl px-6 py-4 shadow-2xl border border-emerald-400/20 flex items-center gap-3 backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg animate-pulse">
              🎉
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest italic">¡Cambios Guardados!</p>
              <p className="text-[10px] opacity-95 font-semibold mt-0.5">El plan anual se actualizó y se bloqueó para visualización.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-TAB NAVIGATION ── */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700/30">
        <button
          onClick={() => {
            setSubTab('office');
            if (editMode) setIsEditingLocal(true);
          }}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            subTab === 'office'
              ? 'bg-white dark:bg-slate-800 text-nexus-blue shadow-md shadow-blue-500/5'
              : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-300'
          }`}
        >
          {editMode ? '🎯 Definir Metas' : '🎯 Metas de Oficina'}
        </button>
        {editMode ? (
          <button
            onClick={() => setSubTab('agents')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              subTab === 'agents'
                ? 'bg-white dark:bg-slate-800 text-nexus-blue shadow-md shadow-blue-500/5'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            👥 Planes de Agentes
          </button>
        ) : (
          <button
            onClick={() => setSubTab('analytics')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              subTab === 'analytics'
                ? 'bg-white dark:bg-slate-800 text-nexus-blue shadow-md shadow-blue-500/5'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            📊 Rendimiento & Rotación
          </button>
        )}
      </div>

      {subTab === 'office' ? (
        <>
          {/* ── METAS DE OFICINA VIEW (EXISTING) ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-6">
            <div>
              <h2 className="text-xl font-black italic text-slate-900 dark:text-white flex flex-wrap items-center gap-2.5">
                <span>{isEditingLocal ? 'Configurar Plan de Oficina' : t('plan_title')}</span>
                <span className="px-3 py-1 rounded-full bg-nexus-blue text-white dark:bg-brand-500/20 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest leading-none shadow-sm">
                  {selectedOffice === 'cero' ? 'Altitud Cero' : 'RE/MAX Altitud'}
                </span>
                {!isEditingLocal && editMode && (
                  <button
                    onClick={() => setIsEditingLocal(true)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-350 hover:text-nexus-blue dark:hover:text-blue-400 transition-all border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105"
                    title="Editar Plan (Desbloquear)"
                  >
                    <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">
                {isEditingLocal ? 'Define las metas mensuales de facturación, captaciones e interacciones de la oficina.' : t('plan_subtitle')} • <span className="text-nexus-blue">Usa el selector superior en la cabecera para cambiar de oficina</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {/* Year select (Segmented Control) */}
              <div className="flex bg-[#f0f2f5] dark:bg-slate-900 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/40 shadow-inner items-center">
                {[2025, 2026].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleYearChange(yr)}
                    className={`px-5 py-1.5 rounded-[15px] text-xs font-black uppercase tracking-widest transition-all ${
                      yearFromMonthStr === yr
                        ? 'bg-white dark:bg-slate-700 text-[#0047AB] dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        : 'text-slate-500 hover:text-slate-750 dark:hover:text-white font-extrabold'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>

              {/* Month select dropdown */}
              <div className="relative flex items-center bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-full px-5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-pointer group">
                <select 
                  value={monthFromMonthStr} 
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  className="appearance-none bg-transparent text-slate-850 dark:text-slate-200 text-xs font-black uppercase tracking-widest outline-none pr-6 cursor-pointer"
                >
                  {MONTH_NAMES_ES.map((lbl, idx) => (
                    <option key={idx} value={idx} className="bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-200 font-bold">{lbl}</option>
                  ))}
                </select>
                <div className="absolute right-4 pointer-events-none text-slate-700 dark:text-slate-300">
                  <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Timeframe pill toggle */}
              <div className="flex bg-[#f0f2f5] dark:bg-slate-900 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/40 shadow-inner items-center">
                <button
                  type="button"
                  onClick={() => setTimeframe('monthly')}
                  className={`px-5 py-1.5 rounded-[15px] text-[10px] font-black uppercase tracking-widest transition-all ${
                    timeframe === 'monthly'
                      ? 'bg-[#0047AB] text-white shadow-[0_2px_8px_rgba(0,47,171,0.2)]'
                      : 'text-slate-500 hover:text-slate-750 dark:hover:text-white font-extrabold'
                  }`}
                >
                  {t('plan_monthly_btn')}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('cumulative')}
                  className={`px-5 py-1.5 rounded-[15px] text-[10px] font-black uppercase tracking-widest transition-all ${
                    timeframe === 'cumulative'
                      ? 'bg-[#0047AB] text-white shadow-[0_2px_8px_rgba(0,47,171,0.2)]'
                      : 'text-slate-500 hover:text-slate-750 dark:hover:text-white font-extrabold'
                  }`}
                >
                  {t('plan_accumulated_btn')}
                </button>
              </div>
              {isEditingLocal && planningView === 'kpis' && kpisSubTab === 'matrix' && (
                <button
                  onClick={handleSaveSimulator}
                  disabled={saving || savingSim}
                  className="px-6 py-2 bg-nexus-blue text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50 hover:bg-blue-700 transition-all"
                >
                  {saving || savingSim ? t('plan_saving') : t('plan_save')}
                </button>
              )}
            </div>
          </div>

          {!isEditingLocal && (
            <>
              {/* Filtro de Segmentación (Consolidado, Equipo, Broker) */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/30 mt-4 mb-2 shadow-sm">
                <button
                  onClick={() => setSegmentFilter('all')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    segmentFilter === 'all'
                      ? 'bg-white dark:bg-slate-800 text-nexus-blue shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350 font-bold'
                  }`}
                >
                  Consolidado
                </button>
                <button
                  onClick={() => setSegmentFilter('team')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    segmentFilter === 'team'
                      ? 'bg-white dark:bg-slate-800 text-nexus-blue shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-355'
                  }`}
                >
                  Solo Equipo
                </button>
                <button
                  onClick={() => setSegmentFilter('broker')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    segmentFilter === 'broker'
                      ? 'bg-white dark:bg-slate-800 text-nexus-blue shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-355'
                  }`}
                >
                  Ventas Broker
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 shadow-sm border border-slate-200/60 dark:border-slate-700/50 flex items-center gap-4">
                  <div className="relative">
                    <ProgressRing pct={overallPct} size={56} stroke={5} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-900 dark:text-white">{Math.round(overallPct)}%</span>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{t('plan_overall_score')}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{metAt100} {t('plan_of')} {scored.length} {t('plan_metrics')}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{t('plan_revenue')}</p>
                  <p className="text-xl font-black italic text-emerald-500 mt-1 tabular-nums">{fmtCurrency(revenueActual)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t('plan_goal')}: {fmtCurrency(Number(periodPlan.revenue_goal) || 0)}</p>
                </div>

                <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{t('plan_transactions')}</p>
                  <p className="text-xl font-black italic text-nexus-blue mt-1 tabular-nums">{actuals.transactions}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t('plan_goal')}: {Number(periodPlan.transactions_goal) || 0}</p>
                </div>

                <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{t('plan_active_portfolio')}</p>
                  <p className="text-xl font-black italic text-slate-900 dark:text-white mt-1 tabular-nums">{actuals.active_properties}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t('plan_goal')}: {Number(periodPlan.active_properties_goal) || 0}</p>
                </div>
              </div>


            </>
          )}

          {/* ── Sub-navigation in Planning Mode ── */}
          {isEditingLocal && (
            <div className="flex flex-wrap items-center gap-2 mt-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-3">
              <button
                onClick={() => setPlanningView('kpis')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  planningView === 'kpis'
                    ? 'bg-nexus-blue text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                }`}
              >
                🎯 Metas Generales de Oficina
              </button>
              <button
                type="button"
                onClick={() => setPlanningView('simulator')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  planningView === 'simulator'
                    ? 'bg-nexus-blue text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 hover:text-slate-850 dark:hover:text-slate-300'
                }`}
              >
                💼 Simulador Financiero
              </button>
            </div>
          )}

          {editMode && planningView === 'simulator' ? (
            <div className="space-y-6">
              {/* ── SUB-TAB 1: EXPENSES MODELER ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel: Fixed outgoings & RCCA fees */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/50 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      <span>🏢</span> Gastos Operativos de Oficina
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(simulator.office_expenses).map(([key, value]) => (
                        <div key={key}>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            {key === 'alquiler' ? 'Alquiler Oficina' : key === 'salarios' ? 'Salarios Staff' : key === 'plataformas' ? 'Software / Plataformas' : key === 'marketing' ? 'Marketing Oficina' : 'Otros Gastos'}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                            <input
                              type="number"
                              value={value || ''}
                              onChange={(e) => handleUpdateSimulator('office_expenses', key, e.target.value)}
                              className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Total Gastos Fijos</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">${totalFixedExpenses.toLocaleString()} / mes</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      <span>🛡️</span> Reglas RCCA & Regalías Regionales
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Royalty Regional (%)</label>
                        <input
                          type="number"
                          value={simulator.rcca_rules.royalty_pct || ''}
                          onChange={(e) => handleUpdateSimulator('rcca_rules', 'royalty_pct', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Marketing Fee por Agente ($)</label>
                        <input
                          type="number"
                          value={simulator.rcca_rules.mkt_fee_per_agent || ''}
                          onChange={(e) => handleUpdateSimulator('rcca_rules', 'mkt_fee_per_agent', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Plataforma Fee por Agente ($)</label>
                        <input
                          type="number"
                          value={simulator.rcca_rules.platform_fee_per_agent || ''}
                          onChange={(e) => handleUpdateSimulator('rcca_rules', 'platform_fee_per_agent', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Deserción de Agentes Anual (%)</label>
                        <input
                          type="number"
                          value={simulator.rcca_rules.agent_churn_rate || ''}
                          onChange={(e) => handleUpdateSimulator('rcca_rules', 'agent_churn_rate', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Panel: Team & Splits modeling */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/50 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      <span>👥</span> Fuerza de Ventas por Split
                    </h3>
                    <div className="space-y-4">
                      {splitTiers.map(tier => {
                        const isRap = tier.startsWith('100');
                        const countKey = getCountKey(tier);
                        
                        if (isRap) {
                          return (
                            <div key={tier} className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Agentes RAP / 100%</label>
                                <input
                                  type="number"
                                  value={simulator.agent_tiers[countKey] || ''}
                                  onChange={(e) => handleUpdateSimulator('agent_tiers', countKey, e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Fijo Mensual RAP ($)</label>
                                <input
                                  type="number"
                                  value={simulator.agent_tiers.tier_100_rap_desk_fee || ''}
                                  onChange={(e) => handleUpdateSimulator('agent_tiers', 'tier_100_rap_desk_fee', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                                />
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={tier}>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                              Agentes en Split {tier} (Cantidad)
                            </label>
                            <input
                              type="number"
                              value={simulator.agent_tiers[countKey] || ''}
                              onChange={(e) => handleUpdateSimulator('agent_tiers', countKey, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      <span>⚖️</span> Distribución de Peso de Facturación
                    </h3>
                    <div className="space-y-3">
                      {(() => {
                        const brokerWeightVal = Number(simulator.production_weights?.broker || 0);
                        const splitTiersWeightsVal = splitTiers.reduce((sum, tier) => {
                          const wKey = getWeightKey(tier);
                          return sum + Number(simulator.production_weights?.[wKey] || 0);
                        }, 0);
                        const totalSum = brokerWeightVal + splitTiersWeightsVal;

                        return (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Configure el peso de participación por tier:</p>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap self-start sm:self-auto ${
                              totalSum === 100
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}>
                              Total: {totalSum}% / 100%
                            </span>
                          </div>
                        );
                      })()}
                      
                      {/* Broker */}
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-24">Broker</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={simulator.production_weights?.broker || 0}
                          onChange={(e) => {
                            const rawVal = Number(e.target.value) || 0;
                            const splitsSum = splitTiers.reduce((sum, tier) => {
                              const wKey = getWeightKey(tier);
                              return sum + Number(simulator.production_weights?.[wKey] || 0);
                            }, 0);
                            const maxBroker = Math.max(0, 100 - splitsSum);
                            const numericValue = Math.min(rawVal, maxBroker);
                            setSimulator(prev => ({
                              ...prev,
                              production_weights: {
                                ...prev.production_weights,
                                broker: numericValue
                              }
                            }));
                          }}
                          className="flex-1 accent-nexus-blue"
                        />
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-8 text-right">{simulator.production_weights?.broker || 0}%</span>
                      </div>

                      {/* Split Tiers */}
                      {splitTiers.map(tier => {
                        const wKey = getWeightKey(tier);
                        const val = simulator.production_weights?.[wKey] || 0;
                        return (
                          <div key={tier} className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-24">{getDisplayName(tier)}</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={val}
                              onChange={(e) => {
                                const rawVal = Number(e.target.value) || 0;
                                const brokerW = Number(simulator.production_weights?.broker || 0);
                                const otherSplitsSum = splitTiers.reduce((sum, t) => {
                                  const otherKey = getWeightKey(t);
                                  if (otherKey === wKey) return sum;
                                  return sum + Number(simulator.production_weights?.[otherKey] || 0);
                                }, 0);
                                const maxTier = Math.max(0, 100 - (brokerW + otherSplitsSum));
                                const numericValue = Math.min(rawVal, maxTier);
                                setSimulator(prev => ({
                                  ...prev,
                                  production_weights: {
                                    ...prev.production_weights,
                                    [wKey]: numericValue
                                  }
                                }));
                              }}
                              className="flex-1 accent-nexus-blue"
                            />
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-8 text-right">{val}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Panel: Live Break-Even */}
                <div className="bg-gradient-to-br from-nexus-blue/10 to-indigo-500/10 dark:from-nexus-blue/20 dark:to-indigo-500/5 rounded-2xl p-6 border border-nexus-blue/30 dark:border-brand-500/30 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-nexus-blue/20 blur-2xl rounded-full"></div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-nexus-blue dark:text-brand-400 mb-4">Punto de Equilibrio en Vivo</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 uppercase font-black tracking-wider">Total Agentes</span>
                      <span className="font-black text-slate-900 dark:text-white">{totalAgents} agentes</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 uppercase font-black tracking-wider">Costos RCCA Plataforma/Mkt</span>
                      <span className="font-black text-slate-900 dark:text-white">${totalAgentCostsRCCA.toLocaleString()} / mes</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 uppercase font-black tracking-wider">Ingresos Fijos (Desk Fees)</span>
                      <span className="font-black text-emerald-500">${Math.round(totalDeskFees).toLocaleString()} / mes</span>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1 mt-0.5 text-[10px]">
                      <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-200/50 dark:border-slate-700/50 pb-1 mb-1">
                        Desglose de Cuotas (Promedio Mensual YTD)
                      </p>
                      <div className="flex justify-between text-slate-500">
                        <span>Agentes RAP (100%): {rapCount} × ${RAPDeskFee}/mes</span>
                        <span className="font-bold text-slate-700 dark:text-slate-350">${Math.round(rapCount * RAPDeskFee).toLocaleString()}</span>
                      </div>
                      {splitTiers.map(tier => {
                        const count = Number(simulator.agent_tiers?.[getCountKey(tier)] || 0);
                        const agentPct = parseAgentPct(tier);
                        if (tier.startsWith('100')) return null;

                        let feeAmount = 0;
                        if (agentPct === 45) feeAmount = 75;
                        else if (agentPct === 60) feeAmount = 200;
                        else if (agentPct === 80) feeAmount = 500;

                        const monthlyAverage = count * feeAmount * (7 / 12);

                        return (
                          <div key={tier} className="flex justify-between text-slate-500">
                            <span>{getDisplayName(tier)}: {count} × ${feeAmount}/mes (desde mes 6)</span>
                            <span className="font-bold text-slate-700 dark:text-slate-350">${Math.round(monthlyAverage).toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
                      <span className="text-slate-400 uppercase font-black tracking-wider">Déficit Mensual Neto</span>
                      <span className="font-black text-red-500">${netDeficit.toLocaleString()} / mes</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 uppercase font-black tracking-wider">Margen Neto de Oficina (GCI)</span>
                      <span className="font-black text-indigo-500">{(marginAfterRoyalty * 100).toFixed(1)}%</span>
                    </div>

                    <div className="border-t border-nexus-blue/30 dark:border-brand-500/30 pt-4 text-center space-y-4">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Facturación GCI Requerida (Mensual)</p>
                        <p className="text-2xl font-black italic text-nexus-blue mt-1 tabular-nums">${Math.round(monthlyBreakEvenGCI).toLocaleString()}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-3">Facturación GCI Requerida (Anual)</p>
                        <p className="text-lg font-black italic text-indigo-500 tabular-nums">${Math.round(yearlyBreakEvenGCI).toLocaleString()}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveSimulator()}
                        disabled={savingSim}
                        className="w-full py-3 px-4 bg-nexus-blue hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                      >
                        {savingSim ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Guardando...
                          </>
                        ) : (
                          <>
                            💾 Guardar Configuración del Simulador
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : editMode && planningView === 'kpis' ? (
            <div className="space-y-6">
              {/* KPIs Sub-Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/30 shadow-sm mb-6">
                <button
                  type="button"
                  onClick={() => setKpisSubTab('annual_plan')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    kpisSubTab === 'annual_plan'
                      ? 'bg-white dark:bg-slate-800 text-nexus-blue shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-bold'
                  }`}
                >
                  📊 Plan Anual
                </button>
                <button
                  type="button"
                  onClick={() => setKpisSubTab('matrix')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    kpisSubTab === 'matrix'
                      ? 'bg-white dark:bg-slate-800 text-nexus-blue shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-bold'
                  }`}
                >
                  📅 Matriz Planificación ENE-DIC
                </button>
                <button
                  type="button"
                  onClick={() => setKpisSubTab('coach')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    kpisSubTab === 'coach'
                      ? 'bg-white dark:bg-slate-800 text-nexus-blue shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-bold'
                  }`}
                >
                  ✨ Olympia IA Coach
                </button>
              </div>

              {kpisSubTab === 'annual_plan' && (
                <div className="space-y-6">
                  {/* Banner / Header */}
                  <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/30 dark:from-slate-900/60 dark:to-slate-900/20 p-5 rounded-2xl border border-blue-100/50 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-blue-100 text-nexus-blue dark:bg-blue-900/30 dark:text-blue-400">
                        ⚡ Co-Pilot Financiero Activo
                      </span>
                      <h4 className="text-sm font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        Configuración del Plan de Negocios
                      </h4>
                      <p className="text-[11px] font-bold text-slate-550 dark:text-slate-400 leading-relaxed">
                        Define las 4 variables clave de tu oficina. El co-pilot recalculará y sincronizará de forma instantánea todo tu plan anual y tu matriz de distribución mes a mes.
                      </p>
                    </div>
                  </div>

                  {/* Grid Layout: Control Panel & Live Calculated Indicators */}
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    {/* Left Column: 4 Key Inputs (Control Card) */}
                    <div className="xl:col-span-3 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800/90 dark:to-slate-900/60 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-md flex flex-col justify-between gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-5 border-b border-slate-100 dark:border-slate-700/40 pb-3">
                          <span className="text-lg">⚙️</span>
                          <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">
                            Variables de Ingeniería Inversa
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          {/* 1. Facturación Anual Deseada (GCI) */}
                          <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                              Facturación Anual Deseada (GCI)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs font-black">$</span>
                              <input
                                type="number"
                                value={dbPlan.revenue_goal || ''}
                                onChange={(e) => handleChange('revenue_goal', e.target.value)}
                                disabled={!isEditingLocal}
                                className="w-full pl-7 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black italic text-slate-900 dark:text-white focus:ring-2 focus:ring-nexus-blue outline-none tabular-nums transition-all disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/60 dark:disabled:bg-slate-900/40"
                                placeholder="0"
                              />
                              {!isEditingLocal && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" title="Campo bloqueado">🔒</span>
                              )}
                            </div>
                          </div>

                          {/* 2. Agentes en Diciembre */}
                          <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                              Agentes en Diciembre (Meta)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={dbPlan.team_size_goal || ''}
                                onChange={(e) => handleChange('team_size_goal', e.target.value)}
                                disabled={!isEditingLocal}
                                className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black italic text-slate-900 dark:text-white focus:ring-2 focus:ring-nexus-blue outline-none tabular-nums transition-all disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/60 dark:disabled:bg-slate-900/40"
                                placeholder="0"
                              />
                              {!isEditingLocal && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" title="Campo bloqueado">🔒</span>
                              )}
                            </div>
                          </div>

                          {/* 3. Ticket Promedio */}
                          <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                              Ticket Promedio
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs font-black">$</span>
                              <input
                                type="number"
                                value={dbPlan.avg_ticket_goal || ''}
                                onChange={(e) => handleChange('avg_ticket_goal', e.target.value)}
                                disabled={!isEditingLocal}
                                className="w-full pl-7 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black italic text-slate-900 dark:text-white focus:ring-2 focus:ring-nexus-blue outline-none tabular-nums transition-all disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/60 dark:disabled:bg-slate-900/40"
                                placeholder="0"
                              />
                              {!isEditingLocal && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" title="Campo bloqueado">🔒</span>
                              )}
                            </div>
                          </div>

                          {/* 4. % de Comisión Promedio */}
                          <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                              % de Comisión Promedio
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                value={dbPlan.avg_commission_pct_goal || ''}
                                onChange={(e) => handleChange('avg_commission_pct_goal', e.target.value)}
                                disabled={!isEditingLocal}
                                className="w-full pl-3 pr-8 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black italic text-slate-900 dark:text-white focus:ring-2 focus:ring-nexus-blue outline-none tabular-nums transition-all disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-100/60 dark:disabled:bg-slate-900/40"
                                placeholder="0.0"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs font-bold">%</span>
                              {!isEditingLocal && (
                                <span className="absolute right-7 top-1/2 -translate-y-1/2 text-xs" title="Campo bloqueado">🔒</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 leading-normal flex items-start gap-2.5">
                        <span className="text-base">💡</span>
                        <div>
                          <p className="font-black uppercase tracking-wider text-slate-650 dark:text-slate-355 mb-0.5">Distribución mes a mes</p>
                          <p>
                            Al cambiar estas variables, la matriz mes a mes se actualizará dinámicamente con una tasa de bajas/rotación calibrada del <strong>2.5%</strong> para el mantenimiento del portafolio.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Live Results Panel */}
                    <div className="xl:col-span-2 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl text-white flex flex-col justify-between gap-5 relative overflow-hidden group">
                      {/* Premium subtle background glow */}
                      <div className="absolute -right-16 -top-16 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/15 transition-all duration-500 pointer-events-none" />
                      
                      <div>
                        <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📊</span>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                              Cálculos en Tiempo Real
                            </span>
                          </div>
                          <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-400" title="Calculando en tiempo real" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Pocket Commission Amount */}
                          <div className="bg-white/5 dark:bg-slate-900/30 p-3 rounded-xl border border-white/5">
                            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">
                              Comisión Promedio ($)
                            </span>
                            <p className="text-lg font-black italic text-emerald-400 mt-0.5 tabular-nums">
                              {formatCurrency(dbPlan.avg_commission_amount_goal)}
                            </p>
                            <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                              Ticket × % Comisión
                            </span>
                          </div>

                          {/* GCI Promedio por Agente */}
                          <div className="bg-white/5 dark:bg-slate-900/30 p-3 rounded-xl border border-white/5">
                            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">
                              Facturación Anual / Agente
                            </span>
                            <p className="text-lg font-black italic text-blue-400 mt-0.5 tabular-nums">
                              {formatCurrency(gciPerAgent)}
                            </p>
                            <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                              Promedio Anual por Agente
                            </span>
                          </div>

                          {/* Transactions Required */}
                          <div className="bg-white/5 dark:bg-slate-900/30 p-3 rounded-xl border border-white/5">
                            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">
                              Transacciones Anuales
                            </span>
                            <p className="text-lg font-black italic text-slate-100 mt-0.5 tabular-nums">
                              {formatNumber(dbPlan.transactions_goal)}
                            </p>
                            <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                              Cierres requeridos
                            </span>
                          </div>

                          {/* Reservations Required */}
                          <div className="bg-white/5 dark:bg-slate-900/30 p-3 rounded-xl border border-white/5">
                            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">
                              Reservas Requeridas
                            </span>
                            <p className="text-lg font-black italic text-amber-400 mt-0.5 tabular-nums">
                              {formatNumber(dbPlan.reservations_goal)}
                            </p>
                            <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                              txs × 1.15 (15% caída)
                            </span>
                          </div>

                          {/* December Active Portfolio */}
                          <div className="bg-white/5 dark:bg-slate-900/30 p-3 rounded-xl border border-white/5">
                            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">
                              Cartera Dic. Requerida
                            </span>
                            <p className="text-lg font-black italic text-purple-400 mt-0.5 tabular-nums">
                              {formatNumber(dbPlan.active_properties_goal)}
                            </p>
                            <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                              Agentes × 15 props/agente
                            </span>
                          </div>

                          {/* Annual Recruits Required */}
                          <div className="bg-white/5 dark:bg-slate-900/30 p-3 rounded-xl border border-white/5">
                            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">
                              Agentes Nuevos
                            </span>
                            <p className="text-lg font-black italic text-indigo-400 mt-0.5 tabular-nums">
                              {formatNumber(dbPlan.new_agents_goal)}
                            </p>
                            <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                              Reclutamientos requeridos
                            </span>
                          </div>
                        </div>

                        {/* Sleek Office Profit Simulator Block */}
                        <div className="mt-5 pt-5 border-t border-slate-800/80 space-y-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">⚖️</span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                              Proyección de Utilidad de Oficina (Mensual)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Input: Gasto de Oficina por Mes */}
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5">
                              <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">
                                Gasto Oficina por Mes ($)
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">$</span>
                                <input
                                  type="number"
                                  value={customOfficeExpense !== null ? customOfficeExpense : Math.round(totalFixedExpenses)}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                    setCustomOfficeExpense(val);
                                  }}
                                  className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white outline-none focus:ring-1 focus:ring-nexus-blue"
                                  placeholder={Math.round(totalFixedExpenses).toString()}
                                />
                              </div>
                              <span className="text-[7.5px] text-slate-500 block font-semibold">
                                editable · base config: ${Math.round(totalFixedExpenses).toLocaleString()}
                              </span>
                            </div>

                            {/* Input: Retención de Oficina (%) */}
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5">
                              <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">
                                Retención Oficina (%)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={officeRetentionPct}
                                  onChange={(e) => setOfficeRetentionPct(Number(e.target.value))}
                                  className="w-full pl-2 pr-6 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white outline-none focus:ring-1 focus:ring-nexus-blue"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">%</span>
                              </div>
                              <span className="text-[7.5px] text-slate-500 block font-semibold">
                                editable (ej. puros vs altos)
                              </span>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-blue-950/20 to-indigo-950/20 p-3.5 rounded-xl border border-slate-800/60 space-y-2 text-xs">
                            {/* Desired Monthly GCI */}
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>Facturación Mensual Meta:</span>
                              <span className="font-bold text-slate-300 tabular-nums">
                                {formatCurrency(desiredMonthlyGCI)} / mes
                              </span>
                            </div>

                            {/* Gross Retained Income */}
                            <div className="flex justify-between text-slate-400 text-[10px] border-b border-slate-800/40 pb-1.5">
                              <span>Retenido por Oficina ({officeRetentionPct}%):</span>
                              <span className="font-bold text-emerald-400 tabular-nums">
                                {formatCurrency(officeMonthlyIncome)}
                              </span>
                            </div>

                            {/* Office Net Gain */}
                            <div className="flex justify-between items-center pt-0.5">
                              <span className="font-black uppercase text-[9px] tracking-wider text-slate-300">
                                Ganancia Oficina / Mes:
                              </span>
                              <span className={`text-sm font-black italic tabular-nums ${officeMonthlyNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {officeMonthlyNetProfit >= 0 ? '+' : ''}{formatCurrency(officeMonthlyNetProfit)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[9px] text-slate-400">
                        <span>Ingeniería Inversa Inteligente</span>
                        <span>v2.0 (Real Estate Engine)</span>
                      </div>
                    </div>
                  </div>

                  {/* Save Button Card */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💾</span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Guardar Planificación
                        </p>
                        <p className="text-[10px] font-bold text-slate-550 dark:text-slate-400">
                          Guarda la configuración anual y actualiza la distribución mensual de la matriz (ENE-DIC).
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full sm:w-auto py-3 px-8 bg-nexus-blue hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {t('plan_saving') || 'Guardando...'}
                        </>
                      ) : (
                        <>
                          <span>💾</span> Guardar Plan Anual de Oficina
                        </>
                      )}
                    </button>
                  </div>

                  {/* Collapsible Advanced settings for other overrides */}
                  <details className="group border border-slate-200/60 dark:border-slate-700/50 rounded-2xl bg-white dark:bg-slate-800 overflow-hidden transition-all shadow-sm">
                    <summary className="flex items-center justify-between p-5 font-black uppercase text-xs tracking-wider text-slate-700 dark:text-slate-200 cursor-pointer list-none select-none hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all">
                      <span className="flex items-center gap-2.5">
                        <span>⚙️</span>
                        {t('plan_advanced_overrides') || 'Ajustes Avanzados & Metas Adicionales (Sobrescribir)'}
                      </span>
                      <span className="transition-transform duration-300 group-open:rotate-180 text-xs opacity-60">
                        ▼
                      </span>
                    </summary>
                    <div className="p-5 border-t border-slate-100 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-900/10">
                      <p className="text-[10px] font-bold text-slate-550 dark:text-slate-450 uppercase tracking-wide mb-6">
                        Define aquí metas adicionales como días en el mercado, porcentaje de exclusividad, volumen de contactos, visitas y tipología de propiedades.
                      </p>
                      
                      <div className="columns-1 lg:columns-2 gap-6 [column-fill:balance]">
                        {sections.map((section, si) => (
                          <div key={si} className="break-inside-avoid-column inline-block w-full mb-6">
                            <SectionCard icon={section.icon} title={t(section.titleKey) || section.titleKey.replace('plan_section_','').toUpperCase()} editMode={editMode}>
                              {section.kpis.map((kpi) => (
                                <KpiRow
                                  key={kpi.key}
                                  label={kpi.label || kpi.key.replace('_goal','')}
                                  goalKey={kpi.key}
                                  plan={dbPlan}
                                  actual={actuals[kpi.actualKey]}
                                  type={kpi.type}
                                  inverse={kpi.inverse}
                                  onChange={handleChange}
                                  t={t}
                                  editMode={editMode}
                                  isEditingLocal={isEditingLocal}
                                  fullWidth={kpi.fullWidth}
                                />
                              ))}
                            </SectionCard>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              )}

              {kpisSubTab === 'matrix' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/50 shadow-sm space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>📅</span> Matriz de Planificación Anual (Hoja de Cálculo ENE-DIC)
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Planifique mes a mes los volúmenes de agentes, captaciones, cartera y facturación requerida.</p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        disabled={!isEditingLocal}
                        onClick={handleReverseEngineering}
                        className="px-4 py-2 bg-gradient-to-r from-nexus-blue to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>🔄</span> Ingeniería Inversa (Desde Actual: {actuals.team_size} Agentes / {actuals.active_properties} Cartera)
                      </button>
                      <button
                        type="button"
                        disabled={!isEditingLocal}
                        onClick={handleAutoDistribute}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ⚡ Auto-distribuir Metas Anuales
                      </button>
                    </div>
                  </div>

                  {/* Segmented Control for Linear vs Season Distribution */}
                  <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/80 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-nexus-blue flex items-center gap-1.5">
                          🎛️ Método de Distribución de Cierres {!isEditingLocal && "🔒"}
                        </span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold mt-0.5">
                          Determina cómo se distribuyen la facturación (GCI), transacciones y reservas en el año.
                        </p>
                      </div>
                      
                      {/* Segmented Control Toggle */}
                      <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm self-start sm:self-auto">
                        <button
                          type="button"
                          disabled={!isEditingLocal}
                          onClick={() => setDistributionMode('linear')}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                            distributionMode === 'linear'
                              ? 'bg-nexus-blue text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350 font-bold disabled:opacity-50'
                          }`}
                        >
                          📈 Lineal (Todo el Año)
                        </button>
                        <button
                          type="button"
                          disabled={!isEditingLocal}
                          onClick={() => setDistributionMode('season')}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                            distributionMode === 'season'
                              ? 'bg-nexus-blue text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350 font-bold disabled:opacity-50'
                          }`}
                        >
                          ❄️ Cierres por Temporada
                        </button>
                      </div>
                    </div>

                    {/* Season Config Inputs (Only visible when 'season' mode is selected) */}
                    {distributionMode === 'season' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3.5 border-t border-slate-200/50 dark:border-slate-800/40">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550 mb-1.5">
                            📅 Mes Inicio de Temporada
                          </label>
                          <select
                            disabled={!isEditingLocal}
                            value={seasonStart}
                            onChange={(e) => setSeasonStart(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-xl text-xs font-black italic text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-nexus-blue disabled:opacity-75 disabled:cursor-not-allowed"
                          >
                            {MONTH_NAMES_ES.map((name, idx) => (
                              <option key={idx} value={idx}>
                                {name} ({idx + 1})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550 mb-1.5">
                            📅 Mes Fin de Temporada
                          </label>
                          <select
                            disabled={!isEditingLocal}
                            value={seasonEnd}
                            onChange={(e) => setSeasonEnd(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-xl text-xs font-black italic text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-nexus-blue disabled:opacity-75 disabled:cursor-not-allowed"
                          >
                            {MONTH_NAMES_ES.map((name, idx) => (
                              <option key={idx} value={idx}>
                                {name} ({idx + 1})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2 md:col-span-1 flex items-end">
                          <div className="w-full p-2.5 bg-blue-50/50 dark:bg-slate-850 border border-blue-100/30 dark:border-slate-750 rounded-xl text-[9px] text-slate-550 dark:text-slate-400 font-bold leading-relaxed">
                            💡 La facturación y cierres anuales se concentrarán de forma equitativa únicamente entre los meses seleccionados, dejando los demás meses en cero.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <table className="w-full min-w-[900px] text-left text-xs tabular-nums">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                        <tr className="divide-x divide-slate-100 dark:divide-slate-700/30">
                          <th className="px-3 py-3">Mes</th>
                          <th className="px-3 py-3">Cartera Activa</th>
                          <th className="px-3 py-3">Agentes</th>
                          <th className="px-3 py-3">Agentes Nuevos</th>
                          <th className="px-3 py-3">Captaciones</th>
                          <th className="px-3 py-3">Ticket Prom. ($)</th>
                          <th className="px-3 py-3">Reservas</th>
                          <th className="px-3 py-3">Comisión Prom. ($)</th>
                          <th className="px-3 py-3">Transacciones</th>
                          <th className="px-3 py-3">Facturación ($)</th>
                          <th className="px-3 py-3 bg-emerald-550/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">Neto Oficina ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 dark:divide-slate-750">
                        {Object.entries(simulator.monthly_distribution).map(([monthKey, row]) => {
                          const netIncome = getMonthlyNetIncome(row);
                          return (
                            <tr key={monthKey} className="hover:bg-slate-50/50 dark:hover:bg-white/5 divide-x divide-slate-100 dark:divide-slate-700/30">
                              <td className="px-3 py-2 font-black uppercase text-slate-900 dark:text-white bg-slate-50/30 dark:bg-slate-900/20">{monthKey}</td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  disabled={!isEditingLocal}
                                  value={row.cartera || ''}
                                  onChange={(e) => handleUpdateMatrix(monthKey, 'cartera', e.target.value)}
                                  className="w-full bg-transparent px-2 py-1 outline-none text-slate-800 dark:text-white text-right font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  disabled={!isEditingLocal}
                                  value={row.agentes || ''}
                                  onChange={(e) => handleUpdateMatrix(monthKey, 'agentes', e.target.value)}
                                  className="w-full bg-transparent px-2 py-1 outline-none text-slate-800 dark:text-white text-right font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  disabled={!isEditingLocal}
                                  value={row.agentes_nuevos || ''}
                                  onChange={(e) => handleUpdateMatrix(monthKey, 'agentes_nuevos', e.target.value)}
                                  className="w-full bg-transparent px-2 py-1 outline-none text-slate-800 dark:text-white text-right font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  disabled={!isEditingLocal}
                                  value={row.captaciones || ''}
                                  onChange={(e) => handleUpdateMatrix(monthKey, 'captaciones', e.target.value)}
                                  className="w-full bg-transparent px-2 py-1 outline-none text-slate-800 dark:text-white text-right font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  disabled={!isEditingLocal}
                                  value={row.ticket_prom || ''}
                                  onChange={(e) => handleUpdateMatrix(monthKey, 'ticket_prom', e.target.value)}
                                  className="w-full bg-transparent px-2 py-1 outline-none text-slate-800 dark:text-white text-right font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  disabled={!isEditingLocal}
                                  value={row.reservas || ''}
                                  onChange={(e) => handleUpdateMatrix(monthKey, 'reservas', e.target.value)}
                                  className="w-full bg-transparent px-2 py-1 outline-none text-slate-800 dark:text-white text-right font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  disabled={!isEditingLocal}
                                  value={row.comision_prom || ''}
                                  onChange={(e) => handleUpdateMatrix(monthKey, 'comision_prom', e.target.value)}
                                  className="w-full bg-transparent px-2 py-1 outline-none text-slate-800 dark:text-white text-right font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  disabled={!isEditingLocal}
                                  value={row.transacciones || ''}
                                  onChange={(e) => handleUpdateMatrix(monthKey, 'transacciones', e.target.value)}
                                  className="w-full bg-transparent px-2 py-1 outline-none text-slate-800 dark:text-white text-right font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-1 bg-indigo-50/20 dark:bg-indigo-950/20">
                                <input
                                  type="number"
                                  disabled={!isEditingLocal}
                                  value={row.facturacion || ''}
                                  onChange={(e) => handleUpdateMatrix(monthKey, 'facturacion', e.target.value)}
                                  className="w-full bg-transparent px-2 py-1 outline-none text-indigo-600 dark:text-brand-400 text-right font-black disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="px-3 py-2 bg-emerald-50/10 dark:bg-emerald-950/10 text-right font-black">
                                <span className={netIncome >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                  {netIncome >= 0 ? '+' : ''}${netIncome.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                        {/* TOTALS FOOTER ROW */}
                        {(() => {
                          const totalNetOffice = Object.values(simulator.monthly_distribution).reduce((sum, r) => sum + getMonthlyNetIncome(r), 0);
                          return (
                            <tr className="bg-slate-100/60 dark:bg-slate-900/60 divide-x divide-slate-200 dark:divide-slate-700 font-black text-slate-900 dark:text-white">
                              <td className="px-3 py-3 uppercase tracking-widest text-[9px]">TOTAL/PROM</td>
                              <td className="px-3 py-3 text-right">
                                {Math.round(Object.values(simulator.monthly_distribution).reduce((a, b) => a + (b.cartera || 0), 0) / 12).toLocaleString()} (Prom)
                              </td>
                              <td className="px-3 py-3 text-right">
                                {Math.round(Object.values(simulator.monthly_distribution).reduce((a, b) => a + (b.agentes || 0), 0) / 12).toLocaleString()} (Prom)
                              </td>
                              <td className="px-3 py-3 text-right">
                                {Object.values(simulator.monthly_distribution).reduce((a, b) => a + (b.agentes_nuevos || 0), 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {Object.values(simulator.monthly_distribution).reduce((a, b) => a + (b.captaciones || 0), 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-right">
                                ${Math.round(Object.values(simulator.monthly_distribution).reduce((a, b) => a + (b.ticket_prom || 0), 0) / 12).toLocaleString()} (Prom)
                              </td>
                              <td className="px-3 py-3 text-right">
                                {Object.values(simulator.monthly_distribution).reduce((a, b) => a + (b.reservas || 0), 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-right">
                                ${Math.round(Object.values(simulator.monthly_distribution).reduce((a, b) => a + (b.comision_prom || 0), 0) / 12).toLocaleString()} (Prom)
                              </td>
                              <td className="px-3 py-3 text-right">
                                {Object.values(simulator.monthly_distribution).reduce((a, b) => a + (b.transacciones || 0), 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-right text-emerald-500 bg-indigo-50/40 dark:bg-indigo-950/40">
                                ${Object.values(simulator.monthly_distribution).reduce((a, b) => a + (b.facturacion || 0), 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-right text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/25">
                                {totalNetOffice >= 0 ? '+' : ''}${totalNetOffice.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {kpisSubTab === 'coach' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/50 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Prompt Suggestions */}
                  <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span>✨</span> Sugerencias de Análisis
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Haga clic en una de las preguntas preparadas para que Olympia analice sus datos en tiempo real:</p>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleSendCoach("Realiza un análisis completo de viabilidad de mi modelo financiero de oficina, evaluando mis gastos fijos y la meta de agentes.")}
                        disabled={sendingCoach}
                        className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-350 hover:text-nexus-blue font-bold transition-all"
                      >
                        🔍 Viabilidad de Modelo Financiero
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendCoach("¿Cómo impacta una deserción anual del 15% de mis agentes en los números de facturación planificados en la matriz ENE-DIC?")}
                        disabled={sendingCoach}
                        className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-350 hover:text-nexus-blue font-bold transition-all"
                      >
                        📉 Impacto de Deserción y Churn
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendCoach("¿Cuántos agentes adicionales bajo el split 80/20 o 60/40 necesito para reducir mi punto de equilibrio GCI mensual a la mitad?")}
                        disabled={sendingCoach}
                        className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-350 hover:text-nexus-blue font-bold transition-all"
                      >
                        📈 Estrategia de Reclutamiento Óptima
                      </button>
                    </div>
                  </div>

                  {/* Chat Box */}
                  <div className="lg:col-span-2 flex flex-col h-[400px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-inner">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-nexus-blue to-indigo-600 px-4 py-3 text-white flex items-center gap-3">
                      <span className="text-xl">✨</span>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest">Olympia AI Business Coach</h4>
                        <p className="text-[8px] opacity-75 uppercase tracking-wider">Asesora Financiera de Oficina y Splits de Comisión</p>
                      </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                      {coachMessages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-nexus-blue text-white rounded-tr-none'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 rounded-tl-none shadow-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {sendingCoach && (
                        <div className="flex justify-start">
                          <div className="bg-white dark:bg-slate-800 text-slate-500 rounded-2xl px-4 py-3 text-xs border border-slate-200/50 dark:border-slate-700/50 rounded-tl-none flex items-center gap-2 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-100"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-200"></div>
                            <span className="text-[10px] uppercase font-black tracking-widest ml-1">Olympia está analizando...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input Footer */}
                    <div className="bg-white dark:bg-slate-800 p-2 border-t border-slate-200/50 dark:border-slate-700/50 flex gap-2">
                      <input
                        type="text"
                        placeholder="Pregúntale a Olympia sobre gastos fijos, splits o tu break-even..."
                        value={coachInput}
                        onChange={(e) => setCoachInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendCoach()}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendCoach()}
                        disabled={sendingCoach}
                        className="px-4 py-2 bg-nexus-blue text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="columns-1 lg:columns-2 gap-6 [column-fill:balance]">
              {sections.map((section, si) => (
                <div key={si} className="break-inside-avoid-column inline-block w-full mb-6">
                  <SectionCard icon={section.icon} title={t(section.titleKey) || section.titleKey.replace('plan_section_','').toUpperCase()} editMode={editMode}>
                    {section.kpis.map((kpi) => (
                      <KpiRow
                        key={kpi.key}
                        label={kpi.label || kpi.key.replace('_goal','')}
                        goalKey={kpi.key}
                        plan={periodPlan}
                        actual={actuals[kpi.actualKey]}
                        type={kpi.type}
                        inverse={kpi.inverse}
                        onChange={handleChange}
                        t={t}
                        editMode={editMode}
                        isEditingLocal={false}
                        fullWidth={kpi.fullWidth}
                      />
                    ))}
                  </SectionCard>
                </div>
              ))}
            </div>
          )}
        </>
      ) : subTab === 'agents' ? (
        <>
          {/* ── AGENT YEARLY PLANS VIEW (NEW DESIGN) ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-6">
            <div>
              <h2 className="text-xl font-black italic text-slate-900 dark:text-white flex flex-wrap items-center gap-2.5">
                <span>Planificación de Agentes</span>
                <span className="px-3 py-1 rounded-full bg-nexus-blue text-white dark:bg-brand-500/20 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest leading-none shadow-sm">
                  {selectedOffice === 'cero' ? 'Altitud Cero' : 'RE/MAX Altitud'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">
                Monitorea y asesora los planes anuales individuales de tus agentes • <span className="text-nexus-blue">Usa el selector superior para cambiar de oficina</span>
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Selector */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none"
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map(yr => (
                  <option key={yr} value={yr}>Año {yr}</option>
                ))}
              </select>

              {/* Start Planning Invite Session Button */}
              {activePlanningYear !== selectedYear ? (
                <button
                  onClick={() => handleStartPlanningSession(selectedYear)}
                  disabled={saving}
                  className="px-5 py-2 bg-nexus-blue text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-1.5"
                >
                  📢 Iniciar Planificación {selectedYear}
                </button>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  ✨ Planificación Activa {selectedYear}
                </div>
              )}
            </div>
          </div>

          {/* AGENTS ROSTER TABLE */}
          {loadingAgentPlans ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-nexus-blue border-t-transparent rounded-full" /></div>
          ) : activeAgentsList.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 text-center text-sm text-slate-500">
              No hay agentes registrados en la oficina todavía.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-4">Agente</th>
                    <th className="px-6 py-4">Comisión Split</th>
                    <th className="px-6 py-4">Meta Cartera</th>
                    <th className="px-6 py-4">Cierres Necesarios</th>
                    <th className="px-6 py-4">Presupuesto Mensual</th>
                    <th className="px-6 py-4">Estado del Plan</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {activeAgentsList.map((agent) => {
                    const planDetails = agentPlans.find(ap => ap.agent_email === agent.email);
                    const hasPlan = !!planDetails;
                    const isActive = planDetails?.status === 'active';
                    
                    return (
                      <tr key={agent.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <Image
                            src={agent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.full_name)}&background=3b82f6&color=fff`}
                            alt={agent.full_name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full border border-slate-150 dark:border-slate-700 object-cover"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{agent.full_name}</p>
                            <p className="text-[10px] text-slate-400">{agent.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                          {agent.commission_split || '45/55'}
                        </td>
                        <td className="px-6 py-4 text-xs tabular-nums text-slate-600 dark:text-slate-300">
                          {hasPlan ? `${planDetails.target_portfolio_size || 25} prop.` : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs tabular-nums text-slate-600 dark:text-slate-300">
                          {hasPlan ? `${Number(planDetails.closes_needed_monthly || 0).toFixed(1)}/mes` : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-slate-800 dark:text-white tabular-nums">
                          {hasPlan ? `$${Number(planDetails.grand_total_monthly_usd || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                              : hasPlan
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                          }`}>
                            {isActive ? 'Activo' : hasPlan ? 'Borrador' : 'Sin Plan'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {hasPlan ? (
                            <button
                              onClick={() => setSelectedPlanDetail({ agent, plan: planDetails })}
                              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              🔍 Ver Detalles
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendReminder(agent, selectedYear)}
                              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5 ml-auto"
                            >
                              🔔 Recordar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-6">
            <div>
              <h2 className="text-xl font-black italic text-slate-900 dark:text-white uppercase tracking-wider flex flex-wrap items-center gap-2.5">
                <span>📊 RENDIMIENTO Y ROTACIÓN</span>
                <span className="px-3 py-1 rounded-full bg-nexus-blue text-white dark:bg-brand-500/20 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest leading-none shadow-sm">
                  {selectedOffice === 'cero' ? 'Altitud Cero' : 'RE/MAX Altitud'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">
                Métricas avanzadas de velocidad, efectividad de metas y rotación de cartera en tiempo real • <span className="text-nexus-blue">Usa el selector superior para cambiar de oficina</span>
              </p>
            </div>
          </div>

          {/* First Row: 2 Column Grid for Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Chart 1: Plan vs Logrado (6-Month Revenue Trend) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">📈 Cumplimiento Mensual</h3>
                  <h4 className="text-base font-black italic text-slate-900 dark:text-white mt-1">Facturación: Plan vs Logrado</h4>
                </div>
                <div className="flex gap-3 text-[9px] font-black uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm opacity-60" />
                    <span className="text-slate-500">Plan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                    <span className="text-slate-500">Logrado</span>
                  </div>
                </div>
              </div>

              {/* Interactive Area and Bar Chart */}
              <div className="relative pt-6">
                {/* Hover Tooltip Overlay */}
                {hoveredTrendIdx !== null && (
                  <div className="absolute top-0 right-0 bg-slate-900/95 dark:bg-slate-950/95 text-white text-[10px] p-3 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-md space-y-1 z-10 transition-all">
                    <p className="font-black text-slate-400 uppercase tracking-widest">{revenueTrendData[hoveredTrendIdx].displayName}</p>
                    <div className="flex justify-between gap-6">
                      <span className="text-blue-400 font-bold">🎯 Planificado:</span>
                      <span className="font-black tabular-nums">{fmtCurrency(revenueTrendData[hoveredTrendIdx].plan)}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-emerald-400 font-bold">📈 Logrado:</span>
                      <span className="font-black tabular-nums">{fmtCurrency(revenueTrendData[hoveredTrendIdx].actual)}</span>
                    </div>
                    <div className="flex justify-between gap-6 border-t border-slate-800/80 pt-1 mt-1">
                      <span className="text-slate-400">Cumplimiento:</span>
                      <span className={`font-black tabular-nums ${revenueTrendData[hoveredTrendIdx].actual >= revenueTrendData[hoveredTrendIdx].plan ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {revenueTrendData[hoveredTrendIdx].plan > 0 
                          ? `${Math.round((revenueTrendData[hoveredTrendIdx].actual / revenueTrendData[hoveredTrendIdx].plan) * 100)}%`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400">Transacciones:</span>
                      <span className="font-black text-slate-200">{revenueTrendData[hoveredTrendIdx].closes} cierres</span>
                    </div>
                  </div>
                )}

                {/* SVG Render */}
                <svg viewBox="0 0 500 150" className="w-full h-auto overflow-visible select-none">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const maxVal = Math.max(...revenueTrendData.map(d => Math.max(d.plan, d.actual)), 10000);
                    const yVal = 150 - 25 - pct * (150 - 15 - 25);
                    const labelVal = Math.round(pct * maxVal);
                    return (
                      <g key={idx} className="opacity-40 dark:opacity-20">
                        <line
                          x1={45}
                          y1={yVal}
                          x2={500 - 20}
                          y2={yVal}
                          stroke="#94a3b8"
                          strokeWidth="0.5"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={45 - 8}
                          y={yVal + 3}
                          textAnchor="end"
                          className="fill-slate-400 font-bold text-[8px] tabular-nums"
                        >
                          {fmtCurrency(labelVal)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Plan Bars */}
                  {revenueTrendData.map((d, idx) => {
                    const maxVal = Math.max(...revenueTrendData.map(dm => Math.max(dm.plan, dm.actual)), 10000);
                    const x = 45 + (idx * (500 - 45 - 20) / 5) - 8;
                    const barHeight = (d.plan / maxVal) * (150 - 15 - 25);
                    const yVal = 150 - 25 - barHeight;
                    return (
                      <rect
                        key={idx}
                        x={x}
                        y={yVal}
                        width={16}
                        height={Math.max(barHeight, 2)}
                        rx="3"
                        className="fill-blue-500/20 dark:fill-blue-400/20 stroke-blue-500/60 dark:stroke-blue-400/60 stroke-[1.5px] transition-all"
                      />
                    );
                  })}

                  {/* Achieved Area Path */}
                  {(() => {
                    const maxVal = Math.max(...revenueTrendData.map(dm => Math.max(dm.plan, dm.actual)), 10000);
                    const pts = revenueTrendData.map((d, idx) => {
                      const x = 45 + (idx * (500 - 45 - 20) / 5);
                      const yVal = 150 - 25 - (d.actual / maxVal) * (150 - 15 - 25);
                      return { x, y: yVal };
                    });
                    const lPath = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
                    const aPath = pts.length > 0 
                      ? `${lPath} L ${pts[pts.length - 1].x} ${150 - 25} L ${pts[0].x} ${150 - 25} Z`
                      : '';
                    return aPath && (
                      <path
                        d={aPath}
                        fill="url(#achievedGrad)"
                        className="opacity-20"
                      />
                    );
                  })()}

                  {/* Achieved Line Path */}
                  {(() => {
                    const maxVal = Math.max(...revenueTrendData.map(dm => Math.max(dm.plan, dm.actual)), 10000);
                    const pts = revenueTrendData.map((d, idx) => {
                      const x = 45 + (idx * (500 - 45 - 20) / 5);
                      const yVal = 150 - 25 - (d.actual / maxVal) * (150 - 15 - 25);
                      return { x, y: yVal };
                    });
                    const lPath = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
                    return lPath && (
                      <path
                        d={lPath}
                        fill="none"
                        className="stroke-emerald-500 dark:stroke-emerald-400 stroke-[2.5px]"
                      />
                    );
                  })()}

                  {/* Glowing Achieved Dots */}
                  {revenueTrendData.map((d, idx) => {
                    const maxVal = Math.max(...revenueTrendData.map(dm => Math.max(dm.plan, dm.actual)), 10000);
                    const x = 45 + (idx * (500 - 45 - 20) / 5);
                    const yVal = 150 - 25 - (d.actual / maxVal) * (150 - 15 - 25);
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={yVal}
                        r="4"
                        className="fill-white stroke-emerald-500 dark:stroke-emerald-400 stroke-[2.5px] shadow-sm cursor-pointer hover:r-[6px] transition-all"
                      />
                    );
                  })}

                  {/* Month X Labels */}
                  {revenueTrendData.map((d, idx) => {
                    const x = 45 + (idx * (500 - 45 - 20) / 5);
                    return (
                      <text
                        key={idx}
                        x={x}
                        y={150 - 5}
                        textAnchor="middle"
                        className="fill-slate-500 dark:fill-slate-400 font-black text-[9px] uppercase tracking-wider"
                      >
                        {d.displayName}
                      </text>
                    );
                  })}

                  {/* Interactive hotzones */}
                  {revenueTrendData.map((d, idx) => {
                    const x = 45 + (idx * (500 - 45 - 20) / 5) - (500 - 45 - 20) / 10;
                    const w = (500 - 45 - 20) / 5;
                    return (
                      <rect
                        key={idx}
                        x={x}
                        y={15}
                        width={w}
                        height={150 - 15 - 25}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredTrendIdx(idx)}
                        onMouseLeave={() => setHoveredTrendIdx(null)}
                      />
                    );
                  })}

                  {/* Definitions */}
                  <defs>
                    <linearGradient id="achievedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Chart 2: Portfolio Rotation & aging (Donut Chart) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">⏳ Envejecimiento & Rotación</h3>
                <h4 className="text-base font-black italic text-slate-900 dark:text-white mt-1">Edad de Cartera Activa (DOM)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* SVG Donut */}
                <div className="relative flex justify-center items-center">
                  {(() => {
                    const r = 40;
                    const circ = 2 * Math.PI * r;
                    let accumulatedPercent = 0;
                    const donutSegments = agingTiers.map((tier) => {
                      const pct = tier.pct || 0;
                      const strokeLength = (pct / 100) * circ;
                      const strokeOffset = circ - ((pct / 100) * circ) - (accumulatedPercent / 100) * circ;
                      accumulatedPercent += pct;
                      return {
                        ...tier,
                        strokeLength,
                        strokeOffset,
                      };
                    });
                    
                    return (
                      <>
                        <svg viewBox="0 0 100 100" className="w-40 h-40 transform -rotate-90">
                          {/* Background circle */}
                          <circle cx="50" cy="50" r={r} fill="transparent" stroke="#e2e8f0" className="dark:stroke-slate-800" strokeWidth="12" />
                          
                          {donutSegments.map((seg, idx) => (
                            <circle
                              key={idx}
                              cx="50"
                              cy="50"
                              r={r}
                              fill="transparent"
                              stroke={seg.color}
                              strokeWidth={hoveredAgingIdx === idx ? "15" : "12"}
                              strokeDasharray={`${seg.strokeLength} ${circ - seg.strokeLength}`}
                              strokeDashoffset={seg.strokeOffset}
                              className="transition-all duration-300 cursor-pointer"
                              onMouseEnter={() => setHoveredAgingIdx(idx)}
                              onMouseLeave={() => setHoveredAgingIdx(null)}
                            />
                          ))}
                        </svg>
                        
                        {/* Legend inside Donut */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Activas</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white italic tabular-nums">{activePropertiesDoms.length}</span>
                          {hoveredAgingIdx !== null ? (
                            <span className="text-[7px] font-black uppercase tracking-wider text-slate-500 max-w-[80px] text-center truncate">
                              {agingTiers[hoveredAgingIdx].pct}% {agingTiers[hoveredAgingIdx].name.split(' ')[0]}
                            </span>
                          ) : (
                            <span className="text-[7px] font-bold text-slate-400 uppercase">Inventario</span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Aging tier breakdown list */}
                <div className="space-y-3">
                  {agingTiers.map((tier, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-2xl border transition-all cursor-default ${
                        hoveredAgingIdx === idx 
                          ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-700/60 scale-[1.02]' 
                          : 'bg-transparent border-transparent'
                      }`}
                      onMouseEnter={() => setHoveredAgingIdx(idx)}
                      onMouseLeave={() => setHoveredAgingIdx(null)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300">{tier.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{tier.count} ({tier.pct}%)</span>
                      </div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 ml-4 leading-normal">{tier.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra metric block: average listing days by type */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">⏳ Días en Mercado por Tipo vs Meta (120d)</h5>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                  {velocityByPropertyType.map((v, idx) => {
                    const pctOfTarget = Math.min((v.avgDom / 120) * 100, 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          <span>{v.name}</span>
                          <span className="tabular-nums font-black text-slate-850 dark:text-white">{v.avgDom} días ({v.count} prop)</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              v.avgDom <= 60 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                              : v.avgDom <= 120 ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                              : 'bg-gradient-to-r from-red-400 to-red-500'
                            }`}
                            style={{ width: `${pctOfTarget || 4}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Second Row: Agent Performance Table & Funnel Velocity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Table 3: Agent Performance Targets vs Actuals (8 Cols) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md lg:col-span-8 transition-all">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">👥 Desempeño Individual</h3>
                  <h4 className="text-base font-black italic text-slate-900 dark:text-white mt-1">Cumplimiento de Agentes ({MONTH_NAMES_ES[m]} {year})</h4>
                </div>
                <p className="text-[10px] text-slate-400 font-bold bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 px-3 py-1.5 rounded-xl">
                  Metas mensuales vs Logros reales
                </p>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto max-h-[360px] border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-150 dark:border-slate-800 sticky top-0 backdrop-blur-md">
                      <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Agente</th>
                      <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Cierres Mes</th>
                      <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Captaciones Mes</th>
                      <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">DOM Promedio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150/40 dark:divide-slate-850">
                    {agentPerformanceList.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-xs text-slate-400 italic">No hay agentes activos registrados en la oficina.</td>
                      </tr>
                    ) : (
                      agentPerformanceList.map((item, idx) => {
                        const closesPct = Math.min((item.closesAchieved / item.targetCloses) * 100, 100);
                        const capturesPct = Math.min((item.listingsCaptured / item.targetCaptures) * 100, 100);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={item.agent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.agent.full_name)}&background=3b82f6&color=fff&size=32`}
                                  alt={item.agent.full_name}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                />
                                <div>
                                  <p className="text-xs font-black text-slate-900 dark:text-white">{item.agent.full_name}</p>
                                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Split: {item.agent.commission_split || '50/50'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-black text-slate-850 dark:text-slate-200 tabular-nums">
                                  {item.closesAchieved} <span className="text-[10px] text-slate-400 font-bold">/ {item.targetCloses.toFixed(1)}</span>
                                </span>
                                <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${item.closesAchieved >= item.targetCloses ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-blue-500'}`} style={{ width: `${closesPct || 4}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-black text-slate-855 dark:text-slate-200 tabular-nums">
                                  {item.listingsCaptured} <span className="text-[10px] text-slate-400 font-bold">/ {Math.ceil(item.targetCaptures)}</span>
                                </span>
                                <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${item.listingsCaptured >= item.targetCaptures ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-amber-500'}`} style={{ width: `${capturesPct || 4}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`text-xs font-black tabular-nums px-2 py-0.5 rounded-full ${
                                item.avgDom <= 60 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                                : item.avgDom <= 120 ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                                : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                              }`}>
                                {item.avgDom > 0 ? `${item.avgDom}d` : '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Funnel 4: Office stage pipeline velocity (4 Cols) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md lg:col-span-4 transition-all">
              <div className="mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">⏱️ Cuellos de Botella</h3>
                <h4 className="text-base font-black italic text-slate-900 dark:text-white mt-1">Velocidad del Pipeline</h4>
              </div>

              <div className="space-y-4">
                {computedMilestoneVelocity.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center space-y-2 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-2xl">⏳</span>
                    <p className="text-xs text-slate-400 italic">No hay suficientes hitos de tiempo registrados para calcular la velocidad.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1.5">
                    {computedMilestoneVelocity.map((stage, idx) => {
                      const isWarning = (stage.label.includes('photos') && stage.avg > 5) || 
                                        (stage.label.includes('approved') && stage.avg > 3) ||
                                        (stage.avg > 15);
                                        
                      return (
                        <div key={idx} className="w-full flex flex-col items-center">
                          <div className={`w-full p-2.5 rounded-2xl flex items-center justify-between border transition-all ${
                            isWarning 
                              ? 'bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-900/60 shadow-lg shadow-red-500/5' 
                              : 'bg-slate-50 dark:bg-slate-950/20 border-slate-150 dark:border-slate-850'
                          }`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs shrink-0">{stage.icon}</span>
                              <div className="min-w-0">
                                <p className={`text-[10px] font-black truncate ${isWarning ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {t(stage.label)}
                                </p>
                                <p className="text-[7px] font-black uppercase text-slate-400 tracking-wider">Muestra: {stage.count}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-[11px] font-black tabular-nums ${isWarning ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                                {stage.avg}d
                              </p>
                              {isWarning && (
                                <span className="text-[7px] font-black uppercase tracking-widest text-red-500 animate-pulse block">Alerta</span>
                              )}
                            </div>
                          </div>
                          
                          {idx < computedMilestoneVelocity.length - 1 && (
                            <div className="w-[1.5px] h-3 bg-gradient-to-b from-slate-200 to-slate-350 dark:from-slate-750 dark:to-slate-700" />
                          )}
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

      {/* PLAN DETAILS SLIDE DRAWER / MODAL */}
      {selectedPlanDetail && (
        <div className="fixed inset-0 z-50 flex justify-end p-4 sm:p-6" onClick={() => setSelectedPlanDetail(null)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity" />
          
          {/* Slider Drawer Panel */}
          <div
            className="relative bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 shadow-2xl rounded-3xl w-full max-w-2xl h-full flex flex-col overflow-hidden animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src={selectedPlanDetail.agent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlanDetail.agent.full_name)}&background=3b82f6&color=fff`}
                  alt=""
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white italic">Plan Anual {selectedPlanDetail.plan.plan_year}</h3>
                  <p className="text-[10px] text-slate-400">{selectedPlanDetail.agent.full_name}</p>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedPlanDetail(null)}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Para Qué (Motivation) */}
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-5 rounded-2xl text-white shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-7xl opacity-10">🔥</div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-200">🔥 El "Para Qué" (Motivación Principal)</h4>
                <p className="text-sm font-bold mt-2 leading-relaxed italic">
                  "{selectedPlanDetail.plan.para_que || 'No especificado por el agente.'}"
                </p>
              </div>

              {/* Grid 1: Budget Totals */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-3.5 border border-slate-150 dark:border-slate-800">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">🏠 Gastos Personales</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-1 tabular-nums">
                    ${Number(selectedPlanDetail.plan.total_living_monthly || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-3.5 border border-slate-150 dark:border-slate-800">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">💼 Gastos Operativos</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-1 tabular-nums">
                    ${Number(selectedPlanDetail.plan.total_business_monthly || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-3.5 border border-slate-150 dark:border-slate-800">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">🎯 Metas de Ahorro</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-1 tabular-nums">
                    ${Number(selectedPlanDetail.plan.total_goals_monthly || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Grid 2: Conversion Metrics */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">📊 Metas Operativas Semanales</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div className="border-r border-slate-100 dark:border-slate-800/80 pr-2">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">📞 Llamadas</span>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                      {Math.ceil(Number(selectedPlanDetail.plan.weekly_targets?.calls || 0))}
                    </p>
                    <span className="text-[9px] text-slate-400">por semana</span>
                  </div>
                  
                  <div className="border-r border-slate-100 dark:border-slate-800/80 sm:px-2">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">📐 ACMs</span>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                      {Math.ceil(Number(selectedPlanDetail.plan.weekly_targets?.acm || 0))}
                    </p>
                    <span className="text-[9px] text-slate-400">por semana</span>
                  </div>
                  
                  <div className="border-r border-slate-100 dark:border-slate-800/80 sm:px-2">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">🤝 Capturas</span>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                      {Math.ceil(Number(selectedPlanDetail.plan.weekly_targets?.captures || 0))}
                    </p>
                    <span className="text-[9px] text-slate-400">por semana</span>
                  </div>

                  <div className="pl-1">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">🏆 Cierres</span>
                    <p className="text-lg font-black text-emerald-500 mt-0.5 tabular-nums">
                      {Number(selectedPlanDetail.plan.closes_needed_monthly || 0).toFixed(1)}
                    </p>
                    <span className="text-[9px] text-slate-400">por mes</span>
                  </div>
                </div>
              </div>

              {/* Detailed Living & Business Expense Breakdowns */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">📝 Desglose de Gastos & Presupuesto</h4>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">🏠 Gastos de Vida Principales</p>
                  <div className="bg-slate-50 dark:bg-slate-950/30 rounded-xl divide-y divide-slate-150/40 dark:divide-slate-800/40 border border-slate-150 dark:border-slate-850 px-4">
                    {selectedPlanDetail.plan.living_expenses?.length > 0 ? (
                      selectedPlanDetail.plan.living_expenses.map((e, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span>{e.label}</span>
                          <span className="tabular-nums font-black text-slate-900 dark:text-white">${Number(e.amount).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="py-3 text-xs text-slate-400 italic">No hay gastos detallados registrados.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">💼 Gastos Operativos del Negocio</p>
                  <div className="bg-slate-50 dark:bg-slate-950/30 rounded-xl divide-y divide-slate-150/40 dark:divide-slate-800/40 border border-slate-150 dark:border-slate-850 px-4">
                    {selectedPlanDetail.plan.business_expenses?.length > 0 ? (
                      selectedPlanDetail.plan.business_expenses.map((e, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span>{e.label} {e.annual && <span className="text-[9px] text-slate-400 italic">(Anual)</span>}</span>
                          <span className="tabular-nums font-black text-slate-900 dark:text-white">${Number(e.amount).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="py-3 text-xs text-slate-400 italic">No hay gastos detallados registrados.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => handleSendReminder(selectedPlanDetail.agent, selectedPlanDetail.plan.plan_year)}
                className="flex-1 py-3 bg-nexus-blue text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/10"
              >
                🔔 Enviar Recordatorio
              </button>
              <button
                onClick={() => setSelectedPlanDetail(null)}
                className="flex-1 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
