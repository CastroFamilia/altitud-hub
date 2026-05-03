"use client";

import { useState, useMemo } from 'react';

/* ═══════════════════════════════════════
   DASHBOARD TAB — Office Metrics & KPIs
   ═══════════════════════════════════════ */

const MONTH_NAMES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ label, value, color = 'text-slate-900 dark:text-white', subtitle, icon }) {
  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 shadow-sm border border-slate-200/60 dark:border-slate-700/50 group hover:shadow-lg hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">{label}</p>
          <h3 className={`text-2xl font-black italic mt-1.5 ${color} tabular-nums`}>{value}</h3>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 transition-colors">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniBarChart({ data, labels, lang, color = 'bg-nexus-blue' }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold text-slate-500 tabular-nums">{val}</span>
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

function GaugeBar({ label, value, max, color = 'bg-emerald-500', prefix = '$' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{prefix}{value.toLocaleString()}</span>
      </div>
      <div className="w-full h-3 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardTab({ t, lang, profiles, teams, listings, reservations, commissions, config, loading, selectedOffice }) {
  const [olympiaInsight, setOlympiaInsight] = useState(null);
  const [olympiaLoading, setOlympiaLoading] = useState(false);

  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // ── Agent Metrics ──
  const officeProfiles = profiles.filter(p => p.office === selectedOffice && p.role !== 'broker');
  const totalAgents = officeProfiles.length;
  const ltOneYear = officeProfiles.filter(p => p.start_date && new Date(p.start_date) > oneYearAgo).length;
  const gtOneYear = officeProfiles.filter(p => !p.start_date || new Date(p.start_date) <= oneYearAgo).length;
  const teamsCount = teams.filter(t => t.office === selectedOffice).length;

  // Split tiers
  const splitTiers = useMemo(() => {
    const tiers = config?.split_tiers || ['45/55', '60/40', '80/20'];
    let parsed = tiers;
    if (typeof tiers === 'string') try { parsed = JSON.parse(tiers); } catch { parsed = ['45/55', '60/40', '80/20']; }
    return parsed.map(tier => ({
      tier,
      count: officeProfiles.filter(p => p.commission_split === tier).length
    }));
  }, [officeProfiles, config]);

  // Poverty line
  const povertyLine = useMemo(() => {
    if (!config?.poverty_line) return { amount: 1000, currency: 'USD' };
    if (typeof config.poverty_line === 'string') try { return JSON.parse(config.poverty_line); } catch { return { amount: 1000, currency: 'USD' }; }
    return config.poverty_line;
  }, [config]);

  // Calculate agents above poverty line (based on last month's commissions)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const agentsAbovePoverty = useMemo(() => {
    if (!commissions.length) return 0;
    const byAgent = {};
    commissions.forEach(c => {
      const cd = new Date(c.close_date);
      if (cd >= lastMonthStart && cd <= lastMonthEnd) {
        byAgent[c.profile_id] = (byAgent[c.profile_id] || 0) + (c.agent_commission || 0);
      }
    });
    return Object.values(byAgent).filter(v => v >= povertyLine.amount).length;
  }, [commissions, povertyLine, lastMonthStart, lastMonthEnd]);

  const povertyPct = totalAgents > 0 ? Math.round((agentsAbovePoverty / totalAgents) * 100) : 0;

  // Avg time to first transaction (months from start_date to first commission close_date)
  const avgFirstTx = useMemo(() => {
    if (!commissions.length) return '—';
    const firstTxByAgent = {};
    commissions.forEach(c => {
      if (!firstTxByAgent[c.profile_id] || new Date(c.close_date) < new Date(firstTxByAgent[c.profile_id])) {
        firstTxByAgent[c.profile_id] = c.close_date;
      }
    });
    const months = [];
    Object.entries(firstTxByAgent).forEach(([pid, closeDate]) => {
      const agent = profiles.find(p => p.id === pid);
      if (agent?.start_date) {
        const start = new Date(agent.start_date);
        const close = new Date(closeDate);
        const diff = (close.getFullYear() - start.getFullYear()) * 12 + (close.getMonth() - start.getMonth());
        if (diff >= 0) months.push(diff);
      }
    });
    if (months.length === 0) return '—';
    return (months.reduce((a, b) => a + b, 0) / months.length).toFixed(1);
  }, [commissions, profiles]);

  // ── Listings per Month (last 6 months) ──
  const monthLabels = lang === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  const listingsPerMonth = useMemo(() => {
    const data = [];
    const labels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const count = listings.filter(l => {
        const ld = new Date(l.listing_date);
        return ld >= d && ld <= end && l.office === selectedOffice;
      }).length;
      data.push(count);
      labels.push(monthLabels[d.getMonth()]);
    }
    return { data, labels };
  }, [listings, selectedOffice, now, monthLabels]);

  // ── Reservometro ──
  const pendingReservations = reservations.filter(r => r.office === selectedOffice && (r.status === 'pending' || r.status === 'signed'));
  const loiTotal = pendingReservations.filter(r => r.type === 'LOI').reduce((s, r) => s + (r.reservation_amount || 0), 0);
  const spaTotal = pendingReservations.filter(r => r.type === 'SPA').reduce((s, r) => s + (r.reservation_amount || 0), 0);
  const pipelineTotal = loiTotal + spaTotal;

  // Next 30 days
  const next30 = new Date(now);
  next30.setDate(next30.getDate() + 30);
  const next30Amount = pendingReservations.filter(r => {
    const ed = r.expected_sign_date ? new Date(r.expected_sign_date) : null;
    return ed && ed >= now && ed <= next30;
  }).reduce((s, r) => s + (r.reservation_amount || 0), 0);

  // ── Commissions Trend (last 6 months) ──
  const commissionsPerMonth = useMemo(() => {
    const data = [];
    const labels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const total = commissions.filter(c => {
        const cd = new Date(c.close_date);
        return cd >= d && cd <= end && c.office === selectedOffice;
      }).reduce((s, c) => s + (c.total_commission_amount || 0), 0);
      data.push(total);
      labels.push(monthLabels[d.getMonth()]);
    }
    return { data, labels };
  }, [commissions, selectedOffice, now, monthLabels]);

  const totalRevenue = commissions.filter(c => c.office === selectedOffice).reduce((s, c) => s + (c.total_commission_amount || 0), 0);
  const officeShare = commissions.filter(c => c.office === selectedOffice).reduce((s, c) => s + (c.office_commission || 0), 0);
  const agentShareTotal = commissions.filter(c => c.office === selectedOffice).reduce((s, c) => s + (c.agent_commission || 0), 0);

  // ── Olympia Insights ──
  const handleOlympiaInsight = async () => {
    setOlympiaLoading(true);
    try {
      const res = await fetch('/api/olympia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `As Olympia, the AI business coach for RE/MAX Altitud real estate office, analyze this office data and provide 3-4 key insights with actionable recommendations in ${lang === 'es' ? 'Spanish' : 'English'}:\n\n- Total agents: ${totalAgents}\n- Agents < 1 year: ${ltOneYear}\n- Agents > 1 year: ${gtOneYear}\n- Teams: ${teamsCount}\n- Split distribution: ${splitTiers.map(s => `${s.tier}: ${s.count}`).join(', ')}\n- Agents above baseline ($${povertyLine.amount}/mo): ${agentsAbovePoverty} (${povertyPct}%)\n- Avg months to 1st transaction: ${avgFirstTx}\n- Total pipeline (LOI+SPA): $${pipelineTotal.toLocaleString()}\n- Last 6 months commissions: ${commissionsPerMonth.data.map((v, i) => `${commissionsPerMonth.labels[i]}: $${v.toLocaleString()}`).join(', ')}\n\nFocus on: performance trends, risk alerts for underperforming agents, coaching recommendations, and office growth opportunities. Be specific and use the real data.`,
        }),
      });
      const data = await res.json();
      setOlympiaInsight(data.response || data.text || 'No insights available');
    } catch (e) {
      setOlympiaInsight('Error generating insights');
    } finally {
      setOlympiaLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">

      {/* ── Agent Summary Grid ── */}
      <div>
        <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {t('ofc_dash_agent_summary')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <StatCard label={t('ofc_dash_total_agents')} value={totalAgents} color="text-slate-900 dark:text-white" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
          <StatCard label={t('ofc_dash_lt_1year')} value={ltOneYear} color="text-amber-500" />
          <StatCard label={t('ofc_dash_gt_1year')} value={gtOneYear} color="text-emerald-500" />
          <StatCard label={t('ofc_dash_teams')} value={teamsCount} color="text-nexus-blue" />
          <StatCard label={t('ofc_dash_avg_first_tx')} value={avgFirstTx} color="text-purple-500" subtitle={avgFirstTx !== '—' ? t('ofc_dash_months') : ''} />
        </div>
      </div>

      {/* ── Split Tiers & Poverty Line ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Split Distribution */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('ofc_dash_split_tier')} — {t('ofc_dash_agent_summary')}</h4>
          <div className="space-y-3">
            {splitTiers.map(s => (
              <div key={s.tier} className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-16 tabular-nums">{s.tier}</span>
                <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-nexus-blue to-blue-400 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                    style={{ width: `${totalAgents > 0 ? Math.max((s.count / totalAgents) * 100, 8) : 8}%` }}
                  >
                    <span className="text-[10px] font-black text-white drop-shadow-sm">{s.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Poverty Line / Baseline */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('ofc_dash_poverty_line')} — ${povertyLine.amount.toLocaleString()}/{lang === 'es' ? 'mes' : 'mo'}</h4>
          <div className="flex items-center gap-6">
            <div className="relative">
              <svg width="100" height="100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={povertyPct >= 60 ? '#10b981' : povertyPct >= 30 ? '#f59e0b' : '#ef4444'} strokeWidth="8" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 - (povertyPct / 100) * 2 * Math.PI * 42} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-slate-900 dark:text-white">{povertyPct}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{agentsAbovePoverty} / {totalAgents}</p>
              <p className="text-[10px] text-slate-400">{t('ofc_dash_above_poverty')}</p>
              <p className="text-[9px] text-slate-400 mt-2 italic">
                {lang === 'es' ? `Agentes que ganan más de $${povertyLine.amount}/mes` : `Agents earning more than $${povertyLine.amount}/mo`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Listings per Month & Reservometro ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Listings per Month */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            {t('ofc_dash_listings_month')}
          </h4>
          {listingsPerMonth.data.some(v => v > 0) ? (
            <MiniBarChart data={listingsPerMonth.data} labels={listingsPerMonth.labels} lang={lang} color="bg-teal-500" />
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-slate-400 italic">{t('ofc_dash_no_data')}</div>
          )}
        </div>

        {/* Reservometro */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            {t('ofc_dash_reservometro')}
          </h4>
          <p className="text-[9px] text-slate-400 mb-4">{t('ofc_dash_reservometro_desc')}</p>
          <div className="space-y-3">
            <GaugeBar label={t('ofc_dash_loi_pipeline')} value={loiTotal} max={pipelineTotal || 1} color="bg-amber-500" />
            <GaugeBar label={t('ofc_dash_spa_pipeline')} value={spaTotal} max={pipelineTotal || 1} color="bg-emerald-500" />
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-baseline">
              <span className="text-[10px] font-bold text-slate-400 uppercase">{t('ofc_dash_expected_next')}</span>
              <span className="text-sm font-black text-nexus-blue tabular-nums">${next30Amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Commissions Trend ── */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {t('ofc_dash_commissions')}
        </h4>
        <p className="text-[9px] text-slate-400 mb-4">{t('ofc_dash_commissions_desc')}</p>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="text-center">
            <p className="text-[9px] text-slate-400 uppercase font-bold">{t('ofc_dash_total_revenue')}</p>
            <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">${totalRevenue.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-slate-400 uppercase font-bold">{t('ofc_dash_office_share')}</p>
            <p className="text-lg font-black text-nexus-blue tabular-nums">${officeShare.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-slate-400 uppercase font-bold">{t('ofc_dash_agent_share')}</p>
            <p className="text-lg font-black text-emerald-500 tabular-nums">${agentShareTotal.toLocaleString()}</p>
          </div>
        </div>

        {commissionsPerMonth.data.some(v => v > 0) ? (
          <MiniBarChart data={commissionsPerMonth.data} labels={commissionsPerMonth.labels} lang={lang} color="bg-emerald-500" />
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-slate-400 italic">{t('ofc_dash_no_data')}</div>
        )}
      </div>

      {/* ── Olympia Insights ── */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 shadow-xl border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span className="text-lg">🧠</span>
              {t('ofc_dash_olympia_title')}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">{t('ofc_dash_olympia_desc')}</p>
          </div>
          <button
            onClick={handleOlympiaInsight}
            disabled={olympiaLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 active:scale-95"
          >
            {olympiaLoading ? t('ofc_dash_olympia_loading') : t('ofc_dash_olympia_generate')}
          </button>
        </div>
        {olympiaInsight && (
          <div className="bg-white/5 rounded-xl p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap border border-white/10">
            {olympiaInsight}
          </div>
        )}
        {!olympiaInsight && !olympiaLoading && (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            {lang === 'es' ? 'Haz clic en "Generar Análisis" para que Olympia analice tu equipo' : 'Click "Generate Analysis" for Olympia to analyze your team'}
          </div>
        )}
      </div>
    </div>
  );
}
