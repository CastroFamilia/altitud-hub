import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { propertyId, slug, locale, ipAddress, userAgent } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Insert tracking event
    // Note: developmentId is nullable, but we just set propertyId for QR tracking
    await sql`
      INSERT INTO page_events (
        property_id, 
        event_type, 
        event_meta, 
        referrer
      ) VALUES (
        ${propertyId}, 
        'qr_scan', 
        ${JSON.stringify({ slug, locale, ipAddress, userAgent })}, 
        'qr_code'
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('QR tracking error:', error);
    
    // In case 'qr_scan' isn't yet supported by the DB constraint, 
    // we can fallback to 'page_view' temporarily so we don't drop tracking data.
    if (error.code === '23514') { // check_violation
      try {
        const body = await request.json().catch(() => ({}));
        await sql`
          INSERT INTO page_events (
            property_id, 
            event_type, 
            event_meta, 
            referrer
          ) VALUES (
            ${body.propertyId}, 
            'page_view', 
            ${JSON.stringify({ ...body, source: 'qr_scan_fallback' })}, 
            'qr_code'
          )
        `;
        return NextResponse.json({ success: true, note: 'fallback_used' });
      } catch (fbErr) {
        return NextResponse.json({ error: 'Database constraint fallback failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
