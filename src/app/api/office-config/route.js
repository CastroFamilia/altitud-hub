import { createAdminSupabase, createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // 1. Authenticate user to ensure they are logged in
    const userSupabase = await createClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado: Inicie sesión' }, { status: 401 });
    }

    // 2. Fetch the user's role from profiles to verify they are broker or admin
    const { data: profile, error: profileError } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profileError || !profile || !['broker', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permiso denegado: Se requiere rol de Broker o Admin' }, { status: 403 });
    }

    // 3. Parse request body
    const body = await request.json();
    const { office, config_key, config_value } = body;

    if (!office || !config_key || !config_value) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
    }

    // 4. Use admin client to bypass RLS safely on behalf of validated user
    const adminSupabase = createAdminSupabase();
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Error del servidor: Llave de servicio no configurada' }, { status: 500 });
    }

    const { error: upsertError } = await adminSupabase
      .from('office_config')
      .upsert({
        office,
        config_key,
        config_value
      }, { onConflict: 'office,config_key' });

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/office-config:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
