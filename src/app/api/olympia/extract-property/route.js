import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { rateLimitAI } from '@/lib/rate-limit';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  const limited = rateLimitAI(req);
  if (limited) return limited;

  try {
    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: 'fileId es requerido' }, { status: 400 });
    }

    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    let mimeType = 'application/pdf';
    let base64Data;
    
    try {
      // 1. Intentar obtener metadata del archivo (puede fallar con 403 si no lo creamos nosotros)
      try {
        const metadata = await drive.files.get({ fileId: fileId, fields: 'mimeType' });
        if (metadata.data.mimeType) mimeType = metadata.data.mimeType;
      } catch (e) {
        console.warn("Could not fetch mimeType, defaulting to pdf:", e.message);
      }

      // 2. Descargar el archivo desde Drive
      let fileBuffer;
      try {
        const response = await drive.files.get(
          { fileId: fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        fileBuffer = Buffer.from(response.data);
      } catch (dlError) {
        // Fallback: Si da 403, intentamos descarga anónima (funciona porque la carpeta ahora es pública)
        console.warn("Download via API failed, attempting anonymous fetch fallback...", dlError.message);
        const publicRes = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
        if (!publicRes.ok) throw dlError; // si falla el fallback, tiramos el error original
        const arrayBuffer = await publicRes.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }

      base64Data = fileBuffer.toString('base64');
    } catch (driveError) {
      throw new Error('Google Drive Error: ' + driveError.message);
    }

    let resultText;
    try {
      // 3. Procesar con Olympia (Gemini)
      const prompt = `
Eres Olympia, la IA asistente del ALTITUD HUB. Tu trabajo es analizar el documento adjunto (generalmente un Plano Catastrado o un Reporte del Registro Nacional de Propiedades de Costa Rica) y extraer la información estructurada de la propiedad.

Extrae EXCLUSIVAMENTE estos datos y devuélvelos en formato JSON:
1. "size_sqm": El área o tamaño de la propiedad en metros cuadrados (solo el número, si está en hectáreas, conviértelo a metros cuadrados donde 1 ha = 10000 sqm). Si no está claro, devuelve null.
2. "finca_number": El número de finca (o folio real). Ej: "1-123456-000". Si no hay, devuelve null.
3. "plano_number": El número de plano catastrado. Ej: "SJ-1234567-2023". Si no hay, devuelve null.

Responde ÚNICAMENTE con un objeto JSON válido, sin formato markdown adicional, con la siguiente estructura:
{
  "size_sqm": 0.0,
  "finca_number": "string | null",
  "plano_number": "string | null"
}
`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            }
          },
          prompt
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });
      resultText = aiResponse.text;
    } catch (geminiError) {
      throw new Error('Gemini AI Error: ' + geminiError.message);
    }

    const extractedData = JSON.parse(resultText);
    return NextResponse.json({ success: true, data: extractedData });

  } catch (error) {
    console.error('Olympia Extract Property API Error:', error);
    return NextResponse.json({ error: 'Hubo un error al extraer los datos con Olympia: ' + error.message }, { status: 500 });
  }
}
