import { createClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * PATCH /api/profile
 * Body: { id, ...updates }
 * Updates a profile. Only callable by broker.
 */
export async function PATCH(request) {
  const limited = rateLimit(request, { keyPrefix: 'profile' });
  if (limited) return limited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'broker') {
      return Response.json({ error: 'Solo el broker puede modificar perfiles' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json({ error: 'Profile ID requerido' }, { status: 400 });
    }

    // Only allow safe fields to be updated
    const allowedFields = ['role', 'team_id', 'status', 'full_name', 'phone', 'office', 'remax_agent_id', 'remax_agent_name', 'avatar_url'];
    const safeUpdates = {};
    for (const key of allowedFields) {
      if (key in updates) safeUpdates[key] = updates[key];
    }

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return Response.json({ error: 'Error al actualizar: ' + updateError.message }, { status: 500 });
    }

    return Response.json({ success: true, profile: data });
  } catch (err) {
    return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}

/**
 * GET /api/profile
 * Returns the current user's profile, or all profiles if broker.
 * Query: ?all=true (broker only)
 */
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wantsAll = searchParams.get('all') === 'true';

    if (wantsAll) {
      // Broker wants all profiles — RLS will filter appropriately
      const { data, error } = await supabase
        .from('profiles')
        .select('*, teams(id, name)')
        .order('full_name');
      
      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
      return Response.json({ profiles: data });
    }

    // Return own profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*, teams(id, name)')
      .eq('auth_user_id', user.id)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ profile: data });
  } catch (err) {
    return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}
