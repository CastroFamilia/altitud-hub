import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getContactsForAlerts } from '@/lib/dal/contacts';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Dedup windows per mode
const DEDUP_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export const dynamic = 'force-dynamic';

async function generateOutreachMessage({ clientName, eventType, tone, channel, lang }) {
  try {
    const toneDescription = {
      buffini: lang === 'en' 
        ? 'high-performance coaching style (Buffini), motivational, professional but highly relationship-driven, warm and energetic'
        : 'estilo coach de alto rendimiento (Buffini), motivador, profesional enfocado en relaciones a largo plazo, cálido y energético',
      empathetic: lang === 'en'
        ? 'highly empathetic, personal, warm, friendly, showing true care for their personal life'
        : 'altamente empático, personal, muy cálido, amigable, mostrando interés genuino por su vida personal y bienestar',
      direct: lang === 'en'
        ? 'direct, executive, professional, concise, respectful of their time'
        : 'directo, ejecutivo, profesional, conciso, respetuoso del tiempo pero cortés',
      creative: lang === 'en'
        ? 'creative, enthusiastic, out-of-the-box, very lively, using creative phrases'
        : 'creativo, entusiasta, original, muy animado y con frases ingeniosas'
    }[tone] || 'buffini';

    const systemPrompt = `
Eres Olympia, la asistente virtual de Inteligencia Artificial experta de la oficina de bienes raíces RE/MAX Altitud. Tu objetivo es redactar un mensaje de felicitación/acercamiento personalizado para un cliente.
El mensaje debe ser sumamente profesional, natural y cálido, sin sonar robótico o lleno de clichés corporativos. Debe redactarse para ser enviado por ${channel.toUpperCase()} (si es WhatsApp usa algún emoji y formato natural, si es correo incluye una línea de asunto corta al inicio).

Estilo de tono a usar: ${toneDescription}
Tipo de evento: ${eventType === 'birthday' ? 'Cumpleaños' : 'Aniversario de Compra/Mudanza de su propiedad'}
Nombre del Cliente: ${clientName}
Idioma: ${t('auto_english')}

Instrucciones Críticas:
1. Retorna ÚNICAMENTE el mensaje redactado para el cliente. No agregues introducciones como "Aquí tienes tu mensaje:" o notas adicionales.
2. Si el canal es WhatsApp, usa algunos emojis apropiados y mantén párrafos cortos y fáciles de leer.
3. No inventes detalles específicos de la propiedad que no posees; en su lugar, enfócate en el gran hito de celebrar este día especial en su hogar o celebrar un año más de su mudanza.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Escribe la felicitación para ${clientName} por su ${eventType === 'birthday' ? 'cumpleaños' : 'aniversario'}.` }] }],
      systemInstruction: systemPrompt
    });

    return response.text?.trim() || '';
  } catch (error) {
    console.error('[Outreach Generation Error]:', error);
    return lang === 'en'
      ? `Hi ${clientName}, happy ${eventType === 'birthday' ? 'birthday' : 'anniversary'}! Wishing you the absolute best. Let's catch up soon.`
      : `¡Hola ${clientName}! Feliz ${eventType === 'birthday' ? 'cumpleaños' : 'aniversario de mudanza'}. Te deseo lo mejor hoy y siempre. Un fuerte abrazo.`;
  }
}

export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ alerts: [] }, { status: 401 });

    const { weeklyTargets = {}, mode = 'daily', lang = 'es' } = await req.json();

    // On-demand mode: never push automatic alerts
    if (mode === 'on_demand') {
      return NextResponse.json({ alerts: [], skipped: true });
    }

    const userId = session.user.id;
    const dedupMs = DEDUP_MS[mode] || DEDUP_MS.daily;
    const dedupSince = new Date(Date.now() - dedupMs).toISOString();

    // Fetch agent profile and extract preferences with safe fallback
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .single();

    const olympiaTone = profile?.olympia_tone || 'buffini';
    const olympiaChannels = profile?.olympia_channels || ['whatsapp'];
    const olympiaLifecycleEnabled = profile?.olympia_lifecycle_enabled !== false;

    // Which alert types were already sent within the dedup window?
    const { data: recentNotifs } = await supabase
      .from('notifications')
      .select('type')
      .eq('user_id', userId)
      .gte('created_at', dedupSince)
      .not('type', 'is', null);

    const sentTypes = new Set((recentNotifs || []).map(n => n.type));

    // ── Week date range (Costa Rica Timezone Correction) ────────
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Costa_Rica" }));
    
    // Format YYYY-MM-DD for Costa Rica local date to avoid back-to-UTC conversion in toISOString()
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayISO = `${yyyy}-${mm}-${dd}`;

    const dayOfWeek = today.getDay(); // 0=Sun 1=Mon … 6=Sat
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    // Format week start date in Costa Rica timezone
    const wYyyy = weekStart.getFullYear();
    const wMm = String(weekStart.getMonth() + 1).padStart(2, '0');
    const wDd = String(weekStart.getDate()).padStart(2, '0');
    const weekStartISO = `${wYyyy}-${wMm}-${wDd}`;

    // ── Fetch this week's OKR entries ──────────────────────────
    const { data: entries } = await supabase
      .from('agent_daily_okr_entries')
      .select('*')
      .eq('profile_id', userId)
      .gte('date', weekStartISO)
      .lte('date', todayISO);

    const weekEntries = entries || [];
    const sum = (key) => weekEntries.reduce((s, e) => s + (e[key] || 0), 0);

    // ── Overdue leads ──────────────────────────────────────────
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);
    const { count: overdueCount } = await supabase
      .from('property_inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_agent_id', userId)
      .eq('status', 'new')
      .lte('created_at', cutoff.toISOString());

    // ── Birthdays and Move-in Anniversaries ────────────────────
    const contacts = await getContactsForAlerts(userId, supabase);

    const upcomingBirthdays = [];
    const upcomingMoveIns = [];
    
    if (contacts && olympiaLifecycleEnabled) {
      const todayMonthDay = today.getMonth() * 100 + today.getDate();
      const in7Days = new Date(today);
      in7Days.setDate(in7Days.getDate() + 7);
      const limitMonthDay = in7Days.getMonth() * 100 + in7Days.getDate();
      
      const isUpcoming = (dateStr) => {
        if (!dateStr) return false;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return false;
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const md = m * 100 + d;
        if (limitMonthDay >= todayMonthDay) {
          return md >= todayMonthDay && md <= limitMonthDay;
        } else {
          return md >= todayMonthDay || md <= limitMonthDay;
        }
      };

      contacts.forEach(c => {
        if (isUpcoming(c.birth_date)) upcomingBirthdays.push(c);
        if (isUpcoming(c.move_in_date)) upcomingMoveIns.push(c);
      });
    }

    // ── Build alert list ───────────────────────────────────────
    const toInsert = [];

    const push = (type, title, message, link = '/olimpia') => {
      if (!sentTypes.has(type)) {
        toInsert.push({ user_id: userId, type, title, message, link, is_read: false });
      }
    };

    // Rule 1: Overdue leads
    if ((overdueCount || 0) > 0) {
      push(
        'overdue_leads',
        lang === 'en'
          ? `🚨 ${overdueCount} Lead${overdueCount > 1 ? 's' : ''} Overdue >48h`
          : `🚨 ${overdueCount} Lead${overdueCount > 1 ? 's' : ''} sin contactar >48h`,
        lang === 'en'
          ? 'These leads need immediate attention. Contact them today to avoid losing the opportunity.'
          : 'Estos leads necesitan atención urgente. Contáctalos hoy para no perder la oportunidad.',
        '/oficina'
      );
    }

    // Rule 2: Calls below 50% of weekly target (Wednesday or later)
    if (dayOfWeek >= 3) {
      const callTarget = weeklyTargets?.llamadas || 0;
      const callVal = sum('llamadas');
      if (callTarget > 0 && callVal < callTarget * 0.5) {
        push(
          'calls_below_target',
          lang === 'en'
            ? `📞 Calls behind: ${callVal}/${callTarget} this week`
            : `📞 Llamadas atrasadas: ${callVal}/${callTarget} esta semana`,
          lang === 'en'
            ? `You're at ${Math.round((callVal / callTarget) * 100)}% of your weekly call goal. Time to accelerate!`
            : `Vas en ${Math.round((callVal / callTarget) * 100)}% de tu meta semanal de llamadas. ¡Es momento de acelerar!`
        );
      }
    }

    // Rule 3: No prelisting by Wednesday
    if (dayOfWeek >= 3) {
      const prelistTarget = weeklyTargets?.prelistings || 0;
      const prelistVal = sum('prelistings');
      if (prelistTarget > 0 && prelistVal === 0) {
        push(
          'no_prelisting',
          t('auto_no_prelisting_registered_this'),
          lang === 'en'
            ? "You haven't registered a prelisting yet this week. Olympia can help you find your next prospect."
            : 'Aún no has registrado un prelisting esta semana. Olympia puede ayudarte a encontrar tu próximo prospecto.'
        );
      }
    }

    // Rule 4: Celebrate a perfect week (Friday only)
    if (dayOfWeek === 5) {
      const targets = Object.entries(weeklyTargets);
      const allMet = targets.length > 0 && targets.every(([key, tgt]) => {
        if (!tgt || tgt === 0) return true;
        return sum(key) >= tgt;
      });
      if (allMet) {
        push(
          'week_complete',
          t('auto_week_complete_all_goals'),
          lang === 'en'
            ? "Incredible week! You've hit all your targets. Olympia is proud of you. 🚀"
            : '¡Semana increíble! Alcanzaste todas tus metas. ¡Olympia está orgullosa de ti! 🚀'
        );
      }
    }

    // Rule 5: Upcoming Birthdays (Gemini-Powered)
    if (upcomingBirthdays.length > 0) {
      for (const c of upcomingBirthdays) {
        const typeKey = `birthday_${c.id}`;
        if (!sentTypes.has(typeKey)) {
          const generatedMessage = await generateOutreachMessage({
            clientName: `${c.first_name} ${c.last_name || ''}`.trim(),
            eventType: 'birthday',
            tone: olympiaTone,
            channel: olympiaChannels[0] || 'whatsapp',
            lang
          });

          push(
            typeKey,
            lang === 'en' 
              ? `🎂 Birthday outreach: ${c.first_name} ${c.last_name || ''}` 
              : `🎂 Cumpleaños de ${c.first_name} ${c.last_name || ''}`,
            `[olympia_outreach]${generatedMessage}`,
            `/contactos/${c.id}`
          );
        }
      }
    }

    // Rule 6: Move-in Anniversaries (Gemini-Powered)
    if (upcomingMoveIns.length > 0) {
      for (const c of upcomingMoveIns) {
        const typeKey = `anniversary_${c.id}`;
        if (!sentTypes.has(typeKey)) {
          const generatedMessage = await generateOutreachMessage({
            clientName: `${c.first_name} ${c.last_name || ''}`.trim(),
            eventType: 'move_in_anniversary',
            tone: olympiaTone,
            channel: olympiaChannels[0] || 'whatsapp',
            lang
          });

          push(
            typeKey,
            lang === 'en' 
              ? `🏡 Purchase Anniversary: ${c.first_name} ${c.last_name || ''}` 
              : `🏡 Aniversario de Mudanza: ${c.first_name} ${c.last_name || ''}`,
            `[olympia_outreach]${generatedMessage}`,
            `/contactos/${c.id}`
          );
        }
      }
    }

    // ── Insert alerts ──────────────────────────────────────────
    if (toInsert.length > 0) {
      await supabase.from('notifications').insert(toInsert);
    }

    return NextResponse.json({ alerts: toInsert, inserted: toInsert.length });

  } catch (error) {
    console.error('[Proactive Alerts] Error:', error);
    // Never block the calling page — return gracefully
    return NextResponse.json({ alerts: [], error: error.message }, { status: 200 });
  }
}

