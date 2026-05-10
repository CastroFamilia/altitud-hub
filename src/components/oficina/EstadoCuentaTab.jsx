"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';

export default function EstadoCuentaTab() {
  const { profile, supabase } = useAuth();
  const { t } = useApp();

  const [agents, setAgents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Profitability & Poverty Line State
  const [povertyLineNet, setPovertyLineNet] = useState(1000); // Mensual bolsillo
  const [agentSplit, setAgentSplit] = useState(45); // Porcentaje

  // Modal State
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState('office_charge'); // 'office_charge' | 'agent_payment'
  const [txForm, setTxForm] = useState({
    amount: '',
    category: 'Fee Mensual',
    description: '',
    date: new Date().toISOString().slice(0, 10)
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all agents
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name, avatar_url, role');
      const loadedAgents = profilesData || [];
      
      // Fetch all transactions (to calculate balances)
      const { data: txData } = await supabase.from('account_transactions').select('*');
      const loadedTx = txData || [];
      
      setAgents(loadedAgents);
      setTransactions(loadedTx);
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculate global balances per agent
  const agentBalances = agents.map(agent => {
    const agentTx = transactions.filter(t => t.profile_id === agent.id);
    const charges = agentTx.filter(t => t.type === 'office_charge').reduce((s, t) => s + Number(t.amount), 0);
    const payments = agentTx.filter(t => t.type === 'agent_payment').reduce((s, t) => s + Number(t.amount), 0);
    return {
      ...agent,
      debt: charges - payments
    };
  }).sort((a, b) => b.debt - a.debt); // Sort by highest debt first

  // Details for selected agent
  const selectedAgent = agentBalances.find(a => a.id === selectedAgentId);
  const selectedAgentTx = selectedAgentId 
    ? transactions.filter(t => t.profile_id === selectedAgentId && t.date.startsWith(selectedMonth))
    : [];

  const handleOpenModal = (type) => {
    setTransactionType(type);
    setTxForm({
      amount: '',
      category: type === 'office_charge' ? 'Fee Mensual' : 'Pago Efectivo',
      description: '',
      date: new Date().toISOString().slice(0, 10)
    });
    setShowTransactionModal(true);
  };

  const handleSubmitTx = async (e) => {
    e.preventDefault();
    if (!selectedAgentId || !txForm.amount || !txForm.category) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('account_transactions').insert({
        profile_id: selectedAgentId,
        type: transactionType,
        amount: parseFloat(txForm.amount),
        category: txForm.category,
        description: txForm.description,
        date: txForm.date,
        added_by: profile?.id
      });
      if (error) throw error;
      
      setShowTransactionModal(false);
      loadData();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const chargeCategories = ['Fee Mensual', 'Rótulos', 'Tarjetas/Imprenta', 'Publicidad Oficina', 'Legal', 'Fotografía', 'Otro'];
  const paymentCategories = ['Pago Efectivo', 'Transferencia', 'Sinpe Móvil', 'Deducción de Comisión', 'Otro'];

  // Calculate required GCI
  const requiredAnnualGCI = (povertyLineNet * 12) / (agentSplit / 100);

  return (
    <div className="space-y-8 pb-12">
      {/* ── PROFITABILITY DASHBOARD ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 col-span-1 md:col-span-2 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <svg className="w-32 h-32 text-nexus-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4">Métricas de Rentabilidad</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Línea de Pobreza (Bolsillo/Mes)</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">$</span>
                <input 
                  type="number" 
                  value={povertyLineNet} 
                  onChange={e => setPovertyLineNet(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-lg font-black italic w-32 focus:outline-none focus:ring-2 focus:ring-nexus-blue text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Split Promedio (%)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={agentSplit} 
                  onChange={e => setAgentSplit(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-lg font-black italic w-24 focus:outline-none focus:ring-2 focus:ring-nexus-blue text-slate-900 dark:text-white"
                />
                <span className="text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Facturación Mínima (GCI Anual)</p>
              <p className="text-3xl font-black italic text-nexus-blue">
                ${requiredAnnualGCI.toLocaleString('en-US', {maximumFractionDigits: 0})}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 shadow-sm border border-slate-800 relative flex flex-col justify-center">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Agentes Consolidados (&gt;1 año)</p>
          <h2 className="text-4xl font-black italic text-emerald-400">
            --%
          </h2>
          <p className="text-[10px] font-bold text-white/50 mt-1 uppercase tracking-widest">Superando Línea de Pobreza</p>
          
          <div className="mt-4 bg-white/10 p-3 rounded-xl border border-white/5">
            <p className="text-[9px] text-white/60 leading-tight">
              <span className="font-bold text-amber-400">Nota:</span> Se requiere integración con el módulo de Cierres para calcular el GCI real por agente.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Col: Agents List */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white">Agentes</h3>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Saldos Actuales</p>
            </div>

            {loading ? (
              <div className="p-8 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-nexus-blue border-t-transparent rounded-full"></div></div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[70vh] overflow-y-auto">
                {agentBalances.map(agent => (
                  <button 
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${selectedAgentId === agent.id ? 'bg-nexus-blue/10 dark:bg-nexus-blue/20' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={agent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.full_name)}&background=5a82bf&color=fff`} 
                        alt="" 
                        className="w-10 h-10 rounded-full border border-slate-200"
                      />
                      <div>
                        <p className={`text-sm font-bold ${selectedAgentId === agent.id ? 'text-nexus-blue dark:text-white' : 'text-slate-900 dark:text-white'}`}>{agent.full_name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{agent.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black italic ${agent.debt > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        ${Math.abs(agent.debt).toLocaleString('en-US', {minimumFractionDigits: 2})}
                      </p>
                      {agent.debt > 0 && <p className="text-[9px] text-red-500/70 font-bold uppercase">Debe</p>}
                      {agent.debt === 0 && <p className="text-[9px] text-emerald-500/70 font-bold uppercase">Al Día</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Details & Actions */}
        <div className="w-full lg:w-2/3 space-y-6">
          {!selectedAgentId ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center h-full flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Selecciona un agente para ver sus detalles</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full">
              {/* Header Profile */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedAgent?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAgent?.full_name || '')}&background=5a82bf&color=fff`} 
                    alt="" 
                    className="w-14 h-14 rounded-full border-2 border-white shadow-md"
                  />
                  <div>
                    <h2 className="text-2xl font-black italic text-slate-900 dark:text-white">{selectedAgent?.full_name}</h2>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${selectedAgent?.debt > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      Saldo Pendiente: ${Math.abs(selectedAgent?.debt || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal('office_charge')}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Cargo
                  </button>
                  <button 
                    onClick={() => handleOpenModal('agent_payment')}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    Pago
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Historial del Mes</h3>
                <div className="flex gap-4 items-center">
                  <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-white"
                  />
                  <button className="text-nexus-blue hover:text-blue-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Imprimir
                  </button>
                </div>
              </div>

              {/* TX List */}
              <div className="flex-1 overflow-y-auto">
                {selectedAgentTx.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                    <p className="text-xs font-bold uppercase tracking-widest">No hay transacciones este mes.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Concepto / Cat.</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {selectedAgentTx.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{t.description || t.category}</p>
                            {t.description && <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{t.category}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                              t.type === 'office_charge' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 
                              t.type === 'agent_payment' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 
                              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {t.type === 'office_charge' ? 'Cargo Oficina' : t.type === 'agent_payment' ? 'Pago Recibido' : 'Gasto Personal'}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-black italic text-base ${t.type === 'agent_payment' ? 'text-emerald-500' : t.type === 'office_charge' ? 'text-red-500' : 'text-slate-400'}`}>
                            {t.type === 'agent_payment' ? '+' : '-'}${Number(t.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowTransactionModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div 
            className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-8"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-black italic text-slate-900 dark:text-white mb-2">
              {transactionType === 'office_charge' ? 'Agregar Cargo a Cuenta' : 'Registrar Pago Recibido'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Agente: <span className="font-bold">{selectedAgent?.full_name}</span>
            </p>

            <form onSubmit={handleSubmitTx} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Monto ($)</label>
                <input 
                  type="number" step="0.01" required
                  value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Categoría</label>
                <select 
                  value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
                >
                  {(transactionType === 'office_charge' ? chargeCategories : paymentCategories).map(c => 
                    <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Fecha</label>
                <input 
                  type="date" required
                  value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Descripción / Notas</label>
                <input 
                  type="text" required
                  value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
                  placeholder={transactionType === 'office_charge' ? 'Ej. Mes de Mayo 2026' : 'Ej. Ref. 123456'}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTransactionModal(false)} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-colors shadow-lg disabled:opacity-50 ${
                    transactionType === 'office_charge' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                  }`}
                >
                  {submitting ? 'Procesando...' : (transactionType === 'office_charge' ? 'Aplicar Cargo' : 'Aplicar Pago')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
