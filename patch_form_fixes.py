import re

with open('src/app/busqueda/BusquedaClient.jsx', 'r') as f:
    content = f.read()

# Fix Must Haves and Nice to Haves to have a "+" button
must_old = """                  <input type="text" value={tagInput.must} onChange={e => setTagInput({...tagInput, must: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('must_haves', tagInput.must))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder="Ej. 3 Cuartos (Enter)" />
                </div>"""

must_new = """                  <div className="flex gap-2">
                    <input type="text" value={tagInput.must} onChange={e => setTagInput({...tagInput, must: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('must_haves', tagInput.must))} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder="Ej. 3 Cuartos" />
                    <button type="button" onClick={() => handleAddTag('must_haves', tagInput.must)} className="bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-300">+</button>
                  </div>
                </div>"""
content = content.replace(must_old, must_new)

nice_old = """                  <input type="text" value={tagInput.nice} onChange={e => setTagInput({...tagInput, nice: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('nice_to_haves', tagInput.nice))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder="Ej. Piscina (Enter)" />
                </div>"""

nice_new = """                  <div className="flex gap-2">
                    <input type="text" value={tagInput.nice} onChange={e => setTagInput({...tagInput, nice: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('nice_to_haves', tagInput.nice))} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder="Ej. Piscina" />
                    <button type="button" onClick={() => handleAddTag('nice_to_haves', tagInput.nice)} className="bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-300">+</button>
                  </div>
                </div>"""
content = content.replace(nice_old, nice_new)

# Fix datalist by importing the big location list from locations.js if possible, or just add more common ones.
# The user said "las zonas pueden ser muchas, pero deberian cargarse del location.js" in a previous conversation.
# Let's import LOCATIONS if it exists, but for now just inject a bunch or use the previous code's datalist.

with open('src/app/busqueda/BusquedaClient.jsx', 'w') as f:
    f.write(content)
