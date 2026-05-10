// Vercel Serverless Function — ACM Property Scraper
// Uses Gemini AI to extract structured property data from any real estate URL

const { GoogleGenerativeAI } = require("@google/generative-ai");
const cheerio = require("cheerio");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBgtbqagQqyOulIc_nXnou3iu3f_ABuA9A";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

module.exports = async function handler(req, res) {
  // CORS headers
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
    const { url, propertyType, indicators } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // 1. Fetch HTML simulating a real browser
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "es-CR,es;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "max-age=0",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL. Status: ${response.status}`);
    }

    const html = await response.text();

    // 2. Parse with Cheerio
    const $ = cheerio.load(html);
    let structuredJson = "";
    $('script[type="application/ld+json"]').each((i, el) => {
      structuredJson += $(el).html() + "\n";
    });

    // Extract images (exclude logos, icons, etc.)
    const imgs = [];
    $("img").each((i, el) => {
      const src =
        $(el).attr("data-src") ||
        $(el).attr("data-lazy-src") ||
        $(el).attr("src");
      if (src) {
        const lowerSrc = src.toLowerCase();
        if (
          !lowerSrc.includes("logo") &&
          !lowerSrc.includes("icon") &&
          !lowerSrc.includes("avatar") &&
          !lowerSrc.endsWith(".svg") &&
          !lowerSrc.includes("header") &&
          !lowerSrc.includes("footer") &&
          !lowerSrc.includes("banner") &&
          !lowerSrc.includes("agent") &&
          !lowerSrc.includes("broker")
        ) {
          try {
            imgs.push(src.startsWith("/") ? new URL(src, url).href : src);
          } catch (e) {}
        }
      }
    });

    // Clean HTML but keep text intact
    $(
      'script:not([type="application/ld+json"]), style, nav, footer, iframe, noscript, svg'
    ).remove();

    const title = $("title").text();
    const bodyText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 30000);

    // 3. Build dynamic prompt based on property type and indicators
    const indicatorFields = buildIndicatorPrompt(propertyType, indicators);

    const prompt = `
      Eres un experto en extracción de datos inmobiliarios de Costa Rica. Te pasaré datos crudos de una página web de una propiedad.
      
      REGLAS CRÍTICAS:
      1. Extrae el PRECIO exacto en USD. Si está en colones, conviértelo (1 USD ≈ 510 CRC).
      2. Extrae la UBICACIÓN exacta (dirección, barrio, distrito).
      3. Para campos booleanos (sí/no), responde SOLO "SI" o "NO".
      4. Para campos numéricos, responde SOLO el número sin unidades.
      5. Si un dato no está disponible, pon "N/D".
      6. Extrae SOLO fotos de la propiedad (fachada, interiores, terreno, vistas). EXCLUYE logos, mapas, fotos de agentes.
      7. Devuelve SOLO un JSON válido, sin markdown ni explicaciones.
      
      TIPO DE PROPIEDAD: ${propertyType || "general"}
      
      Estructura JSON esperada:
      {
        "titulo": "nombre o título de la propiedad",
        "precio": número en USD (solo el número, sin $ ni comas),
        "ubicacion": "dirección completa",
        "barrio": "barrio o zona",
        "distrito": "distrito",
        "descripcion": "descripción completa de la propiedad",
        "fuente": "nombre del portal o agencia",
        "tiempo_publicado": "tiempo estimado de publicación",
        "imagenes": ["url1", "url2", "url3"],
        ${indicatorFields}
      }

      ----------------
      DATOS DE LA WEB:
      URL Original: ${url}
      Título: ${title}
      
      Datos Estructurados (JSON-LD):
      ${structuredJson.slice(0, 10000)}

      Imágenes encontradas:
      ${[...new Set(imgs)].slice(0, 20).join(", ")}
      
      Texto de la página:
      ${bodyText}
    `;

    // 4. Call Gemini - Using stable gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let result = null;
    let retries = 3;
    let delay = 2000;
    
    while (retries > 0) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (err) {
        const isOverloaded = err.message?.includes("503") || err.message?.includes("Overloaded") || err.message?.includes("saturado");
        
        if (isOverloaded && retries > 1) {
          console.log(`Gemini overloaded, retrying in ${delay/1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
          retries--;
          delay *= 2; // Exponential backoff
        } else if (isOverloaded) {
          throw new Error(
            "El motor de IA de Google está experimentando alta demanda actualmente. Por favor, intenta de nuevo en unos segundos o ingresa los datos manualmente."
          );
        } else {
          throw err;
        }
      }
    }

    let extractedText = result.response.text().trim();
    if (extractedText.startsWith("```json")) {
      extractedText = extractedText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
    }
    if (extractedText.startsWith("```")) {
      extractedText = extractedText.replace(/```/g, "").trim();
    }

    let propertyData;
    try {
      propertyData = JSON.parse(extractedText);
    } catch (e) {
      console.error("Gemini returned invalid JSON:", extractedText);
      throw new Error("El motor de IA no pudo estructurar los datos.");
    }

    return res.status(200).json({ success: true, data: propertyData });
  } catch (error) {
    console.error("Scrape Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

function buildIndicatorPrompt(propertyType, indicators) {
  // Default indicator sets per property type
  const lotIndicators = `
        "tamano_m2": número de metros cuadrados totales,
        "porcentaje_plano": porcentaje del terreno que es plano (número 0-100),
        "rios_nacientes": "SI" o "NO" — tiene ríos, nacientes o quebradas,
        "vistas": "SI" o "NO" — tiene vistas panorámicas o al valle,
        "arboles_frutales": "SI" o "NO" — tiene árboles frutales o maderables,
        "electricidad": "SI" o "NO",
        "agua": "SI" o "NO",
        "acceso": "4x4" o "Asfalto" o "Ripio buen estado",
        "internet": "SI" o "NO",
        "casas_existentes": "SI" o "NO",
        "caminos_internos": "SI" o "NO",
        "corrales": "SI" o "NO",
        "posibles_usos": "tipo de uso posible (RESIDENCIAL, COMERCIAL, AGRÍCOLA, MIXTO)"`;

  const casaIndicators = `
        "tamano_m2": metros cuadrados de construcción,
        "tamano_lote_m2": metros cuadrados del lote/terreno,
        "habitaciones": número de habitaciones,
        "banos": número de baños,
        "parqueos": número de parqueos,
        "ano_construccion": año de construcción,
        "pisos": número de pisos/niveles,
        "piscina": "SI" o "NO",
        "jardin": "SI" o "NO",
        "seguridad_24h": "SI" o "NO",
        "area_social": "SI" o "NO",
        "acceso": "4x4" o "Asfalto" o "Ripio buen estado",
        "estado_construccion": "Excelente" o "Bueno" o "Regular" o "Necesita reparaciones",
        "amueblado": "Sí" o "Parcial" o "No"`;

  const deptoIndicators = `
        "tamano_m2": metros cuadrados totales,
        "habitaciones": número de habitaciones,
        "banos": número de baños,
        "parqueos": número de parqueos,
        "piso_nivel": en qué piso está,
        "elevador": "SI" o "NO",
        "amenidades": "SI" o "NO" — tiene amenidades del condominio,
        "piscina": "SI" o "NO",
        "seguridad_24h": "SI" o "NO",
        "vista": descripción de la vista,
        "ano_construccion": año de construcción,
        "cuota_mantenimiento": cuota mensual en USD`;

  switch (propertyType) {
    case "casa":
    case "ph":
      return casaIndicators;
    case "depto":
      return deptoIndicators;
    case "lote":
    case "terreno":
    case "campo":
    default:
      return lotIndicators;
  }
}
