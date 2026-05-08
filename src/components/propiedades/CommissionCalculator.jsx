"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════════
   COMMISSION CALCULATOR
   Shows the full split breakdown when marking a property as sold.
   Chain: Sale Price → Gross Commission → Side Amount → RCCA Fee → Agent/Office Split
   ═══════════════════════════════════════════════════════════════ */

export default function CommissionCalculator({
  property,
  agentProfile,
  onConfirm,
  onCancel,
}) {
  const { t, lang } = useApp();

  // Form state
  const [salePrice, setSalePrice] = useState(property?.list_price || '');
  const [totalCommPct, setTotalCommPct] = useState(
    property?.listing_side_comm && property?.selling_side_comm
      ? Number(property.listing_side_comm) + Number(property.selling_side_comm)
      : 6
  );
  const [side, setSide] = useState('listing'); // 'listing', 'selling', 'both'
  const [sidePct, setSidePct] = useState(50); // % of gross for this agent's side
  const [buyerName, setBuyerName] = useState('');
  const [buyerAgent, setBuyerAgent] = useState('');
  const [buyerAgentOffice, setBuyerAgentOffice] = useState('');
  const [referralPct, setReferralPct] = useState(0);
  const [referralAgent, setReferralAgent] = useState('');
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0]);
  const [tiers, setTiers] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Load commission tiers
  useEffect(() => {
    const loadTiers = async () => {
      const { data } = await supabase
        .from('commission_tiers')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (data) {
        setTiers(data);
        // Auto-select the agent's tier if set
        if (agentProfile?.commission_tier_id) {
          const match = data.find(t => t.id === agentProfile.commission_tier_id);
          if (match) setSelectedTier(match);
        } else {
          // Default to starter
          const starter = data.find(t => t.name === 'starter');
          if (starter) setSelectedTier(starter);
        }
      }
    };
    loadTiers();
  }, [agentProfile]);

  // Auto-set side % based on selection
  useEffect(() => {
    if (side === 'both') setSidePct(100);
    else setSidePct(50);
  }, [side]);

  // Calculate the full split chain
  // IMPORTANT: Split logic differs by tier:
  //   - 45% tier: Flat split — Agent 45%, RCCA 6%, Office 49% (no RCCA deduction first)
  //   - 60%+ tiers: RCCA 6% deducted first, then remaining split between agent and office
  const price = parseFloat(salePrice) || 0;
  const grossCommission = price * (totalCommPct / 100);
  const sideAmount = grossCommission * (sidePct / 100);
  const rccaFeePct = selectedTier?.rcca_fee_pct || 6;
  const agentSplitPct = selectedTier?.agent_split_pct || 45;
  const isStarterTier = agentSplitPct <= 45;

  // Referral deducted from side amount first (if any)
  const referralAmount = sideAmount * (referralPct / 100);
  const afterReferral = sideAmount - referralAmount;

  let rccaFeeAmount, agentAmount, officeAmount;

  if (isStarterTier) {
    // 45% tier: flat split from the (post-referral) side amount
    // Agent: 45%, RCCA: 6%, Office: 49%
    agentAmount = afterReferral * (agentSplitPct / 100);
    rccaFeeAmount = afterReferral * (rccaFeePct / 100);
    officeAmount = afterReferral - agentAmount - rccaFeeAmount;
  } else {
    // 60%+ tiers: RCCA deducted first, then split
    rccaFeeAmount = afterReferral * (rccaFeePct / 100);
    const afterRcca = afterReferral - rccaFeeAmount;
    agentAmount = afterRcca * (agentSplitPct / 100);
    officeAmount = afterRcca - agentAmount;
  }

  const fmt = (n) => {
    if (!n && n !== 0) return '$0';
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const handleConfirm = async () => {
    if (!price || !selectedTier) return;
    setSubmitting(true);

    try {
      const commissionData = {
        property_id: property.id,
        agent_id: agentProfile?.id,
        tier_id: selectedTier.id,
        sale_price: price,
        total_commission_pct: totalCommPct,
        gross_commission: grossCommission,
        side,
        side_pct: sidePct,
        side_amount: sideAmount,
        rcca_fee_pct: rccaFeePct,
        rcca_fee_amount: rccaFeeAmount,
        after_rcca: isStarterTier ? afterReferral : (afterReferral - rccaFeeAmount),
        agent_split_pct: agentSplitPct,
        agent_amount: agentAmount,
        office_amount: officeAmount,
        referral_pct: referralPct,
        referral_amount: referralAmount,
        referral_agent: referralAgent || null,
        closing_date: closingDate,
        status: 'pending',
      };

      // Insert commission record
      const { error: commError } = await supabase
        .from('agent_commissions')
        .insert(commissionData);

      if (commError) throw commError;

      // Update property to sold
      const { error: propError } = await supabase
        .from('properties')
        .update({
          status: 'sold',
          sold_price: price,
          sold_date: closingDate,
          buyer_name: buyerName || null,
          buyer_agent: buyerAgent || null,
          buyer_agent_office: buyerAgentOffice || null,
          days_on_market: property.submitted_at
            ? Math.floor((new Date(closingDate).getTime() - new Date(property.submitted_at).getTime()) / (1000 * 60 * 60 * 24))
            : null,
        })
        .eq('id', property.id);

      if (propError) throw propError;

      // Update listing milestones
      await supabase
        .from('listing_milestones')
        .upsert({
          property_id: property.id,
          agent_id: property.agent_id,
        }, { onConflict: 'property_id' });

      onConfirm?.({
        agentAmount,
        officeAmount,
        grossCommission,
        closingDate,
        buyerName,
      });
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sale Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
            {lang === 'en' ? 'Sale Price (USD)' : 'Precio de Venta (USD)'}
          </label>
          <input
            type="number"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            placeholder="350000"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
            {lang === 'en' ? 'Closing Date' : 'Fecha de Cierre'}
          </label>
          <input
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Buyer Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
            {lang === 'en' ? 'Buyer Name' : 'Nombre Comprador'}
          </label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
            {lang === 'en' ? 'Buyer Agent' : 'Agente Comprador'}
          </label>
          <input
            type="text"
            value={buyerAgent}
            onChange={(e) => setBuyerAgent(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
            {lang === 'en' ? 'Buyer Office' : 'Oficina Comprador'}
          </label>
          <input
            type="text"
            value={buyerAgentOffice}
            onChange={(e) => setBuyerAgentOffice(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Commission Structure */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
            {lang === 'en' ? 'Total Commission %' : 'Comisión Total %'}
          </label>
          <input
            type="number"
            value={totalCommPct}
            onChange={(e) => setTotalCommPct(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
            {lang === 'en' ? 'Agent Side' : 'Lado del Agente'}
          </label>
          <div className="flex gap-1">
            {[
              { key: 'listing', label: lang === 'en' ? 'Listing' : 'Captación' },
              { key: 'selling', label: lang === 'en' ? 'Selling' : 'Venta' },
              { key: 'both', label: lang === 'en' ? 'Both' : 'Ambos' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSide(s.key)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  side === s.key
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
            {lang === 'en' ? 'Side % of Gross' : '% del Bruto'}
          </label>
          <input
            type="number"
            value={sidePct}
            onChange={(e) => setSidePct(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Agent Tier */}
      <div>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
          {lang === 'en' ? 'Agent Commission Tier' : 'Nivel de Comisión del Agente'}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {tiers.map(tier => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier)}
              className={`p-3 rounded-xl text-center transition-all border ${
                selectedTier?.id === tier.id
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <p className="text-xl font-black text-slate-900 dark:text-white">{tier.agent_split_pct}%</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-1">{tier.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">${tier.monthly_fee_usd}/mo + IVA</p>
            </button>
          ))}
        </div>
      </div>

      {/* Referral (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
            {lang === 'en' ? 'Referral % (optional)' : 'Referido % (opcional)'}
          </label>
          <input
            type="number"
            value={referralPct}
            onChange={(e) => setReferralPct(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
            {lang === 'en' ? 'Referral Agent' : 'Agente Referidor'}
          </label>
          <input
            type="text"
            value={referralAgent}
            onChange={(e) => setReferralAgent(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ═══ BREAKDOWN CARD ═══ */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {lang === 'en' ? 'Commission Breakdown' : 'Desglose de Comisión'}
          </h4>
          {isStarterTier && (
            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
              {lang === 'en' ? 'Flat split (45/6/49)' : 'Split directo (45/6/49)'}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-slate-400">{lang === 'en' ? 'Sale Price' : 'Precio de Venta'}</span>
            <span className="text-lg font-bold">{fmt(price)}</span>
          </div>

          <div className="flex justify-between items-baseline">
            <span className="text-sm text-slate-400">{lang === 'en' ? 'Gross Commission' : 'Comisión Bruta'} ({totalCommPct}%)</span>
            <span className="text-lg font-bold">{fmt(grossCommission)}</span>
          </div>

          <div className="border-t border-slate-700 pt-3 flex justify-between items-baseline">
            <span className="text-sm text-slate-400">
              {lang === 'en' ? 'Agent Side' : 'Lado Agente'} ({sidePct}%)
            </span>
            <span className="text-base font-bold">{fmt(sideAmount)}</span>
          </div>

          {referralPct > 0 && (
            <div className="flex justify-between items-baseline text-amber-400">
              <span className="text-sm">− {lang === 'en' ? 'Referral' : 'Referido'} ({referralPct}%)</span>
              <span className="text-base font-bold">-{fmt(referralAmount)}</span>
            </div>
          )}

          {isStarterTier ? (
            /* 45% tier: flat split display */
            <div className="border-t border-slate-700 pt-3 space-y-2">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">
                {lang === 'en' ? 'Flat split from side amount' : 'Split directo del monto lado'}
              </p>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-emerald-400 font-bold">
                  🏆 {lang === 'en' ? 'Agent' : 'Agente'} ({agentSplitPct}%)
                </span>
                <span className="text-2xl font-black text-emerald-400">{fmt(agentAmount)}</span>
              </div>
              <div className="flex justify-between items-baseline text-red-400">
                <span className="text-sm">RCCA ({rccaFeePct}%)</span>
                <span className="text-base font-bold">{fmt(rccaFeeAmount)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-blue-400 font-bold">
                  🏢 {lang === 'en' ? 'Office' : 'Oficina'} ({Math.round(100 - agentSplitPct - rccaFeePct)}%)
                </span>
                <span className="text-lg font-bold text-blue-400">{fmt(officeAmount)}</span>
              </div>
            </div>
          ) : (
            /* 60%+ tiers: RCCA first, then split */
            <>
              <div className="flex justify-between items-baseline text-red-400">
                <span className="text-sm">− RCCA ({rccaFeePct}%)</span>
                <span className="text-base font-bold">-{fmt(rccaFeeAmount)}</span>
              </div>

              <div className="border-t border-slate-700 pt-3 space-y-2">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">
                  {lang === 'en' ? 'Split after RCCA deduction' : 'Split después de RCCA'}
                </p>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-emerald-400 font-bold">
                    🏆 {lang === 'en' ? 'Agent' : 'Agente'} ({agentSplitPct}%)
                  </span>
                  <span className="text-2xl font-black text-emerald-400">{fmt(agentAmount)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-blue-400 font-bold">
                    🏢 {lang === 'en' ? 'Office' : 'Oficina'} ({100 - agentSplitPct}%)
                  </span>
                  <span className="text-lg font-bold text-blue-400">{fmt(officeAmount)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {lang === 'en' ? 'Cancel' : 'Cancelar'}
        </button>
        <button
          onClick={handleConfirm}
          disabled={!price || !selectedTier || submitting}
          className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
        >
          {submitting
            ? (lang === 'en' ? 'Processing...' : 'Procesando...')
            : (lang === 'en' ? 'Confirm Sale' : 'Confirmar Venta')
          }
        </button>
      </div>
    </div>
  );
}
