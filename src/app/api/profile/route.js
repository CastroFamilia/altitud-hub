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
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json({ error: 'Profile ID requerido' }, { status: 400 });
    }

    const isBroker = callerProfile?.role === 'broker';
    const isSelf = callerProfile?.id === id;

    if (!isBroker && !isSelf) {
      return Response.json({ error: 'No tienes permisos para modificar este perfil' }, { status: 403 });
    }

    let allowedFields = [];
    if (isBroker) {
      allowedFields = ['role', 'team_id', 'status', 'full_name', 'phone', 'office', 'remax_agent_id', 'remax_agent_name', 'avatar_url', 'psicotest_url', 'psicotest_file_id', 'olympia_behavior_analysis', 'commission_split', 'monthly_fee', 'fee_start_date', 'start_date', 'birth_date', 'bio_en', 'bio_es', 'video_url'];
    } else if (isSelf) {
      allowedFields = ['full_name', 'phone', 'bio_en', 'bio_es', 'video_url', 'avatar_url'];
    }

    const safeUpdates = {};
    for (const key of allowedFields) {
      if (key in updates) safeUpdates[key] = updates[key];
    }

    // Handle Team Leader team name creation/update
    if (updates.role === 'team_leader' && updates.team_name) {
      const { data: existingTeam, error: teamFindError } = await supabase
        .from('teams')
        .select('id')
        .eq('leader_id', id)
        .maybeSingle();

      if (existingTeam) {
        const { error: teamUpdateError } = await supabase
          .from('teams')
          .update({ name: updates.team_name })
          .eq('id', existingTeam.id);
        
        if (teamUpdateError) {
          return Response.json({ error: 'Error al actualizar el nombre del equipo: ' + teamUpdateError.message }, { status: 500 });
        }
        safeUpdates.team_id = existingTeam.id;
      } else {
        const { data: newTeam, error: teamInsertError } = await supabase
          .from('teams')
          .insert({
            name: updates.team_name,
            leader_id: id,
            office: updates.office || callerProfile.office || 'altitud'
          })
          .select()
          .single();

        if (teamInsertError) {
          return Response.json({ error: 'Error al crear el equipo: ' + teamInsertError.message }, { status: 500 });
        }
        safeUpdates.team_id = newTeam.id;
      }
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
        .select('*, teams:teams!profiles_team_id_fkey(id, name)')
        .order('full_name');
      
      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
      return Response.json({ profiles: data });
    }

    // Return own profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*, teams:teams!profiles_team_id_fkey(id, name)')
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
