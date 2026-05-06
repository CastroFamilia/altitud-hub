"use client";

import { useMemo } from 'react';

/* ═══════════════════════════════════════════
   LISTING VELOCITY PANEL — Broker Analytics
   ═══════════════════════════════════════════ */

const STAGE_PAIRS = [
  { from: 'contact_created_at', to: 'prelisting_at', labelKey: 'lpt_stage_prelisting', icon: '📋', color: 'bg-violet-500' },
  { from: 'prelisting_at', to: 'cma_created_at', labelKey: 'lpt_stage_cma', icon: '📊', color: 'bg-blue-500' },
  { from: 'cma_created_at', to: 'listing_created_at', labelKey: 'lpt_stage_listing', icon: '🏠', color: 'bg-cyan-500' },
  { from: 'listing_created_at', to: 'photos_requested_at', labelKey: 'lpt_stage_photos_req', icon: '📸', color: 'bg-amber-500' },
  { from: 'photos_requested_at', to: 'photos_ready_at', labelKey: 'lpt_stage_photos_ready', icon: '✅', color: 'bg-emerald-500' },
  { from: 'photos_ready_at', to: 'authorization_signed_at', labelKey: 'lpt_stage_auth', icon: '✍️', color: 'bg-teal-500' },
  { from: 'authorization_signed_at', to: 'submitted_at', labelKey: 'lpt_stage_submitted', icon: '📤', color: 'bg-orange-500' },
  { from: 'submitted_at', to: 'broker_approved_at', labelKey: 'lpt_stage_approved', icon: '🔎', color: 'bg-green-500' },
  { from: 'broker_approved_at', to: 'published_at', labelKey: 'lpt_stage_published', icon: '🚀', color: 'bg-indigo-500' },
];

function daysBetween(d1, d2) {
  if (!d1 || !d2) return null;
  return Math.max(0, Math.round((new Date(d2) - new Date(d1)) / 86400000));
}
function daysSince(d) {
  if (!d) return null;
  return Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 86400000));
}

const STAGE_ORDER = [
  { key: 'published_at', label: 'lpt_stage_published' },
  { key: 'broker_approved_at', label: 'lpt_stage_approved' },
  { key: 'submitted_at', label: 'lpt_stage_submitted' },
  { key: 'authorization_signed_at', label: 'lpt_stage_auth' },
  { key: 'photos_ready_at', label: 'lpt_stage_photos_ready' },
  { key: 'photos_requested_at', label: 'lpt_stage_photos_req' },
  { key: 'listing_created_at', label: 'lpt_stage_listing' },
  { key: 'cma_created_at', label: 'lpt_stage_cma' },
  { key: 'prelisting_at', label: 'lpt_stage_prelisting' },
  { key: 'contact_created_at', label: 'lpt_stage_contact' },
];

function getCurrentStage(m) {
  for (const s of STAGE_ORDER) {
    if (m[s.key]) return { key: s.key, label: s.label, date: m[s.key] };
  }
  return null;
}

export default function ListingVelocityPanel({ t, lang, milestones = [], profiles = [] }) {
  const stageAverages = useMemo(() => {
    return STAGE_PAIRS.map(pair => {
      const deltas = milestones.map(m => daysBetween(m[pair.from], m[pair.to])).filter(d => d !== null);
      const avg = deltas.length > 0 ? (deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;
      return { ...pair, avg: avg !== null ? Math.round(avg * 10) / 10 : null, count: deltas.length };
    });
  }, [milestones]);

  const overallAvg = useMemo(() => {
    const deltas = milestones.map(m => daysBetween(m.contact_created_at || m.listing_created_at, m.published_at)).filter(d => d !== null);
    if (!deltas.length) return null;
    return Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10;
  }, [milestones]);

  const bottleneck = useMemo(() => {
    const valid = stageAverages.filter(s => s.avg !== null && s.avg > 0);
    if (!valid.length) return null;
    return valid.reduce((mx, s) => s.avg > mx.avg ? s : mx, valid[0]);
  }, [stageAverages]);

  const agentVelocity = useMemo(() => {
    const byAgent = {};
    milestones.forEach(m => { if (!byAgent[m.agent_id]) byAgent[m.agent_id] = []; byAgent[m.agent_id].push(m); });
    return Object.entries(byAgent).map(([aid, recs]) => {
      const p = profiles.find(x => x.auth_user_id === aid || x.id === aid);
      const ds = recs.map(m => daysBetween(m.contact_created_at || m.listing_created_at, m.published_at)).filter(d => d !== null);
      const avg = ds.length ? Math.round((ds.reduce((a, b) => a + b, 0) / ds.length) * 10) / 10 : null;
      let slowest = null, sAvg = 0;
      STAGE_PAIRS.forEach(pr => {
        const dd = recs.map(m => daysBetween(m[pr.from], m[pr.to])).filter(d => d !== null);
        const a = dd.length ? dd.reduce((x, y) => x + y, 0) / dd.length : 0;
        if (a > sAvg) { sAvg = a; slowest = pr; }
      });
      return { agentId: aid, name: p?.full_name || '?', avatar: p?.avatar_url, count: recs.length, avgTotal: avg, slowest: slowest ? { label: slowest.labelKey, avg: Math.round(sAvg * 10) / 10 } : null };
    }).sort((a, b) => (a.avgTotal || 999) - (b.avgTotal || 999));
  }, [milestones, profiles]);

  const activePipeline = useMemo(() => {
    return milestones.filter(m => !m.published_at).map(m => {
      const stage = getCurrentStage(m);
      const p = profiles.find(x => x.auth_user_id === m.agent_id || x.id === m.agent_id);
      return { ...m, currentStage: stage, stuckDays: stage ? daysSince(stage.date) : null, agentName: p?.full_name || '?' };
    }).sort((a, b) => (b.stuckDays || 0) - (a.stuckDays || 0)).slice(0, 10);
  }, [milestones, profiles]);

  const maxAvg = Math.max(...stageAverages.map(s => s.avg || 0), 1);

  if (!milestones.length) {
    return (
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
          <span>⏱️</span> {t('lpt_velocity_title')}
        </h4>
        <p className="text-[9px] text-slate-400 mb-4">{t('lpt_velocity_subtitle')}</p>
        <div className="h-24 flex items-center justify-center text-xs text-slate-400 italic">{t('lpt_no_data')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + KPI + Stage bars */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span>⏱️</span> {t('lpt_velocity_title')}
            </h4>
            <p className="text-[9px] text-slate-400">{t('lpt_velocity_subtitle')}</p>
          </div>
          {overallAvg !== null && (
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{overallAvg}</p>
              <p className="text-[9px] text-slate-400 uppercase font-bold">{t('lpt_avg_days')}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {stageAverages.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm w-5 text-center">{s.icon}</span>
              <div className="w-28 md:w-36 shrink-0 text-right">
                <span className="text-[9px] md:text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate block">{t(s.labelKey)}</span>
              </div>
              <div className="flex-1">
                <div className="w-full h-5 bg-slate-100 dark:bg-slate-700/50 rounded-md overflow-hidden">
                  <div className={`h-full rounded-md transition-all duration-700 ${s.color} ${s.avg === null ? 'opacity-20' : 'opacity-80 hover:opacity-100'}`}
                    style={{ width: s.avg !== null ? `${Math.max((s.avg / maxAvg) * 100, 6)}%` : '3%' }} />
                </div>
              </div>
              <span className={`text-xs font-black tabular-nums w-12 text-right ${s.avg !== null && bottleneck && s.labelKey === bottleneck.labelKey ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
                {s.avg !== null ? `${s.avg}d` : '—'}
              </span>
            </div>
          ))}
        </div>

        {bottleneck && bottleneck.avg > 2 && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{t('lpt_bottleneck')}: {bottleneck.icon} {t(bottleneck.labelKey)}</p>
              <p className="text-[10px] text-red-600 dark:text-red-500">{t('lpt_bottleneck_alert').replace('{days}', bottleneck.avg)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Per-Agent Table */}
      {agentVelocity.length > 0 && (
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>👥</span> {t('lpt_per_agent')}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('lpt_agent')}</th>
                  <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">#</th>
                  <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">{t('lpt_avg_total')}</th>
                  <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">{t('lpt_slowest_stage')}</th>
                </tr>
              </thead>
              <tbody>
                {agentVelocity.map(a => (
                  <tr key={a.agentId} className="border-b border-slate-100 dark:border-slate-700/30 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/5">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <img src={a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=5a82bf&color=fff&size=28`} alt="" className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-600 object-cover" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{a.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">{a.count}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-sm font-black tabular-nums ${a.avgTotal !== null ? (a.avgTotal <= 14 ? 'text-emerald-500' : a.avgTotal <= 30 ? 'text-amber-500' : 'text-red-500') : 'text-slate-400'}`}>
                        {a.avgTotal !== null ? `${a.avgTotal}d` : '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 hidden sm:table-cell">
                      {a.slowest ? <span className="text-[10px] font-semibold text-slate-500">{t(a.slowest.label)} ({a.slowest.avg}d)</span> : <span className="text-[10px] text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Pipeline */}
      {activePipeline.length > 0 && (
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>📦</span> {t('lpt_active_pipeline')}
          </h4>
          <div className="space-y-2">
            {activePipeline.map((item, i) => (
              <div key={item.id || i} className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/30">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px] md:max-w-[200px]">{item.agentName}</span>
                  {item.currentStage && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">
                      {t('lpt_stuck_at')} {t(item.currentStage.label)}
                    </span>
                  )}
                </div>
                {item.stuckDays !== null && (
                  <span className={`text-xs font-black tabular-nums shrink-0 ${item.stuckDays > 7 ? 'text-red-500' : item.stuckDays > 3 ? 'text-amber-500' : 'text-slate-500'}`}>
                    {t('lpt_for_days').replace('{n}', item.stuckDays)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
