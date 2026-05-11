with open('src/app/busqueda/BusquedaClient.jsx', 'r') as f:
    content = f.read()

btn_old = """                              <div className="mt-3 flex gap-2">
                                {!pipe || pipe.status === 'enviada' ? (
                                  <button onClick={() => updateStatus(m.id, m.type, 'enviada')} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-colors ${pipe?.status === 'enviada' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-blue-50'}`}>
                                    {pipe?.status === 'enviada' ? 'Enviada' : 'Marcar Enviada'}
                                  </button>
                                ) : null}"""

btn_new = """                              <div className="mt-3 flex gap-2">
                                {m.type === 'acm' || m.type === 'prelisting' ? (
                                  <div className="text-[10px] px-3 py-1.5 rounded-lg font-bold bg-amber-100 text-amber-700 flex items-center gap-1" title="Propiedad interna en captación. Contacta al agente.">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    En Captación
                                  </div>
                                ) : (!pipe || pipe.status === 'enviada') ? (
                                  <button onClick={() => updateStatus(m.id, m.type, 'enviada')} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-colors ${pipe?.status === 'enviada' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-blue-50'}`}>
                                    {pipe?.status === 'enviada' ? 'Enviada' : 'Marcar Enviada'}
                                  </button>
                                ) : null}"""

content = content.replace(btn_old, btn_new)

with open('src/app/busqueda/BusquedaClient.jsx', 'w') as f:
    f.write(content)
