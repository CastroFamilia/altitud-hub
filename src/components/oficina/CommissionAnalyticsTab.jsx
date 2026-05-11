"use client";

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';

/* ═══════════════════════════════════════════════════════════════
   BROKER COMMISSION ANALYTICS TAB
   Revenue summary, agent leaderboard, tier management,
   transaction table with payout workflow.
   ═══════════════════════════════════════════════════════════════ */

const STATUS_STYLES = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  processing: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  paid:       'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  partial:    'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
};

const TIER_COLORS = {
  premium: 'from-amber-400 to-amber-600',
  gold: 'from-blue-400 to-blue-600',
  standard: 'from-teal-400 to-teal-600',
  starter: 'from-slate-400 to-slate-600',
};

export default function CommissionAnalyticsTab({ profiles = [] }) {
  const { t, lang } = useApp();
  const { supabase } = useAuth();

  const [commissions, setCommissions] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [timeframe, setTimeframe] = useState('ytd');
  const [tierModal, setTierModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: c }, { data: ti }] = await Promise.all([
          supabase
            .from('agent_commissions')
            .select('*, properties(name, listing_title_es, unparsed_address), profiles!agent_commissions_agent_id_fkey(full_name, avatar_url, commission_tier_id)')
            .order('closing_date', { ascending: false }),
          supabase.from('commission_tiers').select('*').eq('active', true).order('sort_order'),
        ]);
        if (c) setCommissions(c);
        if (ti) setTiers(ti);
      } catch (err) {
        console.error('CommAnalytics load:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase]);

  // ── Aggregates ──
  const dateRange = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    
    switch (timeframe) {
      case 'this_month': {
        const start = new Date(y, m, 1).toISOString().slice(0,10);
        const end = new Date(y, m + 1, 0).toISOString().slice(0,10);
        return { start, end };
      }
      case 'last_month': {
        const start = new Date(y, m - 1, 1).toISOString().slice(0,10);
        const end = new Date(y, m, 0).toISOString().slice(0,10);
        return { start, end };
      }
      case 'next_month': {
        const start = new Date(y, m + 1, 1).toISOString().slice(0,10);
        const end = new Date(y, m + 2, 0).toISOString().slice(0,10);
        return { start, end };
      }
      case 'all': {
        return { start: '1900-01-01', end: '2100-12-31' };
      }
      case 'ytd':
      default: {
        const start = `${y}-01-01`;
        const end = new Date(y, 11, 31).toISOString().slice(0,10);
        return { start, end };
      }
    }
  }, [timeframe]);

  const getTimeframeLabel = (tf) => {
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const m = new Date().getMonth();
    if (tf === 'this_month') return monthNames[m];
    if (tf === 'last_month') return monthNames[(m - 1 + 12) % 12];
    if (tf === 'next_month') return monthNames[(m + 1) % 12];
    if (tf === 'ytd') return 'YTD - Año a la Fecha';
    if (tf === 'all') return 'Total';
    return tf;
  };

  const activeData = useMemo(() => {
    return commissions.filter(c => c.closing_date >= dateRange.start && c.closing_date <= dateRange.end);
  }, [commissions, dateRange]);

  const totalGross = activeData.reduce((s, c) => s + (Number(c.gross_commission) || 0), 0);
  const officeShare = activeData.reduce((s, c) => s + (Number(c.office_amount) || 0), 0);
  const agentShare = activeData.reduce((s, c) => s + (Number(c.agent_amount) || 0), 0);
  const rccaTotal = activeData.reduce((s, c) => s + (Number(c.rcca_fee_amount) || 0), 0);

  // ── Agent Leaderboard ──
  const leaderboard = useMemo(() => {
    const map = {};
    activeData.forEach(c => {
      if (!map[c.agent_id]) map[c.agent_id] = { id: c.agent_id, name: c.profiles?.full_name || '—', avatar: c.profiles?.avatar_url, tierId: c.profiles?.commission_tier_id, earned: 0, closings: 0 };
      map[c.agent_id].earned += Number(c.agent_amount) || 0;
      map[c.agent_id].closings += 1;
    });
    return Object.values(map).sort((a, b) => b.earned - a.earned);
  }, [activeData]);

  // ── Tier Distribution ──
  const tierDist = useMemo(() => {
    const map = {};
    tiers.forEach(t => { map[t.id] = { ...t, count: 0 }; });
    profiles.forEach(p => {
      if (p.commission_tier_id && map[p.commission_tier_id]) map[p.commission_tier_id].count++;
    });
    return Object.values(map);
  }, [tiers, profiles]);

  // ── Filtered Transactions ──
  const filtered = commissions.filter(c => {
    if (filterAgent && c.agent_id !== filterAgent) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  // ── Update Commission Status ──
  const updateStatus = async (id, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'paid') updates.payment_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('agent_commissions').update(updates).eq('id', id);
    if (!error) setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // ── Change Agent Tier ──
  const handleTierChange = async (profileId, newTierId) => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ commission_tier_id: newTierId }).eq('id', profileId);
    if (!error) {
      alert(t('ofc_comm_saved'));
      setTierModal(null);
    }
    setSaving(false);
  };

  const uniqueAgents = useMemo(() => {
    const seen = new Set();
    return commissions.reduce((arr, c) => {
      if (c.agent_id && !seen.has(c.agent_id)) {
        seen.add(c.agent_id);
        arr.push({ id: c.agent_id, name: c.profiles?.full_name || '—' });
      }
      return arr;
    }, []);
  }, [commissions]);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8">
    
      {/* ── Timeframe Filter ── */}
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Periodo</span>
        <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm focus:ring-2 focus:ring-nexus-blue outline-none transition-all">
          <option value="this_month">{getTimeframeLabel('this_month')}</option>
          <option value="last_month">{getTimeframeLabel('last_month')}</option>
          <option value="ytd">{getTimeframeLabel('ytd')}</option>
          <option value="all">{getTimeframeLabel('all')}</option>
        </select>
      </div>

      {/* ── Revenue Summary ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('ofc_comm_total_gross'), val: fmt(totalGross), color: 'text-slate-900 dark:text-white', icon: '💎' },
          { label: t('ofc_comm_office_share'), val: fmt(officeShare), color: 'text-nexus-blue', icon: '🏢' },
          { label: t('ofc_comm_agent_share'), val: fmt(agentShare), color: 'text-emerald-500', icon: '👤' },
          { label: t('ofc_comm_rcca_fees'), val: fmt(rccaTotal), color: 'text-red-500', icon: '🏛️' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-200 dark:border-slate-700 group hover:shadow-lg transition-all relative overflow-hidden">
            <div className="absolute top-3 right-3 text-2xl opacity-15 group-hover:opacity-30 transition-opacity">{s.icon}</div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">{s.label}</p>
            <h3 className={`text-2xl font-black italic mt-2 ${s.color} tabular-nums`}>{s.val}</h3>
          </div>
        ))}
      </div>

      {/* ── Agent Leaderboard + Tier Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Leaderboard */}
        <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">🏆 {t('ofc_comm_leaderboard')}</h4>
          </div>
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">{t('ofc_comm_no_data')}</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[350px] overflow-y-auto">
              {leaderboard.map((a, rank) => {
                const tier = tiers.find(t => t.id === a.tierId);
                return (
                  <div key={a.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${rank < 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                      {rank + 1}
                    </span>
                    <Image src={a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=5a82bf&color=fff`} className="w-8 h-8 rounded-full object-cover" alt="" width={32} height={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                      <p className="text-[10px] text-slate-400">{a.closings} {t('ofc_comm_closings')} · {tier?.name || '—'}</p>
                    </div>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(a.earned)}</span>
                    <button onClick={() => setTierModal(a)} className="text-[9px] font-bold text-nexus-blue uppercase tracking-widest hover:underline ml-2">{t('ofc_comm_change_tier')}</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tier Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-black text-slate-900 dark:text-white mb-5 flex items-center gap-2">📊 {t('ofc_comm_tier_distribution')}</h4>
          <div className="space-y-4">
            {tierDist.map(td => {
              const maxCount = Math.max(...tierDist.map(x => x.count), 1);
              const gradClass = TIER_COLORS[td.name] || TIER_COLORS.starter;
              return (
                <div key={td.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-white capitalize">{lang === 'en' ? td.label_en : td.label_es}</span>
                    <span className="text-xs font-black text-slate-500">{td.count} {lang === 'en' ? 'agents' : 'agentes'} · {td.agent_split_pct}%</span>
                  </div>
                  <div className="w-full h-5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${gradClass} rounded-full transition-all duration-700`} style={{ width: `${Math.max((td.count / maxCount) * 100, 8)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Transaction Table ── */}
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">📋 {t('ofc_comm_all_transactions')}</h4>
          <div className="flex gap-2 flex-wrap">
            <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
              <option value="">{t('ofc_comm_filter_all')}</option>
              {uniqueAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
              <option value="">{t('ofc_comm_filter_all')}</option>
              {['pending','processing','paid','partial'].map(s => <option key={s} value={s}>{t(`comm_status_${s}`)}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">{t('ofc_comm_no_data')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/10">
                  {[t('comm_date'), t('ofc_comm_agent'), t('comm_property'), t('comm_sale_price'), t('comm_agent_amount'), t('comm_office'), t('comm_status'), ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{c.closing_date ? new Date(c.closing_date + 'T12:00:00').toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{c.profiles?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{c.properties?.listing_title_es || c.properties?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium tabular-nums">{fmt(c.sale_price)}</td>
                    <td className="px-4 py-3 text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(c.agent_amount)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-nexus-blue tabular-nums">{fmt(c.office_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[c.status] || STATUS_STYLES.pending}`}>{t(`comm_status_${c.status}`)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.status !== 'paid' && (
                        <div className="flex gap-1">
                          {c.status === 'pending' && (
                            <button onClick={() => updateStatus(c.id, 'processing')} className="text-[9px] font-bold text-blue-600 hover:underline uppercase tracking-widest">{t('ofc_comm_mark_processing')}</button>
                          )}
                          <button onClick={() => updateStatus(c.id, 'paid')} className="text-[9px] font-bold text-emerald-600 hover:underline uppercase tracking-widest ml-2">{t('ofc_comm_mark_paid')}</button>
                        </div>
                      )}
                      {c.status === 'paid' && c.payment_date && <span className="text-[10px] text-slate-400">{new Date(c.payment_date + 'T12:00:00').toLocaleDateString()}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Tier Change Modal ── */}
      {tierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setTierModal(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-8 space-y-6" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-xl font-black italic text-slate-900 dark:text-white">{t('ofc_comm_change_tier')}</h3>
              <p className="text-sm text-slate-500 mt-1">{tierModal.name}</p>
              <p className="text-[10px] text-amber-500 font-bold mt-2">⚠️ {t('ofc_comm_tier_note')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tiers.map(tier => (
                <button key={tier.id} onClick={() => handleTierChange(tierModal.id, tier.id)} disabled={saving}
                  className={`p-4 rounded-2xl border-2 transition-all text-center ${tier.id === tierModal.tierId ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-nexus-blue'}`}>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{tier.agent_split_pct}%</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 capitalize">{tier.name}</p>
                  <p className="text-[9px] text-slate-400 mt-1">${tier.monthly_fee_usd}/mo</p>
                </button>
              ))}
            </div>
            <button onClick={() => setTierModal(null)} className="w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">
              {t('ofc_manual_cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
