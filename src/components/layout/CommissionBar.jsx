"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

/* ═══════════════════════════════════════════════════════════════
   COMMISSION BAR
   YTD commission progress bar shown on the main dashboard.
   Pulls from agent_commissions table and shows earned vs target.
   ═══════════════════════════════════════════════════════════════ */

export default function CommissionBar() {
  const { t, lang } = useApp();
  const { profile } = useAuth();
  const [stats, setStats] = useState({ earned: 0, closings: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    const loadCommissions = async () => {
      try {
        // Get YTD commissions for this agent
        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

        const { data, error } = await supabase
          .from('agent_commissions')
          .select('agent_amount, status, closing_date')
          .eq('agent_id', profile.id)
          .gte('closing_date', yearStart.split('T')[0]);

        if (error) throw error;

        const earned = (data || [])
          .filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + (Number(c.agent_amount) || 0), 0);

        const pending = (data || [])
          .filter(c => c.status === 'pending' || c.status === 'processing')
          .reduce((sum, c) => sum + (Number(c.agent_amount) || 0), 0);

        setStats({
          earned,
          pending,
          closings: (data || []).length,
        });
      } catch (err) {
        console.error('Commission load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCommissions();
  }, [profile?.id]);

  // Get annual target from business plan (localStorage)
  const [annualTarget, setAnnualTarget] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const bp = localStorage.getItem('altitud_business_plan');
      if (bp) {
        const parsed = JSON.parse(bp);
    // eslint-disable-next-line react-hooks/set-state-in-effect
        setAnnualTarget(parsed.annual_income_target || parsed.income_target || 50000);
      }
    } catch { /* ignore */ }
  }, []);

  const total = stats.earned + stats.pending;
  const target = annualTarget || 50000;
  const pct = Math.min(Math.round((total / target) * 100), 100);
  const earnedPct = Math.min(Math.round((stats.earned / target) * 100), 100);

  const fmt = (n) => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  if (loading) return null;
  if (stats.closings === 0 && !annualTarget) return null; // Don't show if no data at all

  return (
    <div className="glass-panel rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">💰</span>
          <div>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
              {t('auto_ytd_commission')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {stats.closings} {t('auto_closings')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {fmt(stats.earned)}
          </p>
          {stats.pending > 0 && (
            <p className="text-[10px] text-amber-500 font-medium">
              +{fmt(stats.pending)} {t('auto_pending_1')}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden relative">
        {/* Earned (solid) */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out absolute left-0"
          style={{ width: `${earnedPct}%` }}
        />
        {/* Pending (striped) */}
        {stats.pending > 0 && (
          <div
            className="h-full rounded-r-full bg-amber-400/40 transition-all duration-1000 ease-out absolute"
            style={{
              left: `${earnedPct}%`,
              width: `${Math.min(pct - earnedPct, 100 - earnedPct)}%`,
            }}
          />
        )}
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">{pct}%</span>
        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">
          {t('auto_target')}: {fmt(target)}
        </span>
      </div>
    </div>
  );
}
