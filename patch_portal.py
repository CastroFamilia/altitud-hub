import re

with open('src/app/portal/busqueda/[id]/PortalClient.jsx', 'r') as f:
    content = f.read()

# Replace variables at the top
top_old = """  const agent = search.profiles;
  const parameters = search.evaluation_parameters || ["Ubicación", "Precio", "Metros Cuadrados", "Estado de Conservación"];"""

top_new = """  const agent = search.profiles;
  const mustHaves = search.must_haves || [];
  const niceToHaves = search.nice_to_haves || [];"""

content = content.replace(top_old, top_new)

# Replace Matrix Table
matrix_old = """            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Propiedad</th>
                    <th className="px-6 py-4 font-medium text-center">Tu Voto</th>
                    {parameters.map(param => (
                      <th key={param} className="px-6 py-4 font-medium">{param}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {pipeline.map(p => {
                    const myVotes = p.votes.filter(v => v.voter_name.toLowerCase() === voterName.toLowerCase());
                    const lastVote = myVotes[myVotes.length - 1];
                    
                    return (
                      <tr key={p.pipeline_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                              {p.details.main_image_url || p.details.image_urls?.[0] ? (
                                <img src={p.details.main_image_url || p.details.image_urls[0]} alt="Prop" className="w-full h-full object-cover" />
                              ) : null}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{p.details.name || 'Propiedad Confidencial'}</p>
                              <p className="text-xs text-slate-500">${Number(p.details.list_price || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {lastVote ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                              lastVote.decision === 'descartar' ? 'bg-red-100 text-red-600' :
                              lastVote.decision === 'visita' ? 'bg-green-100 text-green-600' : 'bg-brand-100 text-brand-600'
                            }`}>
                              {lastVote.decision.charAt(0).toUpperCase() + lastVote.decision.slice(1)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">- Pendiente -</span>
                          )}
                        </td>
                        {/* Mock data for parameters since we don't have a way for clients to edit the cells yet, 
                            ideally this comes from p.details or a separate evaluation matrix JSON */}
                        {parameters.map(param => (
                          <td key={param} className="px-6 py-4 text-slate-600 dark:text-slate-300">
                            {param.toLowerCase().includes('precio') ? `$${Number(p.details.list_price || 0).toLocaleString()}` :
                             param.toLowerCase().includes('metro') ? (p.details.construction_size || p.details.lot_size || '-') :
                             param.toLowerCase().includes('ubica') ? (p.details.location || p.details.zone || '-') :
                             '-'}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>"""

matrix_new = """            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Propiedad</th>
                    <th className="px-6 py-4 font-medium text-center border-r border-slate-200 dark:border-slate-700">Votos Familiares</th>
                    {mustHaves.map(param => (
                      <th key={param} className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">{param}</th>
                    ))}
                    {niceToHaves.map(param => (
                      <th key={param} className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400 border-r border-slate-200 dark:border-slate-700">{param}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {pipeline.map(p => {
                    const uniqueVoters = Array.from(new Set(p.votes.map(v => v.voter_name)));
                    
                    return (
                      <tr key={p.pipeline_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                              {p.details.main_image_url || p.details.image_urls?.[0] ? (
                                <img src={p.details.main_image_url || p.details.image_urls[0]} alt="Prop" className="w-full h-full object-cover" />
                              ) : null}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{p.details.name || 'Propiedad Confidencial'}</p>
                              <p className="text-xs text-slate-500">${Number(p.details.list_price || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center border-r border-slate-200 dark:border-slate-700">
                          <div className="flex flex-col gap-1 items-center">
                            {uniqueVoters.length > 0 ? uniqueVoters.map(vn => {
                              const vVote = p.votes.filter(v => v.voter_name === vn).pop();
                              if(!vVote) return null;
                              return (
                                <span key={vn} className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${
                                  vVote.decision === 'descartar' ? 'bg-red-100 text-red-600' :
                                  vVote.decision === 'visita' ? 'bg-green-100 text-green-600' : 'bg-brand-100 text-brand-600'
                                }`}>
                                  {vn}: {vVote.decision.charAt(0).toUpperCase() + vVote.decision.slice(1)}
                                </span>
                              )
                            }) : (
                              <span className="text-xs text-slate-400">- Sin votos -</span>
                            )}
                          </div>
                        </td>
                        {mustHaves.map(param => {
                           const match = p.requirements_match?.[param];
                           return (
                             <td key={param} className="px-6 py-4 text-center border-r border-slate-200 dark:border-slate-700">
                               {match === true ? '✅' : match === false ? '❌' : '-'}
                             </td>
                           )
                        })}
                        {niceToHaves.map(param => {
                           const match = p.requirements_match?.[param];
                           return (
                             <td key={param} className="px-6 py-4 text-center border-r border-slate-200 dark:border-slate-700">
                               {match === true ? '✅' : match === false ? '❌' : '-'}
                             </td>
                           )
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>"""

if matrix_old in content:
    content = content.replace(matrix_old, matrix_new)
else:
    print("Warning: Matrix old not found!")

with open('src/app/portal/busqueda/[id]/PortalClient.jsx', 'w') as f:
    f.write(content)
