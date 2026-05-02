import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const data = await req.json();
    const { rawText, currentNotes } = data;

    if (!rawText) {
      return NextResponse.json({ error: 'No se proporcionó texto para analizar' }, { status: 400 });
    }

    const prompt = `
Eres Olympia, una IA experta en extracción de datos para un CRM Inmobiliario.
Tu tarea es leer el siguiente "Volcado de Texto" (puede ser un chat de WhatsApp, una cadena de correos, o notas desordenadas) y extraer la información estructurada del cliente.

Extrae EXCLUSIVAMENTE estos datos y devuélvelos en formato JSON:
1. "social_instagram": El usuario de Instagram si se menciona (sin el arroba, ej: "alejandrac"). Si no hay, devuelve null.
2. "social_linkedin": El usuario o link de LinkedIn si se menciona. Si no hay, devuelve null.
3. "new_notes": Un resumen maravillosamente redactado y estructurado en Markdown que consolide la información importante del texto (ej. "Familia: Tiene 2 hijos", "Prioridades: Busca cerca de colegios", "Presupuesto: $500k"). 
   IMPORTANTE: Si se proporcionan 'Notas Actuales', debes integrar la nueva información con las notas antiguas para no perder nada, creando un solo gran reporte de notas actualizado.

Notas Actuales del Cliente:
${currentNotes || 'Ninguna'}

Volcado de Texto a Analizar:
${rawText}

Responde ÚNICAMENTE con un objeto JSON válido, sin formato markdown adicional, con la siguiente estructura:
{
  "social_instagram": "string | null",
  "social_linkedin": "string | null",
  "new_notes": "string"
}
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json'
        }
    });
    
    const resultText = response.text;
    const extractedData = JSON.parse(resultText);

    return NextResponse.json(extractedData);

  } catch (error) {
    console.error('Olympia Extract API Error:', error);
    return NextResponse.json({ error: 'Hubo un error al extraer los datos con Olympia.' }, { status: 500 });
  }
}
