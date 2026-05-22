import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { upsertPropertySyndication, removePropertySyndication, deletePropertySyndication } from '@/lib/dal/portals';

/* ═══════════════════════════════════════════════════════════════
   SYNDICATION MANAGEMENT API
   POST   /api/portals/syndication — register/update portal link
   DELETE /api/portals/syndication — remove a portal link
   
   Used by the broker/admin PortalLinkManager to paste portal
   URLs after manually uploading properties to external portals.
   Secured at the application layer to match dynamic portal schema.
   ═══════════════════════════════════════════════════════════════ */

export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Get profiles to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 });
    }

    const body = await req.json();
    const { property_id, portal_name, portal_listing_url, portal_listing_id, status, notes } = body;

    if (!property_id || !portal_name) {
      return NextResponse.json(
        { error: 'property_id and portal_name are required' },
        { status: 400 }
      );
    }

    // Get property to verify ownership
    const { data: property } = await supabase
      .from('properties')
      .select('agent_id')
      .eq('id', property_id)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    const isAuthorized = ['broker', 'admin', 'assistant'].includes(profile.role);

    // If the caller is an agent:
    if (!isAuthorized) {
      // 1. Must own the property
      if (property.agent_id !== user.id) {
        return NextResponse.json(
          { error: 'No autorizado. No eres el agente asignado a esta propiedad.' },
          { status: 403 }
        );
      }
      // 2. Can only set status = 'requested'
      if (status !== 'requested') {
        return NextResponse.json(
          { error: 'No autorizado. Los agentes solo pueden solicitar publicaciones.' },
          { status: 403 }
        );
      }
    }

    const result = await upsertPropertySyndication({
      property_id,
      portal_name,
      portal_listing_url: isAuthorized ? (portal_listing_url || null) : null,
      portal_listing_id: isAuthorized ? (portal_listing_id || null) : null,
      status: status || 'synced',
      notes: notes || null,
      published_by: isAuthorized ? (body.published_by || profile.full_name) : null,
      published_at: (status === 'synced' && isAuthorized) ? new Date().toISOString() : null,
      last_synced_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, syndication: result });
  } catch (err) {
    console.error('Syndication POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const propertyId = searchParams.get('property_id');
    const portalName = searchParams.get('portal_name');

    const isAuthorized = ['broker', 'admin', 'assistant'].includes(profile.role);

    // If caller is an agent, we need to inspect the target record
    if (!isAuthorized) {
      let targetPropertyId = propertyId;
      let targetPortalName = portalName;

      if (id) {
        // Retrieve the record to find propertyId and portalName
        const { data: synRecord } = await supabase
          .from('property_syndication')
          .select('property_id, portal_name, status')
          .eq('id', id)
          .single();

        if (synRecord) {
          targetPropertyId = synRecord.property_id;
          targetPortalName = synRecord.portal_name;
          
          // Agents can only delete 'requested' statuses
          if (synRecord.status !== 'requested') {
            return NextResponse.json(
              { error: 'No autorizado. Los agentes solo pueden eliminar solicitudes pendientes.' },
              { status: 403 }
            );
          }
        }
      } else if (propertyId && portalName) {
        const { data: synRecord } = await supabase
          .from('property_syndication')
          .select('status')
          .eq('property_id', propertyId)
          .eq('portal_name', portalName)
          .single();

        if (synRecord && synRecord.status !== 'requested') {
          return NextResponse.json(
            { error: 'No autorizado. Los agentes solo pueden eliminar solicitudes pendientes.' },
            { status: 403 }
          );
        }
      }

      if (!targetPropertyId) {
        return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
      }

      // Check property ownership
      const { data: property } = await supabase
        .from('properties')
        .select('agent_id')
        .eq('id', targetPropertyId)
        .single();

      if (!property || property.agent_id !== user.id) {
        return NextResponse.json(
          { error: 'No autorizado. No eres el agente asignado a esta propiedad.' },
          { status: 403 }
        );
      }
    }

    if (id) {
      await deletePropertySyndication(id);
    } else if (propertyId && portalName) {
      await removePropertySyndication(propertyId, portalName);
    } else {
      return NextResponse.json({ error: 'id or property_id+portal_name required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Syndication DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

