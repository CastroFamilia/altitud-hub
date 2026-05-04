import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const data = await req.json();
    const { messages, context } = data;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Faltan mensajes' }, { status: 400 });
    }

    // Try to get agent email from context
    const agentEmail = context?.plan?.agent_email || '';
    const agentName = context?.plan?.agent_name || 'Agente';
    const startDate = context?.plan?.plan_start_date;
    
    let isNewAgent = false;
    if (startDate) {
      const start = new Date(startDate);
      const now = new Date();
      const diffTime = Math.abs(now - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 90) {
        isNewAgent = true; // Less than 3 months
      }
    }

    // Fetch some office/agent stats from DB if we have the email
    let dbContext = '';
    try {
      if (agentEmail) {
        // Find agent profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('email', agentEmail).single();
        if (profile) {
          dbContext += `\nDatos del Agente (DB):\n- Oficina: ${profile.office || 'RE/MAX Altitud'}\n- Fecha de Inicio: ${profile.start_date || 'Desconocida'}\n`;
        }
      }
      
      // We could add global counts here if needed, for now we will tell Olympia that she is connected to Altitud Hub.
      const { count: totalListings } = await supabase.from('listings').select('*', { count: 'exact', head: true });
      if (totalListings) {
        dbContext += `- Total de captaciones en el Hub: ${totalListings}\n`;
      }
    } catch (e) {
      console.warn("Could not fetch DB context for Olympia", e);
    }

    const planContext = context?.plan ? `
Plan de Negocios Actual (Altitud Hub):
- Meta de Ingresos: ${context.plan.currency || '$'} ${context.plan.grand_total_monthly || 0} / mes
- Portafolio Objetivo: ${context.plan.target_portfolio_size || 25} propiedades
- Ticket Promedio: ${context.plan.ticket_currency || '$'} ${context.plan.avg_ticket || 0}
- Cierres Mensuales Necesarios: ${context.plan.closes_needed_monthly || 0}
` : 'El agente no tiene un plan de negocios configurado en el HUB.';

    const onboardingContext = isNewAgent ? `
[CONTEXTO DE ONBOARDING - CHECKLIST PARA ROOKIES (PRIMER MES)]: 
Este es un agente nuevo. Tienes acceso a su Checklist de Onboarding del Primer Mes. 
Como su coach, tu objetivo es hacer seguimiento a su progreso en estas tareas, preguntando sutilmente por una o dos cosas a la vez (¡No le des la lista entera de golpe!).

El Checklist es el siguiente:

1. Altas y accesos iniciales
- Firma del acuerdo con REMAX Altitud
- Alta en REconnect y MAX/Center
- Alta Registro de la Propiedad (https://www.rnpdigital.com/shopping/login.jspx)
- Creación del correo institucional (@remax-altitud.cr)
- Acceso a Google Workspace y grupos de WhatsApp (equipo y RCR)
- Reunión con la psicóloga Maia

2. Identidad profesional
- Foto profesional y Bio en inglés/español
- Definir Nicho de mercado (remax-costa-rica.com/niche)
- Firma de correo y Tarjetas de presentación

3. Presencia en línea
- Perfiles en redes actualizados (Instagram, Facebook, LinkedIn)
- Publicación del video de presentación personal
- Primer reel de propiedad o zona

4. Capacitación obligatoria
- Onboarding interno REMAX Altitud (inducción)
- Lectura del Manual de Normas y Código de Ética
- Capacitación básica en Learning Center (proceso captación y ACM)

5. Herramientas y productividad
- Conocimiento de Canva, ChatGPT, CapCut, etc.
- Agregar el calendario compartido
- Carpeta prelisting personalizada
- Hacer 1 ACM (aunque sea de prueba)

6. Objetivos y planificación
- Definir metas trimestrales y plan de negocio
- Definir tareas semanales a alcanzar
- Tener primer funnel activo (al menos 1 cliente o propiedad en prospección)
- Capacitaciones 2026

Instrucción: Usa esta lista para guiar al agente nuevo. Revisa sus metas o pregúntale por un par de tareas específicas, por ejemplo: "¿Ya pudiste crear tu cuenta en el Registro de la Propiedad?" o "¿Cómo te fue con tu primer video de presentación?".
` : '';

    const systemPrompt = `
Eres Olympia, la asistente virtual de Inteligencia Artificial experta y coach inmobiliaria exclusiva para RE/MAX Altitud.
Tu objetivo es ayudar al agente inmobiliario (${agentName}) a alcanzar sus metas, dándole feedback basado en sus números, 
ayudándolo a analizar su cartera, dándole ideas de prospección y manteniéndolo enfocado.

Instrucciones de Personalidad:
- Eres empática, motivadora, pero también exiges resultados (estilo Buffini / coach de alto rendimiento).
- Tu tono es profesional pero cercano. Usas emojis para darle vida al texto.
- Siempre respondes en español.

Contexto del Agente:
Nombre: ${agentName}
${planContext}
${dbContext}
${onboardingContext}

Instrucciones Críticas:
1. Responde a la última pregunta o comentario del usuario de manera concisa pero de mucho valor.
2. Si el usuario te pregunta cómo va, revisa sus metas mensuales y pregúntale cuántas captaciones ha hecho esta semana para comparar.
3. Si te pide ideas de prospección, dale tácticas modernas (ej. farming geográfico, llamadas a base de datos, eventos locales).
4. No asumas datos que no tienes. Si no sabes cuántas captaciones tiene activas hoy, pídele que te cuente cómo va su "Embudo de Ventas" (Kanban).
5. Mantén tus respuestas relativamente cortas y fáciles de leer en un chat (usa viñetas o negritas).
`;

    // Format history for Gemini
    const chatHistory = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    
    // We remove the last message to use it as the current prompt, or we just pass the history
    // Since Gemini SDK allows history:
    // But actually, we can just send the last message, and pass the history.
    // Or with google-genai, we can use `contents` array.
    
    // The google-genai SDK format for contents is an array of objects with role and parts.
    // We need to inject the system prompt as the first message or use `systemInstruction`.
    
    const requestContents = [...chatHistory];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: requestContents,
        systemInstruction: systemPrompt,
    });
    
    return NextResponse.json({ reply: response.text });

  } catch (error) {
    console.error('Olympia Coach API Error:', error);
    return NextResponse.json({ error: 'Hubo un error al conectar con Olympia.' }, { status: 500 });
  }
}
