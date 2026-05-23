"use client";

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context';
import StepParaQue from './StepParaQue';
import StepLivingExpenses from './StepLivingExpenses';
import StepBusinessExpenses from './StepBusinessExpenses';
import StepGoals from './StepGoals';
import StepGestion from './StepGestion';

/* ═══════════════════════════════════════════════════════
   DEFAULT PLAN DATA
   ═══════════════════════════════════════════════════════ */
const DEFAULT_PLAN = {
  para_que: '',
  currency: 'CRC',
  exchange_rate: 530,
  living_expenses: [],
  total_living_monthly: 0,
  business_expenses: [],
  total_business_monthly: 0,
  goals: [],
  total_goals_monthly: 0,
  grand_total_monthly: 0,
  grand_total_monthly_usd: 0,
  avg_ticket: 0,
  ticket_currency: 'USD',
  commission_pct: 5,
  agent_split_pct: 50,
  commission_per_close: 0,
  closes_needed_monthly: 0,
  conversion_ratios: {
    calls_to_prelisting: 0.15,
    prelisting_to_acm: 0.65,
    acm_to_listing: 0.75,
    listing_to_capture: 0.65,
    capture_to_close: 0.50,
  },
  target_portfolio_size: 25,
  plan_start_date: new Date().toISOString().slice(0, 7), // YYYY-MM
  monthly_targets: {},
  weekly_targets: {},
  monthly_targets_by_month: [], // array of 12 objects with per-month targets
  status: 'draft',
};

const PLAN_KEY = 'altitud_business_plan';

/* ═══════════════════════════════════════════════════════
   STEP DEFINITIONS
   ═══════════════════════════════════════════════════════ */
const STEPS = [
  { key: 'para_que', titleKey: 'pw_s1_title', icon: '🔥', color: 'from-violet-600 to-purple-500' },
  { key: 'living',   titleKey: 'pw_s2_title', icon: '🏠', color: 'from-blue-600 to-blue-400' },
  { key: 'business', titleKey: 'pw_s3_title', icon: '💼', color: 'from-teal-600 to-teal-400' },
  { key: 'goals',    titleKey: 'pw_s4_title', icon: '🎯', color: 'from-amber-500 to-yellow-400' },
  { key: 'gestion',  titleKey: 'pw_s5_title', icon: '📊', color: 'from-emerald-600 to-emerald-400' },
];

/* ═══════════════════════════════════════════════════════
   FORMAT HELPERS
   ═══════════════════════════════════════════════════════ */
export function formatMoney(amount, currency = 'CRC') {
  if (!amount && amount !== 0) return currency === 'CRC' ? '₡0' : '$0';
  const num = Number(amount);
  if (currency === 'CRC') {
    return '₡' + num.toLocaleString('es-CR', { maximumFractionDigits: 0 });
  }
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function convertCurrency(amount, fromCurrency, exchangeRate) {
  if (!amount || !exchangeRate) return 0;
  if (fromCurrency === 'CRC') return Math.round(amount / exchangeRate);
  return Math.round(amount * exchangeRate);
}

/* ═══════════════════════════════════════════════════════
   MAIN WIZARD COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function PlanWizard({ existingPlan, queriedYear = new Date().getFullYear(), onComplete, onSaveDraft }) {
  const { t } = useApp();
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState(() => {
    if (existingPlan && Object.keys(existingPlan).length > 0) {
      return { ...DEFAULT_PLAN, ...existingPlan };
    }
    return DEFAULT_PLAN;
  });
  const [direction, setDirection] = useState(1); // 1=forward, -1=back
  const [saving, setSaving] = useState(false);

  // Load existing plan
  useEffect(() => {
    if (existingPlan && Object.keys(existingPlan).length > 0) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlan(prev => ({ ...prev, ...existingPlan }));
    }
  }, [existingPlan]);

  // Update plan fields
  const updatePlan = useCallback((updates) => {
    setPlan(prev => {
      const next = { ...prev, ...updates };
      // Recalculate totals
      next.total_living_monthly = (next.living_expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      next.total_business_monthly = (next.business_expenses || []).reduce((s, e) => s + (e.annual ? Math.round(Number(e.amount) / 12) : (Number(e.amount) || 0)), 0);
      next.total_goals_monthly = (next.goals || []).reduce((s, g) => s + (Number(g.monthly) || 0), 0);
      next.grand_total_monthly = next.total_living_monthly + next.total_business_monthly + next.total_goals_monthly;

      const rate = next.exchange_rate || 530;
      if (next.currency === 'CRC') {
        next.grand_total_monthly_usd = Math.round(next.grand_total_monthly / rate);
      } else {
        next.grand_total_monthly_usd = next.grand_total_monthly;
      }
      return next;
    });
  }, []);

  const goNext = () => { if (step < STEPS.length - 1) { setDirection(1); setStep(s => s + 1); } };
  const goBack = () => { if (step > 0) { setDirection(-1); setStep(s => s - 1); } };

  const handleActivate = async () => {
    setSaving(true);
    const finalPlan = { ...plan, status: 'active' };
    // Save to localStorage as backup
    localStorage.setItem(PLAN_KEY, JSON.stringify(finalPlan));
    if (onComplete) await onComplete(finalPlan);
    setSaving(false);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    if (onSaveDraft) await onSaveDraft(plan);
    setSaving(false);
  };

  const currentStep = STEPS[step];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-dark-bg">

      {/* ── Progress Bar ── */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-dark-panel/90 backdrop-blur-xl border-b border-gray-200 dark:border-dark-border px-4 md:px-8 py-3">
        <div className="max-w-4xl mx-auto">
          {/* Step indicators */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="text-[10px] font-black tracking-widest text-nexus-blue uppercase italic shrink-0 bg-blue-50 dark:bg-blue-900/10 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-500/20">
              Plan {queriedYear}
            </div>
            <div className="flex items-center justify-end gap-1.5 md:gap-2 overflow-x-auto py-1">
              {STEPS.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => { setDirection(i > step ? 1 : -1); setStep(i); }}
                  className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    i === step
                      ? 'bg-gradient-to-r ' + s.color + ' text-white shadow-lg scale-105'
                      : i < step
                      ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-dark-bg text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <span className="text-sm md:text-base">{s.icon}</span>
                  <span className="hidden md:inline">{t(s.titleKey)}</span>
                  <span className="md:hidden text-[10px]">{i + 1}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Progress track */}
          <div className="w-full h-1 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${currentStep.color}`}
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Step Content ── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10">
        <div
          className="max-w-4xl mx-auto fade-in"
          key={step}
        >
          {step === 0 && <StepParaQue plan={plan} updatePlan={updatePlan} />}
          {step === 1 && <StepLivingExpenses plan={plan} updatePlan={updatePlan} />}
          {step === 2 && <StepBusinessExpenses plan={plan} updatePlan={updatePlan} />}
          {step === 3 && <StepGoals plan={plan} updatePlan={updatePlan} />}
          {step === 4 && <StepGestion plan={plan} updatePlan={updatePlan} />}
        </div>
      </div>

      {/* ── Footer Nav ── */}
      <div className="sticky bottom-0 z-30 bg-white/90 dark:bg-dark-panel/90 backdrop-blur-xl border-t border-gray-200 dark:border-dark-border px-4 md:px-8 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={goBack}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-bg transition-all active:scale-95"
              >
                ← {t('pw_back')}
              </button>
            )}
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-3 py-2.5 rounded-xl text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {saving ? t('pw_saving') : t('pw_save_draft')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest hidden sm:block">
              {t('pw_step')} {step + 1} {t('pw_of')} {STEPS.length}
            </span>
            {step < STEPS.length - 1 ? (
              <button
                onClick={goNext}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 bg-gradient-to-r ${currentStep.color} hover:shadow-xl`}
              >
                {t('pw_next')} →
              </button>
            ) : (
              <button
                onClick={handleActivate}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg bg-gradient-to-r from-emerald-600 to-emerald-400 hover:shadow-xl hover:from-emerald-500 hover:to-emerald-300 transition-all active:scale-95 animate-pulse"
              >
                {saving ? t('pw_saving') : t('pw_activate')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
