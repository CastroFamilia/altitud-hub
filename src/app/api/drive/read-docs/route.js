import { google } from 'googleapis';
import { NextResponse } from 'next/server';

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
    const { folderId } = await req.json();

    if (!folderId) {
      return NextResponse.json({ error: 'folderId es requerido' }, { status: 400 });
    }

    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Busca archivos PDF dentro de la carpeta
    const q = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;
    
    const res = await drive.files.list({
      q,
      fields: 'files(id, name, webViewLink, createdTime)',
      orderBy: 'createdTime desc',
      spaces: 'drive'
    });

    if (!res.data.files || res.data.files.length === 0) {
      return NextResponse.json({ files: [] });
    }

    // Devuelve la lista de archivos encontrados (ordenados por fecha descendente)
    return NextResponse.json({
      success: true,
      files: res.data.files
    });

  } catch (error) {
    console.error('Drive Read Docs API Error:', error);
    return NextResponse.json({ error: 'Hubo un error al leer la carpeta de Google Drive.' }, { status: 500 });
  }
}
