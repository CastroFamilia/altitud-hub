import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import stream from 'stream';

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

// Function to find a folder by name
async function findFolder(drive, name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({ q, fields: 'files(id, name)', spaces: 'drive' });
  return res.data.files.length > 0 ? res.data.files[0] : null;
}

// Function to find a file by name
async function findFile(drive, name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`;
  const res = await drive.files.list({ q, fields: 'files(id, name)', spaces: 'drive' });
  return res.data.files.length > 0 ? res.data.files[0] : null;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const agentName = searchParams.get('agentName');

    if (!agentName) {
      return NextResponse.json({ messages: [] });
    }

    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    if (!rootFolderId) return NextResponse.json({ messages: [] });

    const agentFolderName = `HUB-${agentName.toUpperCase().replace(/\s+/g, '-')}`;
    const agentFolder = await findFolder(drive, agentFolderName, rootFolderId);
    
    if (!agentFolder) return NextResponse.json({ messages: [] });

    const historyFile = await findFile(drive, 'olympia_history.json', agentFolder.id);
    if (!historyFile) return NextResponse.json({ messages: [] });

    // Download file content
    const file = await drive.files.get({ fileId: historyFile.id, alt: 'media' });
    const messages = typeof file.data === 'string' ? JSON.parse(file.data) : file.data;
    
    return NextResponse.json({ messages: Array.isArray(messages) ? messages : [] });

  } catch (error) {
    console.error('Drive History GET Error:', error);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req) {
  try {
    const { agentName, messages } = await req.json();

    if (!agentName || !messages) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    if (!rootFolderId) throw new Error('Root folder not configured');

    const agentFolderName = `HUB-${agentName.toUpperCase().replace(/\s+/g, '-')}`;
    
    // Find or create agent folder
    let agentFolder = await findFolder(drive, agentFolderName, rootFolderId);
    if (!agentFolder) {
      const createRes = await drive.files.create({
        requestBody: {
          name: agentFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId]
        },
        fields: 'id'
      });
      agentFolder = createRes.data;
    }

    const historyFile = await findFile(drive, 'olympia_history.json', agentFolder.id);
    
    const fileMetadata = {
      name: 'olympia_history.json',
      mimeType: 'application/json'
    };
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(JSON.stringify(messages));
    
    const media = {
      mimeType: 'application/json',
      body: bufferStream,
    };

    if (historyFile) {
      // Update existing
      await drive.files.update({
        fileId: historyFile.id,
        media: media,
      });
    } else {
      // Create new
      fileMetadata.parents = [agentFolder.id];
      await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Drive History POST Error:', error);
    return NextResponse.json({ error: 'Hubo un error al guardar historial' }, { status: 500 });
  }
}
