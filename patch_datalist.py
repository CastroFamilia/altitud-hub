with open('src/app/busqueda/BusquedaClient.jsx', 'r') as f:
    content = f.read()

datalist_old = """                  <datalist id="cr-locations">
                    <option value="San José" /><option value="Escazú" /><option value="Santa Ana" /><option value="Tamarindo" />
                  </datalist>"""

datalist_new = """                  <datalist id="cr-locations">
                    <option value="San José" /><option value="Escazú" /><option value="Santa Ana" /><option value="Tamarindo" />
                    <option value="Pérez Zeledón" /><option value="Dominical" /><option value="Uvita" /><option value="Ojochal" />
                    <option value="San Isidro de El General" /><option value="Platanillo" /><option value="Tinamastes" />
                    <option value="Cajón" /><option value="Rivas" /><option value="Santa Elena de El General" />
                  </datalist>"""

content = content.replace(datalist_old, datalist_new)

with open('src/app/busqueda/BusquedaClient.jsx', 'w') as f:
    f.write(content)
