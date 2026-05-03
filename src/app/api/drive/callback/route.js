import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/api/drive/callback'
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    if (tokens.refresh_token) {
      // Append refresh token to .env.local automatically
      const envPath = path.join(process.cwd(), '.env.local');
      fs.appendFileSync(envPath, `\nGOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      
      return new NextResponse(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #0F9D58;">✅ ¡Conexión con Google Drive Exitosa!</h1>
            <p>Se ha generado el Refresh Token y se ha guardado automáticamente en tu archivo .env.local</p>
            <p><strong>IMPORTANTE:</strong> Por favor ve a tu terminal, presiona <b>Ctrl+C</b> para apagar el servidor y vuelve a correr <b>npm run dev</b>.</p>
            <p>Después de reiniciar, ¡la automatización de Drive estará lista para usarse!</p>
          </body>
        </html>
      `, { headers: { 'content-type': 'text/html' } });
    } else {
      return NextResponse.json({ 
        error: 'No refresh token received.',
        message: 'Asegúrate de haber borrado los permisos anteriores de la app en tu cuenta de Google si intentaste esto antes.'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
