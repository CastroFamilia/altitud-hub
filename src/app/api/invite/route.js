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
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'broker') {
      return Response.json({ error: 'Solo el broker puede invitar agentes' }, { status: 403 });
    }

    // Helper to create pending transaction if fee is set
    const checkAndCreatePendingFee = async (profileId, mFee, fStartDate) => {
      if (mFee > 0 && fStartDate) {
        // Check if there is already a pending or approved Fee Mensual for this profile on that date to avoid duplicates
        const { data: existingTx } = await supabase
          .from('account_transactions')
          .select('id')
          .eq('profile_id', profileId)
          .eq('category', 'Fee Mensual')
          .eq('date', fStartDate)
          .maybeSingle();

        if (!existingTx) {
          const { error: txError } = await supabase
            .from('account_transactions')
            .insert({
              profile_id: profileId,
              type: 'office_charge',
              amount: parseFloat(mFee),
              category: 'Fee Mensual',
              description: 'Cobro Inicial de Fee Mensual',
              date: fStartDate,
              status: 'pending',
              added_by: callerProfile?.id || null,
            });
          if (txError) {
            console.error('Error inserting pending fee transaction:', txError);
          }
        }
      }
    };

    // 2. Parse request body
    const body = await request.json();
    const { 
      email, 
      full_name, 
      role = 'agent', 
      team_id, 
      remax_agent_id, 
      remax_agent_name, 
      office = 'altitud', 
      avatar_url, 
      phone, 
      status = 'invited',
      start_date,
      birth_date,
      fee_start_date,
      monthly_fee,
    } = body;

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
          start_date: start_date || undefined,
          birth_date: birth_date || undefined,
          fee_start_date: fee_start_date || undefined,
          monthly_fee: monthly_fee !== undefined ? monthly_fee : undefined,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Profile update error:', updateError);
        return Response.json({ error: 'Error al actualizar perfil de borrador: ' + updateError.message }, { status: 500 });
      }

      // Create pending fee if conditions are met
      await checkAndCreatePendingFee(updatedProfile.id, updatedProfile.monthly_fee, updatedProfile.fee_start_date);

      // Handle Team Leader team creation/update for promoted draft agent
      if (role === 'team_leader' && body.team_name) {
        const { data: existingTeam } = await supabase
          .from('teams')
          .select('id')
          .eq('leader_id', updatedProfile.id)
          .maybeSingle();

        if (existingTeam) {
          await supabase
            .from('teams')
            .update({ name: body.team_name })
            .eq('id', existingTeam.id);
          
          await supabase
            .from('profiles')
            .update({ team_id: existingTeam.id })
            .eq('id', updatedProfile.id);
          
          updatedProfile.team_id = existingTeam.id;
        } else {
          const { data: newTeam } = await supabase
            .from('teams')
            .insert({
              name: body.team_name,
              leader_id: updatedProfile.id,
              office: office || callerProfile.office || 'altitud'
            })
            .select()
            .single();

          if (newTeam) {
            await supabase
              .from('profiles')
              .update({ team_id: newTeam.id })
              .eq('id', updatedProfile.id);
            
            updatedProfile.team_id = newTeam.id;
          }
        }
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
        start_date: start_date || null,
        birth_date: birth_date || null,
        fee_start_date: fee_start_date || null,
        monthly_fee: monthly_fee || 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Profile insert error:', insertError);
      return Response.json({ error: 'Error al crear perfil: ' + insertError.message }, { status: 500 });
    }

    // Create pending fee if conditions are met
    await checkAndCreatePendingFee(newProfile.id, newProfile.monthly_fee, newProfile.fee_start_date);

    // Handle Team Leader team creation for brand new profile
    if (role === 'team_leader' && body.team_name) {
      const { data: newTeam, error: teamInsertError } = await supabase
        .from('teams')
        .insert({
          name: body.team_name,
          leader_id: newProfile.id,
          office: office || callerProfile.office || 'altitud'
        })
        .select()
        .single();
      
      if (!teamInsertError && newTeam) {
        await supabase
          .from('profiles')
          .update({ team_id: newTeam.id })
          .eq('id', newProfile.id);
        
        newProfile.team_id = newTeam.id;
      }
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
