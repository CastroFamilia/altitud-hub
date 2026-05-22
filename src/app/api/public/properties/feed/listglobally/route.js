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
        id, name, listing_title_en, listing_title_es,
        public_remarks_en, public_remarks_es,
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

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<listglobally>\n`;

    (data || []).forEach(p => {
      const type = p.listing_contract_type === 'sale' ? 'Sale' : 'Rent';
      const images = (p.property_images || []).sort((a, b) => a.priority - b.priority);
      
      xml += `  <property>\n`;
      xml += `    <reference>${escapeXml(p.id)}</reference>\n`;
      xml += `    <category>${escapeXml(type)}</category>\n`;
      xml += `    <price currency="${escapeXml(p.list_price_currency_id || 'USD')}">${p.list_price || 0}</price>\n`;
      
      xml += `    <title>\n`;
      xml += `      <en>${escapeXml(p.listing_title_en || p.name)}</en>\n`;
      xml += `      <es>${escapeXml(p.listing_title_es || p.name)}</es>\n`;
      xml += `    </title>\n`;
      
      xml += `    <description>\n`;
      xml += `      <en>${escapeXml(p.public_remarks_en)}</en>\n`;
      xml += `      <es>${escapeXml(p.public_remarks_es)}</es>\n`;
      xml += `    </description>\n`;
      
      xml += `    <location>\n`;
      xml += `      <address>${escapeXml(p.unparsed_address)}</address>\n`;
      if (p.latitude && p.longitude) {
        xml += `      <lat>${p.latitude}</lat>\n`;
        xml += `      <lng>${p.longitude}</lng>\n`;
      }
      xml += `    </location>\n`;
      
      xml += `    <details>\n`;
      xml += `      <bedrooms>${p.bedrooms_total || 0}</bedrooms>\n`;
      xml += `      <bathrooms>${(p.bathrooms_full || 0) + (p.bathrooms_half || 0)}</bathrooms>\n`;
      xml += `      <living_area measure="sqm">${p.construction_size || 0}</living_area>\n`;
      xml += `      <lot_area measure="sqm">${p.lot_size_area || 0}</lot_area>\n`;
      xml += `    </details>\n`;
      
      if (images.length > 0) {
        xml += `    <pictures>\n`;
        images.forEach((img, idx) => {
          xml += `      <picture id="${idx + 1}">\n`;
          xml += `        <url>${escapeXml(img.image_url)}</url>\n`;
          xml += `      </picture>\n`;
        });
        xml += `    </pictures>\n`;
      }
      
      xml += `  </property>\n`;
    });

    xml += `</listglobally>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('ListGlobally Feed error:', err);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><error>' + escapeXml(err.message) + '</error>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}
