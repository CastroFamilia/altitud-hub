import { NextResponse } from 'next/server';
import { getPortalRegistry, getAllPortals, upsertPortal, togglePortalActive, reorderPortals, deletePortal } from '@/lib/dal/portals';

/* ═══════════════════════════════════════════════════════════════
   PORTAL REGISTRY API
   GET  /api/portals/registry           — list active portals
   GET  /api/portals/registry?all=true  — list all (admin)
   POST /api/portals/registry           — create/update portal
   PUT  /api/portals/registry           — toggle active / reorder
   DELETE /api/portals/registry?id=UUID — delete a portal
   ═══════════════════════════════════════════════════════════════ */

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get('all') === 'true';
    const officeScope = searchParams.get('office') || null;

    const portals = showAll
      ? await getAllPortals()
      : await getPortalRegistry(officeScope);

    return NextResponse.json({ portals });
  } catch (err) {
    console.error('Portal registry GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, slug, display_name, icon_emoji, color_class, url_base, category, has_stats_api, display_order, office_scope } = body;

    if (!slug || !display_name) {
      return NextResponse.json({ error: 'slug and display_name are required' }, { status: 400 });
    }

    const portal = await upsertPortal({
      id: id || undefined,
      slug,
      display_name,
      icon_emoji: icon_emoji || '🌐',
      color_class: color_class !== undefined ? color_class : 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400',
      url_base: url_base || null,
      category: category || 'manual',
      has_stats_api: has_stats_api !== undefined ? has_stats_api : false,
      display_order: display_order || 100,
      office_scope: office_scope || 'all',
    });

    return NextResponse.json({ success: true, portal });
  } catch (err) {
    console.error('Portal registry POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();

    // Toggle active
    if (body.action === 'toggle' && body.portal_id) {
      await togglePortalActive(body.portal_id, body.is_active);
      return NextResponse.json({ success: true });
    }

    // Reorder
    if (body.action === 'reorder' && body.ordered_slugs) {
      await reorderPortals(body.ordered_slugs);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Portal registry PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await deletePortal(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Portal registry DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
