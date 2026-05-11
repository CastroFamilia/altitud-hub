with open('src/app/busqueda/BusquedaClient.jsx', 'r') as f:
    content = f.read()

card_old = """                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mb-2">
                            {s.property_type} • {s.zone_name || 'Sin zona'}
                          </p>"""

card_new = """                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mb-2">
                            {s.operation_type === 'alquiler' ? 'ALQUILER' : 'VENTA'} • {s.property_type} • {(s.zones && s.zones.length > 0) ? s.zones.join(', ') : 'Sin zona'}
                          </p>"""

content = content.replace(card_old, card_new)

card_old2 = """                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mb-2">
                          {s.zone_name || 'Sin zona'}
                        </p>"""

card_new2 = """                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mb-2">
                          {s.operation_type === 'alquiler' ? 'ALQ' : 'VTA'} • {(s.zones && s.zones.length > 0) ? s.zones.join(', ') : 'Sin zona'}
                        </p>"""

content = content.replace(card_old2, card_new2)

with open('src/app/busqueda/BusquedaClient.jsx', 'w') as f:
    f.write(content)
