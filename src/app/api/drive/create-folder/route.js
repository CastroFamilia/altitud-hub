import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

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
  const limited = rateLimit(req, { maxRequests: 10, keyPrefix: 'drive-folder' });
  if (limited) return limited;

  try {
    const { agentName, agentEmail, propertyName } = await req.json();

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

    // 3. Share the AGENT FOLDER with the agent's email as writer.
    //    Drive inheritance means ALL property subfolders appear in "Shared with me".
    //    Only runs once per agent (Drive ignores duplicate permission grants).
    if (agentEmail) {
      try {
        await drive.permissions.create({
          fileId: agentFolder.id,
          requestBody: {
            role: 'writer',
            type: 'user',
            emailAddress: agentEmail,
          },
          sendNotificationEmail: false,
        });
      } catch (permError) {
        // Permission may already exist — safe to ignore
        console.log('Agent folder share (may already exist):', permError.message);
      }
    }

    // 4. Share agent folder with broker email (if configured)
    const brokerEmail = process.env.BROKER_EMAIL;
    if (brokerEmail) {
      try {
        await drive.permissions.create({
          fileId: agentFolder.id,
          requestBody: {
            role: 'writer',
            type: 'user',
            emailAddress: brokerEmail,
          },
          sendNotificationEmail: false,
        });
      } catch (permError) {
        console.log('Broker share (may already exist):', permError.message);
      }
    }

    // 5. Share agent folder with photographer email (if configured)
    const photographerEmail = process.env.PHOTOGRAPHER_EMAIL;
    if (photographerEmail) {
      try {
        await drive.permissions.create({
          fileId: agentFolder.id,
          requestBody: {
            role: 'writer',
            type: 'user',
            emailAddress: photographerEmail,
          },
          sendNotificationEmail: false,
        });
      } catch (permError) {
        console.log('Photographer share (may already exist):', permError.message);
      }
    }

    return NextResponse.json({
      success: true,
      folderId: propertyFolder.id,
      folderUrl: propertyFolder.webViewLink,
      agentFolder: agentFolderName,
    });

  } catch (error) {
    console.error('Drive API Error:', error);
    return NextResponse.json({ error: 'Hubo un error al crear la carpeta en Google Drive.' }, { status: 500 });
  }
}
