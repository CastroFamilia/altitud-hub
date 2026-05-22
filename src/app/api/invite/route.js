import { createClient } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-server';

/**
 * POST /api/invite
 * Body: { email, full_name, role, team_id, remax_agent_id, remax_agent_name, office, avatar_url, phone }
 * 
 * Creates a profile and sends an invitation email. Only callable by broker.
 */
export async function POST(request) {
  try {
    // 1. Verify the caller is a broker
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
      return Response.json({ error: 'Solo el broker puede invitar agentes' }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { email, full_name, role = 'agent', team_id, remax_agent_id, remax_agent_name, office = 'altitud', avatar_url, phone, status = 'invited' } = body;

    if (!email || !full_name) {
      return Response.json({ error: 'Email y nombre son requeridos' }, { status: 400 });
    }

    // Validate email domain
    if (!email.toLowerCase().endsWith('@remax-altitud.cr')) {
      return Response.json({ error: 'Solo emails @remax-altitud.cr son permitidos' }, { status: 400 });
    }

    // 3. Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, status, full_name, role')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      if (existing.status !== 'draft') {
        return Response.json({ error: 'Este email ya está registrado y activo/invitado', profile: existing }, { status: 409 });
      }

      // If it exists but is 'draft', and the request is to keep it as draft
      if (status === 'draft') {
        return Response.json({ error: 'Este agente ya está registrado como borrador', profile: existing }, { status: 409 });
      }

      // Proceed to update status to 'invited' (promote from draft)
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          status: 'invited',
          invited_at: new Date().toISOString(),
          // update details if provided
          full_name: full_name || existing.full_name,
          role: role || existing.role,
          team_id: team_id !== undefined ? team_id : undefined,
          remax_agent_id: remax_agent_id || null,
          remax_agent_name: remax_agent_name || null,
          office,
          avatar_url: avatar_url || null,
          phone: phone || null,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Profile update error:', updateError);
        return Response.json({ error: 'Error al actualizar perfil de borrador: ' + updateError.message }, { status: 500 });
      }

      // Send invitation email via Supabase Admin API
      const adminClient = createAdminSupabase();
      let inviteSent = false;

      if (adminClient) {
        const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
          email.toLowerCase(),
          {
            redirectTo: `${new URL(request.url).origin}/auth/callback`,
            data: {
              full_name: updatedProfile.full_name,
              role: updatedProfile.role,
            }
          }
        );

        if (inviteError) {
          console.error('Invite email error:', inviteError);
        } else {
          inviteSent = true;
        }
      }

      return Response.json({
        success: true,
        profile: updatedProfile,
        inviteSent,
        message: inviteSent 
          ? `Invitación enviada a ${email}` 
          : 'Perfil de borrador aprobado. Configure SUPABASE_SERVICE_ROLE_KEY para enviar invitaciones por email.',
      });
    }

    // 4. Create the profile (pre-authorized)
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        email: email.toLowerCase(),
        full_name,
        role,
        team_id: team_id || null,
        remax_agent_id: remax_agent_id || null,
        remax_agent_name: remax_agent_name || null,
        office,
        avatar_url: avatar_url || null,
        phone: phone || null,
        status: status,
        invited_at: status === 'invited' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Profile insert error:', insertError);
      return Response.json({ error: 'Error al crear perfil: ' + insertError.message }, { status: 500 });
    }

    // 5. Send invitation email via Supabase Admin API (ONLY if status is 'invited')
    const adminClient = createAdminSupabase();
    let inviteSent = false;

    if (status === 'invited' && adminClient) {
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        email.toLowerCase(),
        {
          redirectTo: `${new URL(request.url).origin}/auth/callback`,
          data: {
            full_name,
            role,
          }
        }
      );

      if (inviteError) {
        console.error('Invite email error:', inviteError);
        // Profile was created but invite failed — not critical
      } else {
        inviteSent = true;
      }
    }

    return Response.json({
      success: true,
      profile: newProfile,
      inviteSent,
      message: inviteSent 
        ? `Invitación enviada a ${email}` 
        : (status === 'draft' ? `Agente ${full_name} guardado como borrador` : 'Perfil creado. Configure SUPABASE_SERVICE_ROLE_KEY para enviar invitaciones por email.'),
    });

  } catch (err) {
    console.error('Invite error:', err);
    return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}
