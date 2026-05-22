import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const office = searchParams.get('office');
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 1000);

    let query = supabaseAdmin
      .from('properties')
      .select(`
        id, name, listing_title_es, public_remarks_es,
        property_type_id, listing_contract_type,
        unparsed_address, latitude, longitude,
        bedrooms_total, bathrooms_full, bathrooms_half, stories,
        lot_size_area, construction_size, year_built,
        list_price, list_price_currency_id,
        property_images(image_url, priority)
      `)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (office) query = query.eq('office_code', office);

    const { data, error } = await query;

    if (error) throw error;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<properties>\n`;

    (data || []).forEach(p => {
      const type = p.listing_contract_type === 'sale' ? 'Venta' : 'Alquiler';
      const images = (p.property_images || []).sort((a, b) => a.priority - b.priority);
      
      xml += `  <property>\n`;
      xml += `    <id>${escapeXml(p.id)}</id>\n`;
      xml += `    <title>${escapeXml(p.listing_title_es || p.name)}</title>\n`;
      xml += `    <description>${escapeXml(p.public_remarks_es)}</description>\n`;
      xml += `    <type>${escapeXml(type)}</type>\n`;
      xml += `    <price currency="${escapeXml(p.list_price_currency_id || 'USD')}">${p.list_price || 0}</price>\n`;
      xml += `    <location>\n`;
      xml += `      <address>${escapeXml(p.unparsed_address)}</address>\n`;
      if (p.latitude && p.longitude) {
        xml += `      <latitude>${p.latitude}</latitude>\n`;
        xml += `      <longitude>${p.longitude}</longitude>\n`;
      }
      xml += `    </location>\n`;
      xml += `    <features>\n`;
      xml += `      <bedrooms>${p.bedrooms_total || 0}</bedrooms>\n`;
      xml += `      <bathrooms>${(p.bathrooms_full || 0) + (p.bathrooms_half || 0)}</bathrooms>\n`;
      xml += `      <area_construction unit="m2">${p.construction_size || 0}</area_construction>\n`;
      xml += `      <area_lot unit="m2">${p.lot_size_area || 0}</area_lot>\n`;
      xml += `    </features>\n`;
      
      if (images.length > 0) {
        xml += `    <images>\n`;
        images.forEach(img => {
          xml += `      <image url="${escapeXml(img.image_url)}" />\n`;
        });
        xml += `    </images>\n`;
      }
      
      xml += `  </property>\n`;
    });

    xml += `</properties>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('Encuentra24 Feed error:', err);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><error>' + escapeXml(err.message) + '</error>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}
