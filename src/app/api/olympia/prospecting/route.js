import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { rateLimitAI } from '@/lib/rate-limit';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  const limited = rateLimitAI(req);
  if (limited) return limited;

  try {
    const data = await req.json();
    const { contact, acms, inquiries } = data;

    if (!contact) {
      return NextResponse.json({ error: 'Faltan datos del contacto' }, { status: 400 });
    }

    const isForeign = contact.market === 'Extranjero';
    const lang = isForeign ? 'Inglés' : 'Español';
    
    const contextStr = `
Perfil del Cliente:
- Nombre: ${contact.first_name} ${contact.last_name || ''}
- Clasificación: ${contact.contact_classification || 'B'}
- Tipo: ${contact.type || 'Desconocido'}
- Mercado: ${contact.market || 'Nacional'}
- Origen: ${contact.lead_origin}
- Notas: ${contact.notes || 'Ninguna'}

Transacciones / Intereses:
- ACMs/Prelistings: ${acms?.length || 0} registrados.
- Búsquedas de Propiedades: ${inquiries?.length || 0} registradas.
`;

    const prompt = `
Eres Olympia, la asistente virtual de Inteligencia Artificial experta en Bienes Raíces (coach inmobiliaria estilo Buffini) para REMAX Altitud.
Tu objetivo es analizar el perfil de un cliente y darle al agente ideas concretas para mantenerse en "Top of Mind" y cultivar la relación.

Instrucciones Críticas:
1. Analiza los datos del cliente proporcionados abajo.
2. Basado en su perfil (ej. Inversionista vs Comprador, o si tiene propiedades para vender), sugiere 2 estrategias de contacto.
3. El idioma de respuesta DEBE SER ESPAÑOL (para que el agente lo lea), PERO los borradores de mensajes que sugieras DEBEN ESTAR EN ${lang.toUpperCase()} ya que el mercado del cliente es ${contact.market}.
4. Entrega:
   - 1 Idea estratégica (¿De qué debería hablarle el agente? Ej. tasas de interés, un reporte de mercado).
   - 1 Borrador de mensaje de WhatsApp (corto, casual, amigable, aportando valor).
   - 1 Asunto y primera línea para un correo electrónico (formal pero cálido).

Devuelve tu respuesta formateada en Markdown, usando emojis apropiados, sin preámbulos innecesarios, directo al grano.

${contextStr}
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return NextResponse.json({ suggestion: response.text });

  } catch (error) {
    console.error('Olympia API Error:', error);
    return NextResponse.json({ error: 'Hubo un error al conectar con Olympia.' }, { status: 500 });
  }
}
