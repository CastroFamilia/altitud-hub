"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/layout/TopNav';
import AchievementOverview from '@/components/layout/AchievementOverview';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import AgentLeadsPanel from '@/components/oficina/AgentLeadsPanel';

/* ═══════════════════════════════════════════════════════
   PIPELINE / FUNNEL ACTIVITIES — 10 stages
   ═══════════════════════════════════════════════════════ */
const ACTIVITIES = [
  { key: 'llamadas',       labelKey: 'act_llamadas',       icon: 'phone',     color: 'brand',   auto: false },
  { key: 'prelistings',    labelKey: 'act_prelistings',    icon: 'clipboard', color: 'indigo',  auto: true, source: 'Pre-Listing' },
  { key: 'acm',            labelKey: 'act_acm',            icon: 'chart',     color: 'blue',    auto: true, source: 'Registro ACM' },
  { key: 'listings',       labelKey: 'act_listings',       icon: 'presentation', color: 'purple', auto: false },
  { key: 'captaciones',    labelKey: 'act_captaciones',    icon: 'home',      color: 'teal',    auto: true, source: 'HUB' },
  { key: 'busquedas',      labelKey: 'act_busquedas',      icon: 'search',    color: 'indigo',  auto: true, source: 'Portal' },
  { key: 'consultas',      labelKey: 'act_consultas',      icon: 'search',    color: 'cyan',    auto: false },
  { key: 'muestras',       labelKey: 'act_muestras',       icon: 'eye',       color: 'amber',   auto: false },
  { key: 'reservas',       labelKey: 'act_reservas',       icon: 'bookmark',  color: 'orange',  auto: true, source: 'HUB' },
  { key: 'transacciones',  labelKey: 'act_transacciones',  icon: 'repeat',    color: 'rose',    auto: false },
  { key: 'cierres',        labelKey: 'act_cierres',        icon: 'check',     color: 'emerald', auto: true, source: 'HUB' },
];

/* ═══════════════════════════════════════════════════════
   AGENT PLAN (editable, persisted in localStorage)
   ═══════════════════════════════════════════════════════ */
const DEFAULT_PLAN = {
  monthly_targets: { llamadas: 80, prelistings: 12, acm: 8, listings: 6, captaciones: 4, busquedas: 5, consultas: 20, muestras: 10, reservas: 3, transacciones: 2, cierres: 1 },
  weekly_targets:  { llamadas: 20, prelistings: 3, acm: 2, listings: 1, captaciones: 1, busquedas: 1, consultas: 5, muestras: 3, reservas: 1, transacciones: 0, cierres: 0 },
};
const PLAN_KEY = 'altitud_okr_plan';
function loadPlan() { if(typeof window==='undefined') return DEFAULT_PLAN; try{ const r=localStorage.getItem(PLAN_KEY); if(r) return JSON.parse(r); }catch{} return DEFAULT_PLAN; }
function savePlan(plan) { if(typeof window!=='undefined') localStorage.setItem(PLAN_KEY,JSON.stringify(plan)); }

/* ═══════════════════════════════════════════════════════
   HISTORY (persisted in localStorage)
   ═══════════════════════════════════════════════════════ */
const STORAGE_KEY = 'altitud_okr_entries';
function loadEntries() { if(typeof window==='undefined') return []; try{ const r=localStorage.getItem(STORAGE_KEY); if(r) return JSON.parse(r); }catch{} return []; }
function saveEntries(entries) { if(typeof window==='undefined') return; localStorage.setItem(STORAGE_KEY,JSON.stringify(entries)); }


/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */
function todayISO() { return new Date().toISOString().split('T')[0]; }
function getWeekDates(offset=0) {
  const n=new Date(); n.setDate(n.getDate() + offset * 7);
  const d=n.getDay(); const diff=n.getDate()-d+(d===0?-6:1);
  const mon=new Date(n.setDate(diff)); mon.setHours(0,0,0,0);
  const ds=[]; for(let i=0;i<7;i++){ const x=new Date(mon); x.setDate(x.getDate()+i); ds.push(x.toISOString().split('T')[0]); } return ds;
}
function getWeekLabel(offset=0) {
  const dates=getWeekDates(offset);
  const s=new Date(dates[0]+'T12:00:00'); const e=new Date(dates[6]+'T12:00:00');
  const fmt=(d)=>`${d.getDate()}/${d.getMonth()+1}`;
  return `${fmt(s)} – ${fmt(e)}`;
}
function getMonthDatesFor(year, month) {
  const f=new Date(year,month,1); const l=new Date(year,month+1,0);
  const ds=[]; for(let d=new Date(f);d<=l;d.setDate(d.getDate()+1)) ds.push(new Date(d).toISOString().split('T')[0]); return ds;
}
function getMonthDates() { const n=new Date(); return getMonthDatesFor(n.getFullYear(), n.getMonth()); }
function getYearDates(year) {
  const f=new Date(year,0,1); const end=year===new Date().getFullYear()?new Date():new Date(year,11,31);
  const ds=[]; for(let d=new Date(f);d<=end;d.setDate(d.getDate()+1)) ds.push(new Date(d).toISOString().split('T')[0]); return ds;
}
function getYTDDates() { return getYearDates(new Date().getFullYear()); }
const MONTH_NAMES_ES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTH_NAMES_EN=['January','February','March','April','May','June','July','August','September','October','November','December'];
function sumEntries(entries, dateSet, key) { return entries.filter(e=>dateSet.has(e.date)).reduce((s,e)=>s+(e[key]||0),0); }
function completionPct(a, t) { if(t<=0) return a>0?100:0; return Math.min(Math.round((a/t)*100),100); }

/* ═══════════════════════════════════════════════════════
   ICON MAP
   ═══════════════════════════════════════════════════════ */
function ActivityIcon({ type, className="w-4 h-4" }) {
  const icons = {
    phone:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
    clipboard:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
    chart:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    presentation:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />,
    home:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    search:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    eye:<><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>,
    bookmark:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />,
    repeat:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
    check:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  };
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">{icons[type]}</svg>;
}

/* ═══════════════════════════════════════════════════════
   COLOR SYSTEM
   ═══════════════════════════════════════════════════════ */
const COLORS = {
  brand:{bg:'bg-brand-50 dark:bg-brand-500/10',text:'text-brand-600 dark:text-brand-400',border:'border-brand-200 dark:border-brand-800',bar:'bg-brand-500'},
  indigo:{bg:'bg-indigo-50 dark:bg-indigo-500/10',text:'text-indigo-600 dark:text-indigo-400',border:'border-indigo-200 dark:border-indigo-800',bar:'bg-indigo-500'},
  blue:{bg:'bg-blue-50 dark:bg-blue-500/10',text:'text-blue-600 dark:text-blue-400',border:'border-blue-200 dark:border-blue-800',bar:'bg-blue-500'},
  purple:{bg:'bg-purple-50 dark:bg-purple-500/10',text:'text-purple-600 dark:text-purple-400',border:'border-purple-200 dark:border-purple-800',bar:'bg-purple-500'},
  teal:{bg:'bg-teal-50 dark:bg-teal-500/10',text:'text-teal-600 dark:text-teal-400',border:'border-teal-200 dark:border-teal-800',bar:'bg-teal-500'},
  cyan:{bg:'bg-cyan-50 dark:bg-cyan-500/10',text:'text-cyan-600 dark:text-cyan-400',border:'border-cyan-200 dark:border-cyan-800',bar:'bg-cyan-500'},
  amber:{bg:'bg-amber-50 dark:bg-amber-500/10',text:'text-amber-600 dark:text-amber-400',border:'border-amber-200 dark:border-amber-800',bar:'bg-amber-500'},
  orange:{bg:'bg-orange-50 dark:bg-orange-500/10',text:'text-orange-600 dark:text-orange-400',border:'border-orange-200 dark:border-orange-800',bar:'bg-orange-500'},
  rose:{bg:'bg-rose-50 dark:bg-rose-500/10',text:'text-rose-600 dark:text-rose-400',border:'border-rose-200 dark:border-rose-800',bar:'bg-rose-500'},
  emerald:{bg:'bg-emerald-50 dark:bg-emerald-500/10',text:'text-emerald-600 dark:text-emerald-400',border:'border-emerald-200 dark:border-emerald-800',bar:'bg-emerald-500'},
};

/* ═══════════════════════════════════════════════════════
   PROGRESS BAR
   ═══════════════════════════════════════════════════════ */
function ProgressBar({ pct, colorBar }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ease-out ${pct>100?'bg-emerald-500':colorBar}`} style={{width:`${Math.min(pct,100)}%`}} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CIRCULAR PROGRESS
   ═══════════════════════════════════════════════════════ */
function CircularProgress({ value, size=80, strokeWidth=6 }) {
  const r=(size-strokeWidth)/2; const c=2*Math.PI*r; const o=c-(Math.min(value,100)/100)*c;
  const color=value>=80?'#10b981':value>=50?'#5a82bf':'#f59e0b';
  return (<svg width={size} height={size} className="transform -rotate-90"><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200 dark:text-dark-border" /><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" style={{transition:'stroke-dashoffset 1s ease-out'}} /></svg>);
}

/* ═══════════════════════════════════════════════════════
   NAV ARROW BUTTON
   ═══════════════════════════════════════════════════════ */
function NavArrow({ direction, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
        disabled
          ? 'border-gray-100 dark:border-dark-border/50 text-gray-300 dark:text-gray-600 cursor-not-allowed'
          : 'border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-800 active:scale-95'
      }`}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {direction === 'left'
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        }
      </svg>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   DATE NAVIGATION CONTROLS
   ═══════════════════════════════════════════════════════ */
function DateNavControls({ weekOffset, setWeekOffset, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, lang, t }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthNames = lang === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  const isCurrentWeek = weekOffset === 0;
  const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear;
  const isCurrentYear = selectedYear === currentYear;

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      {/* Week Nav */}
      <div className="flex items-center gap-1 bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1 shadow-sm">
        <NavArrow direction="left" onClick={() => setWeekOffset(w => w - 1)} />
        <button
          onClick={() => setWeekOffset(0)}
          className={`px-2 py-0.5 rounded-md text-[10px] md:text-[11px] font-bold transition-all min-w-[90px] text-center ${
            isCurrentWeek
              ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg'
          }`}
        >
          {isCurrentWeek
            ? `📅 ${t('okr_col_week')} ${t('okr_current').toLowerCase()}`
            : `${t('okr_week_of')} ${getWeekLabel(weekOffset)}`
          }
        </button>
        <NavArrow direction="right" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} />
      </div>

      {/* Month Nav */}
      <div className="flex items-center gap-1 bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1 shadow-sm">
        <NavArrow direction="left" onClick={() => {
          if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
          else setSelectedMonth(m => m - 1);
        }} />
        <button
          onClick={() => { setSelectedMonth(currentMonth); setSelectedYear(currentYear); }}
          className={`px-2 py-0.5 rounded-md text-[10px] md:text-[11px] font-bold transition-all min-w-[80px] text-center ${
            isCurrentMonth
              ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg'
          }`}
        >
          {monthNames[selectedMonth]}
        </button>
        <NavArrow direction="right" onClick={() => {
          if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
          else setSelectedMonth(m => m + 1);
        }} disabled={isCurrentMonth} />
      </div>

      {/* Year Nav */}
      <div className="flex items-center gap-1 bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1 shadow-sm">
        <NavArrow direction="left" onClick={() => setSelectedYear(y => y - 1)} />
        <button
          onClick={() => setSelectedYear(currentYear)}
          className={`px-2 py-0.5 rounded-md text-[10px] md:text-[11px] font-bold transition-all min-w-[42px] text-center ${
            isCurrentYear
              ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg'
          }`}
        >
          {selectedYear}
        </button>
        <NavArrow direction="right" onClick={() => setSelectedYear(y => y + 1)} disabled={isCurrentYear} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WEEK CALENDAR
   ═══════════════════════════════════════════════════════ */
function WeekCalendar({ entries, t }) {
  const wd = getWeekDates();
  const em = new Set(entries.map(e=>e.date));
  const today = todayISO();
  const dayKeys = ['day_mon','day_tue','day_wed','day_thu','day_fri','day_sat','day_sun'];
  return (
    <div className="flex gap-1 md:gap-1.5">
      {wd.map((d,i) => {
        const filled=em.has(d); const isToday=d===today; const isPast=d<today;
        return (
          <div key={d} className="flex flex-col items-center gap-0.5 md:gap-1">
            <span className="text-[8px] md:text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">{t(dayKeys[i])}</span>
            <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-bold transition-all ${filled?'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30':isToday?'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 border-2 border-brand-400 dark:border-brand-500 animate-pulse':isPast?'bg-red-100 dark:bg-red-500/10 text-red-400 dark:text-red-500 border border-red-200 dark:border-red-800':'bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-400 dark:text-gray-500'}`}>
              {filled?'✓':new Date(d+'T12:00:00').getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DAILY FORM MODAL (mobile-first)
   ═══════════════════════════════════════════════════════ */
function DailyFormModal({ isOpen, onClose, onSave, existingEntry, t }) {
  const [values, setValues] = useState({});
    // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const i={}; ACTIVITIES.forEach(a=>{i[a.key]=existingEntry?.[a.key]??0}); setValues(i); }, [existingEntry, isOpen]);
  const update = (key,delta) => setValues(prev=>({...prev,[key]:Math.max(0,(prev[key]||0)+delta)}));
  const handleSave = () => { onSave({date:todayISO(),...values}); onClose(); };
  if(!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-brand-50 to-white dark:from-dark-bg/50 dark:to-dark-panel shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white flex items-center">
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {t('form_title')}
              </h3>
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5">{new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-3 md:py-4 space-y-1.5 md:space-y-2">
          {ACTIVITIES.map(a => {
            const c=COLORS[a.color];
            return (
              <div key={a.key} className={`flex items-center justify-between py-2 md:py-2.5 px-2.5 md:px-3 rounded-lg border ${c.border} ${c.bg} transition-colors`}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`w-6 h-6 md:w-7 md:h-7 rounded-md flex items-center justify-center shrink-0 ${c.text}`}>
                    <ActivityIcon type={a.icon} className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] md:text-xs font-semibold text-gray-900 dark:text-white block truncate">{t(a.labelKey)}</span>
                    {a.auto && <span className="text-[8px] md:text-[9px] text-gray-400 dark:text-gray-500">{t('form_auto')}: {a.source}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                  {a.auto ? (
                    <span className="px-3 py-1 rounded bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-dark-border text-center text-xs font-black text-slate-500 dark:text-slate-400 tabular-nums">
                      {values[a.key]||0}
                    </span>
                  ) : (
                    <>
                      <button onClick={()=>update(a.key,-1)} className="w-8 h-8 md:w-7 md:h-7 rounded-md bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-300 active:scale-95 transition-all text-base md:text-sm font-bold">−</button>
                      <span className="w-7 md:w-8 text-center text-sm font-black text-gray-900 dark:text-white tabular-nums">{values[a.key]||0}</span>
                      <button onClick={()=>update(a.key,1)} className="w-8 h-8 md:w-7 md:h-7 rounded-md bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border flex items-center justify-center text-gray-500 hover:text-emerald-500 hover:border-emerald-300 active:scale-95 transition-all text-base md:text-sm font-bold">+</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-[#1e222a] flex justify-between items-center shrink-0 gap-3">
          <p className="text-[9px] md:text-[10px] text-gray-400 hidden sm:block">{t('form_footer')}</p>
          <button onClick={handleSave} className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-lg shadow-brand-500/25 transition-all active:scale-95 flex items-center w-full sm:w-auto justify-center">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            {t('form_save')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PLAN EDITOR MODAL
   ═══════════════════════════════════════════════════════ */
function PlanEditorModal({ isOpen, onClose, plan, onSave, t }) {
  const [draft, setDraft] = useState({ monthly_targets: {}, weekly_targets: {} });
    // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if(isOpen && plan) setDraft(JSON.parse(JSON.stringify(plan))); }, [isOpen, plan]);
  const upd = (period, key, val) => setDraft(prev => ({ ...prev, [period]: { ...prev[period], [key]: Math.max(0, parseInt(val)||0) } }));
  if(!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-indigo-50 to-white dark:from-dark-bg/50 dark:to-dark-panel shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white flex items-center">
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {t('plan_title')}
              </h3>
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('plan_subtitle')}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-3 md:py-4">
          <div className="grid grid-cols-[1fr_80px_80px] md:grid-cols-[1fr_100px_100px] gap-x-2 gap-y-1">
            <div className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1">{t('okr_col_activity')}</div>
            <div className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center pb-1">{t('plan_monthly')}</div>
            <div className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center pb-1">{t('plan_weekly')}</div>
            {ACTIVITIES.map(a => {
              const c = COLORS[a.color];
              return [
                <div key={a.key+'-l'} className="flex items-center gap-2 py-1.5">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${c.bg} ${c.text} border ${c.border}`}><ActivityIcon type={a.icon} className="w-3 h-3" /></div>
                  <span className="text-[10px] md:text-xs font-semibold text-gray-900 dark:text-white truncate">{t(a.labelKey)}</span>
                </div>,
                <input key={a.key+'-m'} type="number" min="0" value={draft.monthly_targets[a.key]||0} onChange={e=>upd('monthly_targets',a.key,e.target.value)}
                  className="w-full text-center text-xs font-bold bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-md py-1.5 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors" />,
                <input key={a.key+'-w'} type="number" min="0" value={draft.weekly_targets[a.key]||0} onChange={e=>upd('weekly_targets',a.key,e.target.value)}
                  className="w-full text-center text-xs font-bold bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-md py-1.5 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors" />,
              ];
            })}
          </div>
        </div>
        <div className="px-4 md:px-6 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-[#1e222a] flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors">{t('plan_cancel')}</button>
          <button onClick={()=>{onSave(draft);onClose();}} className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-lg shadow-brand-500/25 transition-all active:scale-95">{t('plan_save')}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STAT TABLE ROW
   ═══════════════════════════════════════════════════════ */
function StatRow({ activity, weekVal, weekTarget, monthVal, monthTarget, ytdVal, ytdTarget, t }) {
  const c=COLORS[activity.color];
  const wP=completionPct(weekVal,weekTarget); const mP=completionPct(monthVal,monthTarget); const yP=completionPct(ytdVal,ytdTarget);
  const cc=(p)=>p>=100?'text-emerald-600 dark:text-emerald-400':p>=70?'text-brand-600 dark:text-brand-400':p>=40?'text-amber-600 dark:text-amber-400':'text-red-500 dark:text-red-400';
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors border-b border-gray-100 dark:border-dark-border/50 last:border-0">
      <td className="py-2.5 md:py-3 px-3 md:px-4">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 md:w-7 md:h-7 rounded-md flex items-center justify-center shrink-0 ${c.bg} ${c.text} border ${c.border}`}>
            <ActivityIcon type={activity.icon} className="w-3 h-3 md:w-3.5 md:h-3.5" />
          </div>
          <span className="text-[10px] md:text-xs font-semibold text-gray-900 dark:text-white truncate">{t(activity.labelKey)}</span>
        </div>
      </td>
      <td className="py-2.5 md:py-3 px-3 md:px-4 hidden sm:table-cell">
        <div className="space-y-1">
          <div className="flex justify-between items-baseline"><span className={`text-xs font-bold tabular-nums ${cc(wP)}`}>{weekVal}</span><span className="text-[10px] text-gray-400 font-medium">/{weekTarget}</span></div>
          <ProgressBar pct={wP} colorBar={c.bar} />
        </div>
      </td>
      <td className="py-2.5 md:py-3 px-3 md:px-4">
        <div className="space-y-1">
          <div className="flex justify-between items-baseline"><span className={`text-xs font-bold tabular-nums ${cc(mP)}`}>{monthVal}</span><span className="text-[10px] text-gray-400 font-medium">/{monthTarget}</span></div>
          <ProgressBar pct={mP} colorBar={c.bar} />
        </div>
      </td>
      <td className="py-2.5 md:py-3 px-3 md:px-4 hidden md:table-cell">
        <div className="space-y-1">
          <div className="flex justify-between items-baseline"><span className={`text-xs font-bold tabular-nums ${cc(yP)}`}>{ytdVal}</span><span className="text-[10px] text-gray-400 font-medium">/{ytdTarget}</span></div>
          <ProgressBar pct={yP} colorBar={c.bar} />
        </div>
      </td>
      <td className="py-2.5 md:py-3 px-3 md:px-4 text-right"><span className={`text-xs md:text-sm font-black tabular-nums ${cc(yP)}`}>{yP}%</span></td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */
export default function DashboardClient({ initialEntries = [], initialFollowUps = [], initialActiveCount = 0, initialSoldStats = { avgDom: 0, recentTrend: 0, count: 0 } }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { t, lang, mounted: appMounted } = useApp();
  const [entries, setEntries] = useState(initialEntries);
  const [modalOpen, setModalOpen] = useState(false);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [mounted, setMounted] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [activePropertiesCount, setActivePropertiesCount] = useState(initialActiveCount);
  const [soldDomStats, setSoldDomStats] = useState(initialSoldStats);

  // Navigation state
  const now = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [activePlanningYear, setActivePlanningYear] = useState(null);
  const [activePlanningYearPlan, setActivePlanningYearPlan] = useState(null);

  useEffect(() => {
    const fetchPlanFromDb = async () => {
      if (!profile?.email) return;
      try {
        const { data, error } = await supabase
          .from('business_plans')
          .select('*')
          .eq('agent_email', profile.email)
          .eq('plan_year', selectedYear)
          .maybeSingle();

        if (data && !error) {
          setHasPlan(data.status === 'active');
          if (data.monthly_targets && Object.keys(data.monthly_targets).length > 0) {
            setPlan({
              monthly_targets: data.monthly_targets,
              weekly_targets: data.weekly_targets || {},
              monthly_targets_by_month: data.monthly_targets_by_month || [],
              plan_start_date: data.plan_start_date || '',
              target_portfolio_size: data.target_portfolio_size || 25,
            });
          }
        } else {
          // Fallback to local storage
          const bp = localStorage.getItem(`altitud_business_plan_${selectedYear}`) || localStorage.getItem('altitud_business_plan');
          if (bp) {
            const parsed = JSON.parse(bp);
            setHasPlan(parsed.status === 'active');
            if (parsed.monthly_targets && Object.keys(parsed.monthly_targets).length > 0) {
              setPlan({
                monthly_targets: parsed.monthly_targets,
                weekly_targets: parsed.weekly_targets || {},
                monthly_targets_by_month: parsed.monthly_targets_by_month || [],
                plan_start_date: parsed.plan_start_date || '',
                target_portfolio_size: parsed.target_portfolio_size || 25,
              });
            }
          } else {
            setHasPlan(false);
            setPlan(loadPlan()); // Default targets
          }
        }
      } catch (err) {
        console.warn('Failed to load yearly business plan on dashboard:', err);
      }
    };
    
    const fetchPlanningBannerInfo = async () => {
      if (!profile?.office || !profile?.email) return;
      try {
        const { data: config } = await supabase
          .from('office_config')
          .select('config_value')
          .eq('office', profile.office)
          .eq('config_key', 'active_planning_year')
          .maybeSingle();
        
        if (config?.config_value?.year) {
          const year = config.config_value.year;
          setActivePlanningYear(year);

          const { data: planData } = await supabase
            .from('business_plans')
            .select('status')
            .eq('agent_email', profile.email)
            .eq('plan_year', year)
            .maybeSingle();

          setActivePlanningYearPlan(planData || null);
        } else {
          setActivePlanningYear(null);
          setActivePlanningYearPlan(null);
        }
      } catch (err) {
        console.warn('Failed to load planning banner info:', err);
      }
    };

    fetchPlanFromDb();
    fetchPlanningBannerInfo();
    setMounted(true);
  }, [profile?.email, profile?.office, selectedYear]);

    const markFollowUpDone = async (id) => {
    await supabase.from('lead_follow_ups').update({ status: 'completed' }).eq('id', id);
    setFollowUps(prev => prev.filter(f => f.id !== id));
    router.refresh();
  };

  const todayISO_ = todayISO();
  const overdueFollowUps = followUps.filter(f => f.due_date < todayISO_);
  const todayFollowUps = followUps.filter(f => f.due_date === todayISO_);
  const upcomingFollowUps = followUps.filter(f => f.due_date > todayISO_).slice(0, 3);

  const todayEntry = entries.find(e=>e.date===todayISO());
  const hasFilledToday = !!todayEntry;

  const handleSave = useCallback(async (entry) => {
    setEntries(prev => { const f=prev.filter(e=>e.date!==entry.date); const u=[...f,entry]; saveEntries(u); return u; });
    if (profile?.id) {
      try {
        const payload = {
          profile_id: profile.id,
          date: entry.date,
          is_completed: true,
          completed_at: new Date().toISOString()
        };
        ACTIVITIES.forEach(a => { if (entry[a.key] !== undefined) payload[a.key] = entry[a.key]; });
        await supabase.from('agent_daily_okr_entries').upsert(payload, { onConflict: 'profile_id, date' });
      } catch (err) {
        console.error('Failed to save OKR to DB', err);
      }
    }
  }, [profile?.id]);



  // Dynamic date sets based on navigation
  const navWeekDates = new Set(getWeekDates(weekOffset));
  const navMonthDates = new Set(getMonthDatesFor(selectedYear, selectedMonth));
  const navYearDates = new Set(getYearDates(selectedYear));

  // Current dates (for summary cards — always current period)
  const weekDates=new Set(getWeekDates()); const monthDates=new Set(getMonthDates()); const ytdDates=new Set(getYTDDates());

  // Helper: get the relative month index (0-11) from plan_start_date
  const getRelativeMonth = (year, month) => {
    if (!plan.plan_start_date) return month;
    const [sy, sm] = plan.plan_start_date.split('-').map(Number);
    if (!sy || isNaN(sm)) return month;
    const relM = (year - sy) * 12 + (month - (sm - 1));
    return Math.max(0, Math.min(11, relM));
  };

  // Get target for a specific activity for a specific month (uses progressive if available)
  const getMonthTarget = (actKey, year, month) => {
    const byMonth = plan.monthly_targets_by_month;
    if (byMonth && byMonth.length === 12) {
      const relM = getRelativeMonth(year, month);
      return byMonth[relM]?.[actKey] ?? (plan.monthly_targets[actKey] || 0);
    }
    return plan.monthly_targets[actKey] || 0;
  };

  // Get cumulative YTD target (sum of per-month targets for months elapsed)
  const getYtdTarget = (actKey, year) => {
    const byMonth = plan.monthly_targets_by_month;
    if (byMonth && byMonth.length === 12) {
      const monthsToSum = year === now.getFullYear() ? now.getMonth() + 1 : 12;
      let total = 0;
      for (let m = 0; m < monthsToSum; m++) {
        const relM = getRelativeMonth(year, m);
        total += byMonth[relM]?.[actKey] ?? (plan.monthly_targets[actKey] || 0);
      }
      return total;
    }
    const monthsE = year === now.getFullYear() ? now.getMonth() + 1 : 12;
    return (plan.monthly_targets[actKey] || 0) * monthsE;
  };
  const monthsElapsed=new Date().getMonth()+1;

  // How many months elapsed in the selected year for YTD target calculation
  const navMonthsElapsed = selectedYear === now.getFullYear() ? now.getMonth() + 1 : 12;

  const overallYTD = mounted ? Math.round(ACTIVITIES.reduce((s,a)=>{
    const act=sumEntries(entries,ytdDates,a.key); const tgt=getYtdTarget(a.key, now.getFullYear());
    return s+completionPct(act,tgt);
  },0)/ACTIVITIES.length) : 0;

  // Monthly plan compliance
  const monthCompliance = mounted ? Math.round(ACTIVITIES.reduce((s,a)=>{
    const act=sumEntries(entries,monthDates,a.key); const tgt=getMonthTarget(a.key, now.getFullYear(), now.getMonth());
    return s+completionPct(act,tgt);
  },0)/ACTIVITIES.length) : 0;

  const streak = (()=>{ if(!mounted)return 0; let c=0; const sd=[...new Set(entries.map(e=>e.date))].sort().reverse(); let ck=todayISO(); for(const d of sd){ if(d===ck){c++;const p=new Date(ck+'T12:00:00');p.setDate(p.getDate()-1);while(p.getDay()===0||p.getDay()===6)p.setDate(p.getDate()-1);ck=p.toISOString().split('T')[0];}else if(d<ck)break;} return c; })();

  const weekTotal=mounted?ACTIVITIES.reduce((s,a)=>s+sumEntries(entries,weekDates,a.key),0):0;
  const monthTotal=mounted?ACTIVITIES.reduce((s,a)=>s+sumEntries(entries,monthDates,a.key),0):0;

  return (
    <>
      <TopNav titleKey="okr_title" subtitleKey="okr_subtitle" />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative z-0">
        <div className="fade-in max-w-6xl mx-auto pb-16">

          {/* ── Active Broker Planning Invite Banner ── */}
          {mounted && activePlanningYear && activePlanningYearPlan?.status !== 'active' && (
            <Link href={`/plan?year=${activePlanningYear}`} className="block mb-4 md:mb-6 group">
              <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500 rounded-2xl p-5 md:p-6 text-white shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] border border-blue-400/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 opacity-10 select-none text-9xl font-black pointer-events-none translate-x-10 translate-y-5">📅</div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl shrink-0 mt-0.5">📅</span>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-200">Invitación del Broker</h4>
                      <h3 className="text-base md:text-lg font-black mt-1">
                        {activePlanningYearPlan?.status === 'draft' 
                          ? `¡Completa tu borrador de plan de negocio para el año ${activePlanningYear}!`
                          : `Sesión de Planificación Anual ${activePlanningYear} Abierta`}
                      </h3>
                      <p className="text-xs text-white/80 mt-1 max-w-lg">
                        El broker ha iniciado la sesión de planificación de negocios. Prepárate para el éxito el próximo año configurando tus presupuestos y metas de conversión.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white text-blue-700 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest group-hover:bg-blue-50 transition-colors shrink-0 self-start sm:self-center">
                    {activePlanningYearPlan?.status === 'draft' ? 'Continuar Borrador' : 'Comenzar Plan'} →
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* ── Plan CTA or Compliance Bar ── */}
          {!hasPlan ? (
            <Link href="/plan" className="block mb-4 md:mb-6 group">
              <div className="bg-gradient-to-r from-violet-600 to-purple-500 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-violet-500/20 hover:shadow-2xl hover:shadow-violet-500/30 transition-all hover:scale-[1.01] active:scale-[0.99]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">🗺️</span>
                      <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">{t('okr_no_plan_title')}</h3>
                    </div>
                    <p className="text-sm text-white/70 max-w-md">{t('okr_no_plan_desc')}</p>
                  </div>
                  <div className="bg-white/20 rounded-2xl px-5 py-3 font-bold text-sm group-hover:bg-white/30 transition-colors shrink-0 hidden sm:block">
                    {t('okr_no_plan_cta')} →
                  </div>
                </div>
              </div>
            </Link>
          ) : (
          <div className="bg-white dark:bg-dark-panel rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4 md:p-5 mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                  <svg className="w-4 h-4 mr-2 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  {t('plan_compliance')}
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{t('plan_subtitle')}</p>
              </div>
              <Link href="/plan" className="text-xs font-semibold text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors flex items-center gap-1.5 shrink-0 self-start">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {t('plan_edit')}
              </Link>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex-1">
                <div className="w-full h-3 md:h-4 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ease-out ${monthCompliance>=80?'bg-gradient-to-r from-emerald-500 to-emerald-400':monthCompliance>=50?'bg-gradient-to-r from-brand-600 to-brand-400':'bg-gradient-to-r from-amber-500 to-amber-400'}`} style={{width:`${Math.min(monthCompliance,100)}%`}} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 font-medium">{t('plan_month_progress')}</span>
                  <span className={`text-[9px] md:text-[10px] font-bold ${monthCompliance>=80?'text-emerald-600 dark:text-emerald-400':monthCompliance>=50?'text-brand-600 dark:text-brand-400':'text-amber-600 dark:text-amber-400'}`}>{monthCompliance}%</span>
                </div>
              </div>
              <div className="text-center shrink-0 px-2 md:px-3">
                <span className={`text-xl md:text-2xl font-black tabular-nums ${overallYTD>=80?'text-emerald-600 dark:text-emerald-400':overallYTD>=50?'text-brand-600 dark:text-brand-400':'text-amber-600 dark:text-amber-400'}`}>{overallYTD}%</span>
                <p className="text-[8px] md:text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase">YTD</p>
              </div>
            </div>
          </div>
          )}

          {/* ── Agent Leads Panel ── */}
          {mounted && <AgentLeadsPanel />}

          {/* ── Commission Progress Bar ── */}
            <div className="mb-4 md:mb-6">
              <AchievementOverview />
            </div>

          {/* ── Follow-Up Reminders ── */}
          {mounted && followUps.length > 0 && (
            <div className="bg-white dark:bg-dark-panel rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4 md:p-5 mb-4 md:mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔔</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('dash_followups_title')}</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('dash_followups_subtitle')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {overdueFollowUps.length > 0 && <span className="text-[9px] font-black px-2 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse">{overdueFollowUps.length} {t('ofc_leads_followup_overdue')}</span>}
                  {todayFollowUps.length > 0 && <span className="text-[9px] font-black px-2 py-1 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">{todayFollowUps.length} {t('ofc_leads_followup_today')}</span>}
                </div>
              </div>
              <div className="space-y-1.5">
                {[...overdueFollowUps, ...todayFollowUps, ...upcomingFollowUps].slice(0, 5).map(f => {
                  const isOverdue = f.due_date < todayISO_;
                  const isToday = f.due_date === todayISO_;
                  return (
                    <div key={f.id} className={`flex items-center gap-3 py-2 px-3 rounded-lg border transition-all ${isOverdue ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : isToday ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30' : 'bg-gray-50 dark:bg-dark-bg border-gray-100 dark:border-dark-border'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{f.property_inquiries?.lead_name || 'Lead'}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{f.note}</p>
                      </div>
                      <span className={`text-[9px] font-bold whitespace-nowrap ${isOverdue ? 'text-red-500' : isToday ? 'text-amber-500' : 'text-gray-400'}`}>
                        {isToday ? (lang === 'es' ? 'Hoy' : 'Today') : new Date(f.due_date + 'T12:00:00').toLocaleDateString()}
                      </span>
                      <button onClick={() => markFollowUpDone(f.id)} className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors whitespace-nowrap">
                        ✓ {t('dash_followups_mark_done')}
                      </button>
                    </div>
                  );
                })}
              </div>
              <Link href="/oficina" className="block text-center mt-3 text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline">
                {t('dash_followups_view_all')} →
              </Link>
            </div>
          )}

          {/* ── Top Section ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6 md:mb-8">

            {/* CTA Card */}
            <div className={`lg:col-span-5 rounded-xl p-4 md:p-5 border shadow-sm transition-all ${hasFilledToday?'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-800':'bg-gradient-to-br from-brand-50 to-white dark:from-dark-panel dark:to-[#161a22] border-brand-200 dark:border-brand-800'}`}>
              <div className="mb-3 md:mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{hasFilledToday?t('okr_today_done'):t('okr_today_pending')}</h3>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5">{hasFilledToday?t('okr_today_done_desc'):t('okr_today_pending_desc')}</p>
              </div>
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base md:text-lg">🔥</span>
                  <div><span className="text-sm font-black text-gray-900 dark:text-white">{streak}</span><span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1 font-medium">{t('okr_streak')}</span></div>
                </div>
                <WeekCalendar entries={entries} t={t} />
              </div>
              <button onClick={()=>setModalOpen(true)} className={`w-full py-3 rounded-lg text-sm font-bold shadow-lg flex items-center justify-center transition-all active:scale-[0.98] ${hasFilledToday?'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25':'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-brand-500/25 animate-pulse'}`}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {hasFilledToday?t('okr_edit_btn'):t('okr_complete_btn')}
              </button>
            </div>

            {/* Summary Cards */}
            <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
              <div className="glass-panel rounded-xl p-3 md:p-4 flex flex-col items-center justify-center shadow-sm col-span-2 md:col-span-1 md:row-span-2">
                <div className="relative mb-1"><CircularProgress value={overallYTD} /><div className="absolute inset-0 flex items-center justify-center"><span className="text-base md:text-lg font-black text-gray-900 dark:text-white">{overallYTD}%</span></div></div>
                <p className="text-[8px] md:text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider text-center">{t('okr_ytd_compliance')}</p>
              </div>
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-center shadow-sm">
                <p className="text-[8px] md:text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">{t('okr_week_activities')}</p>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mt-0.5">{weekTotal}</h3>
              </div>
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-center shadow-sm">
                <p className="text-[8px] md:text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">{t('okr_month_activities')}</p>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mt-0.5">{monthTotal}</h3>
              </div>
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-center shadow-sm">
                <p className="text-[8px] md:text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">{t('okr_closes_ytd')}</p>
                <h3 className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{mounted?sumEntries(entries,ytdDates,'cierres'):0}<span className="text-[10px] text-gray-400 font-medium ml-1">/{getYtdTarget('cierres', now.getFullYear())}</span></h3>
              </div>
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-center shadow-sm">
                <p className="text-[8px] md:text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">{t('okr_captures_ytd')}</p>
                <h3 className="text-lg md:text-xl font-bold text-teal-600 dark:text-teal-400 mt-0.5">{mounted?sumEntries(entries,ytdDates,'captaciones'):0}<span className="text-[10px] text-gray-400 font-medium ml-1">/{getYtdTarget('captaciones', now.getFullYear())}</span></h3>
              </div>
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-center shadow-sm">
                <p className="text-[8px] md:text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">{t('okr_streak_label')}</p>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mt-0.5">🔥 {streak}</h3>
              </div>
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-center shadow-sm relative overflow-hidden">
                <p className="text-[8px] md:text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider relative z-10">Rotación Cartera</p>
                <div className="flex items-end gap-2 mt-0.5 relative z-10">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                    {soldDomStats.avgDom || 0}
                    <span className="text-xs font-normal text-gray-500 ml-1">días</span>
                  </h3>
                  {soldDomStats.count > 0 && (
                    <span className={`text-[10px] font-bold mb-1 ${soldDomStats.recentTrend <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {soldDomStats.recentTrend <= 0 ? '↓' : '↑'} {Math.abs(soldDomStats.recentTrend)}d
                    </span>
                  )}
                </div>
                {/* SVG Trendline background */}
                <div className="absolute bottom-0 left-0 right-0 h-8 opacity-20 pointer-events-none">
                  <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                    <polyline points={soldDomStats.recentTrend <= 0 ? "0,25 25,20 50,22 75,10 100,5" : "0,5 25,10 50,8 75,20 100,25"} fill="none" stroke={soldDomStats.recentTrend <= 0 ? "#10b981" : "#ef4444"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* ── Table Navigation ── */}
          <div className="mb-4 px-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-300 text-xs md:text-sm tracking-wide uppercase">{t('okr_table_title')}</h3>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-500 mt-0.5">{t('okr_table_subtitle')}</p>
              </div>
            </div>
            <DateNavControls
              weekOffset={weekOffset}
              setWeekOffset={setWeekOffset}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              lang={lang}
              t={t}
            />
          </div>

          <div className="bg-white dark:bg-dark-panel rounded-xl shadow-xl border border-gray-200 dark:border-dark-border transition-colors overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-200 dark:border-dark-border">
                  <th className="py-2.5 md:py-3 px-3 md:px-4 text-[9px] md:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('okr_col_activity')}</th>
                  <th className="py-2.5 md:py-3 px-3 md:px-4 text-[9px] md:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">{t('okr_col_week')}</th>
                  <th className="py-2.5 md:py-3 px-3 md:px-4 text-[9px] md:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('okr_col_month')}</th>
                  <th className="py-2.5 md:py-3 px-3 md:px-4 text-[9px] md:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">{t('okr_col_ytd')}</th>
                  <th className="py-2.5 md:py-3 px-3 md:px-4 text-[9px] md:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {mounted && ACTIVITIES.map(a => (
                  <StatRow key={a.key} activity={a} t={t}
                    weekVal={sumEntries(entries,navWeekDates,a.key)} weekTarget={plan.weekly_targets[a.key]}
                    monthVal={sumEntries(entries,navMonthDates,a.key)} monthTarget={getMonthTarget(a.key, selectedYear, selectedMonth)}
                    ytdVal={sumEntries(entries,navYearDates,a.key)} ytdTarget={getYtdTarget(a.key, selectedYear)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Funnel ── */}
          <div className="mt-6 md:mt-8">
            <h3 className="font-bold text-gray-900 dark:text-gray-300 text-xs md:text-sm tracking-wide uppercase mb-3 md:mb-4 px-1">{t('okr_funnel_title')} — {(lang==='es'?MONTH_NAMES_ES:MONTH_NAMES_EN)[selectedMonth]} {selectedYear}</h3>
            <div className="bg-white dark:bg-dark-panel rounded-xl shadow-xl border border-gray-200 dark:border-dark-border p-4 md:p-6">
              <div className="space-y-1.5 md:space-y-2">
                {mounted && ACTIVITIES.map(a => {
                  const val=sumEntries(entries,navMonthDates,a.key);
                  const topVal=Math.max(sumEntries(entries,navMonthDates,ACTIVITIES[0].key),1);
                  const wP=Math.max(Math.round((val/topVal)*100),8);
                  const c=COLORS[a.color];
                  return (
                    <div key={a.key} className="flex items-center gap-2 md:gap-3">
                      <div className="w-20 md:w-28 shrink-0 text-right"><span className="text-[9px] md:text-[10px] font-semibold text-gray-500 dark:text-gray-400 truncate block">{t(a.labelKey).split('(')[0].trim()}</span></div>
                      <div className="flex-1 relative"><div className={`h-6 md:h-7 rounded-md ${c.bar} transition-all duration-700 ease-out flex items-center justify-end pr-2`} style={{width:`${wP}%`,opacity:0.85}}><span className="text-[10px] md:text-[11px] font-black text-white drop-shadow-sm">{val}</span></div></div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 mt-3 md:mt-4 text-center">{t('okr_funnel_footer')}</p>
            </div>
          </div>

        </div>
      </div>

      <DailyFormModal isOpen={modalOpen} onClose={()=>setModalOpen(false)} onSave={handleSave} existingEntry={todayEntry} t={t} />
    </>
  );
}
