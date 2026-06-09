import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { rateLimitAI } from '@/lib/rate-limit';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * POST /api/olympia/whatsapp-message
 * Body: { property: {...}, lang: 'es' | 'en', contactName?: string }
 * Returns: { message: string }
 *
 * Generates a short, warm WhatsApp message for an agent to send to a prospect
 * about a specific property. The message is pre-filled with key details and a
 * personal touch from Olympia AI — NO Drive folder links are included.
 */
export async function POST(req) {
  const limited = rateLimitAI(req);
  if (limited) return limited;

  try {
    const { property, lang = 'es', contactName } = await req.json();

    if (!property) {
      return NextResponse.json({ error: 'Missing property data' }, { status: 400 });
    }

    // ── Build a concise property summary for the prompt ──
    const currency = property.list_price_currency_id === 1 ? 'CRC' : 'USD';
    const symbol   = property.list_price_currency_id === 1 ? '₡' : '$';
    const price    = property.list_price
      ? `${symbol}${Number(property.list_price).toLocaleString('en-US', { maximumFractionDigits: 0 })} ${currency}`
      : null;

    const title      = lang === 'en'
      ? (property.listing_title_en || property.listing_title_es || property.name)
      : (property.listing_title_es || property.listing_title_en || property.name);
    const location   = property.unparsed_address || null;
    const typeMap    = { 1: 'Casa', 2: 'Apartamento', 3: 'Lote', 4: 'Finca', 5: 'Local Comercial', 6: 'Bodega', 7: 'Oficina', 8: 'Hotel', 9: 'Edificio', 10: 'Terreno' };
    const type       = property.property_type_id ? (typeMap[property.property_type_id] || property.property_type || 'Propiedad') : (property.property_type || 'Propiedad');
    const contract   = property.listing_contract_type === 2 ? 'alquiler' : 'venta';
    const bedrooms   = property.bedrooms_total   ? `${property.bedrooms_total} hab.` : null;
    const bathrooms  = property.bathrooms_full   ? `${property.bathrooms_full} baños` : null;
    const area       = property.lot_size_area     ? `${Number(property.lot_size_area).toLocaleString()} m²` : null;
    const desc       = lang === 'en'
      ? (property.public_remarks_en || property.public_remarks_es || '')
      : (property.public_remarks_es || property.public_remarks_en || '');

    const propSummary = [
      title && `Nombre: ${title}`,
      type   && `Tipo: ${type}`,
      contract && `Modalidad: ${contract}`,
      price  && `Precio: ${price}`,
      location && `Ubicación: ${location}`,
      bedrooms && bathrooms ? `Detalle: ${bedrooms}, ${bathrooms}` : (bedrooms || bathrooms),
      area   && `Área: ${area}`,
      desc   && `Descripción corta: ${desc.slice(0, 250)}`,
    ].filter(Boolean).join('\n');

    const targetLang = t('auto_english_1');
    const greeting   = contactName ? `el cliente se llama ${contactName}` : 'no conocemos el nombre del cliente todavía';

    const prompt = `
Eres Olympia, la asistente de IA de REMAX Altitud, experta en bienes raíces y comunicación inmobiliaria.

Tu tarea: Redacta UN mensaje de WhatsApp corto, cálido y profesional que el AGENTE pueda enviar a un CLIENTE potencial sobre esta propiedad.

Reglas estrictas:
1. El mensaje debe estar en ${targetLang}.
2. Sé breve: máximo 5 líneas. No es un correo formal, es un WhatsApp.
3. Incluye el precio, tipo de propiedad y ubicación de forma natural.
4. Termina con una pregunta abierta que genere conversación (ej. "¿Cuándo podría mostrártela?").
5. NO incluyas ningún link ni URL.
6. NO incluyas tu nombre (Olympia) en el mensaje. Escribe como si fuera el agente.
7. Usa emojis con moderación (1-2 máximo).
8. Contexto del cliente: ${greeting}.

Datos de la propiedad:
${propSummary}

Devuelve SOLO el texto del mensaje, sin explicaciones, sin comillas, sin prefijos.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const message = (response.text || '').trim();
    return NextResponse.json({ message });

  } catch (error) {
    console.error('[WhatsApp Message API] Error:', error);
    return NextResponse.json({ error: 'Error al generar el mensaje con Olympia.' }, { status: 500 });
  }
}
