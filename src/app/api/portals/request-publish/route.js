import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-server';
import { upsertPropertySyndication } from '@/lib/dal/portals';

/* ═══════════════════════════════════════════════════════════════
   REQUEST PUBLICATION API
   POST /api/portals/request-publish
   
   Agent requests that a property be published on a premium
   portal (e.g. JamesEdition). Creates a syndication record
   with status='requested', sends notification to broker,
   and sends email to hola@ + CC acastro@.
   Secured at the application layer.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { property_id, portal_name } = body;

    if (!property_id || !portal_name) {
      return NextResponse.json(
        { error: 'property_id and portal_name are required' },
        { status: 400 }
      );
    }

    // Get caller profile
    const { data: profile } = await supabaseSession
      .from('profiles')
      .select('role, full_name')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 });
    }

    // Get property details
    const { data: property } = await supabaseSession
      .from('properties')
      .select('id, name, listing_title_es, agent_id, office_code')
      .eq('id', property_id)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    const isAuthorized = ['broker', 'admin', 'assistant'].includes(profile.role);

    // Verify ownership if agent
    if (!isAuthorized && property.agent_id !== user.id) {
      return NextResponse.json(
        { error: 'No autorizado. Solo puedes solicitar la publicación de tus propias propiedades.' },
        { status: 403 }
      );
    }

    const agentName = profile.full_name;
    const propertyTitle = property.listing_title_es || property.name || 'Propiedad';
    const officeCode = property.office_code || 'altitud';

    // 1. Create syndication record with status 'requested'
    const syndication = await upsertPropertySyndication({
      property_id,
      portal_name,
      status: 'requested',
      notes: `Requested by ${agentName} on ${new Date().toLocaleDateString()}`,
    });

    // 2. Create in-app notification for broker
    const supabaseAdmin = getSupabaseAdmin();

    // Get all broker profiles to notify
    const { data: brokers } = await supabaseAdmin
      .from('profiles')
      .select('auth_user_id')
      .eq('role', 'broker');

    if (brokers && brokers.length > 0) {
      const notifications = brokers.map(b => ({
        user_id: b.auth_user_id,
        type: 'portal_request',
        title: `Solicitud de publicación en portal`,
        message: `${agentName} solicita publicar "${propertyTitle}" en ${portal_name.replace(/_/g, ' ')}`,
        link: `/propiedades/${property_id}`,
        read: false,
      }));

      await supabaseAdmin.from('notifications').insert(notifications);
    }

    // 3. Send email notification
    const emailRecipient = officeCode === 'cero' ? 'cero@remax-altitud.cr' : 'hola@remax-altitud.cr';

    try {
      if (process.env.RESEND_API_KEY) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Altitud Hub <hub@remax-altitud.cr>',
            to: [emailRecipient],
            cc: ['acastro@remax-altitud.cr'],
            subject: `📢 Solicitud de publicación — ${portal_name.replace(/_/g, ' ')}`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 600px;">
                <h2 style="color: #003DA5;">Solicitud de Publicación en Portal</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Propiedad</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${propertyTitle}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Portal</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${portal_name.replace(/_/g, ' ')}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Agente</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${agentName}</td></tr>
                  <tr><td style="padding: 8px; font-weight: bold;">Fecha</td><td style="padding: 8px;">${new Date().toLocaleDateString('es-CR')}</td></tr>
                </table>
                <a href="https://hub.remax-altitud.cr/propiedades/${property_id}" style="display: inline-block; background: #003DA5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  Ver propiedad en el Hub
                </a>
              </div>
            `,
          }),
        });
        if (!emailRes.ok) {
          console.error('Email send failed:', await emailRes.text());
        }
      }
    } catch (emailErr) {
      console.error('Email notification error:', emailErr);
    }

    return NextResponse.json({ success: true, syndication });
  } catch (err) {
    console.error('Request publish error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

