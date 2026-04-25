"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { formatMoney, convertCurrency } from './PlanWizard';

const ICONS = { rent: '🏠', utilities: '⚡', food: '🛒', transport: '🚗', education: '📚', health: '🏥', entertainment: '🎬', savings: '💰', custom: '➕' };
const CATEGORIES = ['rent', 'utilities', 'food', 'transport', 'education', 'health', 'entertainment', 'savings'];

export default function StepLivingExpenses({ plan, updatePlan }) {
  const { t } = useApp();
  const [exchangeData, setExchangeData] = useState(null);
  const [exchangeLoading, setExchangeLoading] = useState(false);

  // Fetch exchange rate from BCCR via Hacienda API
  useEffect(() => {
    async function fetchRate() {
      setExchangeLoading(true);
      try {
        const res = await fetch('https://api.hacienda.go.cr/indicadores/tc/dolar');
        if (res.ok) {
          const data = await res.json();
          setExchangeData(data);
          // Use venta (sell) rate as the working exchange rate
          if (data?.venta?.valor) {
            updatePlan({ exchange_rate: data.venta.valor });
          }
        }
      } catch {
        // Fallback — keep the existing exchange_rate
      }
      setExchangeLoading(false);
    }
    fetchRate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize with default categories if empty
  useEffect(() => {
    if (!plan.living_expenses || plan.living_expenses.length === 0) {
      const defaults = CATEGORIES.map(cat => ({
        id: cat,
        category: cat,
        label: t(`pw_s2_cat_${cat}`),
        amount: 0,
      }));
      updatePlan({ living_expenses: defaults });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expenses = plan.living_expenses || [];
  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const otherCurrency = plan.currency === 'CRC' ? 'USD' : 'CRC';
  const converted = convertCurrency(total, plan.currency, plan.exchange_rate);

  const updateExpense = (index, field, value) => {
    const next = [...expenses];
    next[index] = { ...next[index], [field]: field === 'amount' ? (Number(value) || 0) : value };
    updatePlan({ living_expenses: next });
  };

  const addCustom = () => {
    updatePlan({
      living_expenses: [...expenses, { id: 'custom_' + Date.now(), category: 'custom', label: '', amount: 0 }],
    });
  };

  const removeExpense = (index) => {
    const next = expenses.filter((_, i) => i !== index);
    updatePlan({ living_expenses: next });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-2xl shadow-blue-500/30 mb-4">
          <span className="text-4xl">🏠</span>
        </div>
        <h2 className="text-3xl md:text-4xl nexus-header text-gray-900 dark:text-white">
          {t('pw_s2_title')}
        </h2>
        <p className="text-base text-gray-500 dark:text-gray-400 font-medium max-w-lg mx-auto">
          {t('pw_s2_subtitle')}
        </p>
      </div>

      {/* Currency Selector + Exchange Rate */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-dark-panel rounded-2xl shadow-lg border border-gray-200 dark:border-dark-border p-5 space-y-4">
          {/* Currency Toggle */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">
              {t('pw_s2_currency')}
            </label>
            <div className="flex bg-gray-100 dark:bg-dark-bg rounded-xl p-1">
              {['CRC', 'USD'].map(c => (
                <button
                  key={c}
                  onClick={() => updatePlan({ currency: c })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    plan.currency === c
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {c === 'CRC' ? '₡ Colones (CRC)' : '$ Dólares (USD)'}
                </button>
              ))}
            </div>
          </div>

          {/* Exchange Rate */}
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-500/5 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
            <div>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                {t('pw_s2_exchange')}
              </p>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                {t('pw_s2_exchange_src')}
              </p>
            </div>
            <div className="text-right">
              {exchangeLoading ? (
                <span className="text-xs text-gray-400 animate-pulse">...</span>
              ) : exchangeData ? (
                <div className="space-y-0.5">
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-medium">{t('pw_s2_exchange_buy')}:</span>
                    <span className="font-bold ml-1">₡{exchangeData.compra?.valor?.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-medium">{t('pw_s2_exchange_sell')}:</span>
                    <span className="font-bold ml-1">₡{exchangeData.venta?.valor?.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">₡1 USD =</span>
                  <input
                    type="number"
                    value={plan.exchange_rate || 530}
                    onChange={(e) => updatePlan({ exchange_rate: Number(e.target.value) || 530 })}
                    className="w-20 text-center text-sm font-bold bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg py-1 text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Items */}
      <div className="max-w-2xl mx-auto space-y-2">
        {expenses.map((exp, i) => (
          <div
            key={exp.id || i}
            className="bg-white dark:bg-dark-panel rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border p-4 flex items-center gap-3 group hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-lg shrink-0">
              {ICONS[exp.category] || '➕'}
            </div>
            <div className="flex-1 min-w-0">
              {exp.category === 'custom' ? (
                <input
                  type="text"
                  value={exp.label}
                  onChange={(e) => updateExpense(i, 'label', e.target.value)}
                  placeholder={t('pw_s2_cat_custom')}
                  className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-0 border-b border-dashed border-gray-200 dark:border-dark-border focus:outline-none focus:border-blue-400 pb-0.5"
                />
              ) : (
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t(`pw_s2_cat_${exp.category}`)}
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
                className="w-28 text-right text-sm font-bold bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl py-2 px-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
              />
            </div>
            {exp.category === 'custom' && (
              <button
                onClick={() => removeExpense(i)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}

        {/* Add Custom */}
        <button
          onClick={addCustom}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 text-blue-500 dark:text-blue-400 text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all active:scale-[0.99]"
        >
          {t('pw_s2_add')}
        </button>
      </div>

      {/* Total */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl p-5 text-white shadow-xl shadow-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">{t('pw_s2_total')}</p>
              {total > 0 && (
                <p className="text-[10px] text-white/50 mt-1">
                  {t('pw_s2_equivalent')} {formatMoney(converted, otherCurrency)}
                </p>
              )}
            </div>
            <h3 className="text-2xl md:text-3xl font-black italic">
              {formatMoney(total, plan.currency)}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}
