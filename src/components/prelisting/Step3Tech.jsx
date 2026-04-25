export default function Step3Tech({ formData, updateForm, onPrev, onSubmit, isSubmitting }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    updateForm(name, value);
  };

  const type = formData.property_type || 'house';

  return (
    <div className="bg-white dark:bg-dark-panel p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border space-y-8 fade-in">
      <div className="mb-8 flex items-center">
          <button onClick={onPrev} className="mr-4 w-10 h-10 rounded-full border border-gray-300 dark:border-dark-border flex justify-center items-center text-gray-500 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ficha Técnica Adaptativa</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Estos datos se exportarán automáticamente a la herramienta de Análisis de Mercado (ACM).</p>
          </div>
      </div>

      {/* DYNAMIC RENDERING */}
      {(type === 'house' || type === 'condo') && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <div>
                  <label className="form-label">m² Construcción</label>
                  <div className="relative"><input type="number" name="m2_const" value={formData.m2_const || ''} onChange={handleChange} className="form-input pr-8" placeholder="0"/><span className="absolute right-3 top-2.5 text-xs text-gray-400">m²</span></div>
              </div>
              {type === 'house' && (
                <div>
                    <label className="form-label">m² Lote Total</label>
                    <div className="relative"><input type="number" name="m2_lot" value={formData.m2_lot || ''} onChange={handleChange} className="form-input pr-8" placeholder="0"/><span className="absolute right-3 top-2.5 text-xs text-gray-400">m²</span></div>
                </div>
              )}
              {type === 'condo' && (
                <div>
                   <label className="form-label">Cuota HOA (Mensual)</label>
                   <div className="relative"><span className="absolute left-3 top-2.5 text-xs text-gray-400">$</span><input type="number" name="hoa_fee" value={formData.hoa_fee || ''} onChange={handleChange} className="form-input pl-6" placeholder="250"/></div>
                </div>
              )}
              <div>
                  <label className="form-label">Año de Construcción</label>
                  <input type="number" name="year_built" value={formData.year_built || ''} onChange={handleChange} className="form-input" placeholder="2010" />
              </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pt-4 border-t border-gray-100 dark:border-dark-border">
              <div><label className="form-label">Dormitorios</label><input type="number" name="bedrooms" value={formData.bedrooms || ''} onChange={handleChange} className="form-input" placeholder="3"/></div>
              <div><label className="form-label">Baños</label><input type="number" name="bathrooms" value={formData.bathrooms || ''} onChange={handleChange} className="form-input" placeholder="2"/></div>
              <div><label className="form-label">Cocheras</label><input type="number" name="parking" value={formData.parking || ''} onChange={handleChange} className="form-input" placeholder="2"/></div>
          </div>
        </>
      )}

      {(type === 'land' || type === 'farm') && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                  <label className="form-label">Área de Terreno</label>
                  <div className="relative"><input type="number" name="area_ha" value={formData.area_ha || ''} onChange={handleChange} className="form-input pr-8" placeholder="0"/><span className="absolute right-3 top-2.5 text-xs text-gray-400">m² / ha</span></div>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-gray-100 dark:border-dark-border">
              <div>
                  <label className="form-label">Agua Disponible</label>
                  <select name="water" value={formData.water || ''} onChange={handleChange} className="form-input"><option value="">Seleccionar</option><option value="asada">Asada / AyA</option><option value="well">Pozo Propio</option><option value="none">No Tiene</option></select>
              </div>
              <div>
                  <label className="form-label">Luz Disponible</label>
                  <select name="power" value={formData.power || ''} onChange={handleChange} className="form-input"><option value="">Seleccionar</option><option value="foot">A pie de lote</option><option value="solar">Solar (Off-grid)</option><option value="none">No Tiene</option></select>
              </div>
          </div>
        </>
      )}
      
      {(type === 'commercial') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div>
                <label className="form-label">Tipo Comercial</label>
                <select name="commercial_type" value={formData.commercial_type || ''} onChange={handleChange} className="form-input"><option value="">Seleccionar</option><option value="retail">Local</option><option value="office">Oficina</option><option value="warehouse">Bodega / Industrial</option></select>
            </div>
            <div>
                <label className="form-label">m² Construcción</label>
                <div className="relative"><input type="number" name="m2_const" value={formData.m2_const || ''} onChange={handleChange} className="form-input pr-8" placeholder="0"/><span className="absolute right-3 top-2.5 text-xs text-gray-400">m²</span></div>
            </div>
        </div>
      )}

      {/* PIPELINE STATUS */}
      <div className="flex flex-col pt-4 border-t border-gray-100 dark:border-dark-border mt-8">
          <div className="mb-8">
              <h3 className="text-brand-600 dark:text-brand-400 font-bold uppercase text-xs tracking-wider mb-4">Estado Inicial en Pipeline</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['draft', 'presented', 'followup', 'accepted', 'rejected'].map(st => (
                    <label key={st} className="relative cursor-pointer">
                        <input type="radio" name="status" value={st} checked={(formData.status || 'draft') === st} onChange={handleChange} className="peer sr-only" />
                        <div className={`text-center py-2.5 px-2 rounded-lg border border-gray-200 dark:border-dark-border badge-${st} peer-checked:ring-2 peer-checked:ring-brand-500 font-bold text-[10px] uppercase transition-all shadow-sm`}>{st}</div>
                    </label>
                  ))}
              </div>
          </div>

          <div className="flex justify-between items-center bg-gray-50 dark:bg-dark-input p-4 rounded-xl border border-gray-200 dark:border-dark-border">
              <button onClick={onPrev} type="button" className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border hover:bg-gray-100 hover:text-gray-900 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm">Atrás</button>
              <button onClick={onSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-8 py-3 rounded-lg text-sm font-bold shadow-lg shadow-brand-500/25 transition-all transform hover:scale-105 flex items-center disabled:opacity-50 disabled:transform-none">
                  <span>{isSubmitting ? 'Guardando...' : 'Guardar en ALTITUD HUB'}</span> 
                  {!isSubmitting && <i className="fa-solid fa-arrow-right ml-2"></i>}
              </button>
          </div>
      </div>
    </div>
  );
}
