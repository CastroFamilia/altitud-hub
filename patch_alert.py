with open('src/app/busqueda/BusquedaClient.jsx', 'r') as f:
    content = f.read()

submit_old = """      const res = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.search) {"""

submit_new = """      const res = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok && data.search) {
"""

content = content.replace(submit_old, submit_new)

submit_old_2 = """        setShowModal(false);
        setForm({ operation_type: 'venta', client_name: '', property_type: 'Casa', price_min: '', price_max: '', purchase_timeframe: 'urgente', purchase_type: 'efectivo', zones: [], must_haves: [], nice_to_haves: [], price_tolerance: '0' });
        loadSearches();
      }
    } catch (err) {"""

submit_new_2 = """        setShowModal(false);
        setForm({ operation_type: 'venta', client_name: '', property_type: 'Casa', price_min: '', price_max: '', purchase_timeframe: 'urgente', purchase_type: 'efectivo', zones: [], must_haves: [], nice_to_haves: [], price_tolerance: '0' });
        loadSearches();
      } else {
        alert(data.error || "Error al guardar. Verifica tu conexión o vuelve a iniciar sesión.");
      }
    } catch (err) {"""

content = content.replace(submit_old_2, submit_new_2)

with open('src/app/busqueda/BusquedaClient.jsx', 'w') as f:
    f.write(content)
