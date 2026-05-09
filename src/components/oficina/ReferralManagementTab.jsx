"use client";

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';

/* ═══════════════════════════════════════════════════════════════
   BROKER REFERRAL MANAGEMENT TAB
   Office-wide view of all referrals with fee tracking,
   status management, and "Referred by" labels.
   ═══════════════════════════════════════════════════════════════ */

const STATUS_STYLES = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  active:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  closed:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  paid:      'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
};

export default function ReferralManagementTab({ profiles = [] }) {
  const { t } = useApp();
  const { supabase } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDir, setFilterDir] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAgent, setFilterAgent] = useState('');

  const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('agent_referrals')
          .select('*, referring_profile:profiles!agent_referrals_referring_agent_id_fkey(full_name, avatar_url, office), receiving_profile:profiles!agent_referrals_receiving_agent_id_fkey(full_name, avatar_url, office)')
          .order('created_at', { ascending: false });
        if (data) setReferrals(data);
      } catch (err) {
        console.error('Broker referrals load:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase]);

  // Aggregates
  const totalSent = referrals.filter(r => r.direction === 'sent').length;
  const totalReceived = referrals.filter(r => r.direction === 'received').length;
  const pendingFees = referrals.filter(r => r.status === 'closed').reduce((s, r) => s + (Number(r.referral_fee_amount) || 0), 0);
  const paidFees = referrals.filter(r => r.status === 'paid').reduce((s, r) => s + (Number(r.referral_fee_amount) || 0), 0);

  // Unique agents for filter
  const uniqueAgents = useMemo(() => {
    const seen = new Set();
    return referrals.reduce((arr, r) => {
      const addAgent = (id, name) => { if (id && !seen.has(id)) { seen.add(id); arr.push({ id, name }); } };
      addAgent(r.referring_agent_id, r.referring_profile?.full_name || r.referring_agent_name);
      addAgent(r.receiving_agent_id, r.receiving_profile?.full_name || r.receiving_agent_name);
      return arr;
    }, []);
  }, [referrals]);

  // Filtered
  const filtered = referrals.filter(r => {
    if (filterDir && r.direction !== filterDir) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterAgent && r.referring_agent_id !== filterAgent && r.receiving_agent_id !== filterAgent) return false;
    return true;
  });

  // Update status
  const updateStatus = async (id, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'paid') updates.payment_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('agent_referrals').update(updates).eq('id', id);
    if (!error) setReferrals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('ref_total_sent'), val: totalSent, color: 'text-blue-600 dark:text-blue-400', icon: '📤' },
          { label: t('ref_total_received'), val: totalReceived, color: 'text-purple-600 dark:text-purple-400', icon: '📥' },
          { label: t('ref_pending_fees'), val: fmt(pendingFees), color: 'text-amber-600 dark:text-amber-400', icon: '⏳' },
          { label: t('ref_total_paid'), val: fmt(paidFees), color: 'text-emerald-600 dark:text-emerald-400', icon: '✅' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-200 dark:border-slate-700 group hover:shadow-lg transition-all relative overflow-hidden">
            <div className="absolute top-3 right-3 text-2xl opacity-15 group-hover:opacity-30 transition-opacity">{s.icon}</div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">{s.label}</p>
            <h3 className={`text-2xl font-black italic mt-2 ${s.color} tabular-nums`}>{s.val}</h3>
          </div>
        ))}
      </div>

      {/* ── Referral Table ── */}
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">🔗 {t('ref_title')}</h4>
          <div className="flex gap-2 flex-wrap">
            <select value={filterDir} onChange={e => setFilterDir(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
              <option value="">{t('ref_filter_all')}</option>
              <option value="sent">{t('ref_sent')}</option>
              <option value="received">{t('ref_received')}</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
              <option value="">{t('ref_filter_all')}</option>
              {['pending','active','closed','paid','cancelled'].map(s => <option key={s} value={s}>{t(`ref_status_${s}`)}</option>)}
            </select>
            <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
              <option value="">{t('ofc_comm_filter_all')}</option>
              {uniqueAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">{t('ref_no_data')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/10">
                  {['', t('ref_client'), t('ref_referring_agent'), t('ref_receiving_agent'), t('ref_fee_pct'), t('ref_fee_amount'), t('comm_status'), ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map(r => {
                  const refName = r.referring_profile?.full_name || r.referring_agent_name || '—';
                  const recName = r.receiving_profile?.full_name || r.receiving_agent_name || '—';
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-lg">{r.direction === 'sent' ? '📤' : '📥'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.client_name}</p>
                        {r.property_address && <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{r.property_address}</p>}
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[9px] font-bold border border-amber-200 dark:border-amber-500/20">
                          🔗 {t('ref_referred_by')} {refName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{refName}</p>
                        <p className="text-[10px] text-slate-400">{r.referring_office || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{recName}</p>
                        <p className="text-[10px] text-slate-400">{r.receiving_office || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold tabular-nums">{r.referral_fee_pct}%</td>
                      <td className="px-4 py-3 text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {r.referral_fee_amount > 0 ? fmt(r.referral_fee_amount) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                          {t(`ref_status_${r.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status !== 'paid' && r.status !== 'cancelled' && (
                          <div className="flex flex-col gap-1">
                            {r.status === 'pending' && (
                              <button onClick={() => updateStatus(r.id, 'active')} className="text-[9px] font-bold text-blue-600 hover:underline uppercase tracking-widest">{t('ref_mark_active')}</button>
                            )}
                            {r.status === 'active' && (
                              <button onClick={() => updateStatus(r.id, 'closed')} className="text-[9px] font-bold text-emerald-600 hover:underline uppercase tracking-widest">{t('ref_mark_closed')}</button>
                            )}
                            {r.status === 'closed' && (
                              <button onClick={() => updateStatus(r.id, 'paid')} className="text-[9px] font-bold text-green-600 hover:underline uppercase tracking-widest">{t('ref_mark_paid')}</button>
                            )}
                          </div>
                        )}
                        {r.status === 'paid' && r.payment_date && <span className="text-[10px] text-slate-400">{new Date(r.payment_date + 'T12:00:00').toLocaleDateString()}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fee Note */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20">
        <span className="text-xl">💡</span>
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{t('ref_25pct_note')}</p>
      </div>
    </div>
  );
}
