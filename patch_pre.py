import os
if os.path.exists('src/app/prelisting/PrelistingClient.jsx'):
    with open('src/app/prelisting/PrelistingClient.jsx', 'r') as f:
        content = f.read()

    import_old = "import { useState } from 'react';"
    import_new = "import { useState, useEffect } from 'react';"
    content = content.replace(import_old, import_new)

    state_old = "  const [showNewModal, setShowNewModal] = useState(false);"
    state_new = """  const [showNewModal, setShowNewModal] = useState(false);
  const [activeSearches, setActiveSearches] = useState([]);
  
  useEffect(() => {
    fetch('/api/searches?all=true')
      .then(res => res.json())
      .then(data => {
        if(data.searches) {
          setActiveSearches(data.searches.filter(s => s.status === 'activa'));
        }
      })
      .catch(console.error);
  }, []);"""
    content = content.replace(state_old, state_new)

    render_old = """            {/* Empty State */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">"""
    
    render_new = """            {/* Cruces / Matchmaking */}
            {activeSearches.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[32px] p-8 shadow-sm border border-blue-200 dark:border-blue-800/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic text-blue-900 dark:text-blue-100">Cruces Inteligentes</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">Existen {activeSearches.length} búsquedas activas en la red que podrían hacer match con tus nuevas captaciones.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSearches.slice(0, 6).map(s => (
                    <div key={s.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                      <div className="flex items-center gap-2 mb-2">
                        {s.profiles?.avatar_url ? (
                          <img src={s.profiles.avatar_url} alt="agent" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                            {s.profiles?.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{s.profiles?.full_name || 'Agente'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{s.property_type}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest my-1">
                        {s.operation_type === 'alquiler' ? 'ALQ' : 'VTA'} • {(s.zones && s.zones.length > 0) ? s.zones.join(', ') : 'Sin zona'}
                      </p>
                      <p className="text-xs font-black italic text-nexus-blue">
                        ${Number(s.price_min || 0).toLocaleString()} - ${Number(s.price_max || 0).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">"""
    
    if render_old in content:
        content = content.replace(render_old, render_new)
        with open('src/app/prelisting/PrelistingClient.jsx', 'w') as f:
            f.write(content)
