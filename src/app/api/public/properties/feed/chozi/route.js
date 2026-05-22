import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
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

    if (error) {
      console.error('Chozi Feed query error:', error);
      return NextResponse.json({ error: 'Feed query failed' }, { status: 500 });
    }

    // Map properties to a generic/Chozi-friendly JSON format
    const properties = (data || []).map(p => {
      const type = p.listing_contract_type === 'sale' ? 'sale' : 'rent';
      const images = (p.property_images || []).sort((a, b) => a.priority - b.priority);

      return {
        property_id: p.id,
        title: p.listing_title_es || p.name,
        title_en: p.listing_title_en || p.name,
        description: p.public_remarks_es,
        description_en: p.public_remarks_en,
        transaction_type: type,
        price: {
          amount: p.list_price || 0,
          currency: p.list_price_currency_id || 'USD'
        },
        location: {
          address: p.unparsed_address,
          latitude: p.latitude,
          longitude: p.longitude
        },
        features: {
          bedrooms: p.bedrooms_total || 0,
          bathrooms: (p.bathrooms_full || 0) + (p.bathrooms_half || 0),
          construction_area: p.construction_size || 0,
          lot_area: p.lot_size_area || 0
        },
        images: images.map(img => img.image_url)
      };
    });

    return NextResponse.json({
      feed_provider: 'Altitud Hub',
      portal: 'chozi',
      count: properties.length,
      generated_at: new Date().toISOString(),
      listings: properties,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('Chozi Feed error:', err);
    return NextResponse.json({ error: 'Feed failed: ' + err.message }, { status: 500 });
  }
}
