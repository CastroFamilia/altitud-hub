"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

/* ═══════════════════════════════════════════════════════════════
   ACHIEVEMENT OVERVIEW COMPONENT
   Displays YTD actual commissions, volume, and closed sides.
   Calculates progress towards REMAX Annual Award Clubs by dividing
   nominal club thresholds by the regional CCF (default: 1.307).
   ═══════════════════════════════════════════════════════════════ */

const AWARDS = [
  { name_en: 'Executive Club', name_es: 'Club Ejecutivo', threshold: 50000, color: 'from-blue-600 to-cyan-500' },
  { name_en: '100% Club', name_es: 'Club 100%', threshold: 100000, color: 'from-amber-500 to-orange-500' },
  { name_en: 'Platinum Club', name_es: 'Club Platino', threshold: 250000, color: 'from-violet-600 to-indigo-600' },
  { name_en: 'Chairman\'s Club', name_es: 'Club del Presidente', threshold: 500000, color: 'from-pink-600 to-rose-600' },
  { name_en: 'Titan Club', name_es: 'Club Titán', threshold: 750000, color: 'from-red-500 to-pink-600' },
  { name_en: 'Diamond Club', name_es: 'Club Diamante', threshold: 1000000, color: 'from-emerald-500 to-teal-500' },
  { name_en: 'Pinnacle Club', name_es: 'Club Pinnacle', threshold: 2000000, color: 'from-purple-600 to-violet-800' },
];

export default function AchievementOverview() {
  const { t, lang } = useApp();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ccf, setCcf] = useState(1.307);
  const [stats, setStats] = useState({
    earned: 0,
    pending: 0,
    volume: 0,
    sides: 0,
    closings: 0,
  });

  useEffect(() => {
    if (!profile?.id) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Load CCF from office_settings
        if (profile.office) {
          const { data: officeData, error: officeError } = await supabase
            .from('office_settings')
            .select('ccf')
            .eq('office_id', profile.office)
            .maybeSingle();

          if (!officeError && officeData?.ccf) {
            setCcf(Number(officeData.ccf));
          }
        }

        // 2. Load agent commissions for the current year
        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

        const { data: comms, error: commsError } = await supabase
          .from('agent_commissions')
          .select('agent_amount, status, sale_price, side, side_pct, closing_date')
          .eq('agent_id', profile.id)
          .gte('closing_date', yearStart);

        if (commsError) throw commsError;

        let earned = 0;
        let pending = 0;
        let volume = 0;
        let sides = 0;
        let closings = 0;

        (comms || []).forEach(c => {
          const amt = Number(c.agent_amount) || 0;
          const status = c.status;
          
          if (status === 'paid') {
            earned += amt;
            closings += 1;
            
            // Calculate Sides: both sides counts as 2, others as 1
            sides += c.side === 'both' ? 2 : 1;
            
            // Calculate Volume Split Credit
            // Volume credit = sale_price * (side_pct / 50). Representing 1 side (50% side_pct) gets 100% sale_price, both (100% side_pct) gets 200% sale_price.
            const sidePct = Number(c.side_pct) || 50;
            const price = Number(c.sale_price) || 0;
            volume += price * (sidePct / 50);
          } else if (status === 'pending' || status === 'processing') {
            pending += amt;
          }
        });

        setStats({
          earned,
          pending,
          volume,
          sides,
          closings,
        });

      } catch (err) {
        console.error('Failed to load achievement overview data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profile?.id, profile?.office]);

  if (loading || !profile?.id) {
    return (
      <div className="glass-panel rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-dark-border animate-pulse min-h-[220px]">
        <div className="h-4 bg-gray-200 dark:bg-dark-border rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 dark:bg-dark-border rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 dark:bg-dark-border rounded w-3/4"></div>
          </div>
          <div className="h-12 bg-gray-200 dark:bg-dark-border rounded"></div>
        </div>
      </div>
    );
  }

  // Calculate award status
  const earned = stats.earned;
  let currentAward = null;
  let nextAward = AWARDS[0];

  for (let i = 0; i < AWARDS.length; i++) {
    const adjThreshold = AWARDS[i].threshold / ccf;
    if (earned >= adjThreshold) {
      currentAward = AWARDS[i];
      nextAward = AWARDS[i + 1] || null;
    } else {
      break;
    }
  }

  // Progress to next award
  let pct = 0;
  let nextTargetAdjusted = 0;
  let approachingName = '';

  if (nextAward) {
    nextTargetAdjusted = nextAward.threshold / ccf;
    pct = Math.min(Math.round((earned / nextTargetAdjusted) * 100), 100);
    approachingName = lang === 'es' ? nextAward.name_es : nextAward.name_en;
  } else {
    pct = 100;
    approachingName = t('ach_max_reached');
  }

  // Formatter functions
  const fmtMoney = (n) => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const fmtAbbr = (n) => {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
    return '$' + n;
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-dark-border relative overflow-hidden transition-all duration-300">
      {/* Background Gradient Accent */}
      <div className="absolute right-0 top-0 w-32 h-32 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Side: YTD Earned actual */}
        <div className="lg:col-span-5 space-y-2">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {t('ach_title')}
          </p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight tabular-nums">
              {fmtMoney(earned)}
            </h2>
            {stats.pending > 0 && (
              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                +{fmtAbbr(stats.pending)} {t('ach_pending')}
              </span>
            )}
          </div>
          <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm">
            {t('ach_desc').replace('{ccf}', ccf.toFixed(3))}
          </p>
        </div>

        {/* Right Side: Award Club Progress Bar */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider block">
                {t('ach_next_award')}
              </span>
              <span className="text-base font-black text-slate-800 dark:text-white">
                {nextAward ? t('ach_approaching') + approachingName : approachingName}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-brand-600 dark:text-brand-400 tabular-nums">
                {pct}%
              </span>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="relative pt-1">
            {/* The Bar */}
            <div className="overflow-hidden h-4 text-xs flex rounded-full bg-slate-100 dark:bg-dark-border/80 border border-slate-200/40 dark:border-dark-border relative">
              <div
                style={{ width: `${pct}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r ${nextAward ? nextAward.color : 'from-brand-600 to-brand-500'} transition-all duration-1000 ease-out`}
              >
                <span className="text-[9px] font-black leading-none drop-shadow-md">{pct}%</span>
              </div>
            </div>

            {/* Threshold Labels (0%, 25%, 50%, 75%, 100%) */}
            <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-500 font-bold px-1 mt-1.5 uppercase tracking-wider">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Separator */}
      <div className="h-px bg-slate-100 dark:bg-dark-border/60 my-6" />

      {/* Production Stats Grid: Commissions, Volume, Sides */}
      <div className="grid grid-cols-3 gap-4 text-center md:text-left">
        {/* Column 1: Commissions */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-2.5 p-3 rounded-xl bg-slate-50/50 dark:bg-dark-panel/40 border border-slate-100 dark:border-dark-border/40 hover:bg-slate-50 dark:hover:bg-dark-panel/60 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0">
            💵
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block truncate">
              {t('ach_commissions')}
            </span>
            <span className="text-base font-black text-slate-800 dark:text-white block mt-0.5 tabular-nums">
              {fmtAbbr(earned)}
            </span>
          </div>
        </div>

        {/* Column 2: Volume */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-2.5 p-3 rounded-xl bg-slate-50/50 dark:bg-dark-panel/40 border border-slate-100 dark:border-dark-border/40 hover:bg-slate-50 dark:hover:bg-dark-panel/60 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0">
            📈
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block truncate">
              {t('ach_volume')}
            </span>
            <span className="text-base font-black text-slate-800 dark:text-white block mt-0.5 tabular-nums">
              {fmtAbbr(stats.volume)}
            </span>
          </div>
        </div>

        {/* Column 3: Sides */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-2.5 p-3 rounded-xl bg-slate-50/50 dark:bg-dark-panel/40 border border-slate-100 dark:border-dark-border/40 hover:bg-slate-50 dark:hover:bg-dark-panel/60 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg shrink-0">
            🔢
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block truncate">
              {t('ach_sides')}
            </span>
            <span className="text-base font-black text-slate-800 dark:text-white block mt-0.5 tabular-nums">
              {stats.sides}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
