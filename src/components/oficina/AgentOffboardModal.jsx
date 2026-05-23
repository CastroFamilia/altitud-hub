'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import Image from 'next/image';

const CATEGORY_META = {
  contacts:            { icon: '👥', key: 'ofc_offboard_contacts' },
  properties:          { icon: '🏠', key: 'ofc_offboard_properties' },
  acm_reports:         { icon: '📊', key: 'ofc_offboard_cmas' },
  buyer_searches:      { icon: '🔍', key: 'ofc_offboard_searches' },
  office_listings:     { icon: '📋', key: 'ofc_offboard_listings' },
  office_reservations: { icon: '📝', key: 'ofc_offboard_deals' },
  office_commissions:  { icon: '💵', key: 'ofc_offboard_ofc_comm' },
  agent_commissions:   { icon: '💰', key: 'ofc_offboard_commissions' },
  agent_referrals:     { icon: '🔗', key: 'ofc_offboard_referrals' },
  listing_milestones:  { icon: '⏱️', key: 'ofc_offboard_milestones' },
  lead_communications: { icon: '📩', key: 'ofc_offboard_communications' },
  lead_follow_ups:     { icon: '🔔', key: 'ofc_offboard_followups' },
  saved_presentations: { icon: '📄', key: 'ofc_offboard_presentations' },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_META);

export default function AgentOffboardModal({ profile, profiles, onClose, onComplete }) {
  const { t } = useApp();
  const [step, setStep] = useState(1);
  const [receivingId, setReceivingId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([...ALL_CATEGORIES]);
  const [notes, setNotes] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [result, setResult] = useState(null);

  // Available agents (active, same office, not the departing one)
  const availableAgents = (profiles || []).filter(
    p => p.id !== profile.id && p.status === 'active' && p.role !== 'broker'
  );

  const filteredAgents = availableAgents.filter(p =>
    !searchQuery ||
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const receivingAgent = availableAgents.find(p => p.id === receivingId);

  // Fetch preview counts when reaching step 2
  useEffect(() => {
    if (step === 2 && !counts) {
      fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agent-offboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departingProfileId: profile.id,
          receivingProfileId: receivingId,
          execute: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCounts(data.counts);
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (key) => {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const totalReassign = counts ? ALL_CATEGORIES.reduce((sum, k) =>
    sum + (selectedCategories.includes(k) ? (counts[k] || 0) : 0), 0) : 0;
  const totalPlaceholder = counts ? ALL_CATEGORIES.reduce((sum, k) =>
    sum + (!selectedCategories.includes(k) ? (counts[k] || 0) : 0), 0) : 0;
  const totalAll = counts ? ALL_CATEGORIES.reduce((sum, k) => sum + (counts[k] || 0), 0) : 0;

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const res = await fetch('/api/agent-offboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departingProfileId: profile.id,
          receivingProfileId: receivingId,
          selectedCategories,
          execute: true,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setStep(4); // success
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setExecuting(false);
    }
  };

  const nameMatches = confirmName.trim().toLowerCase() === profile.full_name.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div
        className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xl">
            ⚠️
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black italic text-slate-900 dark:text-white">
              {t('ofc_offboard_title')}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{t('ofc_offboard_subtitle')}</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  step >= s
                    ? step === 4 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}
              >
                {step === 4 && s === 3 ? '✓' : s}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP 1: Select Receiving Agent ── */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Departing agent card */}
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-2xl p-4 flex items-center gap-4">
                <Image
                  src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=ef4444&color=fff`}
                  alt={profile.full_name}
                  className="w-12 h-12 rounded-full border-2 border-red-300"
                  width={48} height={48}
                />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{profile.full_name}</p>
                  <p className="text-[10px] text-slate-500">{profile.email}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mt-1">
                    {t('ofc_offboard_leaving')}
                  </p>
                </div>
              </div>

              {/* Search + Agent list */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  {t('ofc_offboard_select_agent')}
                </label>
                <input
                  type="text"
                  placeholder={t('ofc_offboard_select_placeholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
                />
                <div className="max-h-[240px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredAgents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">{t('ofc_no_agents_available')}</div>
                  ) : filteredAgents.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setReceivingId(a.id)}
                      className={`w-full px-4 py-3 flex items-center gap-3 transition-all text-left ${
                        receivingId === a.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                          : 'hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <Image
                        src={a.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.full_name)}&background=5a82bf&color=fff`}
                        alt={a.full_name}
                        className="w-8 h-8 rounded-full"
                        width={32} height={32}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{a.full_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{a.email}</p>
                      </div>
                      {receivingId === a.id && (
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Review & Select Categories ── */}
          {step === 2 && (
            <div className="space-y-5">
              {loading ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full"></div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Analizando datos del agente...</p>
                </div>
              ) : counts ? (
                <>
                  {/* Transfer summary bar */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Image
                        src={receivingAgent?.avatar_url || `https://ui-avatars.com/api/?name=A&background=5a82bf&color=fff`}
                        alt="" className="w-6 h-6 rounded-full" width={24} height={24}
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-white">
                        → {receivingAgent?.full_name}
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-black">
                        {totalReassign}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{t('ofc_offboard_in_profile')}:</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-black">
                        {totalPlaceholder}
                      </span>
                    </div>
                  </div>

                  {/* Category toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ALL_CATEGORIES.map(key => {
                      const meta = CATEGORY_META[key];
                      const count = counts[key] || 0;
                      const isSelected = selectedCategories.includes(key);
                      const isEmpty = count === 0;

                      return (
                        <button
                          key={key}
                          onClick={() => !isEmpty && toggleCategory(key)}
                          disabled={isEmpty}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            isEmpty
                              ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 opacity-40 cursor-not-allowed'
                              : isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30'
                                : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {/* Toggle */}
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                            isEmpty ? 'bg-slate-200 dark:bg-slate-700'
                              : isSelected ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'
                          }`}>
                            {isSelected && !isEmpty && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          <span className="text-base">{meta.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                              {t(meta.key)}
                            </p>
                          </div>
                          <span className={`text-sm font-black ${count > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Business plan notice */}
                  {counts.business_plans > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-900/10">
                      <span className="text-base">🗑️</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-red-600 dark:text-red-400">{t('ofc_offboard_bp_delete')}</p>
                        <p className="text-[10px] text-red-400">{t('ofc_offboard_bp_reason')}</p>
                      </div>
                      <span className="text-sm font-black text-red-500">{counts.business_plans}</span>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                      {t('ofc_offboard_notes')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Razón de salida, notas adicionales..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none h-20"
                    />
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ── STEP 3: Confirmation ── */}
          {step === 3 && (
            <div className="space-y-6 py-4">
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-2xl p-5 text-center">
                <div className="text-3xl mb-3">⚠️</div>
                <h4 className="text-sm font-black text-red-600 dark:text-red-400 mb-2">
                  {t('ofc_offboard_confirm_title')}
                </h4>
                <p className="text-xs text-red-500/80 leading-relaxed max-w-md mx-auto">
                  {t('ofc_offboard_confirm_warning')}
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-800/30">
                  <p className="text-2xl font-black text-blue-600 italic">{totalReassign}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400 mt-1">
                    → {receivingAgent?.full_name?.split(' ')[0]}
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 text-center border border-slate-200 dark:border-slate-700">
                  <p className="text-2xl font-black text-slate-500 italic">{totalPlaceholder}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">{t('ofc_offboard_keep_in_profile')}</p>
                </div>
              </div>

              {/* Type name to confirm */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  {t('ofc_offboard_confirm_type')}
                </label>
                <input
                  type="text"
                  value={confirmName}
                  onChange={e => setConfirmName(e.target.value)}
                  placeholder={profile.full_name}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
                    nameMatches
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 focus:ring-red-400'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-slate-400'
                  }`}
                />
              </div>
            </div>
          )}

          {/* ── STEP 4: Success ── */}
          {step === 4 && result && (
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-3xl mx-auto">
                ✅
              </div>
              <h4 className="text-lg font-black italic text-emerald-600">{t('ofc_offboard_success')}</h4>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-200 dark:border-blue-800/30">
                  <p className="text-xl font-black text-blue-600 italic">
                    {Object.values(result.reassignedCounts || {}).reduce((a, b) => a + b, 0)}
                  </p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-blue-400 mt-1">{t('ofc_reassigned')}</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-xl font-black text-slate-500 italic">
                    {Object.values(result.placeholderCounts || {}).reduce((a, b) => a + b, 0)}
                  </p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">{t('ofc_offboard_in_profile')}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-3 border border-red-200 dark:border-red-800/30">
                  <p className="text-xl font-black text-red-500 italic">{result.businessPlansDeleted || 0}</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-red-400 mt-1">{t('ofc_plans')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-[32px]">
          {step === 4 ? (
            <button
              onClick={() => { onComplete?.(); onClose(); }}
              className="w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
            >
              {t('ofc_done')}
            </button>
          ) : (
            <>
              <button
                onClick={step === 1 ? onClose : () => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                {step === 1 ? 'Cancelar' : 'Atrás'}
              </button>
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !receivingId}
                  className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleExecute}
                  disabled={!nameMatches || executing}
                  className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {executing ? t('ofc_offboard_executing') : t('ofc_offboard_btn_confirm')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
