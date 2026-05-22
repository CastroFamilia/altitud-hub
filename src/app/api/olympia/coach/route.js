import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/lib/supabase-server';
import { rateLimitAI } from '@/lib/rate-limit';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/* ═══════════════════════════════════════════════════════════════
   CHAT HISTORY MANAGEMENT
   
   Problem: Sending entire chat history grows token usage linearly.
   After ~20 messages, a single request can use 5K+ tokens.
   
   Solution: Sliding window — keep last N messages + a summary.
   ═══════════════════════════════════════════════════════════════ */

const MAX_HISTORY_MESSAGES = 16; // Keep last 16 messages (8 exchanges)

/**
 * Truncate chat history to prevent token explosion.
 * Keeps the most recent messages and adds a context summary if truncated.
 */
function truncateHistory(messages) {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
  const truncatedCount = messages.length - MAX_HISTORY_MESSAGES;
  const summary = {
    role: 'user',
    content: `[Nota del sistema: Se omitieron ${truncatedCount} mensajes anteriores de esta conversación para optimizar el rendimiento. Continúa la conversación de manera natural basándote en los mensajes recientes.]`,
  };
  return [summary, ...messages.slice(-MAX_HISTORY_MESSAGES)];
}

/**
 * Summarize OKR entries (last 7 days + last 30 days) into a readable context string.
 */
function buildOkrContext(entries, agentName, planData) {
  if (!entries || entries.length === 0) {
    return 'El agente aún no tiene actividades registradas en el Hub esta semana.';
  }

  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];
  const weekStart = new Date(today);
  // Go to Monday of current week
  const day = today.getDay();
  weekStart.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const weekStartISO = weekStart.toISOString().split('T')[0];

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

  const KEYS = ['llamadas', 'prelistings', 'acm', 'listings', 'captaciones', 'busquedas', 'consultas', 'muestras', 'reservas', 'transacciones', 'cierres'];
  const LABELS = {
    llamadas: 'Llamadas', prelistings: 'Prelistings', acm: 'ACMs/CMA',
    listings: 'Presentaciones', captaciones: 'Captaciones', busquedas: 'Búsquedas activas',
    consultas: 'Consultas', muestras: 'Muestras', reservas: 'Reservas',
    transacciones: 'Transacciones', cierres: 'Cierres',
  };

  const weekEntries = entries.filter(e => e.date >= weekStartISO && e.date <= todayISO);
  const monthEntries = entries.filter(e => e.date >= monthStart && e.date <= todayISO);

  const sumKey = (arr, key) => arr.reduce((s, e) => s + (e[key] || 0), 0);

  // Weekly targets from plan
  const weeklyTargets = planData?.weekly_targets || {};
  const monthlyTargets = planData?.monthly_targets || {};

  const weekLines = KEYS
    .map(k => {
      const val = sumKey(weekEntries, k);
      const tgt = weeklyTargets[k] || 0;
      if (val === 0 && tgt === 0) return null;
      const pct = tgt > 0 ? Math.round((val / tgt) * 100) : null;
      const indicator = pct === null ? '' : pct >= 100 ? ' ✅' : pct >= 60 ? ' 🟡' : ' 🔴';
      return `  - ${LABELS[k]}: ${val}${tgt > 0 ? `/${tgt}${indicator}` : ''}`;
    })
    .filter(Boolean)
    .join('\n');

  const monthLines = KEYS
    .map(k => {
      const val = sumKey(monthEntries, k);
      const tgt = monthlyTargets[k] || 0;
      if (val === 0 && tgt === 0) return null;
      return `  - ${LABELS[k]}: ${val}${tgt > 0 ? `/${tgt}` : ''}`;
    })
    .filter(Boolean)
    .join('\n');

  const totalWeekActivities = KEYS.reduce((s, k) => s + sumKey(weekEntries, k), 0);
  const streak = (() => {
    const dates = [...new Set(entries.map(e => e.date))].sort().reverse();
    let c = 0;
    let ck = todayISO;
    for (const d of dates) {
      if (d === ck) {
        c++;
        const p = new Date(ck + 'T12:00:00');
        p.setDate(p.getDate() - 1);
        while (p.getDay() === 0 || p.getDay() === 6) p.setDate(p.getDate() - 1);
        ck = p.toISOString().split('T')[0];
      } else if (d < ck) break;
    }
    return c;
  })();

  return `
📊 Actividades esta semana (datos reales del Hub):
${weekLines || '  - Sin actividades registradas esta semana.'}
Total actividades semanales: ${totalWeekActivities} | Racha de días consecutivos: 🔥 ${streak}

📅 Actividades este mes:
${monthLines || '  - Sin actividades registradas este mes.'}
`.trim();
}

export async function POST(req) {
  // ── Rate Limiting ────────────────────────────────────────────
  const limited = rateLimitAI(req);
  if (limited) return limited;

  try {
    const data = await req.json();
    const { messages, context } = data;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Faltan mensajes' }, { status: 400 });
    }

    // ── Truncate history ─────────────────────────────────────
    const trimmedMessages = truncateHistory(messages);

    const agentName = context?.agentName || context?.plan?.agent_name || 'Agente';
    const agentEmail = context?.agentEmail || context?.plan?.agent_email || '';
    const agentId = context?.agentId;
    const moduleType = context?.module || 'agent';
    const lang = context?.lang || 'es';

    // ── Newness check ─────────────────────────────────────────
    const startDate = context?.plan?.plan_start_date;
    let isNewAgent = false;
    if (startDate) {
      const diffDays = Math.ceil(Math.abs(new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24));
      if (diffDays < 90) isNewAgent = true;
    }

    // ── Live OKR data (passed from client, already fetched) ───
    const okrEntries = context?.okrEntries || null;
    const okrContext = buildOkrContext(okrEntries, agentName, context?.plan);

    // ── DB enrichment (overdue leads, profile) ─────────────────
    let dbContext = '';
    const supabase = await createClient();
    try {
      // Agent profile from DB
      if (agentEmail) {
        const { data: profile } = await supabase.from('profiles').select('full_name, office, start_date, role, preferred_follow_up_days').eq('email', agentEmail).single();
        if (profile) {
          dbContext += `\nPerfil del Agente en DB:\n- Oficina: ${profile.office || 'RE/MAX Altitud'}\n- Rol: ${profile.role || 'agent'}\n- Días preferidos para seguimiento: ${(profile.preferred_follow_up_days || []).join(', ')}\n`;
        }
      }

      // Overdue leads (SLA >48h)
      const fortyEightHoursAgo = new Date();
      fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
      const { count: overdueLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'NUEVO')
        .lte('created_at', fortyEightHoursAgo.toISOString())
        .eq(agentId ? 'agent_id' : 'status', agentId || 'NUEVO'); // filter by agent if id available

      if (overdueLeads && overdueLeads > 0) {
        dbContext += `\n⚠️ URGENTE: Tienes ${overdueLeads} lead(s) sin contactar por más de 48 horas. ¡Esto necesita atención inmediata!\n`;
      }

      // Total office listings
      const { count: totalListings } = await supabase.from('listings').select('*', { count: 'exact', head: true });
      if (totalListings) dbContext += `- Total captaciones en el Hub (red): ${totalListings}\n`;

    } catch (e) {
      console.warn('[Olympia Coach] Could not fetch DB context:', e.message);
    }

    // ── Plan context ──────────────────────────────────────────
    const planContext = context?.plan ? `
Plan de Negocios Activo:
- Meta de Ingresos: ${context.plan.currency || '$'} ${context.plan.grand_total_monthly || 0} / mes
- Portafolio Objetivo: ${context.plan.target_portfolio_size || 25} propiedades
- Ticket Promedio: ${context.plan.ticket_currency || '$'} ${context.plan.avg_ticket || 0}
- Cierres Mensuales Necesarios: ${context.plan.closes_needed_monthly || 0}
` : 'El agente no tiene un plan de negocios configurado en el HUB todavía.';

    // ── Onboarding checklist for rookies ─────────────────────
    const onboardingContext = isNewAgent ? `
[CONTEXTO DE ONBOARDING - CHECKLIST PRIMER MES]: 
Este es un agente nuevo. Como su coach, guíalo sutilmente por una o dos tareas a la vez.

Checklist:
1. Altas iniciales: REconnect, MAX/Center, Registro de la Propiedad, correo institucional, Google Workspace, grupos WhatsApp, reunión con psicóloga Maia.
2. Identidad profesional: Foto profesional, Bio ES/EN, Nicho de mercado, Firma correo, Tarjetas.
3. Presencia online: Redes actualizadas, video presentación, primer reel de propiedad/zona.
4. Capacitación: Onboarding interno, Manual de Normas, Learning Center (captación y ACM).
5. Herramientas: Canva, ChatGPT, CapCut, calendario compartido, carpeta prelisting, 1 ACM de prueba.
6. Objetivos: Metas trimestrales, plan de negocio, primer funnel activo.

Instrucción: Pregunta por 1-2 tareas específicas, no toda la lista. Ej: "¿Ya tienes tu correo @remax-altitud.cr?"
` : '';

    // ── Role descriptions ─────────────────────────────────────
    let roleDescription = `coach inmobiliaria exclusiva para agentes de RE/MAX Altitud y máxima experta en la plataforma "Altitud Hub". Tu deber es entrenar a los agentes en el hub y ayudarlos a alcanzar sus metas basándote en sus números reales.`;
    if (moduleType === 'office') {
      roleDescription = `asesora experta para el Broker / Office Manager de RE/MAX Altitud. Ayudas a analizar métricas de la oficina, liderar agentes y tomar decisiones gerenciales.`;
    } else if (moduleType === 'team') {
      roleDescription = `asesora experta para Líderes de Equipo de RE/MAX Altitud. Ayudas a coachear agentes, medir rendimiento del equipo y alcanzar metas conjuntas.`;
    }

    const languageInstruction = lang === 'en'
      ? '- Respond exclusively in ENGLISH.'
      : '- Responde exclusivamente en ESPAÑOL.';

    const systemPrompt = `
Eres Olympia, la asistente virtual de Inteligencia Artificial experta y ${roleDescription}

Instrucciones de Personalidad:
- Eres empática, motivadora, pero exiges resultados (estilo Buffini / coach de alto rendimiento).
- Tu tono es profesional pero cercano. Usas emojis para dar vida al texto.
- Formateas tus respuestas en Markdown: usa **negritas**, listas con viñetas y emojis.
${languageInstruction}

Contexto del Usuario:
- Nombre: ${agentName}
- Rol en el Hub: ${moduleType.toUpperCase()}
${planContext}
${okrContext}
${dbContext}
${onboardingContext}

Instrucciones Críticas:
1. Cuando el agente pregunte "¿cómo voy?", usa los datos reales de OKR arriba para dar feedback específico. Menciona las actividades con 🔴 (riesgo) y felicita las ✅.
2. Si hay leads con SLA vencido (>48h), menciónalo con urgencia al inicio.
3. Si preguntan sobre el hub, explica paso a paso dónde encontrar la función.
4. Si piden ideas de prospección, da tácticas modernas y concretas.
5. No inventes datos. Si no tienes info, pídela al usuario.
6. Mantén respuestas concisas y fáciles de leer (usa viñetas y negritas).
7. Tienes herramientas (tools) disponibles: "update_follow_up_preferences", "log_communication", y "schedule_follow_up". Úsalas proactivamente para ayudar al agente a registrar actividades en el CRM.
`;

    // ── Format for Gemini ─────────────────────────────────────
    const chatHistory = trimmedMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const tools = [{
      functionDeclarations: [
        {
          name: 'update_follow_up_preferences',
          description: 'Actualiza los días preferidos del agente para hacer seguimientos (ej. Lunes, Jueves).',
          parameters: {
            type: 'OBJECT',
            properties: {
              days: {
                type: 'ARRAY',
                items: { type: 'STRING' },
                description: 'Array de nombres de días en español o inglés (ej. ["Lunes", "Miércoles"]).'
              }
            },
            required: ['days']
          }
        },
        {
          name: 'log_communication',
          description: 'Registra una comunicación o interacción con un lead en el CRM.',
          parameters: {
            type: 'OBJECT',
            properties: {
              inquiry_id: { type: 'STRING', description: 'El UUID (ID de Inquiry) del lead.' },
              channel: { type: 'STRING', enum: ['whatsapp', 'email', 'phone', 'in_person'], description: 'Canal de comunicación.' },
              direction: { type: 'STRING', enum: ['outbound', 'inbound'], description: 'Dirección de la comunicación.' },
              summary: { type: 'STRING', description: 'Resumen de la interacción.' }
            },
            required: ['inquiry_id', 'channel', 'direction', 'summary']
          }
        },
        {
          name: 'schedule_follow_up',
          description: 'Programa un recordatorio de seguimiento futuro para un lead en el CRM.',
          parameters: {
            type: 'OBJECT',
            properties: {
              inquiry_id: { type: 'STRING', description: 'El UUID (ID de Inquiry) del lead.' },
              due_date: { type: 'STRING', description: 'Fecha del seguimiento en formato YYYY-MM-DD.' },
              note: { type: 'STRING', description: 'Nota o motivo del seguimiento.' }
            },
            required: ['inquiry_id', 'due_date', 'note']
          }
        }
      ]
    }];

    let response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: chatHistory,
      systemInstruction: systemPrompt,
      tools: tools
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionResponses = [];

      for (const call of response.functionCalls) {
        const name = call.name;
        const args = call.args;
        let result = {};

        try {
          if (name === 'update_follow_up_preferences') {
            await supabase.from('profiles').update({ preferred_follow_up_days: args.days }).eq('email', agentEmail);
            result = { success: true, message: 'Preferences updated successfully.' };
          } else if (name === 'log_communication') {
            await supabase.from('lead_communications').insert({
              inquiry_id: args.inquiry_id,
              agent_id: agentId,
              channel: args.channel,
              direction: args.direction,
              summary: args.summary
            });
            result = { success: true, message: 'Communication logged successfully.' };
          } else if (name === 'schedule_follow_up') {
            await supabase.from('lead_follow_ups').insert({
              inquiry_id: args.inquiry_id,
              agent_id: agentId,
              due_date: args.due_date,
              note: args.note
            });
            result = { success: true, message: 'Follow up scheduled successfully.' };
          } else {
            result = { success: false, message: 'Unknown function.' };
          }
        } catch (e) {
          result = { success: false, error: e.message };
        }

        functionResponses.push({
          functionResponse: {
            name: name,
            response: result
          }
        });
      }

      chatHistory.push({
        role: 'model',
        parts: response.functionCalls.map(call => ({
          functionCall: {
            name: call.name,
            args: call.args
          }
        }))
      });

      chatHistory.push({
        role: 'user',
        parts: functionResponses
      });

      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: chatHistory,
        systemInstruction: systemPrompt,
        tools: tools
      });
    }

    return NextResponse.json({ reply: response.text });

  } catch (error) {
    console.error('Olympia Coach API Error:', error);
    const errorMessage = error.message || '';

    if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({
        reply: '⏸️ Olympia está tomando un breve descanso por alta demanda. Todos los demás módulos del Hub siguen funcionando. Intenta de nuevo en unos minutos.',
        isQuotaError: true,
      }, { status: 200 });
    }

    if (errorMessage.includes('API key') || errorMessage.includes('INVALID_API_KEY')) {
      return NextResponse.json({
        reply: '🔧 Olympia está en mantenimiento técnico. Los demás módulos del Hub funcionan normalmente.',
        isConfigError: true,
      }, { status: 200 });
    }

    return NextResponse.json({
      reply: 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo.',
    }, { status: 200 });
  }
}
