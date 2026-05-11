"use client";

import { useState } from 'react';
import Image from 'next/image';

export default function PortalClient({ search, initialPipeline }) {
  const [voterName, setVoterName] = useState('');
  const [isIdentified, setIsIdentified] = useState(false);
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('tinder'); // 'tinder' or 'matrix'

  const agent = search.profiles;
  const mustHaves = search.must_haves || [];
  const niceToHaves = search.nice_to_haves || [];

  // Filter out items that have already been voted on by this voter, or just show them all and let them override?
  // Let's show all and highlight if they already voted, or just let them vote on the remaining ones.
  const unvotedItems = pipeline.filter(p => !p.votes.some(v => v.voter_name.toLowerCase() === voterName.toLowerCase() && v.decision));

  const handleIdentify = (e) => {
    e.preventDefault();
    if (voterName.trim()) {
      setIsIdentified(true);
    }
  };

  const handleVote = async (pipeline_id, decision, rating = null) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/portal/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline_id,
          voter_name: voterName,
          decision,
          rating
        })
      });

      if (res.ok) {
        const { vote } = await res.json();
        // Update local state
        setPipeline(prev => prev.map(p => {
          if (p.pipeline_id === pipeline_id) {
            return { ...p, votes: [...p.votes, vote] };
          }
          return p;
        }));
        // Move to next item if in tinder mode
        if (viewMode === 'tinder' && currentIndex < unvotedItems.length - 1) {
          setCurrentIndex(c => c + 1);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error al enviar el voto. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isIdentified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl max-w-md w-full p-8 text-center border border-slate-100 dark:border-slate-700">
          {agent?.avatar_url && (
            <Image src={agent.avatar_url} alt={agent.full_name} className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-brand-50" width={80} height={80} />
          )}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">¡Hola!</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
            {agent?.full_name} ha preparado una selección de propiedades basada en tus requerimientos para <strong>{search.property_type}</strong>.
          </p>
          <form onSubmit={handleIdentify}>
            <input 
              type="text" 
              placeholder="¿Cuál es tu nombre?" 
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              className="w-full text-center text-lg px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              required
            />
            <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md">
              Ver Propiedades
            </button>
            <p className="text-xs text-slate-400 mt-4">Si estás buscando en pareja, cada uno puede ingresar con su propio nombre para votar de forma independiente.</p>
          </form>
        </div>
      </div>
    );
  }

  const currentItem = unvotedItems[currentIndex];

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          {agent?.avatar_url ? (
            <Image src={agent.avatar_url} alt={agent.full_name} className="w-10 h-10 rounded-full" width={40} height={40} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
              {agent?.full_name?.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">Preparado por</p>
            <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{agent?.full_name}</p>
          </div>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
          <button 
            onClick={() => setViewMode('tinder')} 
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'tinder' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Descubrir
          </button>
          <button 
            onClick={() => setViewMode('matrix')} 
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'matrix' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Comparar
          </button>
        </div>
      </div>

      {viewMode === 'tinder' && (
        <div className="p-4 md:p-8 mt-4">
          {!currentItem ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">¡Todo al día, {voterName}!</h2>
              <p className="text-slate-500 mt-2">Has revisado todas las propiedades enviadas por {agent?.full_name}.</p>
              <button onClick={() => setViewMode('matrix')} className="mt-6 text-brand-600 font-medium hover:underline">Ver resumen de evaluación</button>
            </div>
          ) : (
            <div className="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700 relative">
              {/* Image Carousel (Simplified for now, taking first image or generic) */}
              <div className="aspect-[4/5] relative bg-slate-200 dark:bg-slate-700">
                {currentItem.details.main_image_url || currentItem.details.image_urls?.[0] ? (
                  <Image src={currentItem.details.main_image_url || currentItem.details.image_urls[0]} alt="Propiedad" className="w-full h-full object-cover" fill />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">Sin foto</div>
                )}
                
                {/* Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-20">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-white text-2xl font-bold nexus-header leading-tight">
                        {currentItem.details.name || 'Propiedad Confidencial'}
                      </h2>
                      <p className="text-white/80 text-sm mt-1">{currentItem.details.location || currentItem.details.zone || 'Ubicación protegida'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-black text-xl">${Number(currentItem.details.list_price || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="flex space-x-3 mt-4">
                    {(currentItem.details.bedrooms || currentItem.details.beds) && (
                      <div className="bg-white/20 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md font-medium">
                        {currentItem.details.bedrooms || currentItem.details.beds} Cuartos
                      </div>
                    )}
                    {(currentItem.details.bathrooms || currentItem.details.baths) && (
                      <div className="bg-white/20 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md font-medium">
                        {currentItem.details.bathrooms || currentItem.details.baths} Baños
                      </div>
                    )}
                    {currentItem.details.construction_size && (
                      <div className="bg-white/20 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md font-medium">
                        {currentItem.details.construction_size} m²
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 flex justify-center items-center space-x-6 bg-slate-50 dark:bg-slate-900">
                <button 
                  disabled={submitting}
                  onClick={() => handleVote(currentItem.pipeline_id, 'descartar')}
                  className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-red-100 flex items-center justify-center text-red-500 hover:scale-110 transition-transform disabled:opacity-50"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <button 
                  disabled={submitting}
                  onClick={() => handleVote(currentItem.pipeline_id, 'visita', 5)}
                  className="w-20 h-20 rounded-full bg-brand-500 shadow-xl shadow-brand-500/30 text-white flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                >
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path></svg>
                </button>
                <button 
                  disabled={submitting}
                  onClick={() => handleVote(currentItem.pipeline_id, 'interesado', 3)}
                  className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-yellow-100 flex items-center justify-center text-yellow-500 hover:scale-110 transition-transform disabled:opacity-50"
                  title="Tal vez..."
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                </button>
              </div>
            </div>
          )}
          
          <p className="text-center text-xs text-slate-400 mt-6">
            Desliza o usa los botones. <strong className="text-red-500">X</strong> descarta, <strong className="text-brand-500">Corazón</strong> solicita visita, <strong className="text-yellow-500">Flecha</strong> la guarda para después.
          </p>
        </div>
      )}

      {viewMode === 'matrix' && (
        <div className="p-4 md:p-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white nexus-header">Resumen de Evaluación</h2>
              <p className="text-xs text-slate-500 mt-1">Compara los indicadores clave de las propiedades.</p>
            </div>
            
            <div className="overflow-x-auto">
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
                                <Image src={p.details.main_image_url || p.details.image_urls[0]} alt="Prop" className="w-full h-full object-cover" fill />
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
