"use client";

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════════
   AGENT REFERRALS PANEL
   Shows referrals sent/received by the agent, with create modal.
   Fee is configurable (default 25%) on the gross side amount.
   ═══════════════════════════════════════════════════════════════ */

const STATUS_STYLES = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  active:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  closed:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  paid:      'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
};

const DIRECTION_ICONS = { sent: '📤', received: '📥' };

export default function AgentReferralsPanel({ initialReferrals = [] }) {
  const { t, lang } = useApp();
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState(initialReferrals);
  const [loading, setLoading] = useState(initialReferrals.length === 0);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const [form, setForm] = useState({
    direction: 'sent',
    referring_agent_name: '',
    referring_office: '',
    receiving_agent_name: '',
    receiving_office: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    property_address: '',
    referral_fee_pct: 25,
    notes: '',
  });

  // Load referrals client-side if not from SSR
  useEffect(() => {
    if (initialReferrals.length > 0 || !profile?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('agent_referrals')
          .select('*, referring_profile:profiles!agent_referrals_referring_agent_id_fkey(full_name, avatar_url, office), receiving_profile:profiles!agent_referrals_receiving_agent_id_fkey(full_name, avatar_url, office)')
          .or(`referring_agent_id.eq.${profile.id},receiving_agent_id.eq.${profile.id}`)
          .order('created_at', { ascending: false });
        if (data) setReferrals(data);
      } catch (err) {
        console.error('Referrals load:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.id, initialReferrals.length]);

  // Stats
  const sent = referrals.filter(r => r.referring_agent_id === profile?.id);
  const received = referrals.filter(r => r.receiving_agent_id === profile?.id);
  const feesToCollect = sent.filter(r => r.status === 'closed').reduce((s, r) => s + (Number(r.referral_fee_amount) || 0), 0);
  const feesToPay = received.filter(r => r.status === 'closed').reduce((s, r) => s + (Number(r.referral_fee_amount) || 0), 0);

  // Filtered
  const filtered = useMemo(() => {
    if (filter === 'sent') return sent;
    if (filter === 'received') return received;
    return referrals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referrals, filter, profile?.id, sent, received]);

  // Determine direction label for a referral row
  const getDirection = (r) => r.referring_agent_id === profile?.id ? 'sent' : 'received';

  // Create referral
  const handleCreate = async () => {
    if (!form.client_name) return;
    setSaving(true);
    try {
      const isSent = form.direction === 'sent';
      const payload = {
        direction: form.direction,
        referring_agent_id: isSent ? profile.id : null,
        referring_agent_name: isSent ? profile.full_name : form.referring_agent_name,
        referring_office: isSent ? (profile.office || 'altitud') : form.referring_office,
        receiving_agent_id: isSent ? null : profile.id,
        receiving_agent_name: isSent ? form.receiving_agent_name : profile.full_name,
        receiving_office: isSent ? form.receiving_office : (profile.office || 'altitud'),
        client_name: form.client_name,
        client_email: form.client_email,
        client_phone: form.client_phone,
        property_address: form.property_address,
        referral_fee_pct: Number(form.referral_fee_pct) || 25,
        notes: form.notes,
        status: 'pending',
      };
      const { data, error } = await supabase.from('agent_referrals').insert([payload]).select('*, referring_profile:profiles!agent_referrals_referring_agent_id_fkey(full_name, avatar_url, office), receiving_profile:profiles!agent_referrals_receiving_agent_id_fkey(full_name, avatar_url, office)');
      if (error) throw error;
      if (data) setReferrals(prev => [data[0], ...prev]);
      setShowModal(false);
      setForm({ direction: 'sent', referring_agent_name: '', referring_office: '', receiving_agent_name: '', receiving_office: '', client_name: '', client_email: '', client_phone: '', property_address: '', referral_fee_pct: 25, notes: '' });
    } catch (err) {
      console.error('Create referral error:', err);
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Update status
  const updateStatus = async (id, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'paid') updates.payment_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('agent_referrals').update(updates).eq('id', id);
    if (!error) setReferrals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('ref_total_sent'), val: sent.length, color: 'text-blue-600 dark:text-blue-400', icon: '📤' },
          { label: t('ref_total_received'), val: received.length, color: 'text-purple-600 dark:text-purple-400', icon: '📥' },
          { label: t('ref_fee_owed'), val: fmt(feesToCollect), color: 'text-emerald-600 dark:text-emerald-400', icon: '💰' },
          { label: t('ref_fee_to_pay'), val: fmt(feesToPay), color: 'text-amber-600 dark:text-amber-400', icon: '💸' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
            <div className="absolute top-3 right-3 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">{s.icon}</div>
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">{s.label}</p>
            <h3 className={`text-2xl font-black italic mt-2 ${s.color} tabular-nums`}>{s.val}</h3>
          </div>
        ))}
      </div>

      {/* ── Filter + Create ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex bg-white dark:bg-slate-800/50 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-white/10">
          {[
            { key: 'all', label: t('ref_filter_all') },
            { key: 'sent', label: t('ref_sent') },
            { key: 'received', label: t('ref_received') },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${filter === f.key ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          {t('ref_create')}
        </button>
      </div>

      {/* ── Referral List ── */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4 opacity-30">🔗</div>
            <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">{t('ref_empty_title')}</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">{t('ref_empty_desc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/10">
                  {[t('ref_direction'), t('ref_client'), t('ref_referring_agent'), t('ref_receiving_agent'), t('ref_fee_pct'), t('ref_fee_amount'), t('comm_status'), ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map(r => {
                  const dir = getDirection(r);
                  const referringName = r.referring_profile?.full_name || r.referring_agent_name || '—';
                  const receivingName = r.receiving_profile?.full_name || r.receiving_agent_name || '—';
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${dir === 'sent' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'}`}>
                          {DIRECTION_ICONS[dir]} {dir === 'sent' ? t('ref_sent') : t('ref_received')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.client_name}</p>
                        {r.property_address && <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{r.property_address}</p>}
                        {/* Referred by label */}
                        {dir === 'received' && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[9px] font-bold border border-amber-200 dark:border-amber-500/20">
                            🔗 {t('ref_referred_by')} {referringName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{referringName}</p>
                        <p className="text-[10px] text-slate-400">{r.referring_office || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{receivingName}</p>
                        <p className="text-[10px] text-slate-400">{r.receiving_office || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold tabular-nums">{r.referral_fee_pct}%</td>
                      <td className="px-4 py-3.5 text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {r.referral_fee_amount > 0 ? fmt(r.referral_fee_amount) : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                          {t(`ref_status_${r.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1 flex-col">
                          {r.status === 'pending' && (
                            <button onClick={() => updateStatus(r.id, 'active')} className="text-[9px] font-bold text-blue-600 hover:underline uppercase tracking-widest">{t('ref_mark_active')}</button>
                          )}
                          {r.status === 'active' && (
                            <button onClick={() => updateStatus(r.id, 'closed')} className="text-[9px] font-bold text-emerald-600 hover:underline uppercase tracking-widest">{t('ref_mark_closed')}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Referral Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-8 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-xl font-black italic text-slate-900 dark:text-white">{t('ref_create')}</h3>
              <p className="text-xs text-slate-400 mt-1">{t('ref_create_desc')}</p>
            </div>

            {/* Direction Toggle */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('ref_direction')}</label>
              <div className="flex gap-2">
                {[
                  { key: 'sent', label: t('ref_direction_sent'), icon: '📤' },
                  { key: 'received', label: t('ref_direction_received'), icon: '📥' },
                ].map(d => (
                  <button key={d.key} onClick={() => setForm(p => ({ ...p, direction: d.key }))}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${form.direction === d.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                    <span>{d.icon}</span> {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Other agent info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  {form.direction === 'sent' ? t('ref_receiving_agent') : t('ref_referring_agent')}
                </label>
                <input type="text" placeholder={t('ref_agent_name')}
                  value={form.direction === 'sent' ? form.receiving_agent_name : form.referring_agent_name}
                  onChange={e => setForm(p => form.direction === 'sent' ? { ...p, receiving_agent_name: e.target.value } : { ...p, referring_agent_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{t('ref_office_name')}</label>
                <input type="text" placeholder={t('ref_external_office')}
                  value={form.direction === 'sent' ? form.receiving_office : form.referring_office}
                  onChange={e => setForm(p => form.direction === 'sent' ? { ...p, receiving_office: e.target.value } : { ...p, referring_office: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              </div>
            </div>

            {/* Client */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{t('ref_client_name')} *</label>
                <input type="text" required value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{t('ref_client_email')}</label>
                  <input type="email" value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{t('ref_client_phone')}</label>
                  <input type="tel" value={form.client_phone} onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
                </div>
              </div>
            </div>

            {/* Property + Fee */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{t('ref_property_address')}</label>
                <input type="text" value={form.property_address} onChange={e => setForm(p => ({ ...p, property_address: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{t('ref_fee_pct')}</label>
                <input type="number" step="1" min="0" max="100" value={form.referral_fee_pct} onChange={e => setForm(p => ({ ...p, referral_fee_pct: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
                <p className="text-[9px] text-amber-500 font-bold mt-1">💡 {t('ref_25pct_note')}</p>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{t('ref_notes')}</label>
                <textarea rows="2" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm resize-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">
                {t('ref_cancel')}
              </button>
              <button onClick={handleCreate} disabled={!form.client_name || saving}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-brand-600 text-white shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all disabled:opacity-50">
                {saving ? t('ref_saving') : t('ref_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
