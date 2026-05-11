import re

with open('src/app/busqueda/BusquedaClient.jsx', 'r') as f:
    content = f.read()

# Replace the beginning of the form
form_start_old = """              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tipo Propiedad</label>"""

form_start_new = """              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Operación</label>
                  <select value={form.operation_type} onChange={e => setForm({...form, operation_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="venta">Venta</option>
                    <option value="alquiler">Alquiler</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tipo Propiedad</label>"""
content = content.replace(form_start_old, form_start_new)

# Replace zone_name input
zone_old = """                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Zona / Ubicación</label>
                  <input required list="cr-locations" type="text" value={form.zone_name} onChange={e => setForm({...form, zone_name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="Ej. Escazú" />
                  <datalist id="cr-locations">
                    <option value="San José" />
                    <option value="Escazú" />
                    <option value="Santa Ana" />
                    <option value="Alajuela" />
                    <option value="Cartago" />
                    <option value="Heredia" />
                    <option value="Guanacaste" />
                    <option value="Puntarenas" />
                    <option value="Limón" />
                    <option value="Tamarindo" />
                    <option value="Jacó" />
                    <option value="Santa Teresa" />
                  </datalist>
                </div>"""

zone_new = """                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Zonas (Múltiples)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.zones.map((z, i) => (
                      <span key={i} className="bg-nexus-blue/10 text-nexus-blue px-2 py-1 rounded text-xs flex items-center gap-1 font-bold">
                        {z} <button type="button" onClick={() => handleRemoveTag('zones', i)} className="hover:text-blue-800">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input list="cr-locations" type="text" value={tagInput.zone} onChange={e => setTagInput({...tagInput, zone: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('zones', tagInput.zone))} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none" placeholder="Escribe la zona y presiona Enter..." />
                    <button type="button" onClick={() => handleAddTag('zones', tagInput.zone)} className="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-300">+</button>
                  </div>
                  <datalist id="cr-locations">
                    <option value="San José" /><option value="Escazú" /><option value="Santa Ana" /><option value="Tamarindo" />
                  </datalist>
                </div>"""
content = content.replace(zone_old, zone_new)

# Add Must Haves and Nice to Haves below the grid
timeframe_old = """              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tiempo de Compra</label>"""

timeframe_new = """              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Must Haves (Indispensables)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.must_haves.map((m, i) => (
                      <span key={i} className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                        {m} <button type="button" onClick={() => handleRemoveTag('must_haves', i)} className="hover:text-emerald-900">&times;</button>
                      </span>
                    ))}
                  </div>
                  <input type="text" value={tagInput.must} onChange={e => setTagInput({...tagInput, must: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('must_haves', tagInput.must))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder="Ej. 3 Cuartos (Enter)" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">Nice to Haves (Deseables)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.nice_to_haves.map((n, i) => (
                      <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                        {n} <button type="button" onClick={() => handleRemoveTag('nice_to_haves', i)} className="hover:text-blue-900">&times;</button>
                      </span>
                    ))}
                  </div>
                  <input type="text" value={tagInput.nice} onChange={e => setTagInput({...tagInput, nice: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('nice_to_haves', tagInput.nice))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder="Ej. Piscina (Enter)" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tiempo de Compra</label>"""
content = content.replace(timeframe_old, timeframe_new)

with open('src/app/busqueda/BusquedaClient.jsx', 'w') as f:
    f.write(content)
