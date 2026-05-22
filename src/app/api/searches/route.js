import { createClient, createAdminSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getSearchesByAgentId, getAllSearches, insertSearch, updateSearch, deleteSearch } from '@/lib/dal/searches';

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if ((authError || !user) && process.env.NODE_ENV !== 'development') {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No user'}` }, { status: 401 });
    }

    // Mock user for development
    const activeUserId = user ? user.id : 'b2ebf531-50e5-4a67-85b4-d53b5161cebc'; // Mock UUID


    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    let data;
    if (all) {
      data = await getAllSearches(supabase);
    } else {
      data = await getSearchesByAgentId(user.id, supabase);
    }

    return NextResponse.json({ searches: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let dbClient = supabase;
    let activeUserId = user ? user.id : null;

    if (!user) {
      if (process.env.NODE_ENV !== 'development') {
        console.error('Auth Error:', authError);
        return NextResponse.json({ error: `Unauthorized: Debes iniciar sesión para guardar búsquedas.` }, { status: 401 });
      } else {
        const adminClient = createAdminSupabase();
        dbClient = adminClient || supabase;
        
        // Buscamos un usuario válido para que la base de datos no rechace la prueba (Bypass FK Constraint)
        const { data: firstProfile } = await dbClient.from('profiles').select('id').limit(1).single();
        activeUserId = firstProfile?.id || 'b2ebf531-50e5-4a67-85b4-d53b5161cebc';
      }
    }

    const body = await request.json();
    const { operation_type, client_name, property_type, price_min, price_max, purchase_timeframe, purchase_type, zones, must_haves, nice_to_haves, price_tolerance, lat, lng, min_bedrooms, min_bathrooms, min_sqm } = body;

    const data = await insertSearch({
      agent_id: activeUserId,
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
      lng,
      min_bedrooms: min_bedrooms ? Number(min_bedrooms) : 0,
      min_bathrooms: min_bathrooms ? Number(min_bathrooms) : 0,
      min_sqm: min_sqm ? Number(min_sqm) : 0
    }, dbClient);

    // After creating a search, let's optionally find matches and create notifications for OTHER agents
    // who have properties that match.
    const tolerance = 0.15;
    const pMin = price_min ? Number(price_min) * (1 - tolerance) : 0;
    const pMax = price_max ? Number(price_max) * (1 + tolerance) : 999999999;

    const { data: matchingProps } = await supabase
      .from('properties')
      .select('agent_id, name')
      .eq('property_type', property_type)
      .neq('agent_id', user.id)
      .gte('list_price', pMin)
      .lte('list_price', pMax);
      
    if (matchingProps && matchingProps.length > 0) {
      // Create notifications for these agents
      const notifications = matchingProps.map(p => ({
        user_id: p.agent_id,
        title: '¡Nuevo Comprador Potencial!',
        message: `El agente ha registrado una búsqueda de ${property_type} que coincide con tu propiedad: ${p.name}`,
        link: '/busqueda'
      }));
      await supabase.from('notifications').insert(notifications);
    }

    return NextResponse.json({ search: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if ((authError || !user) && process.env.NODE_ENV !== 'development') {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No user'}` }, { status: 401 });
    }

    // Mock user for development
    const activeUserId = user ? user.id : 'b2ebf531-50e5-4a67-85b4-d53b5161cebc'; // Mock UUID


    const body = await request.json();
    const { id, ...updates } = body;

    if (updates.status === 'activa') {
      updates.last_verified_at = new Date().toISOString();
    }
    updates.updated_at = new Date().toISOString();

    // Verify ownership before updating if we are not admin. Since we are in the API route, we should verify ownership here.
    // However, the previous code just did eq('agent_id', user.id) in the query, so let's check it manually.
    const search = await dbClient.from('buyer_searches').select('agent_id').eq('id', id).single();
    if (search.data && search.data.agent_id !== user.id) {
       return NextResponse.json({ error: 'Unauthorized update' }, { status: 403 });
    }

    const data = await updateSearch(id, updates, supabase);

    return NextResponse.json({ search: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if ((authError || !user) && process.env.NODE_ENV !== 'development') {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No user'}` }, { status: 401 });
    }

    // Mock user for development
    const activeUserId = user ? user.id : 'b2ebf531-50e5-4a67-85b4-d53b5161cebc'; // Mock UUID


    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const search = await supabase.from('buyer_searches').select('agent_id').eq('id', id).single();
    if (search.data && search.data.agent_id !== user.id) {
       return NextResponse.json({ error: 'Unauthorized delete' }, { status: 403 });
    }

    await deleteSearch(id, supabase);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
