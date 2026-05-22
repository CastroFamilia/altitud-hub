import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { Readable } from 'stream';

// App Router: request body size limit is controlled via Vercel project settings or Next.js config.
// maxDuration prevents Vercel timeout on large uploads (default 10s on hobby, 60s on pro).
export const maxDuration = 60;

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

async function findOrCreateFolder(drive, name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({ q, fields: 'files(id, name, webViewLink)', spaces: 'drive' });
  if (res.data.files.length > 0) return res.data.files[0];

  const createRes = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id, name, webViewLink'
  });
  return createRes.data;
}

export async function POST(req) {
  const limited = rateLimit(req, { maxRequests: 5, keyPrefix: 'drive-upload' });
  if (limited) return limited;

  try {
    const { agentName, propertyName, pdfBase64, fileName } = await req.json();

    if (!agentName || !propertyName || !pdfBase64) {
      return NextResponse.json({ error: 'agentName, propertyName y pdfBase64 son requeridos' }, { status: 400 });
    }

    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID no configurado en el servidor.');

    // 1. Encuentra o crea la carpeta del agente ("HUB-GERARDO")
    const agentFolderName = `HUB-${agentName.toUpperCase().replace(/\s+/g, '-')}`;
    const agentFolder = await findOrCreateFolder(drive, agentFolderName, rootFolderId);

    // 2. Crea la carpeta de la propiedad adentro de la carpeta del agente
    const propertyFolder = await findOrCreateFolder(drive, propertyName, agentFolder.id);

    // 3. Convertir Base64 a Stream
    // Eliminar prefijo de data URI si existe (ej. "data:application/pdf;base64,JVBER...")
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const stream = Readable.from(buffer);

    // 4. Subir el archivo a Drive
    const fileRes = await drive.files.create({
      requestBody: {
        name: fileName || `ACM_${propertyName}.pdf`,
        parents: [propertyFolder.id],
      },
      media: {
        mimeType: 'application/pdf',
        body: stream,
      },
      fields: 'id, name, webViewLink',
    });

    return NextResponse.json({
      success: true,
      folderId: propertyFolder.id,
      folderUrl: propertyFolder.webViewLink,
      fileId: fileRes.data.id,
      fileUrl: fileRes.data.webViewLink,
    });

  } catch (error) {
    console.error('Drive Upload API Error:', error);
    return NextResponse.json({ error: 'Hubo un error al subir el archivo a Google Drive.' }, { status: 500 });
  }
}
