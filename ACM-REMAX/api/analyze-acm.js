// Vercel Serverless Function — ACM Analysis
// Uses Gemini AI to synthesize pros/cons based on the ACM data

const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBgtbqagQqyOulIc_nXnou3iu3f_ABuA9A";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { property, comps, propertyType } = req.body;

    if (!property || !comps || comps.length === 0) {
      return res.status(400).json({ error: "Faltan datos de la propiedad o competencias" });
    }

    const prompt = `
      Eres un Analista Inmobiliario experto en Costa Rica asistiendo a un agente de RE/MAX.
      El agente acaba de armar un Análisis Comparativo de Mercado (ACM) para una propiedad de tipo "${propertyType}".
      Aquí tienes los datos de la propiedad que quiere vender el agente:
      ${JSON.stringify(property, null, 2)}

      Y aquí están las ${comps.length} propiedades de la competencia:
      ${JSON.stringify(comps, null, 2)}

      TAREA:
      Analiza las diferencias clave (tamaño, características, y muy importante, precios por m2 o precios absolutos). 
      Redacta EXACTAMENTE 3 puntos clave (viñetas cortas y concisas) para ayudar al agente a fijar o justificar su precio ante el cliente.
      
      Reglas:
      - Sé directo y profesional. Usa el tono de un consultor experto.
      - Destaca una ventaja competitiva o desventaja importante (ej. "Tu propiedad tiene vista al mar pero compite contra otras más grandes y baratas").
      - No calcules el precio tú, solo sugiere el posicionamiento lógico ("Para estar competitivo podrías posicionarte levemente debajo de X...").
      - DEVUELVE ÚNICAMENTE html válido para insertar. Una lista <ul> con 3 <li> adentro. No uses markdown de código (\`\`\`html).
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    
    let answer = result.response.text().trim();
    if (answer.startsWith("\`\`\`html")) answer = answer.replace(/\`\`\`html/g, "").replace(/\`\`\`/g, "").trim();

    return res.status(200).json({ success: true, html: answer });

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return res.status(500).json({ error: error.message });
  }
};
