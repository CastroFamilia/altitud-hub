import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

/* ═══════════════════════════════════════════════════════════════
   SYNC PHOTOS FROM GOOGLE DRIVE
   POST /api/properties/sync-photos
   
   Reads image files from a property's Drive folder and
   creates/updates property_images records.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  });
  return oauth2Client;
}

export async function POST(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { propertyId } = await req.json();

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }

    // 1. Get property and its Drive folder
    const { data: property, error: fetchError } = await supabaseAdmin
      .from('properties')
      .select('id, drive_photos_folder_id, name')
      .eq('id', propertyId)
      .single();

    if (fetchError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (!property.drive_photos_folder_id) {
      return NextResponse.json(
        { error: 'No Drive folder configured for this property. Create one first.' },
        { status: 400 }
      );
    }

    // 2. List images in the Drive folder
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const driveRes = await drive.files.list({
      q: `'${property.drive_photos_folder_id}' in parents and mimeType contains 'image/' and trashed=false`,
      fields: 'files(id, name, mimeType, webContentLink, thumbnailLink, webViewLink)',
      orderBy: 'name',
      pageSize: 50,
    });

    const driveFiles = driveRes.data.files || [];

    if (driveFiles.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'No image files found in Drive folder.',
      });
    }

    // 3. Get existing images for this property
    const { data: existingImages } = await supabaseAdmin
      .from('property_images')
      .select('id, drive_file_id')
      .eq('property_id', propertyId);

    const existingDriveIds = new Set((existingImages || []).map(i => i.drive_file_id));

    // 4. Create records for new images
    let synced = 0;
    for (let i = 0; i < driveFiles.length; i++) {
      const file = driveFiles[i];

      if (existingDriveIds.has(file.id)) continue; // Already synced

      // Build public URL for the image
      // Using the Drive direct link format
      const imageUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;
      const thumbnailUrl = file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`;

      const { error: insertError } = await supabaseAdmin
        .from('property_images')
        .insert({
          property_id: propertyId,
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          drive_file_id: file.id,
          alt_text: file.name.replace(/\.[^.]+$/, ''), // filename without extension
          priority: i,
        });

      if (!insertError) synced++;
    }

    // 5. Update photos_ready flag if we now have images
    const totalImages = (existingImages?.length || 0) + synced;
    if (totalImages > 0) {
      await supabaseAdmin
        .from('properties')
        .update({ photos_ready: true })
        .eq('id', propertyId);
    }

    return NextResponse.json({
      success: true,
      synced,
      total_in_folder: driveFiles.length,
      total_images: totalImages,
    });

  } catch (err) {
    console.error('Sync photos error:', err);
    return NextResponse.json({ error: 'Sync photos failed: ' + err.message }, { status: 500 });
  }
}
