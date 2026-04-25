"use client";

import { useEffect } from 'react';
import { useApp } from '@/lib/context';
import { formatMoney, convertCurrency } from './PlanWizard';

const ICONS = { office: '🏢', signs: '🪧', gas: '⛽', phone: '📱', marketing: '📣', convention: '✈️', training: '📖', platforms: '💻', custom: '➕' };
const CATEGORIES = ['office', 'signs', 'gas', 'phone', 'marketing', 'convention', 'training', 'platforms'];

export default function StepBusinessExpenses({ plan, updatePlan }) {
  const { t } = useApp();

  // Initialize with default categories if empty
  useEffect(() => {
    if (!plan.business_expenses || plan.business_expenses.length === 0) {
      const defaults = CATEGORIES.map(cat => ({
        id: cat,
        category: cat,
        label: t(`pw_s3_cat_${cat}`),
        amount: 0,
        annual: cat === 'convention',
      }));
      updatePlan({ business_expenses: defaults });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expenses = plan.business_expenses || [];
  const livingTotal = plan.total_living_monthly || 0;
  const bizTotal = expenses.reduce((s, e) => s + (e.annual ? Math.round((Number(e.amount) || 0) / 12) : (Number(e.amount) || 0)), 0);
  const runningTotal = livingTotal + bizTotal;
  const otherCurrency = plan.currency === 'CRC' ? 'USD' : 'CRC';
  const convertedRunning = convertCurrency(runningTotal, plan.currency, plan.exchange_rate);

  const updateExpense = (index, field, value) => {
    const next = [...expenses];
    if (field === 'amount') {
      next[index] = { ...next[index], amount: Number(value) || 0 };
    } else if (field === 'annual') {
      next[index] = { ...next[index], annual: value };
    } else {
      next[index] = { ...next[index], [field]: value };
    }
    updatePlan({ business_expenses: next });
  };

  const addCustom = () => {
    updatePlan({
      business_expenses: [...expenses, { id: 'custom_' + Date.now(), category: 'custom', label: '', amount: 0, annual: false }],
    });
  };

  const removeExpense = (index) => {
    updatePlan({ business_expenses: expenses.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-2xl shadow-teal-500/30 mb-4">
          <span className="text-4xl">💼</span>
        </div>
        <h2 className="text-3xl md:text-4xl nexus-header text-gray-900 dark:text-white">
          {t('pw_s3_title')}
        </h2>
        <p className="text-base text-gray-500 dark:text-gray-400 font-medium max-w-lg mx-auto">
          {t('pw_s3_subtitle')}
        </p>
      </div>

      {/* Expense Items */}
      <div className="max-w-2xl mx-auto space-y-2">
        {expenses.map((exp, i) => {
          const monthlyEquiv = exp.annual ? Math.round((Number(exp.amount) || 0) / 12) : null;
          return (
            <div
              key={exp.id || i}
              className="bg-white dark:bg-dark-panel rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border p-4 group hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-lg shrink-0">
                  {ICONS[exp.category] || '➕'}
                </div>
                <div className="flex-1 min-w-0">
                  {exp.category === 'custom' ? (
                    <input
                      type="text"
                      value={exp.label}
                      onChange={(e) => updateExpense(i, 'label', e.target.value)}
                      placeholder={t('pw_s3_cat_custom')}
                      className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-0 border-b border-dashed border-gray-200 dark:border-dark-border focus:outline-none focus:border-teal-400 pb-0.5"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t(`pw_s3_cat_${exp.category}`)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-gray-400">{plan.currency === 'CRC' ? '₡' : '$'}</span>
                  <input
                    type="number"
                    min="0"
                    value={exp.amount || ''}
                    onChange={(e) => updateExpense(i, 'amount', e.target.value)}
                    placeholder="0"
                    className="w-28 text-right text-sm font-bold bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl py-2 px-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
                  />
                </div>
                {exp.category === 'custom' && (
                  <button onClick={() => removeExpense(i)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
              {/* Annual toggle */}
              <div className="flex items-center justify-between mt-2 pl-[52px]">
                <button
                  onClick={() => updateExpense(i, 'annual', !exp.annual)}
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all ${
                    exp.annual
                      ? 'bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {t('pw_s3_annual')}
                </button>
                {monthlyEquiv !== null && exp.amount > 0 && (
                  <span className="text-xs text-teal-600 dark:text-teal-400 font-bold">
                    = {formatMoney(monthlyEquiv, plan.currency)}{t('pw_s3_monthly_calc')}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Custom */}
        <button
          onClick={addCustom}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-teal-200 dark:border-teal-800 text-teal-500 dark:text-teal-400 text-sm font-bold hover:bg-teal-50 dark:hover:bg-teal-500/5 transition-all active:scale-[0.99]"
        >
          {t('pw_s3_add')}
        </button>
      </div>

      {/* Totals */}
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="bg-teal-50 dark:bg-teal-500/5 rounded-2xl p-4 border border-teal-200 dark:border-teal-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">{t('pw_s3_total')}</p>
            <h3 className="text-xl font-black italic text-teal-700 dark:text-teal-400">
              {formatMoney(bizTotal, plan.currency)}
            </h3>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">{t('pw_s3_running_total')}</p>
              <p className="text-[10px] text-white/40 mt-1">
                ≈ {formatMoney(convertedRunning, otherCurrency)}
              </p>
            </div>
            <h3 className="text-2xl md:text-3xl font-black italic">
              {formatMoney(runningTotal, plan.currency)}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}
