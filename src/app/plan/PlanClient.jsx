"use client";

import { useState, useEffect, useCallback } from 'react';
import TopNav from '@/components/layout/TopNav';
import PlanWizard from '@/components/plan/PlanWizard';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';

const getPlanKey = (year) => `altitud_business_plan_${year}`;
const getOkrPlanKey = (year) => `altitud_okr_plan_${year}`;

function loadLocalPlan(year) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getPlanKey(year));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export default function PlanClient({ initialPlan, queriedYear }) {
  const { t } = useApp();
  const [existingPlan, setExistingPlan] = useState(initialPlan);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!initialPlan) {
      const local = loadLocalPlan(queriedYear);
     
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (local) setExistingPlan(local);
    }
     
    setLoading(false);
  }, [initialPlan, queriedYear]);

  // Save (upsert) to Supabase
  const handleSave = useCallback(async (planData) => {
    const payload = {
      agent_email: planData.agent_email || 'default@altitud.cr',
      agent_name: planData.agent_name || 'Agente',
      plan_year: queriedYear,
      para_que: planData.para_que,
      currency: planData.currency,
      exchange_rate: planData.exchange_rate,
      living_expenses: planData.living_expenses,
      total_living_monthly: planData.total_living_monthly,
      business_expenses: planData.business_expenses,
      total_business_monthly: planData.total_business_monthly,
      goals: planData.goals,
      total_goals_monthly: planData.total_goals_monthly,
      grand_total_monthly: planData.grand_total_monthly,
      grand_total_monthly_usd: planData.grand_total_monthly_usd,
      avg_ticket: planData.avg_ticket,
      ticket_currency: planData.ticket_currency,
      commission_pct: planData.commission_pct,
      agent_split_pct: planData.agent_split_pct,
      commission_per_close: planData.commission_per_close,
      closes_needed_monthly: planData.closes_needed_monthly,
      conversion_ratios: planData.conversion_ratios,
      monthly_targets: planData.monthly_targets,
      weekly_targets: planData.weekly_targets,
      monthly_targets_by_month: planData.monthly_targets_by_month || [],
      target_portfolio_size: planData.target_portfolio_size || 25,
      plan_start_date: planData.plan_start_date || '',
      status: planData.status || 'draft',
    };

    try {
      const { error } = await supabase
        .from('business_plans')
        .upsert(payload, { onConflict: 'agent_email,plan_year' });
      
      if (error) {
        console.warn('Supabase save failed, saving to localStorage:', error.message);
      }
    } catch (e) {
      console.warn('Supabase unavailable, saving to localStorage:', e.message);
    }

    // Always save to localStorage as backup + for OKR integration
    localStorage.setItem(getPlanKey(queriedYear), JSON.stringify(planData));
    localStorage.setItem(getOkrPlanKey(queriedYear), JSON.stringify({
      monthly_targets: planData.monthly_targets || {},
      weekly_targets: planData.weekly_targets || {},
      monthly_targets_by_month: planData.monthly_targets_by_month || [],
      plan_start_date: planData.plan_start_date || '',
      target_portfolio_size: planData.target_portfolio_size || 25,
    }));
  }, [queriedYear]);

  const handleComplete = useCallback(async (planData) => {
    await handleSave({ ...planData, status: 'active', completed_at: new Date().toISOString() });
    // Navigate back to OKR
    window.location.href = '/';
  }, [handleSave]);

  const handleSaveDraft = useCallback(async (planData) => {
    await handleSave({ ...planData, status: 'draft' });
  }, [handleSave]);

  if (loading) {
    return (
      <>
        <TopNav titleKey="pw_page_title" subtitleKey="pw_page_subtitle" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-400 dark:text-gray-500 text-sm font-bold uppercase tracking-widest">
            {t('pw_saving')}...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav titleKey="pw_page_title" subtitleKey="pw_page_subtitle" />
      <PlanWizard
        key={queriedYear}
        existingPlan={existingPlan}
        queriedYear={queriedYear}
        onComplete={handleComplete}
        onSaveDraft={handleSaveDraft}
      />
    </>
  );
}
