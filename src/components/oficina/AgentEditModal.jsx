import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';

export default function AgentEditModal({ profile, teams, selectedOffice, onClose, onUpdateProfile, t }) {
  const [activeTab, setActiveTab] = useState('general');
  const [role, setRole] = useState(profile.role);
  const [teamId, setTeamId] = useState(profile.team_id || '');
  
  // Evaluation & Notes State
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [analyzingBehavior, setAnalyzingBehavior] = useState(false);

  useEffect(() => {
    if (activeTab === 'evaluacion') {
      fetchNotes();
    }
  }, [activeTab]);

  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await fetch(`/api/agent-notes?agent_id=${profile.id}`);
      const data = await res.json();
      if (data.notes) setNotes(data.notes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotes(false);
    }
  };

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
        profile.olympia_behavior_analysis = data.analysis;
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
            <img
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=5a82bf&color=fff`}
              className="w-14 h-14 rounded-full border-2 border-slate-200"
              alt=""
            />
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
          </div>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          {activeTab === 'general' ? (
            <div className="space-y-6 max-w-md mx-auto py-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('ofc_manual_role')}</label>
                <div className="flex gap-2">
                  {['agent', 'team_leader'].map(r => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                        role === r
                          ? 'bg-nexus-blue text-white border-nexus-blue'
                          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {r === 'agent' ? t('ofc_role_junior') : t('ofc_role_leader')}
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
                            <img src={note.author?.avatar_url} alt="" className="w-4 h-4 rounded-full" />
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
          <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-[32px]">
            <button
              onClick={onClose}
              className="py-2.5 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onUpdateProfile(profile.id, { role, team_id: teamId || null });
              }}
              className="py-2.5 px-8 rounded-xl text-[11px] font-black uppercase tracking-widest bg-nexus-blue text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              {t('ofc_done')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
