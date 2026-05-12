"use client";

import { useApp } from '@/lib/context';
import { formatMoney } from './PlanWizard';

const SUGGESTIONS = [
  { emoji: '🚗', key: 'pw_s4_sug_car' },
  { emoji: '✈️', key: 'pw_s4_sug_travel' },
  { emoji: '🏠', key: 'pw_s4_sug_house' },
  { emoji: '💍', key: 'pw_s4_sug_wedding' },
  { emoji: '📚', key: 'pw_s4_sug_degree' },
  { emoji: '💰', key: 'pw_s4_sug_fund' },
  { emoji: '🎓', key: 'pw_s4_sug_school' },
];

export default function StepGoals({ plan, updatePlan }) {
  const { t } = useApp();
  const goals = plan.goals || [];

  const addGoal = (name = '', emoji = '🎯') => {
    const newGoal = {
    // eslint-disable-next-line react-hooks/purity
      id: 'goal_' + Date.now(),
      name,
      emoji,
      total: 0,
      months: 12,
      monthly: 0,
    };
    updatePlan({ goals: [...goals, newGoal] });
  };

  const updateGoal = (index, field, value) => {
    const next = [...goals];
    const g = { ...next[index] };

    if (field === 'total' || field === 'months') {
      g[field] = Number(value) || 0;
      g.monthly = g.months > 0 ? Math.round(g.total / g.months) : 0;
    } else {
      g[field] = value;
    }

    next[index] = g;
    updatePlan({ goals: next });
  };

  const removeGoal = (index) => {
    updatePlan({ goals: goals.filter((_, i) => i !== index) });
  };

  const totalMonthly = goals.reduce((s, g) => s + (Number(g.monthly) || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-2xl shadow-amber-500/30 mb-4">
          <span className="text-4xl">🎯</span>
        </div>
        <h2 className="text-3xl md:text-4xl nexus-header text-gray-900 dark:text-white">
          {t('pw_s4_title')}
        </h2>
        <p className="text-base text-gray-500 dark:text-gray-400 font-medium max-w-lg mx-auto">
          {t('pw_s4_subtitle')}
        </p>
      </div>

      {/* Suggestion Chips */}
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((sug) => (
            <button
              key={sug.key}
              onClick={() => addGoal(t(sug.key), sug.emoji)}
              className="px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:scale-105 transition-all active:scale-95"
            >
              {sug.emoji} {t(sug.key)}
            </button>
          ))}
        </div>
      </div>

      {/* Goal Cards */}
      <div className="max-w-2xl mx-auto space-y-4">
        {goals.map((goal, i) => (
          <div
            key={goal.id || i}
            className="bg-white dark:bg-dark-panel rounded-3xl shadow-lg border border-gray-200 dark:border-dark-border p-5 space-y-4 group hover:shadow-xl transition-all"
            style={{ animation: 'fadeIn 0.3s ease-out' }}
          >
            {/* Top row — emoji, name, remove */}
            <div className="flex items-center gap-3">
              <span className="text-3xl">{goal.emoji}</span>
              <input
                type="text"
                value={goal.name}
                onChange={(e) => updateGoal(i, 'name', e.target.value)}
                placeholder={t('pw_s4_name')}
                className="flex-1 text-lg font-bold text-gray-900 dark:text-white bg-transparent border-0 focus:outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
              <button
                onClick={() => removeGoal(i)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs font-medium transition-all px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                {t('pw_s4_remove')}
              </button>
            </div>

            {/* Amount + Months */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                  {t('pw_s4_amount')}
                </label>
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border px-3">
                  <span className="text-sm font-bold text-gray-400">{plan.currency === 'CRC' ? '₡' : '$'}</span>
                  <input
                    type="number"
                    min="0"
                    value={goal.total || ''}
                    onChange={(e) => updateGoal(i, 'total', e.target.value)}
                    placeholder="0"
                    className="w-full text-right text-sm font-bold bg-transparent py-2.5 text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                  {t('pw_s4_months')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={goal.months || 12}
                    onChange={(e) => updateGoal(i, 'months', e.target.value)}
                    className="flex-1 h-2 appearance-none bg-gray-200 dark:bg-dark-border rounded-full cursor-pointer accent-amber-500"
                  />
                  <span className="text-sm font-black text-gray-900 dark:text-white w-8 text-center tabular-nums">
                    {goal.months}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly calculation */}
            {goal.total > 0 && goal.months > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/5 rounded-xl p-3 border border-amber-200 dark:border-amber-800 text-center">
                <span className="text-xl font-black text-amber-700 dark:text-amber-400 italic">
                  {formatMoney(goal.monthly, plan.currency)}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-500 font-medium ml-2">
                  {t('pw_s4_per_month')} × {goal.months} {t('pw_s4_months')}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Add Goal */}
        <button
          onClick={() => addGoal()}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-800 text-amber-500 dark:text-amber-400 text-sm font-bold hover:bg-amber-50 dark:hover:bg-amber-500/5 transition-all active:scale-[0.99]"
        >
          {t('pw_s4_add')}
        </button>
      </div>

      {/* Total */}
      {goals.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-amber-500 to-yellow-400 rounded-2xl p-5 text-white shadow-xl shadow-amber-500/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">{t('pw_s4_total')}</p>
              <h3 className="text-2xl md:text-3xl font-black italic">
                {formatMoney(totalMonthly, plan.currency)}
                <span className="text-sm font-medium text-white/70 ml-1">{t('pw_s4_per_month')}</span>
              </h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
