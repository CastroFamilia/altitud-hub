"use client";

import { useMemo } from 'react';
import { useApp } from '@/lib/context';
import { formatMoney, convertCurrency } from './PlanWizard';

/* ═══════════════════════════════════════════════════════
   FUNNEL ACTIVITIES (mirroring OKR pipeline)
   ═══════════════════════════════════════════════════════ */
const FUNNEL = [
  { key: 'llamadas',     label: 'act_llamadas',     icon: '📞', color: 'bg-brand-500' },
  { key: 'prelistings',  label: 'act_prelistings',  icon: '📋', color: 'bg-indigo-500' },
  { key: 'acm',          label: 'act_acm',          icon: '📊', color: 'bg-blue-500' },
  { key: 'listings',     label: 'act_listings',     icon: '🎤', color: 'bg-purple-500' },
  { key: 'captaciones',  label: 'act_captaciones',  icon: '🏠', color: 'bg-teal-500' },
  { key: 'cierres',      label: 'act_cierres',      icon: '✅', color: 'bg-emerald-500' },
];

const RATIO_KEYS = [
  { key: 'calls_to_prelisting',  labelKey: 'pw_s5_ratio_calls' },
  { key: 'prelisting_to_acm',    labelKey: 'pw_s5_ratio_pre_acm' },
  { key: 'acm_to_listing',       labelKey: 'pw_s5_ratio_acm_list' },
  { key: 'listing_to_capture',   labelKey: 'pw_s5_ratio_list_cap' },
  { key: 'capture_to_close',     labelKey: 'pw_s5_ratio_cap_close' },
];

export default function StepGestion({ plan, updatePlan }) {
  const { t } = useApp();
  const r = plan.conversion_ratios || {};

  // Calculate commission per close
  const commPerClose = useMemo(() => {
    const ticket = Number(plan.avg_ticket) || 0;
    const commPct = Number(plan.commission_pct) || 0;
    const splitPct = Number(plan.agent_split_pct) || 0;
    return ticket * (commPct / 100) * (splitPct / 100);
  }, [plan.avg_ticket, plan.commission_pct, plan.agent_split_pct]);

  // Need in USD for calculation
  const needUSD = plan.grand_total_monthly_usd || 0;

  // Commission per close in USD
  const commUSD = plan.ticket_currency === 'USD'
    ? commPerClose
    : convertCurrency(commPerClose, 'CRC', plan.exchange_rate);

  // Closes needed
  const closesNeeded = commUSD > 0 ? Math.ceil(needUSD / commUSD) : 0;

  // Calculate funnel targets (from bottom up)
  const targets = useMemo(() => {
    const cierres = closesNeeded;
    const captaciones = r.capture_to_close > 0 ? Math.ceil(cierres / r.capture_to_close) : cierres;
    const listings = r.listing_to_capture > 0 ? Math.ceil(captaciones / r.listing_to_capture) : captaciones;
    const acm = r.acm_to_listing > 0 ? Math.ceil(listings / r.acm_to_listing) : listings;
    const prelistings = r.prelisting_to_acm > 0 ? Math.ceil(acm / r.prelisting_to_acm) : acm;
    const llamadas = r.calls_to_prelisting > 0 ? Math.ceil(prelistings / r.calls_to_prelisting) : prelistings;

    const monthly = { llamadas, prelistings, acm, listings, captaciones, cierres };
    const weekly = {};
    Object.keys(monthly).forEach(k => { weekly[k] = Math.ceil(monthly[k] / 4); });

    return { monthly, weekly };
  }, [closesNeeded, r]);

  // Sync calculated targets back to plan
  const syncTargets = () => {
    updatePlan({
      commission_per_close: commPerClose,
      closes_needed_monthly: closesNeeded,
      monthly_targets: { ...targets.monthly, consultas: 0, muestras: 0, reservas: 0, transacciones: 0 },
      weekly_targets: { ...targets.weekly, consultas: 0, muestras: 0, reservas: 0, transacciones: 0 },
    });
  };

  // Auto-sync on every re-render
  useMemo(() => {
    if (commPerClose > 0 && closesNeeded > 0) {
      // Schedule update to avoid state update during render
      setTimeout(() => syncTargets(), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commPerClose, closesNeeded, JSON.stringify(targets)]);

  const updateRatio = (key, value) => {
    const v = Math.min(1, Math.max(0, Number(value) || 0));
    updatePlan({ conversion_ratios: { ...r, [key]: v } });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-2xl shadow-emerald-500/30 mb-4">
          <span className="text-4xl">📊</span>
        </div>
        <h2 className="text-3xl md:text-4xl nexus-header text-gray-900 dark:text-white">
          {t('pw_s5_title')}
        </h2>
        <p className="text-base text-gray-500 dark:text-gray-400 font-medium max-w-lg mx-auto">
          {t('pw_s5_subtitle')}
        </p>
      </div>

      {/* ── Section A: Plan Summary ── */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-dark-panel rounded-3xl shadow-xl border border-gray-200 dark:border-dark-border p-6 space-y-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
            📋 {t('pw_s5_summary_title')}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-dark-border/50">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">🏠 {t('pw_s5_living')}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatMoney(plan.total_living_monthly, plan.currency)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-dark-border/50">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">💼 {t('pw_s5_business')}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatMoney(plan.total_business_monthly, plan.currency)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-dark-border/50">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">🎯 {t('pw_s5_goals_label')}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatMoney(plan.total_goals_monthly, plan.currency)}</span>
            </div>
          </div>
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-2xl p-4 mt-2">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/70">💎 {t('pw_s5_grand_total')}</p>
                {plan.currency === 'CRC' && plan.grand_total_monthly_usd > 0 && (
                  <p className="text-[10px] text-white/50 mt-0.5">≈ ${plan.grand_total_monthly_usd.toLocaleString('en-US')} USD</p>
                )}
              </div>
              <h3 className="text-2xl md:text-3xl font-black italic">
                {formatMoney(plan.grand_total_monthly, plan.currency)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section B: Zone Data ── */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-dark-panel rounded-3xl shadow-lg border border-gray-200 dark:border-dark-border p-6 space-y-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
            🗺️ {t('pw_s5_zone_title')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Average Ticket */}
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                {t('pw_s5_avg_ticket')}
              </label>
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border px-3">
                <span className="text-sm font-bold text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  value={plan.avg_ticket || ''}
                  onChange={(e) => updatePlan({ avg_ticket: Number(e.target.value) || 0, ticket_currency: 'USD' })}
                  placeholder="120,000"
                  className="w-full text-right text-sm font-bold bg-transparent py-2.5 text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
            {/* Commission */}
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                {t('pw_s5_commission')}
              </label>
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border px-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={plan.commission_pct || ''}
                  onChange={(e) => updatePlan({ commission_pct: Number(e.target.value) || 0 })}
                  placeholder="5"
                  className="w-full text-right text-sm font-bold bg-transparent py-2.5 text-gray-900 dark:text-white focus:outline-none"
                />
                <span className="text-sm font-bold text-gray-400">%</span>
              </div>
            </div>
            {/* Agent Split */}
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                {t('pw_s5_agent_split')}
              </label>
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border px-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={plan.agent_split_pct || ''}
                  onChange={(e) => updatePlan({ agent_split_pct: Number(e.target.value) || 0 })}
                  placeholder="50"
                  className="w-full text-right text-sm font-bold bg-transparent py-2.5 text-gray-900 dark:text-white focus:outline-none"
                />
                <span className="text-sm font-bold text-gray-400">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section C: The Calculation ── */}
      {commPerClose > 0 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-800 dark:to-gray-700 rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">
              ⚡ {t('pw_s5_calc_title')}
            </h3>
            <div className="bg-white/5 rounded-2xl p-4 space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">${(plan.avg_ticket || 0).toLocaleString()} × {plan.commission_pct}% × {plan.agent_split_pct}%</span>
                <span className="font-bold text-emerald-400">= ${commUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-white/50">{t('pw_s5_per_close')}</p>
                </div>
                <span className="text-xl font-black text-emerald-400">${commUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-white/50">${needUSD.toLocaleString()} ÷ ${commUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-amber-400">{closesNeeded}</span>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">{t('pw_s5_closes_needed')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Section D: Conversion Ratios ── */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-dark-panel rounded-3xl shadow-lg border border-gray-200 dark:border-dark-border p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
              🔄 {t('pw_s5_ratios_title')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('pw_s5_ratios_desc')}</p>
          </div>
          <div className="space-y-3">
            {RATIO_KEYS.map((rk) => (
              <div key={rk.key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex-1">{t(rk.labelKey)}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={r[rk.key] || 0.5}
                    onChange={(e) => updateRatio(rk.key, e.target.value)}
                    className="w-24 md:w-32 h-2 appearance-none bg-gray-200 dark:bg-dark-border rounded-full cursor-pointer accent-emerald-500"
                  />
                  <span className="text-sm font-black text-gray-900 dark:text-white w-12 text-right tabular-nums">
                    {Math.round((r[rk.key] || 0) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section E: Weekly Targets ── */}
      {closesNeeded > 0 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-500 rounded-3xl p-6 text-white shadow-2xl shadow-emerald-500/20 space-y-5">
            <div className="text-center">
              <h3 className="text-lg font-black uppercase tracking-widest">{t('pw_s5_weekly_title')}</h3>
              <p className="text-xs text-white/60 mt-1">{t('pw_s5_weekly_subtitle')}</p>
            </div>

            <div className="space-y-2">
              {FUNNEL.map((f) => {
                const m = targets.monthly[f.key] || 0;
                const w = targets.weekly[f.key] || 0;
                const maxW = targets.weekly.llamadas || 1;
                const barPct = Math.max(Math.round((w / maxW) * 100), 8);

                return (
                  <div key={f.key} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{f.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white/80">{t(f.label).split('(')[0].trim()}</span>
                        <div className="flex items-center gap-2 text-right">
                          <span className="text-sm font-black">{w}{t('pw_s5_per_week')}</span>
                          <span className="text-[10px] text-white/40 font-medium">({m}{t('pw_s5_per_month')})</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-white/30 transition-all duration-700`} style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Celebration */}
            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-2xl mb-2">🎉</p>
              <h4 className="text-lg font-black">{t('pw_s5_congratulations')}</h4>
              <p className="text-xs text-white/60 mt-1">{t('pw_s5_congrats_desc')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
