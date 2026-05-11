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
      try {
        const metadata = await drive.files.get({ fileId: fileId, fields: 'mimeType' });
        if (metadata.data.mimeType) mimeType = metadata.data.mimeType;
      } catch (e) {
        console.warn("Could not fetch mimeType, defaulting to pdf:", e.message);
      }

      let fileBuffer;
      try {
        const response = await drive.files.get(
          { fileId: fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        fileBuffer = Buffer.from(response.data);
      } catch (dlError) {
        console.warn("Download via API failed, attempting anonymous fetch fallback...", dlError.message);
        const publicRes = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
        if (!publicRes.ok) throw dlError;
        const arrayBuffer = await publicRes.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }

      base64Data = fileBuffer.toString('base64');
    } catch (driveError) {
      throw new Error('Google Drive Error: ' + driveError.message);
    }

    let resultText;
    try {
      const prompt = `
Eres Olympia, la IA asistente del ALTITUD HUB. Tu trabajo es analizar el documento adjunto, el cual es un psicotest o prueba de comportamiento (frecuentemente llamado prueba psicométrica o "psicotest de Maia") de un agente inmobiliario.

Por favor, proporciona un análisis estructurado y conciso del comportamiento de este agente y bríndale a sus Brokers (supervisores) consejos prácticos sobre cómo tratar con esta persona.

Incluye lo siguiente en formato Markdown:
1. **Perfil General:** Un breve resumen de los rasgos de personalidad dominantes del agente.
2. **Fortalezas y Oportunidades:** Puntos fuertes y posibles debilidades que destacar.
3. **Consejos de Gestión (Para el Broker):** Recomendaciones claras sobre cómo comunicarse mejor con el agente, qué le motiva, cómo manejar sus áreas de oportunidad y cómo liderarlo eficientemente.

El texto debe ser profesional, empático, claro y muy útil para la gestión de talento humano. Evita hacer diagnósticos clínicos; enfócate puramente en el desempeño laboral y la dinámica interpersonal en ventas.
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
        ]
      });
      resultText = aiResponse.text;
    } catch (geminiError) {
      throw new Error('Gemini AI Error: ' + geminiError.message);
    }

    return NextResponse.json({ success: true, analysis: resultText });

  } catch (error) {
    console.error('Olympia Agent Behavior API Error:', error);
    return NextResponse.json({ error: 'Hubo un error al extraer los datos con Olympia: ' + error.message }, { status: 500 });
  }
}
