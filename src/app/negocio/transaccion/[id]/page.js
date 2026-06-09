import { createAdminSupabase } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { getOfficeReservationById } from '@/lib/dal/office';

export const metadata = {
  title: 'Deal Room | REMAX Altitud',
  description: 'Progreso y Documentos de la Transacción',
};

// Next.js 15 requires async params
export default async function TransaccionPage(props) {
  const params = await props.params;
  const { id } = params;

  if (!id) return notFound();

  const supabase = createAdminSupabase();
  if (!supabase) {
    return <div className="p-8 text-center text-red-500">Error: Service Role no configurado.</div>;
  }

  // Fetch the reservation bypassing RLS
  let res;
  try {
    res = await getOfficeReservationById(id, supabase);
  } catch (error) {
    res = null;
  }

  if (!res) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B1120]">
        <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Transacción No Encontrada</h1>
          <p className="text-slate-500">El enlace es inválido o la reserva ha sido eliminada.</p>
        </div>
      </div>
    );
  }

  // Calculate timeline progress
  const today = new Date();
  const dates = [
    { label: 'Firma Esperada', date: res.expected_sign_date },
    { label: 'Depósito Límite', date: res.earnest_money_deadline },
    { label: 'Fin Due Diligence', date: res.earnest_money_non_refundable_date },
    { label: 'Cierre Límite', date: res.close_deadline }
  ].filter(d => d.date).sort((a, b) => new Date(a.date) - new Date(b.date));

  // DD Items
  const ddItems = res.due_diligence_items || [];
  const readyItems = ddItems.filter(i => i.status === 'ready').length;
  const totalItems = ddItems.length;
  const progressPct = totalItems > 0 ? Math.round((readyItems / totalItems) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 selection:bg-brand-500/30 font-sans">
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-brand-600 dark:text-brand-500 font-bold text-xl tracking-tight">ALTITUD</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-xs font-semibold text-slate-500 dark:text-slate-400">DEAL ROOM</span>
          </div>
          <div className="text-sm font-medium text-slate-500">
            Agente: <span className="text-slate-900 dark:text-white">{res.profiles?.full_name || 'REMAX Agent'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Title Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <p className="text-brand-600 font-semibold mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                Transacción Activa
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">{res.property_address}</h1>
              <p className="text-slate-500 text-lg">{res.client_name} • {res.type}</p>
            </div>
            
            {res.drive_folder_url && (
              <a 
                href={res.drive_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#0F9D58] hover:bg-[#0b8043] text-white rounded-2xl font-bold transition-all shadow-lg shadow-[#0F9D58]/30 hover:shadow-[#0F9D58]/50 hover:-translate-y-1 w-full md:w-auto"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                Abrir en Google Drive
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Timeline */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                ⏳ Timeline
              </h3>
              
              {dates.length === 0 ? (
                <p className="text-sm text-slate-500">No hay fechas definidas para esta transacción.</p>
              ) : (
                <div className="relative pl-4 space-y-8 border-l-2 border-slate-200 dark:border-slate-800">
                  {dates.map((d, idx) => {
                    const isPast = new Date(d.date) < today;
                    return (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[21px] w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${isPast ? 'bg-emerald-500' : 'bg-brand-500'}`}></div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{d.label}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-900 dark:text-slate-200 mb-2">Información de Contacto</p>
              <p>Si tienes dudas sobre los documentos o las fechas, contacta a:</p>
              <p className="mt-4 font-medium text-slate-900 dark:text-white">{res.profiles?.full_name}</p>
              <p>{res.profiles?.email}</p>
              <p>{res.profiles?.phone}</p>
            </div>
          </div>

          {/* Right Column: Due Diligence */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    📑 Due Diligence
                  </h3>
                  <p className="text-slate-500">Progreso de recolección de documentos</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-brand-600 dark:text-brand-400">{progressPct}%</p>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{readyItems} de {totalItems} listos</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-8">
                <div 
                  className="h-full bg-brand-500 transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${progressPct}%` }}
                ></div>
              </div>

              {/* Checklist */}
              {totalItems === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-4xl mb-3">📁</div>
                  <p>Aún no se ha configurado la lista de Due Diligence.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ddItems.map(item => (
                    <div key={item.id} className="flex items-start md:items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 gap-4 flex-col md:flex-row hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                          item.status === 'ready' ? 'bg-emerald-500 border-emerald-500 text-white' : 
                          item.status === 'in_progress' ? 'border-brand-500 text-brand-500' :
                          'border-slate-300 dark:border-slate-600'
                        }`}>
                          {item.status === 'ready' && <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{item.document_name || item.item_name}</p>
                          <p className="text-sm text-slate-500">{item.notes || 'Sin notas adicionales'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto pl-10 md:pl-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          item.status === 'ready' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          item.status === 'in_progress' ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' :
                          'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {item.status === 'ready' ? 'Listo' : item.status === 'in_progress' ? 'En Trámite' : 'Pendiente'}
                        </span>
                        {item.file_url && (
                          <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors" title="Abrir Documento">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
