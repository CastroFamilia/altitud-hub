"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { updateOfficeExpense, insertPettyCashTransaction } from '@/lib/dal/office';
import Image from 'next/image';

/* ═══════════════════════════════════════════════════════════════
   OFFICE FINANCE TAB — Expenses, Incomes & Petty Cash Tracking
   ═══════════════════════════════════════════════════════════════ */

export default function OfficeFinanceTab({ expenses = [], categories = [], funds = [], transactions = [], salaries = [], profiles = [] }) {
  const { t } = useApp();
  const { supabase, isBroker, isOfficeAssistant, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [timeframe, setTimeframe] = useState('this_month');
  const [activeTab, setActiveTab] = useState('expense'); // 'expense' or 'income'

  // Local state for optimistic updates
  const [localExpenses, setLocalExpenses] = useState(expenses);
  const [localFunds, setLocalFunds] = useState(funds);
  const [localTxs, setLocalTxs] = useState(transactions);
  
  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(null); // holds expense/income object
  
  const fmt = (num, curr = 'CRC') => new Intl.NumberFormat('en-US', { style: 'currency', currency: curr, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num || 0);

  // ── Aggregates ──
  const now = new Date();
  
  const dateRange = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    
    switch (timeframe) {
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
      case 'ytd': {
        const start = `${y}-01-01`;
        const end = new Date(y, 11, 31).toISOString().slice(0,10);
        return { start, end };
      }
      case 'all': {
        return { start: '1900-01-01', end: '2100-12-31' };
      }
      case 'this_month':
      default: {
        const start = new Date(y, m, 1).toISOString().slice(0,10);
        const end = new Date(y, m + 1, 0).toISOString().slice(0,10);
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
  
  // Split expenses vs incomes
  const expensesList = useMemo(() => localExpenses.filter(e => e.transaction_type === 'expense' || !e.transaction_type), [localExpenses]);
  const incomesList = useMemo(() => localExpenses.filter(e => e.transaction_type === 'income'), [localExpenses]);

  // Completed in period (Paid expenses / Received incomes)
  const completedExpenses = expensesList.filter(e => e.status === 'paid' && e.paid_date >= dateRange.start && e.paid_date <= dateRange.end);
  const completedExpensesCRC = completedExpenses.filter(e => e.currency === 'CRC').reduce((acc, e) => acc + Number(e.amount), 0);
  const completedExpensesUSD = completedExpenses.filter(e => e.currency === 'USD').reduce((acc, e) => acc + Number(e.amount), 0);

  const completedIncomes = incomesList.filter(e => e.status === 'received' && e.paid_date >= dateRange.start && e.paid_date <= dateRange.end);
  const completedIncomesCRC = completedIncomes.filter(e => e.currency === 'CRC').reduce((acc, e) => acc + Number(e.amount), 0);
  const completedIncomesUSD = completedIncomes.filter(e => e.currency === 'USD').reduce((acc, e) => acc + Number(e.amount), 0);
  
  // Pending in period
  const pendingExpenses = expensesList.filter(e => e.status === 'pending' && e.due_date >= dateRange.start && e.due_date <= dateRange.end);
  const pendingExpensesCRC = pendingExpenses.filter(e => e.currency === 'CRC').reduce((acc, e) => acc + Number(e.amount), 0);
  const pendingExpensesUSD = pendingExpenses.filter(e => e.currency === 'USD').reduce((acc, e) => acc + Number(e.amount), 0);

  const pendingIncomes = incomesList.filter(e => e.status === 'pending' && e.due_date >= dateRange.start && e.due_date <= dateRange.end);
  const pendingIncomesCRC = pendingIncomes.filter(e => e.currency === 'CRC').reduce((acc, e) => acc + Number(e.amount), 0);
  const pendingIncomesUSD = pendingIncomes.filter(e => e.currency === 'USD').reduce((acc, e) => acc + Number(e.amount), 0);

  // Petty Cash combined balance
  const pettyCashBalanceCRC = localFunds.filter(f => f.currency === 'CRC').reduce((acc, f) => {
    const txs = localTxs.filter(t => t.fund_id === f.id);
    const balance = Number(f.initial_amount) + txs.reduce((sum, t) => (t.type === 'replenish' || t.type === 'income') ? sum + Number(t.amount) : sum - Number(t.amount), 0);
    return acc + balance;
  }, 0);

  // Filtered List based on active tab
  const activeList = useMemo(() => activeTab === 'expense' ? expensesList : incomesList, [activeTab, expensesList, incomesList]);
  const filteredList = useMemo(() => activeList.filter(e => {
    if (filterCategory && e.category_id !== filterCategory) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => new Date(b.due_date) - new Date(a.due_date)), [activeList, filterCategory, filterStatus]);

  // Category breakdown for active tab
  const categoryStats = useMemo(() => {
    return categories
      .filter(c => c.type === activeTab || c.type === 'both' || !c.type)
      .map(cat => {
        const catItems = activeList.filter(e => e.category_id === cat.id && (e.status === 'paid' || e.status === 'received') && e.paid_date >= dateRange.start && e.paid_date <= dateRange.end);
        const totalCRC = catItems.filter(e => e.currency === 'CRC').reduce((sum, e) => sum + Number(e.amount), 0);
        const totalUSD = catItems.filter(e => e.currency === 'USD').reduce((sum, e) => sum + Number(e.amount), 0);
        return { ...cat, totalCRC, totalUSD };
      }).sort((a, b) => a.sort_order - b.sort_order);
  }, [categories, activeList, dateRange, activeTab]);

  // Handle Confirm Transaction
  const handleConfirmTransaction = async (item, source, fundId = null) => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const isIncome = item.transaction_type === 'income';
    const newStatus = isIncome ? 'received' : 'paid';
    
    // Update status
    try {
      await updateOfficeExpense(item.id, {
        status: newStatus,
        paid_date: today,
        paid_by: profile.id,
        payment_source: source,
        petty_cash_fund_id: fundId
      }, supabase);

      setLocalExpenses(prev => prev.map(e => e.id === item.id ? { ...e, status: newStatus, paid_date: today, payment_source: source } : e));
      
      // If petty cash, create transaction
      if (source === 'petty_cash' && fundId) {
        const tx = {
          fund_id: fundId,
          type: isIncome ? 'income' : 'expense',
          amount: item.amount,
          expense_id: item.id, // we use expense_id for both to keep the schema simple
          description: item.description,
          created_by: profile.id
        };
        const newTx = await insertPettyCashTransaction(tx, supabase);
        if (newTx) setLocalTxs(prev => [newTx, ...prev]);
      }
    } catch (error) {
      console.error(error);
    }
    
    setLoading(false);
    setShowConfirmModal(null);
  };

  if (!isBroker && !isOfficeAssistant) {
    return <div className="p-10 text-center text-slate-500">Acceso denegado.</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── Timeframe Filter ── */}
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Periodo</span>
        <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm focus:ring-2 focus:ring-nexus-blue outline-none transition-all">
          <option value="this_month">{getTimeframeLabel('this_month')}</option>
          <option value="last_month">{getTimeframeLabel('last_month')}</option>
          <option value="next_month">{getTimeframeLabel('next_month')}</option>
          <option value="ytd">{getTimeframeLabel('ytd')}</option>
          <option value="all">{getTimeframeLabel('all')}</option>
        </select>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Ingresos ({getTimeframeLabel(timeframe)})</p>
          <div className="mt-2 space-y-1">
            <p className="text-xl font-black italic text-emerald-500">{fmt(completedIncomesCRC, 'CRC')}</p>
            {completedIncomesUSD > 0 && <p className="text-sm font-bold text-emerald-400/70">{fmt(completedIncomesUSD, 'USD')}</p>}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Gastos ({getTimeframeLabel(timeframe)})</p>
          <div className="mt-2 space-y-1">
            <p className="text-xl font-black italic text-red-500">{fmt(completedExpensesCRC, 'CRC')}</p>
            {completedExpensesUSD > 0 && <p className="text-sm font-bold text-red-400/70">{fmt(completedExpensesUSD, 'USD')}</p>}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{t('ofc_fin_petty_cash_balance')}</p>
          <div className="mt-2 space-y-1">
            <p className="text-xl font-black italic text-blue-500">{fmt(pettyCashBalanceCRC, 'CRC')}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-center gap-2">
          <button onClick={() => setShowExpenseModal('income')} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all">
            + Nuevo Ingreso
          </button>
          <button onClick={() => setShowExpenseModal('expense')} className="w-full bg-nexus-blue hover:bg-blue-700 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all">
            + Nuevo Gasto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left Column: Expense List & Categories ── */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full max-w-sm">
            <button
              onClick={() => { setActiveTab('expense'); setFilterCategory(''); setFilterStatus(''); }}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'expense' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Gastos
            </button>
            <button
              onClick={() => { setActiveTab('income'); setFilterCategory(''); setFilterStatus(''); }}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'income' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Ingresos
            </button>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest">
              Categorías de {activeTab === 'expense' ? 'Gastos' : 'Ingresos'} ({getTimeframeLabel(timeframe)})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categoryStats.map(cat => (
                <div key={cat.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">{cat.label_es}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{fmt(cat.totalCRC, 'CRC')}</p>
                  {cat.totalUSD > 0 && <p className="text-[10px] text-slate-400">{fmt(cat.totalUSD, 'USD')}</p>}
                </div>
              ))}
              {categoryStats.length === 0 && <p className="text-xs text-slate-400 col-span-full">No hay categorías configuradas.</p>}
            </div>
          </div>

          {/* Transaction List */}
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                Lista de {activeTab === 'expense' ? 'Gastos' : 'Ingresos'}
              </h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest">
                  <option value="">{t('ofc_fin_filter_all_cats')}</option>
                  {categories.filter(c => c.type === activeTab || c.type === 'both' || !c.type).map(c => <option key={c.id} value={c.id}>{c.label_es}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest">
                  <option value="">{t('ofc_fin_filter_all_status')}</option>
                  <option value="pending">{t('ofc_fin_status_pending')}</option>
                  <option value={activeTab === 'expense' ? 'paid' : 'received'}>{activeTab === 'expense' ? t('ofc_fin_status_paid') : 'RECIBIDO'}</option>
                </select>
              </div>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[600px] overflow-y-auto">
              {filteredList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No hay registros que mostrar</div>
              ) : filteredList.map(item => {
                const cat = categories.find(c => c.id === item.category_id);
                return (
                  <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg shadow-sm">
                        {cat?.icon || (activeTab === 'expense' ? '💸' : '💰')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{item.description}</p>
                          {item.is_recurring && <span className="text-[10px] text-blue-500" title={t('ofc_fin_recurring')}>🔄</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {item.due_date && new Date(item.due_date + 'T12:00:00').toLocaleDateString()} · {cat?.label_es}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className={`text-sm font-black tabular-nums ${activeTab === 'expense' ? 'text-slate-900 dark:text-white' : 'text-emerald-500'}`}>
                        {activeTab === 'income' ? '+' : ''}{fmt(item.amount, item.currency)}
                      </p>
                      {item.status === 'pending' ? (
                        <button onClick={() => setShowConfirmModal(item)} className="bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors">
                          {activeTab === 'expense' ? 'MARCAR PAGADO' : 'MARCAR RECIBIDO'}
                        </button>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                          {activeTab === 'expense' ? t('ofc_fin_status_paid') : 'RECIBIDO'} {item.payment_source === 'petty_cash' ? '💵' : '🏦'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right Column: Petty Cash & Config ── */}
        <div className="space-y-8">
          
          {/* Petty Cash Funds */}
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <span>💵</span> {t('ofc_fin_petty_cash')}
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {localFunds.map(fund => {
                const assistant = profiles.find(p => p.id === fund.assistant_id);
                const fundTxs = localTxs.filter(t => t.fund_id === fund.id);
                const balance = Number(fund.initial_amount) + fundTxs.reduce((sum, t) => (t.type === 'replenish' || t.type === 'income') ? sum + Number(t.amount) : sum - Number(t.amount), 0);
                
                return (
                  <div key={fund.id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Image src={assistant?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(assistant?.full_name || 'Asistente')}`} className="w-8 h-8 rounded-full border-2 border-slate-200" alt="" width={32} height={32} />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{assistant?.full_name || 'Asistente'}</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest">Responsable</p>
                        </div>
                      </div>
                      <p className="text-lg font-black text-blue-500">{fmt(balance, fund.currency)}</p>
                    </div>
                    {fundTxs.slice(0, 3).length > 0 && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 space-y-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('ofc_fin_petty_txs')}</p>
                        {fundTxs.slice(0, 3).map(tx => {
                          const isPositive = tx.type === 'replenish' || tx.type === 'income';
                          return (
                            <div key={tx.id} className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-600 dark:text-slate-400 truncate pr-2">
                                {isPositive ? `🟢 ${tx.type === 'replenish' ? 'Recarga' : 'Ingreso'}` : `🔴 ${tx.description}`}
                              </span>
                              <span className={`font-bold ${isPositive ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                {isPositive ? '+' : '-'}{fmt(tx.amount, fund.currency)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {localFunds.length === 0 && <div className="p-6 text-center text-xs text-slate-400">No hay fondos de caja chica configurados.</div>}
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals ── */}
      
      {/* Confirm Transaction Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black italic text-slate-900 dark:text-white">
              {showConfirmModal.transaction_type === 'income' ? 'MARCAR RECIBIDO' : 'MARCAR PAGADO'}
            </h3>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{showConfirmModal.description}</p>
              <p className="text-2xl font-black text-emerald-500 mt-1">{fmt(showConfirmModal.amount, showConfirmModal.currency)}</p>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {showConfirmModal.transaction_type === 'income' ? '¿A dónde ingresó el dinero?' : '¿De dónde salió el dinero?'}
              </p>
              <button disabled={loading} onClick={() => handleConfirmTransaction(showConfirmModal, 'bank')} className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 flex items-center justify-between group transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏦</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Cuenta Bancaria</p>
                    <p className="text-[10px] text-slate-500">Transferencia o tarjeta corporativa</p>
                  </div>
                </div>
              </button>
              
              {/* Petty cash options if currencies match */}
              {localFunds.filter(f => f.currency === showConfirmModal.currency).map(f => {
                const assistant = profiles.find(p => p.id === f.assistant_id);
                const fundTxs = localTxs.filter(t => t.fund_id === f.id);
                const balance = Number(f.initial_amount) + fundTxs.reduce((sum, t) => (t.type === 'replenish' || t.type === 'income') ? sum + Number(t.amount) : sum - Number(t.amount), 0);
                
                const isIncome = showConfirmModal.transaction_type === 'income';
                const hasSufficientFunds = balance >= showConfirmModal.amount;
                // Only disable if it's an expense and there's no money. If it's income, it always adds money.
                const isDisabled = loading || (!isIncome && !hasSufficientFunds);

                return (
                  <button key={f.id} disabled={isDisabled} onClick={() => handleConfirmTransaction(showConfirmModal, 'petty_cash', f.id)} className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 flex items-center justify-between group transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💵</span>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{t('ofc_fin_pay_from_petty')} ({assistant?.full_name?.split(' ')[0]})</p>
                        <p className={`text-[10px] font-black ${(!isIncome && !hasSufficientFunds) ? 'text-red-500' : 'text-slate-500'}`}>Balance actual: {fmt(balance, f.currency)}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
