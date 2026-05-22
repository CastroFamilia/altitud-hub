import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { getAgentAcmReports, getAgentNotes } from '@/lib/dal/office';
import AgentOffboardModal from '@/components/oficina/AgentOffboardModal';
import Image from 'next/image';

export default function AgentEditModal({ profile, profiles, teams, selectedOffice, onClose, onUpdateProfile, onOffboardComplete, t, splitTiers = ['45/55', '60/40', '80/20'] }) {
  const { supabase } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [role, setRole] = useState(profile.role);
  const [teamId, setTeamId] = useState(profile.team_id || '');
  const [commissionSplit, setCommissionSplit] = useState(profile.commission_split || '45/55');
  const [monthlyFee, setMonthlyFee] = useState(profile.monthly_fee || 0);
  const [feeStartDate, setFeeStartDate] = useState(profile.fee_start_date || '');
  
  // Evaluation & Notes State
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [analyzingBehavior, setAnalyzingBehavior] = useState(false);
  const [showOffboard, setShowOffboard] = useState(false);

  // Estado de Cuenta State
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const fetchTransactions = useCallback(async () => {
    setLoadingTx(true);
    try {
      const data = await getAgentAcmReports(profile.id, supabase);
      if (data) setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTx(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  const fetchNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const data = await getAgentNotes(profile.id, supabase);
      if (data) setNotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotes(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  useEffect(() => {
    if (activeTab === 'evaluacion') {
    // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchNotes();
    } else if (activeTab === 'estado-cuenta') {
      fetchTransactions();
    }
  }, [activeTab, fetchNotes, fetchTransactions]);

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch('/api/agent-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: profile.id, note_content: newNote }),
      });
      const data = await res.json();
      if (data.success) {
        setNotes([data.note, ...notes]);
        setNewNote('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleUploadPsicotest = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert("Por favor sube un archivo PDF.");
      return;
    }

    setUploadingPdf(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result;
        
        const res = await fetch('/api/drive/upload-agent-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: profile.full_name,
            pdfBase64: base64,
            documentType: 'Psicotest_Maia'
          })
        });
        
        const data = await res.json();
        if (data.success) {
          // Update profile with file url and id
          await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: profile.id,
              psicotest_url: data.fileUrl,
              psicotest_file_id: data.fileId
            })
          });
          profile.psicotest_url = data.fileUrl;
          profile.psicotest_file_id = data.fileId;
          // trigger re-render
          setUploadingPdf(false);
        } else {
          alert("Error: " + data.error);
        }
      };
    } catch (err) {
      console.error(err);
      alert("Error al subir archivo");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleAskOlympia = async () => {
    if (!profile.psicotest_file_id) {
      alert("Primero debes subir el Psicotest en PDF para que Olympia pueda analizarlo.");
      return;
    }

    setAnalyzingBehavior(true);
    try {
      const res = await fetch('/api/olympia/agent-behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: profile.psicotest_file_id })
      });
      const data = await res.json();
      if (data.success) {
        // Save analysis to profile
        await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: profile.id,
            olympia_behavior_analysis: data.analysis
          })
        });
        // Do not mutate profile directly, mutate the parent state if possible or keep local
        // Here we just notify user. To update UI, we rely on parent's state or a refetch
        alert("Análisis completado exitosamente.");
      } else {
        alert("Error de Olympia: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error al analizar con Olympia");
    } finally {
      setAnalyzingBehavior(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div
        className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=5a82bf&color=fff`}
              className="w-14 h-14 rounded-full border-2 border-slate-200"
              alt="" width={56} height={56} />
            <div>
              <h3 className="text-xl font-black italic text-slate-900 dark:text-white">{profile.full_name}</h3>
              <p className="text-sm text-slate-400">{profile.email}</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'general'
                  ? 'bg-white dark:bg-slate-700 text-nexus-blue shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('evaluacion')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'evaluacion'
                  ? 'bg-white dark:bg-slate-700 text-nexus-blue shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              Evaluación & Notas
            </button>
            <button
              onClick={() => setActiveTab('estado-cuenta')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'estado-cuenta'
                  ? 'bg-white dark:bg-slate-700 text-nexus-blue shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              {t('ofc_acc_statement')}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          {activeTab === 'general' ? (
            <div className="space-y-6 max-w-md mx-auto py-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('ofc_manual_role')}</label>
                <div className="flex gap-2">
                  {['agent', 'junior', 'team_leader'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                        role === r
                          ? 'bg-nexus-blue text-white border-nexus-blue'
                          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {r === 'agent' ? t('ofc_role_agent') : r === 'junior' ? t('ofc_role_junior') : t('ofc_role_leader')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('ofc_manual_team')}</label>
                <select
                  value={teamId}
                  onChange={e => setTeamId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('ofc_manual_no_team')}</option>
                  {teams.filter(team => team.office === selectedOffice).map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Split Comisional</label>
                <select
                  value={commissionSplit}
                  onChange={e => setCommissionSplit(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  {splitTiers.map(tier => (
                    <option key={tier} value={tier}>{tier} (Agente {tier.split('/')[0]}%)</option>
                  ))}
                  {!splitTiers.includes(commissionSplit) && (
                    <option value={commissionSplit}>{commissionSplit} (Personalizado)</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Monto del Fee Mensual ($)</label>
                  <input
                    type="number"
                    value={monthlyFee}
                    onChange={e => setMonthlyFee(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    placeholder="Ej. 450"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Fecha de Cobro (Inicio)</label>
                  <input
                    type="date"
                    value={feeStartDate}
                    onChange={e => setFeeStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'estado-cuenta' ? (
            <div className="space-y-6">
              {/* Resumen de Saldo */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t('ofc_acc_statement')}</h4>
                  <p className="text-xs text-slate-500">Historial financiero y saldo pendiente con la oficina.</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('ofc_balance_total')}</p>
                  <p className={`text-2xl font-black italic ${
                    transactions.reduce((acc, t) => acc + (t.type === 'office_charge' ? Number(t.amount) : -Number(t.amount)), 0) > 0 
                      ? 'text-red-500' 
                      : 'text-emerald-500'
                  }`}>
                    ${Math.abs(transactions.reduce((acc, t) => acc + (t.type === 'office_charge' ? Number(t.amount) : -Number(t.amount)), 0)).toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </p>
                  {transactions.reduce((acc, t) => acc + (t.type === 'office_charge' ? Number(t.amount) : -Number(t.amount)), 0) > 0 && <p className="text-[9px] text-red-500/70 font-bold uppercase mt-1">{t('ofc_debt')}</p>}
                  {transactions.reduce((acc, t) => acc + (t.type === 'office_charge' ? Number(t.amount) : -Number(t.amount)), 0) === 0 && <p className="text-[9px] text-emerald-500/70 font-bold uppercase mt-1">{t('ofc_up_to_date')}</p>}
                </div>
              </div>

              {/* Filtros */}
              <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('ofc_monthly_history')}</h3>
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue"
                />
              </div>

              {/* Lista de Transacciones */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loadingTx ? (
                  <div className="p-8 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-nexus-blue border-t-transparent rounded-full"></div></div>
                ) : transactions.filter(t => t.date.startsWith(selectedMonth)).length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <p className="text-xs font-bold uppercase tracking-widest">No hay transacciones este mes.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Concepto / Cat.</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {transactions.filter(t => t.date.startsWith(selectedMonth)).map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{t.description || t.category}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                              t.type === 'office_charge' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 
                              t.type === 'agent_payment' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 
                              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {t.type === 'office_charge' ? 'Cargo Oficina' : t.type === 'agent_payment' ? 'Pago Recibido' : 'Gasto Personal'}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-black italic text-sm ${t.type === 'agent_payment' ? 'text-emerald-500' : t.type === 'office_charge' ? 'text-red-500' : 'text-slate-400'}`}>
                            {t.type === 'agent_payment' ? '+' : '-'}${Number(t.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Col: Psicotest & Olympia */}
              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-nexus-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Psicotest de Maia (PDF)
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">Sube el resultado del psicotest para analizar su perfil de comportamiento.</p>
                  
                  {profile.psicotest_url ? (
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200">
                      <a href={profile.psicotest_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-nexus-blue hover:underline">
                        Ver Documento PDF
                      </a>
                      <label className="text-[10px] font-black uppercase text-slate-400 cursor-pointer hover:text-slate-600">
                        Cambiar
                        <input type="file" accept="application/pdf" className="hidden" onChange={handleUploadPsicotest} />
                      </label>
                    </div>
                  ) : (
                    <label className="w-full flex items-center justify-center py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-nexus-blue transition-colors group">
                      <div className="text-center">
                        <span className="text-xs font-bold text-slate-500 group-hover:text-nexus-blue">
                          {uploadingPdf ? 'Subiendo...' : 'Click para subir PDF'}
                        </span>
                      </div>
                      <input type="file" accept="application/pdf" className="hidden" disabled={uploadingPdf} onChange={handleUploadPsicotest} />
                    </label>
                  )}
                </div>

                {profile.psicotest_url && (
                  <div className="bg-nexus-blue/5 border border-nexus-blue/20 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-nexus-blue flex items-center gap-2">
                        <span>🧠</span> Análisis de Olympia
                      </h4>
                      {!profile.olympia_behavior_analysis && (
                        <button 
                          onClick={handleAskOlympia}
                          disabled={analyzingBehavior}
                          className="bg-nexus-blue text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {analyzingBehavior ? 'Analizando...' : 'Generar Consejo'}
                        </button>
                      )}
                    </div>
                    
                    {profile.olympia_behavior_analysis ? (
                      <div className="prose prose-sm dark:prose-invert prose-p:text-xs prose-headings:text-sm prose-headings:font-bold prose-p:leading-relaxed max-w-none bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div dangerouslySetInnerHTML={{ __html: profile.olympia_behavior_analysis.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No se ha generado un análisis para este agente todavía.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Col: Meeting Notes */}
              <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>💬</span> Notas de Reuniones (Privado Broker)
                  </h4>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[300px]">
                  {loadingNotes ? (
                    <p className="text-xs text-center text-slate-400">Cargando notas...</p>
                  ) : notes.length === 0 ? (
                    <p className="text-xs text-center text-slate-400 italic">No hay notas registradas.</p>
                  ) : (
                    notes.map(note => (
                      <div key={note.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">{note.note_content}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 font-medium">
                            <Image src={note.author?.avatar_url} alt="" className="w-4 h-4 rounded-full" width={16} height={16} />
                            {note.author?.full_name}
                          </span>
                          <span>{new Date(note.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Escribe una nota sobre el desempeño, reunión 1-on-1, etc..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 resize-none h-20"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNote}
                      disabled={savingNote || !newNote.trim()}
                      className="bg-slate-800 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-colors disabled:opacity-50"
                    >
                      {savingNote ? 'Guardando...' : 'Agregar Nota'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Only for General Tab to update role/team) */}
        {activeTab === 'general' && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 rounded-b-[32px]">
            <button
              onClick={() => setShowOffboard(true)}
              className="py-2.5 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 border border-red-200 dark:border-red-800/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
              </svg>
              {t('ofc_offboard_btn')}
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="py-2.5 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onUpdateProfile(profile.id, { 
                    role, 
                    team_id: teamId || null, 
                    commission_split: commissionSplit,
                    monthly_fee: Number(monthlyFee) || 0,
                    fee_start_date: feeStartDate || null
                  });
                }}
                className="py-2.5 px-8 rounded-xl text-[11px] font-black uppercase tracking-widest bg-nexus-blue text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
              >
                {t('ofc_done')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Offboarding Modal */}
      {showOffboard && (
        <AgentOffboardModal
          profile={profile}
          profiles={profiles}
          onClose={() => setShowOffboard(false)}
          onComplete={() => {
            setShowOffboard(false);
            onOffboardComplete?.();
            onClose();
          }}
        />
      )}
    </div>
  );
}
