import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { rateLimitAI } from '@/lib/rate-limit';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  const limited = rateLimitAI(req);
  if (limited) return limited;

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo.' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');
    
    // We send the document as an inline part to Gemini
    const prompt = `
Eres Olympia, una IA experta legal inmobiliaria para RE/MAX.
Lee el siguiente contrato adjunto (puede ser un LOI, SPA, Opción de Compra, etc.) y extrae EXCLUSIVAMENTE los siguientes datos de la transacción.

Devuelve tu respuesta ÚNICAMENTE en este formato JSON exacto:
{
  "type": "LOI" o "SPA",
  "property_address": "string (dirección o descripción breve del inmueble)",
  "buyer_name": "string (nombre completo o razón social del comprador)",
  "seller_name": "string (nombre completo o razón social del vendedor)",
  "registry_numbers": "string (número(s) de finca o folio real, separados por coma)",
  "plan_numbers": "string (número(s) de plano catastrado, separados por coma)",
  "side": "listing" (si representamos al vendedor), "buying" (al comprador) o "both" (ambos),
  "sale_price": "number (precio de venta total en USD, solo números sin comas)",
  "reservation_amount": "number (monto del depósito/enganche en USD, solo números)",
  "commission_pct": "number (porcentaje de comisión, ej: 5)",
  "buyer_agent_name": "string (nombre del agente del comprador si se menciona)",
  "buyer_agent_office": "string (oficina del agente del comprador si se menciona)",
  "seller_agent_name": "string (nombre del agente del vendedor si se menciona)",
  "seller_agent_office": "string (oficina del agente del vendedor si se menciona)",
  "buyer_notary_name": "string (nombre del abogado/notario designado por el comprador si se menciona)",
  "seller_notary_name": "string (nombre del abogado/notario designado por el vendedor si se menciona)",
  "expected_sign_date": "YYYY-MM-DD (fecha esperada de firma de este documento, si se menciona)",
  "close_deadline": "YYYY-MM-DD (fecha límite de cierre/traspaso)",
  "earnest_money_deadline": "YYYY-MM-DD (fecha límite para el depósito/enganche)",
  "earnest_money_non_refundable_date": "YYYY-MM-DD (fecha en que el depósito se vuelve no reembolsable/fin del due diligence)",
  "due_diligence_deadline": "YYYY-MM-DD (fecha límite del período de due diligence)",
  "negotiation_details": "string (un resumen maravillosamente redactado de 2-3 párrafos sobre los términos principales, plazos, condiciones especiales y responsabilidades acordadas)"
}

Si algún dato no está presente en el contrato, devuelve null para ese campo (excepto para type y side, deduce lo mejor posible).
Para las fechas, si mencionan "X días después de la firma", calcula una fecha aproximada asumiendo hoy como fecha de firma, o pon null si es imposible.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type || 'application/pdf',
          }
        },
        prompt
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });
    
    const resultText = response.text;
    const extractedData = JSON.parse(resultText);

    return NextResponse.json(extractedData);

  } catch (error) {
    console.error('Olympia Contract Extract API Error:', error);
    return NextResponse.json({ error: error.message || 'Hubo un error al procesar el contrato con Olympia.' }, { status: 500 });
  }
}
