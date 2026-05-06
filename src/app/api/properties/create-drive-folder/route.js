import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

/* ═══════════════════════════════════════════════════════════════
   CREATE GOOGLE DRIVE FOLDER
   POST /api/properties/create-drive-folder
   
   Creates a new Drive folder for a property and saves its ID/URL
   to the database.
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

    // 1. Get property
    const { data: property, error: fetchError } = await supabaseAdmin
      .from('properties')
      .select('id, name, drive_photos_folder_id')
      .eq('id', propertyId)
      .single();

    if (fetchError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.drive_photos_folder_id) {
      return NextResponse.json({ success: true, message: 'Folder already exists' });
    }

    // 2. Create Drive folder
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const folderName = `Property: ${property.name}`;
    const parentFolderId = process.env.GOOGLE_DRIVE_PROPERTIES_PARENT_ID; // The main "Properties" folder

    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const driveRes = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, webViewLink',
    });

    const folderId = driveRes.data.id;
    const folderUrl = driveRes.data.webViewLink;

    // 3. Update property record
    const { error: updateError } = await supabaseAdmin
      .from('properties')
      .update({
        drive_photos_folder_id: folderId,
        drive_photos_folder_url: folderUrl,
      })
      .eq('id', propertyId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      folderId,
      folderUrl,
    });

  } catch (err) {
    console.error('Create Drive folder error:', err);
    return NextResponse.json({ error: 'Failed to create Drive folder: ' + err.message }, { status: 500 });
  }
}
