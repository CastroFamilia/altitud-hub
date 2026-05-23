"use client";

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════════
   AGENT COMMISSIONS PANEL
   Shows YTD summary, current tier, commission history table
   with expandable breakdowns, and monthly trend chart.
   ═══════════════════════════════════════════════════════════════ */

const MONTH_NAMES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_STYLES = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  processing: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  paid:       'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  partial:    'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
};

function MiniBarChart({ data, labels, color = 'bg-emerald-500' }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold text-slate-500 tabular-nums">
            {val > 0 ? `$${(val / 1000).toFixed(0)}k` : '—'}
          </span>
          <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-t-md overflow-hidden flex-1 flex items-end">
            <div
              className={`w-full ${color} rounded-t-md transition-all duration-700 ease-out opacity-85 hover:opacity-100`}
              style={{ height: `${Math.max((val / max) * 100, 4)}%` }}
            />
          </div>
          <span className="text-[8px] font-bold text-slate-400 uppercase">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function AgentCommissionsPanel({ initialCommissions = [], initialTiers = [] }) {
  const { t, lang } = useApp();
  const { profile } = useAuth();
  const [commissions, setCommissions] = useState(initialCommissions);
  const [tiers, setTiers] = useState(initialTiers);
  const [loading, setLoading] = useState(initialCommissions.length === 0);
  const [expandedId, setExpandedId] = useState(null);

  // Load data client-side if not from SSR
  useEffect(() => {
    if (initialCommissions.length > 0 && initialTiers.length > 0) return;
    if (!profile?.id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [{ data: c }, { data: t }] = await Promise.all([
          supabase
            .from('agent_commissions')
            .select('*, properties(name, listing_title_es, listing_title_en, unparsed_address)')
            .eq('agent_id', profile.id)
            .order('closing_date', { ascending: false }),
          supabase
            .from('commission_tiers')
            .select('*')
            .eq('active', true)
            .order('sort_order'),
        ]);
        if (c) setCommissions(c);
        if (t) setTiers(t);
      } catch (err) {
        console.error('CommissionsPanel load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [profile?.id, initialCommissions.length, initialTiers.length]);

  const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // ── Stats ──
  const now = useMemo(() => new Date(), []);
  const yearStart = `${now.getFullYear()}-01-01`;
  const ytdCommissions = commissions.filter(c => c.closing_date >= yearStart);

  const earned = ytdCommissions
    .filter(c => c.status === 'paid')
    .reduce((s, c) => s + (Number(c.agent_amount) || 0), 0);

  const pending = ytdCommissions
    .filter(c => c.status === 'pending' || c.status === 'processing')
    .reduce((s, c) => s + (Number(c.agent_amount) || 0), 0);

  const totalClosings = ytdCommissions.length;
  const avgPerClose = totalClosings > 0
    ? ytdCommissions.reduce((s, c) => s + (Number(c.agent_amount) || 0), 0) / totalClosings
    : 0;

  // ── Agent's current tier ──
  const agentTier = tiers.find(t => t.id === profile?.commission_tier_id) || tiers.find(t => t.name === 'starter');

  // ── Monthly Trend (last 6 months) ──
  const monthLabels = lang === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  const monthlyTrend = useMemo(() => {
    const data = [];
    const labels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const total = commissions
        .filter(c => c.closing_date?.startsWith(monthStr) && c.status === 'paid')
        .reduce((s, c) => s + (Number(c.agent_amount) || 0), 0);
      data.push(total);
      labels.push(monthLabels[d.getMonth()]);
    }
    return { data, labels };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commissions, monthLabels]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('comm_ytd_earned'), value: fmt(earned), color: 'text-emerald-600 dark:text-emerald-400', icon: '💰' },
          { label: t('comm_pending'), value: fmt(pending), color: 'text-amber-600 dark:text-amber-400', icon: '⏳' },
          { label: t('comm_total_closings'), value: totalClosings, color: 'text-slate-900 dark:text-white', icon: '📊' },
          { label: t('comm_avg_per_close'), value: fmt(avgPerClose), color: 'text-blue-600 dark:text-blue-400', icon: '📈' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
            <div className="absolute top-3 right-3 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">{s.icon}</div>
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">{s.label}</p>
            <h3 className={`text-2xl font-black italic mt-2 ${s.color} tabular-nums`}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* ── Current Tier Card ── */}
      {agentTier && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-3xl font-black text-emerald-400">{agentTier.agent_split_pct}%</span>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{t('comm_your_tier')}</p>
              <h3 className="text-xl font-black text-white capitalize mt-0.5">{lang === 'en' ? agentTier.label_en : agentTier.label_es}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {t('comm_monthly_fee')}: ${agentTier.monthly_fee_usd} {t('comm_plus_iva')} · {t('comm_your_split')}: {agentTier.agent_split_pct}%
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {tiers.map(tier => (
              <div
                key={tier.id}
                className={`px-3 py-2 rounded-xl text-center border transition-all ${
                  tier.id === agentTier.id
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-slate-500'
                }`}
              >
                <p className="text-lg font-black">{tier.agent_split_pct}%</p>
                <p className="text-[8px] uppercase tracking-widest font-bold mt-0.5">{tier.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Monthly Trend ── */}
      {monthlyTrend.data.some(v => v > 0) && (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-white/10 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
            {t('comm_trend_title')} — {t('comm_paid')}
          </h4>
          <MiniBarChart data={monthlyTrend.data} labels={monthlyTrend.labels} />
        </div>
      )}

      {/* ── Commission History Table ── */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            💰 {t('comm_history_title')}
          </h3>
        </div>

        {commissions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4 opacity-30">💰</div>
            <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">{t('comm_no_commissions')}</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">{t('comm_no_commissions_desc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/10">
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('comm_date')}</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('comm_property')}</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('comm_sale_price')}</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('comm_side')}</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('comm_split')}</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">{t('comm_agent_amount')}</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('comm_status')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {commissions.map(c => {
                  const propTitle = c.properties
                    ? (lang === 'en' ? c.properties.listing_title_en : c.properties.listing_title_es) || c.properties.name || c.properties.unparsed_address
                    : '—';
                  const isExpanded = expandedId === c.id;
                  const sideLabel = c.side === 'listing' ? (t('auto_listing'))
                    : c.side === 'selling' ? (t('auto_selling'))
                    : (t('auto_both'));
                  const statusKey = `comm_status_${c.status}`;

                  return (
                    <>
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                          {c.closing_date ? new Date(c.closing_date + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-CR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">{propTitle}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white tabular-nums">{fmt(c.sale_price)}</td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{sideLabel}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{c.agent_split_pct}%</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(c.agent_amount)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[c.status] || STATUS_STYLES.pending}`}>
                            {t(statusKey)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline uppercase tracking-widest"
                          >
                            {isExpanded ? '▲' : t('comm_breakdown')}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${c.id}-detail`}>
                          <td colSpan="8" className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">{t('comm_gross')}</p>
                                <p className="font-bold text-slate-900 dark:text-white">{fmt(c.gross_commission)}</p>
                                <p className="text-[10px] text-slate-400">{c.total_commission_pct}% {t('auto_of_sale')}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">{t('comm_side_amount')}</p>
                                <p className="font-bold text-slate-900 dark:text-white">{fmt(c.side_amount)}</p>
                                <p className="text-[10px] text-slate-400">{c.side_pct}% {t('auto_of_gross')}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-red-400 uppercase font-bold tracking-widest mb-1">{t('comm_rcca')}</p>
                                <p className="font-bold text-red-500">-{fmt(c.rcca_fee_amount)}</p>
                                <p className="text-[10px] text-slate-400">{c.rcca_fee_pct}%</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-blue-400 uppercase font-bold tracking-widest mb-1">{t('comm_office')}</p>
                                <p className="font-bold text-blue-500">{fmt(c.office_amount)}</p>
                                <p className="text-[10px] text-slate-400">{Math.round(100 - c.agent_split_pct)}%</p>
                              </div>
                              {c.referral_pct > 0 && (
                                <div>
                                  <p className="text-[9px] text-amber-400 uppercase font-bold tracking-widest mb-1">{t('comm_referral')}</p>
                                  <p className="font-bold text-amber-500">-{fmt(c.referral_amount)}</p>
                                  <p className="text-[10px] text-slate-400">{c.referral_pct}% → {c.referral_agent || '—'}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
