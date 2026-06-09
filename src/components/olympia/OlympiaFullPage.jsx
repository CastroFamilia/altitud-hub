"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import TopNav from '@/components/layout/TopNav';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

const ACTIVITIES = [
  { key: 'llamadas', label: 'Llamadas', emoji: '📞' },
  { key: 'prelistings', label: 'Prelistings', emoji: '📋' },
  { key: 'acm', label: 'ACMs', emoji: '📊' },
  { key: 'captaciones', label: 'Captaciones', emoji: '🏠' },
  { key: 'cierres', label: 'Cierres', emoji: '🏆' },
  { key: 'muestras', label: 'Muestras', emoji: '👁️' },
];

function getWeekDates() {
  const n = new Date();
  const d = n.getDay();
  const diff = n.getDate() - d + (d === 0 ? -6 : 1);
  const mon = new Date(n.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  const ds = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(mon);
    x.setDate(x.getDate() + i);
    ds.push(x.toISOString().split('T')[0]);
  }
  return ds;
}

function getMonthDates() {
  const n = new Date();
  const f = new Date(n.getFullYear(), n.getMonth(), 1);
  const l = new Date(n.getFullYear(), n.getMonth() + 1, 0);
  const ds = [];
  for (let d = new Date(f); d <= l; d.setDate(d.getDate() + 1)) ds.push(new Date(d).toISOString().split('T')[0]);
  return ds;
}

const sumEntries = (entries, dateSet, key) => entries.filter(e => dateSet.has(e.date)).reduce((s, e) => s + (e[key] || 0), 0);

export default function OlympiaFullPage() {
  const { t, lang } = useApp();
  const { profile, supabase } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [okrEntries, setOkrEntries] = useState([]);
  const [overdueLeads, setOverdueLeads] = useState(0);
  const [plan, setPlan] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  // ── Olympia Agent Preferences State ──────────────────────────
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [preferredDays, setPreferredDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [olympiaTone, setOlympiaTone] = useState('buffini');
  const [olympiaChannels, setOlympiaChannels] = useState(['whatsapp']);
  const [olympiaLifecycleEnabled, setOlympiaLifecycleEnabled] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefSavedMessage, setPrefSavedMessage] = useState('');

  // ── Proactive Recommendations State ─────────────────────────
  const [proactiveRecommendations, setProactiveRecommendations] = useState([]);
  const [schedulingId, setSchedulingId] = useState(null);
  const [scheduledSuccessId, setScheduledSuccessId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const agentName = profile?.full_name?.split(' ')[0] || '';

  // ── Load Profile Preferences ────────────────────────────────
  useEffect(() => {
    if (profile) {
      if (profile.preferred_follow_up_days) setPreferredDays(profile.preferred_follow_up_days);
      if (profile.olympia_tone) setOlympiaTone(profile.olympia_tone);
      if (profile.olympia_channels) setOlympiaChannels(profile.olympia_channels);
      if (profile.olympia_lifecycle_enabled !== undefined) setOlympiaLifecycleEnabled(profile.olympia_lifecycle_enabled);
    }
  }, [profile]);

  // ── Fetch Proactive Recommendations ─────────────────────────
  const loadProactiveRecommendations = useCallback(async () => {
    if (!profile?.id || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .like('message', '[olympia_outreach]%')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setProactiveRecommendations(data.map(notif => {
          const rawMessage = notif.message.replace('[olympia_outreach]', '');
          return {
            ...notif,
            extractedMessage: rawMessage
          };
        }));
      }
    } catch (e) {
      console.warn('[OlympiaFullPage] Failed to fetch proactive recommendations:', e);
    }
  }, [profile?.id, supabase]);

  // ── Load OKR data ──────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      if (!profile?.id || !supabase) return;
      try {
        // Load OKR entries (last 30 days)
        const from = new Date();
        from.setDate(from.getDate() - 30);
        const { data: entries } = await supabase
          .from('agent_daily_okr_entries')
          .select('*')
          .eq('profile_id', profile.id)
          .gte('date', from.toISOString().split('T')[0])
          .order('date', { ascending: false });
        setOkrEntries(entries || []);

        // Overdue leads
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - 48);
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'NUEVO')
          .lte('created_at', cutoff.toISOString());
        setOverdueLeads(count || 0);
      } catch (e) {
        console.warn('[OlympiaFullPage] Data load error:', e);
      }

      // Load plan
      try {
        const planStr = localStorage.getItem('altitud_okr_plan') || localStorage.getItem('altitud_business_plan');
        if (planStr) setPlan(JSON.parse(planStr));
      } catch {}

      // Fetch active alerts/recommendations
      await loadProactiveRecommendations();

      setDataLoaded(true);
    }
    loadData();
  }, [profile?.id, supabase, loadProactiveRecommendations]);

  // ── Build proactive opening message ───────────────────────
  useEffect(() => {
    if (!dataLoaded) return;
    const weekDates = new Set(getWeekDates());
    const weekCallsVal = sumEntries(okrEntries, weekDates, 'llamadas');
    const weekPrelistVal = sumEntries(okrEntries, weekDates, 'prelistings');
    const weekCallsTarget = plan?.weekly_targets?.llamadas || 0;

    let opening = '';
    if (lang === 'en') {
      const parts = [];
      if (overdueLeads > 0) parts.push(`🚨 **${overdueLeads} lead${overdueLeads > 1 ? 's' : ''} without contact for more than 48 hours** — this is urgent! Would you like help planning your outreach?`);
      if (weekCallsTarget > 0 && weekCallsVal < weekCallsTarget * 0.5) parts.push(`📞 You've made **${weekCallsVal} of ${weekCallsTarget} calls** this week. You're behind — let's fix that!`);
      if (weekPrelistVal > 0) parts.push(`✅ Good job on **${weekPrelistVal} prelisting${weekPrelistVal > 1 ? 's' : ''}** this week!`);
      opening = parts.length > 0
        ? `Hello${agentName ? `, **${agentName}**` : ''}! Here's your quick snapshot 👇\n\n${parts.join('\n\n')}\n\nWhat would you like to work on today?`
        : `Hello${agentName ? `, **${agentName}**` : ''}! 👋 I'm Olympia, your personal AI coach. Ask me anything about your numbers, prospecting ideas, or how to use the Altitud Hub.`;
    } else {
      const parts = [];
      if (overdueLeads > 0) parts.push(`🚨 **Tienes ${overdueLeads} lead${overdueLeads > 1 ? 's' : ''} sin contactar por más de 48 horas** — ¡necesita atención urgente! ¿Te ayudo a planear el acercamiento?`);
      if (weekCallsTarget > 0 && weekCallsVal < weekCallsTarget * 0.5) parts.push(`📞 Llevas **${weekCallsVal} de ${weekCallsTarget} llamadas** esta semana. Vas por debajo de tu meta — ¡vamos a recuperarlo!`);
      if (weekPrelistVal > 0) parts.push(`✅ ¡Excelente trabajo con **${weekPrelistVal} prelisting${weekPrelistVal > 1 ? 's' : ''}** esta semana!`);
      opening = parts.length > 0
        ? `¡Hola${agentName ? `, **${agentName}**` : ''}! Aquí está tu resumen rápido 👇\n\n${parts.join('\n\n')}\n\n¿En qué quieres enfocarte hoy?`
        : `¡Hola${agentName ? `, **${agentName}**` : ''}! 👋 Soy Olympia, tu coach personal con IA. Pregúntame sobre tus números, ideas de prospección o cómo usar el Altitud Hub.`;
    }

    setMessages([{ role: 'assistant', content: opening }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e, quickPrompt) => {
    if (e) e.preventDefault();
    const userMsg = quickPrompt || input.trim();
    if (!userMsg || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/olympia/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            plan,
            agentId: profile?.id,
            agentEmail: profile?.email,
            agentName: profile?.full_name,
            agentRole: profile?.role,
            okrEntries,
            lang: lang || 'es',
            module: 'agent',
          },
        }),
      });
      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('auto_sorry_i_had_a_1') }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Preferences Actions ─────────────────────────────────────
  const handleSavePreferences = async () => {
    if (!profile?.id || !supabase) return;
    setIsSavingPrefs(true);
    setPrefSavedMessage('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_follow_up_days: preferredDays,
          olympia_tone: olympiaTone,
          olympia_channels: olympiaChannels,
          olympia_lifecycle_enabled: olympiaLifecycleEnabled
        })
        .eq('id', profile.id);
      if (error) throw error;
      setPrefSavedMessage(t('olympia_pref_saved'));
      setTimeout(() => {
        setPrefSavedMessage('');
        setShowPreferencesModal(false);
      }, 1500);
    } catch (e) {
      console.error(e);
      alert(t('auto_error_saving_preferences'));
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // ── Proactive Outreach Actions ──────────────────────────────
  const getContactDetails = async (contactId) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('first_name, last_name, phone, email')
      .eq('id', contactId)
      .single();
    if (error) throw error;
    return data;
  };

  const handleCopyOutreach = (rec) => {
    navigator.clipboard.writeText(rec.extractedMessage);
    setCopiedId(rec.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendWhatsApp = async (rec) => {
    const contactId = rec.link.split('/').pop();
    try {
      const contact = await getContactDetails(contactId);
      if (!contact.phone) {
        alert(t('olympia_outreach_no_phone'));
        return;
      }
      const cleanPhone = contact.phone.replace(/\D/g, '');
      const phoneWithCountry = cleanPhone.length === 8 ? `506${cleanPhone}` : cleanPhone;
      const text = encodeURIComponent(rec.extractedMessage);
      window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');

      // Mark alert as read
      await supabase.from('notifications').update({ is_read: true }).eq('id', rec.id);
      setProactiveRecommendations(prev => prev.filter(r => r.id !== rec.id));
    } catch (err) {
      console.error('Error fetching contact for WhatsApp:', err);
      alert(t('auto_failed_to_fetch_contact'));
    }
  };

  const handleScheduleFollowup = async (rec) => {
    const contactId = rec.link.split('/').pop();
    setSchedulingId(rec.id);
    try {
      const contact = await getContactDetails(contactId);
      
      let inquiryId;
      const { data: existingInqs } = await supabase
        .from('property_inquiries')
        .select('id')
        .eq('contact_id', contactId)
        .limit(1);

      if (existingInqs && existingInqs.length > 0) {
        inquiryId = existingInqs[0].id;
      } else {
        const { data: newInq, error: inqErr } = await supabase
          .from('property_inquiries')
          .insert({
            contact_id: contactId,
            remax_property_id: 'GENERAL',
            notes: 'Creado por Olympia para seguimiento'
          })
          .select('id')
          .single();
        if (inqErr) throw inqErr;
        inquiryId = newInq.id;
      }

      const today = new Date();
      const followUpDate = new Date(today);
      followUpDate.setDate(today.getDate() + 3);
      const followUpDateISO = followUpDate.toISOString().split('T')[0];

      const { error: fupErr } = await supabase
        .from('lead_follow_ups')
        .insert({
          inquiry_id: inquiryId,
          agent_id: profile.id,
          due_date: followUpDateISO,
          note: `${rec.title}: ${rec.extractedMessage.slice(0, 100)}...`
        });

      if (fupErr) throw fupErr;

      // Mark alert as read
      await supabase.from('notifications').update({ is_read: true }).eq('id', rec.id);
      
      setScheduledSuccessId(rec.id);
      setTimeout(() => {
        setProactiveRecommendations(prev => prev.filter(r => r.id !== rec.id));
        setScheduledSuccessId(null);
      }, 1500);

    } catch (err) {
      console.error('Error scheduling follow-up:', err);
      alert(t('auto_failed_to_schedule_follow'));
    } finally {
      setSchedulingId(null);
    }
  };

  const weekDates = new Set(getWeekDates());
  const monthDates = new Set(getMonthDates());
  const ytdStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const ytdDates = new Set(okrEntries.filter(e => e.date >= ytdStart).map(e => e.date));

  const quickPrompts = lang === 'en'
    ? ['How am I doing this week? 📊', 'Give me prospecting ideas 💡', 'I need a follow-up strategy 📱', 'How do I add a prelisting? 🏠', 'Motivate me! 🔥']
    : ['¿Cómo voy esta semana? 📊', 'Dame ideas de prospección 💡', 'Necesito una estrategia de seguimiento 📱', '¿Cómo agrego un prelisting? 🏠', '¡Motívame! 🔥'];

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-dark-bg overflow-hidden">
      <TopNav title="Olympia" subtitle={t('auto_your_ai_business_coach')} />

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL — Agent Snapshot & Outreach ──────────── */}
        <aside className="hidden lg:flex flex-col w-80 xl:w-96 border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel overflow-y-auto shrink-0">
          {/* Olympia Identity & Settings Gear */}
          <div className="p-6 bg-gradient-to-br from-brand-600 to-purple-700 text-white relative shrink-0">
            <button
              onClick={() => setShowPreferencesModal(true)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white/80 hover:text-white group border border-white/10"
              title={t('olympia_pref_title')}
            >
              <svg className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="flex items-center gap-4 mb-4 pr-8">
              <div className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-white/30 shrink-0">
                <Image src="/assets/olympia-avatar.png" alt="Olympia" fill className="object-cover" />
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <h2 className="text-xl font-black">Olympia</h2>
                <p className="text-white/70 text-sm">REMAX Altitud AI</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-emerald-300 font-bold">ONLINE</span>
                </div>
              </div>
            </div>
            <p className="text-white/80 text-xs leading-relaxed">
              {lang === 'en'
                ? 'Your personal AI coach. I have access to your real performance data and I\'m here to help you grow. 🚀'
                : 'Tu coach personal con IA. Tengo acceso a tus datos reales de rendimiento y estoy aquí para ayudarte a crecer. 🚀'}
            </p>
          </div>

          {/* OKR Snapshot */}
          <div className="p-4 flex-1 space-y-5">
            {overdueLeads > 0 && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                <span className="text-lg shrink-0">🚨</span>
                <div>
                  <p className="text-xs font-black text-red-700 dark:text-red-400">
                    {overdueLeads} {lang === 'en' ? `lead${overdueLeads > 1 ? 's' : ''} overdue >48h` : `lead${overdueLeads > 1 ? 's' : ''} sin contactar >48h`}
                  </p>
                  <p className="text-[10px] text-red-500 dark:text-red-500 mt-0.5">
                    {t('auto_requires_immediate_action')}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                {t('auto_this_week_vs_goal')}
              </h3>

              <div className="space-y-2.5">
                {ACTIVITIES.map(act => {
                  const weekVal = sumEntries(okrEntries, weekDates, act.key);
                  const weekTgt = plan?.weekly_targets?.[act.key] || 0;
                  const pct = weekTgt > 0 ? Math.min(Math.round((weekVal / weekTgt) * 100), 100) : null;
                  const color = pct === null ? 'bg-gray-200 dark:bg-gray-700' : pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-brand-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500';
                  return (
                    <div key={act.key}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                          {act.emoji} {act.label}
                        </span>
                        <span className="text-[10px] font-black text-gray-900 dark:text-white tabular-nums">
                          {weekVal}{weekTgt > 0 ? `/${weekTgt}` : ''}
                          {pct !== null && <span className={`ml-1 ${pct >= 100 ? 'text-emerald-500' : pct >= 60 ? 'text-brand-500' : 'text-red-500'}`}>{pct}%</span>}
                        </span>
                      </div>
                      {weekTgt > 0 && (
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Month & YTD totals */}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-3 text-center border border-gray-100 dark:border-dark-border">
                  <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">{t('auto_month_acts')}</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                    {ACTIVITIES.reduce((s, a) => s + sumEntries(okrEntries, monthDates, a.key), 0)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-3 text-center border border-gray-100 dark:border-dark-border">
                  <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">YTD Cierres</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {sumEntries(okrEntries, ytdDates, 'cierres')}
                  </p>
                </div>
              </div>
            </div>

            {/* Horizontal Divider */}
            <div className="border-t border-gray-100 dark:border-dark-border/50 my-5" />

            {/* Proactive Outreach List */}
            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-3 px-1">
                ✨ {t('olympia_outreach_recommendations')}
              </h3>

              {proactiveRecommendations.length === 0 ? (
                <div className="text-center p-5 bg-gray-50/50 dark:bg-dark-bg/30 rounded-2xl border border-dashed border-gray-200 dark:border-dark-border/40">
                  <span className="text-2xl">✨</span>
                  <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                    {t('olympia_outreach_empty')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proactiveRecommendations.map(rec => (
                    <div
                      key={rec.id}
                      className="bg-gradient-to-r from-purple-500/5 to-brand-500/5 dark:from-purple-500/10 dark:to-brand-500/10 border border-brand-100/50 dark:border-brand-900/30 rounded-2xl p-4 space-y-3 relative overflow-hidden transition-all duration-300 hover:shadow-md"
                    >
                      {/* Top Header Card */}
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black tracking-wider uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          {rec.title.includes('🎂') ? '🎂 Cumpleaños' : '🏡 Aniversario'}
                        </span>
                        <button
                          onClick={() => handleCopyOutreach(rec)}
                          className="p-1 rounded-lg bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                          title={t('olympia_outreach_copy')}
                        >
                          {copiedId === rec.id ? (
                            <span className="text-[9px] text-emerald-500 font-bold px-1">{t('olympia_outreach_copied')}</span>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* Recipient details */}
                      <h4 className="text-[11px] font-black text-gray-800 dark:text-white">
                        {rec.title.replace('🎂 ', '').replace('🏡 ', '').split(':')[0]}
                      </h4>

                      {/* Generated Text */}
                      <div className="text-[11px] text-gray-600 dark:text-gray-300 italic leading-relaxed bg-white/60 dark:bg-black/25 p-3 rounded-xl border border-gray-100 dark:border-gray-800/40 select-all max-h-32 overflow-y-auto">
                        {rec.extractedMessage}
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(rec)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 px-3 flex items-center justify-center gap-1 text-[11px] font-bold shadow-sm active:scale-95 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.623-1.023-5.09-2.885-6.956-1.864-1.863-4.341-2.887-6.962-2.888-5.442 0-9.866 4.372-9.87 9.802 0 1.714.47 3.387 1.357 4.881l-.994 3.634 3.73-.977zm11.58-5.467c-.29-.145-1.716-.845-1.983-.942-.266-.097-.46-.145-.653.145-.193.29-.747.942-.917 1.134-.17.193-.34.218-.63.073-.29-.145-1.223-.45-2.328-1.437-.86-.767-1.44-1.716-1.61-2.006-.17-.29-.018-.446.127-.59.13-.13.29-.34.435-.508.145-.17.193-.29.29-.483.097-.193.048-.363-.024-.508-.073-.145-.653-1.573-.895-2.153-.236-.569-.475-.49-.653-.49-.17 0-.363-.012-.556-.012-.193 0-.508.073-.774.363-.266.29-1.015.992-1.015 2.417s1.04 2.78 1.185 2.974c.145.195 2.046 3.125 4.957 4.38.692.298 1.233.477 1.654.61.696.22 1.328.19 1.83.115.56-.085 1.717-.7 1.958-1.378.24-.677.24-1.258.17-1.378-.07-.12-.266-.194-.556-.34z" />
                          </svg>
                          {t('olympia_outreach_whatsapp')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScheduleFollowup(rec)}
                          disabled={schedulingId === rec.id}
                          className="bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2 px-3 flex items-center justify-center gap-1 text-[11px] font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
                        >
                          {schedulingId === rec.id ? (
                            <span>{t('olympia_outreach_scheduling')}</span>
                          ) : scheduledSuccessId === rec.id ? (
                            <span>✅ {t('olympia_outreach_scheduled')}</span>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {t('olympia_outreach_schedule')}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── RIGHT PANEL — Chat ───────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-gray-50 dark:bg-dark-bg">
            {!dataLoaded ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="w-12 h-12 rounded-full overflow-hidden relative ring-4 ring-brand-100 dark:ring-brand-900 animate-pulse">
                    <Image src="/assets/olympia-avatar.png" alt="Olympia" fill className="object-cover" />
                  </div>
                  <p className="text-sm font-medium">{t('auto_olympia_is_warming_up')}</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} max-w-3xl ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'} w-full`}>
                  {msg.role === 'assistant' && (
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 mt-1 relative ring-2 ring-brand-200 dark:ring-brand-800">
                      <Image src="/assets/olympia-avatar.png" alt="Olympia" fill className="object-cover" />
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 shadow-sm text-sm max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-brand-500 text-white rounded-tr-none'
                      : 'bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-800 dark:text-gray-200 rounded-tl-none'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:font-black prose-strong:text-gray-900 dark:prose-strong:text-white leading-relaxed">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                  {msg.role === 'user' && profile?.avatar_url && (
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 mt-1 relative">
                      <Image src={profile.avatar_url} alt="You" fill className="object-cover" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3 max-w-3xl mr-auto">
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 relative ring-2 ring-brand-200 dark:ring-brand-800">
                  <Image src="/assets/olympia-avatar.png" alt="Olympia" fill className="object-cover" />
                </div>
                <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                  <div className="w-2 h-2 bg-brand-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && dataLoaded && (
            <div className="px-4 md:px-6 py-2 bg-gray-50 dark:bg-dark-bg flex flex-wrap gap-2 border-t border-gray-100 dark:border-dark-border/50 shrink-0">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(null, prompt)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-white dark:bg-dark-card border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 md:p-5 bg-white dark:bg-dark-panel border-t border-gray-200 dark:border-dark-border shrink-0">
            <form onSubmit={handleSend} className="flex gap-3 items-center max-w-3xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('auto_ask_olympia_anything')}
                className="flex-1 bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 transition-all outline-none"
                disabled={isLoading || !dataLoaded}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !dataLoaded}
                className="w-12 h-12 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand-500/30 hover:shadow-xl active:scale-95 shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Preferences Modal ── */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-dark-border/50 flex justify-between items-center bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/10 dark:to-dark-panel">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚙️</span>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {t('olympia_pref_title')}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('auto_customize_your_ai_assistant')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-bg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {/* AI Tone Select */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  {t('olympia_pref_tone')}
                </label>
                <select
                  value={olympiaTone}
                  onChange={(e) => setOlympiaTone(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition-all"
                >
                  <option value="buffini">🏆 {t('auto_coaching_buffini')}</option>
                  <option value="empathetic">❤️ {t('auto_empathetic')}</option>
                  <option value="direct">💼 {t('auto_direct_executive')}</option>
                  <option value="creative">🎨 {t('auto_creative_enthusiastic')}</option>
                </select>
              </div>

              {/* Outreach Channels Checkboxes */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  {t('olympia_pref_channels')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['whatsapp', 'email', 'phone'].map(ch => {
                    const isChecked = olympiaChannels.includes(ch);
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setOlympiaChannels(prev => prev.filter(c => c !== ch));
                          } else {
                            setOlympiaChannels(prev => [...prev, ch]);
                          }
                        }}
                        className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                          isChecked
                            ? 'bg-brand-50 dark:bg-brand-950/20 border-brand-500 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/20'
                            : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-bg'
                        }`}
                      >
                        <span>{ch === 'whatsapp' ? '💬' : ch === 'email' ? '📧' : '📱'}</span>
                        <span className="capitalize">{ch}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lifecycle Reminders Toggle */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border/50 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-gray-800 dark:text-white">
                    {t('olympia_pref_lifecycle')}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 max-w-[280px]">
                    {lang === 'en'
                      ? 'Proactively alert and generate outreach drafts for birthdays and move-in anniversaries.'
                      : 'Alertas proactivas y redacción de saludos para cumpleaños y aniversarios de mudanza.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOlympiaLifecycleEnabled(!olympiaLifecycleEnabled)}
                  className={`w-11 h-6 rounded-full transition-all relative ${
                    olympiaLifecycleEnabled ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all ${
                    olympiaLifecycleEnabled ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>

              {/* Follow-up Days Checkboxes */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  {t('olympia_pref_days')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                    const isChecked = preferredDays.includes(day);
                    const label = {
                      Monday: t('auto_mon'),
                      Tuesday: t('auto_tue'),
                      Wednesday: t('auto_wed'),
                      Thursday: t('auto_thu'),
                      Friday: t('auto_fri')
                    }[day];

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setPreferredDays(prev => prev.filter(d => d !== day));
                          } else {
                            setPreferredDays(prev => [...prev, day]);
                          }
                        }}
                        className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                          isChecked
                            ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-500 text-purple-600 dark:text-purple-400 ring-2 ring-purple-500/20'
                            : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-bg'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-dark-border/50 bg-gray-50 dark:bg-dark-bg flex justify-between items-center shrink-0">
              {prefSavedMessage ? (
                <span className="text-xs text-emerald-500 font-bold flex items-center gap-1.5">
                  ✅ {prefSavedMessage}
                </span>
              ) : (
                <span className="text-[10px] text-gray-400 leading-relaxed max-w-[200px]">
                  {t('olympia_outreach_note')}
                </span>
              )}
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={isSavingPrefs}
                className="bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2.5 px-5 text-xs font-bold transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-brand-500/20"
              >
                {isSavingPrefs ? t('olympia_pref_saving') : t('olympia_pref_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
