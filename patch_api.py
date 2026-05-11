with open('src/app/api/searches/route.js', 'r') as f:
    content = f.read()

old_insert = """    const { client_name, property_type, price_min, price_max, purchase_timeframe, purchase_type, zone_name, lat, lng } = body;

    const { data, error } = await supabase.from('buyer_searches').insert({
      agent_id: user.id,
      client_name,
      property_type,
      price_min: price_min ? Number(price_min) : null,
      price_max: price_max ? Number(price_max) : null,
      purchase_timeframe,
      purchase_type,
      zone_name,
      lat,
      lng
    }).select().single();"""

new_insert = """    const { operation_type, client_name, property_type, price_min, price_max, purchase_timeframe, purchase_type, zones, must_haves, nice_to_haves, price_tolerance, lat, lng } = body;

    const { data, error } = await supabase.from('buyer_searches').insert({
      agent_id: user.id,
      operation_type,
      client_name,
      property_type,
      price_min: price_min ? Number(price_min) : null,
      price_max: price_max ? Number(price_max) : null,
      purchase_timeframe,
      purchase_type,
      zones,
      must_haves,
      nice_to_haves,
      price_tolerance: price_tolerance ? Number(price_tolerance) : 0,
      lat,
      lng
    }).select().single();"""

content = content.replace(old_insert, new_insert)

with open('src/app/api/searches/route.js', 'w') as f:
    f.write(content)
