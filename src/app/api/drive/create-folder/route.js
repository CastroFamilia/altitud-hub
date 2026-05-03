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

// Function to find or create a folder
async function findOrCreateFolder(drive, name, parentId) {
  // Query to find folder by name inside the parent
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  
  const res = await drive.files.list({
    q,
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive'
  });

  if (res.data.files.length > 0) {
    // Folder exists
    return res.data.files[0];
  }

  // Folder doesn't exist, create it
  const createRes = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id, name, webViewLink'
  });

  return createRes.data;
}

export async function POST(req) {
  try {
    const { agentName, propertyName } = await req.json();

    if (!agentName || !propertyName) {
      return NextResponse.json({ error: 'agentName y propertyName son requeridos' }, { status: 400 });
    }

    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) {
      throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID no configurado en el servidor.');
    }

    // 1. Encuentra o crea la carpeta del agente ("HUB-GERARDO")
    const agentFolderName = `HUB-${agentName.toUpperCase().replace(/\s+/g, '-')}`;
    const agentFolder = await findOrCreateFolder(drive, agentFolderName, rootFolderId);

    // 2. Crea la carpeta de la propiedad adentro de la carpeta del agente
    const propertyFolder = await findOrCreateFolder(drive, propertyName, agentFolder.id);

    return NextResponse.json({
      success: true,
      folderId: propertyFolder.id,
      folderUrl: propertyFolder.webViewLink,
      agentFolder: agentFolderName
    });

  } catch (error) {
    console.error('Drive API Error:', error);
    return NextResponse.json({ error: 'Hubo un error al crear la carpeta en Google Drive.' }, { status: 500 });
  }
}
