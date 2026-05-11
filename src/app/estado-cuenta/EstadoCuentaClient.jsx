"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import TopNav from '@/components/layout/TopNav';

export default function EstadoCuentaClient({ initialTransactions = [] }) {
  const { profile, supabase } = useAuth();
  const { t } = useApp();
  
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: 'Gasolina',
    description: '',
    date: new Date().toISOString().slice(0, 10)
  });
  const [submitting, setSubmitting] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    
    // YYYY-MM-01 to YYYY-MM-31
    const startDate = `${selectedMonth}-01`;
    const lastDay = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).getDate();
    const endDate = `${selectedMonth}-${lastDay}`;

    try {
      // Load all transactions to calculate total debt, and just month's transactions for display
      const { data: allData, error: allError } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('profile_id', profile.id)
        .order('date', { ascending: false });

      if (allError) throw allError;
      
      setTransactions(allData || []);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [profile, selectedMonth, supabase]);

  // Removed initial loadTransactions in useEffect, keep function for refreshing

  // Calculations
  const totalCharges = transactions.filter(t => t.type === 'office_charge').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPayments = transactions.filter(t => t.type === 'agent_payment').reduce((sum, t) => sum + Number(t.amount), 0);
  const debtToOffice = totalCharges - totalPayments;

  // Filter for display
  const displayTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
  
  const monthPersonalExpenses = displayTransactions
    .filter(t => t.type === 'personal_expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.category || !expenseForm.date) return;
    setSubmitting(true);
    
    try {
      const { error } = await supabase.from('account_transactions').insert({
        profile_id: profile.id,
        type: 'personal_expense',
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        description: expenseForm.description,
        date: expenseForm.date,
        added_by: profile.id
      });

      if (error) throw error;
      
      setShowExpenseModal(false);
      setExpenseForm({ amount: '', category: 'Gasolina', description: '', date: new Date().toISOString().slice(0, 10) });
      loadTransactions();
    } catch (err) {
      alert("Error al guardar gasto: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestPhotography = async () => {
    if (!confirm('¿Deseas solicitar el servicio de fotografía? (Cubierto por la oficina)')) return;
    try {
      const { error } = await supabase.from('account_transactions').insert({
        profile_id: profile.id,
        type: 'office_charge',
        amount: 0,
        category: 'Fotografía',
        description: 'Solicitud de Fotografía (Asumido por Oficina)',
        date: new Date().toISOString().slice(0, 10),
        added_by: profile.id
      });
      if (error) throw error;
      alert('Solicitud enviada correctamente. El rastro quedó en tu estado de cuenta.');
      loadTransactions();
    } catch (err) {
      alert("Error al solicitar fotografía: " + err.message);
    }
  };

  const categories = ['Gasolina', 'Publicidad', 'Marketing', 'Fotografía', 'Eventos', 'Otro'];

  if (loading && !profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!profile) return null;

  return (
    <>
      <TopNav title="Estado de Cuenta" subtitle="Tus finanzas y cobros de la oficina" />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative z-0 bg-slate-50 dark:bg-dark-bg">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <svg className="w-24 h-24 text-nexus-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Saldo a la Oficina</p>
              <h2 className={`text-4xl font-black italic ${debtToOffice > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                ${Math.abs(debtToOffice).toLocaleString('en-US', {minimumFractionDigits: 2})}
              </h2>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                {debtToOffice > 0 ? 'Tienes pagos pendientes con la oficina.' : debtToOffice === 0 ? 'Estás al día con la oficina.' : 'Tienes saldo a favor.'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 shadow-xl border border-slate-800 relative">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Mis Gastos Operativos (Mes)</p>
              <h2 className="text-4xl font-black italic text-white">
                ${monthPersonalExpenses.toLocaleString('en-US', {minimumFractionDigits: 2})}
              </h2>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setShowExpenseModal(true)}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Gasto
                </button>
                <button 
                  onClick={handleRequestPhotography}
                  className="bg-brand-500/20 hover:bg-brand-500/40 text-brand-300 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 border border-brand-500/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Solicitar Fotógrafo ($0)
                </button>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white">Movimientos del Mes</h3>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-700 dark:text-white"
              />
            </div>

            {loading ? (
              <div className="p-12 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full"></div></div>
            ) : displayTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-xs font-bold uppercase tracking-widest">No hay transacciones este mes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Concepto</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {displayTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{t.description || (t.type === 'office_charge' ? 'Cargo de Oficina' : t.type === 'agent_payment' ? 'Pago a Oficina' : 'Gasto')}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                            {t.type === 'office_charge' ? 'Deuda a Oficina' : t.type === 'agent_payment' ? 'Abono a Oficina' : 'Gasto Operativo'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-[10px] font-bold">
                            {t.category}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-black italic text-base ${t.type === 'agent_payment' ? 'text-emerald-500' : t.type === 'office_charge' ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                          {t.type === 'agent_payment' ? '+' : '-'}${Number(t.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add Expense */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowExpenseModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div 
            className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-8"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-black italic text-slate-900 dark:text-white mb-2">Registrar Gasto Operativo</h3>
            <p className="text-xs text-slate-500 mb-6">Este gasto es para tu control personal y no afecta tu saldo con la oficina.</p>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Monto ($)</label>
                <input 
                  type="number" step="0.01" required
                  value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Categoría</label>
                <select 
                  value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Fecha</label>
                <input 
                  type="date" required
                  value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Descripción (Opcional)</label>
                <input 
                  type="text"
                  value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
                  placeholder="Ej. Gasolina visita cliente"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-nexus-blue text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50">
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
