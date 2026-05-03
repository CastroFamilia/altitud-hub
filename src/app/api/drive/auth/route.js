import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/api/drive/callback'
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Important to get the refresh_token
    prompt: 'consent', // Force consent prompt to ensure we get a refresh_token
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ]
  });

  return NextResponse.redirect(url);
}
