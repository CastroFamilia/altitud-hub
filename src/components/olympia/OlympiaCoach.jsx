"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export default function OlympiaCoach() {
  const { t, lang } = useApp();
  const { profile, supabase } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  let currentModule = 'agent';
  if (pathname?.includes('/oficina')) currentModule = 'office';
  else if (pathname?.includes('/team')) currentModule = 'team';

  const getInitialMessage = useCallback(() => {
    const name = profile?.full_name?.split(' ')[0] || '';
    const greeting = name ? `¡Hola, ${name}! ` : '¡Hola! ';
    if (lang === 'en') {
      if (currentModule === 'office') return `Hello${name ? `, ${name}` : ''}! I'm Olympia, your Altitud Hub expert and Office Manager advisor. How can I help you today?`;
      if (currentModule === 'team') return `Hello${name ? `, ${name}` : ''}! I'm Olympia, your Team Leader advisor. How can I help you today?`;
      return `Hello${name ? `, ${name}` : ''}! I'm Olympia, your coach and Altitud Hub expert. Ask me anything about your numbers, the hub, or prospecting ideas.`;
    } else {
      if (currentModule === 'office') return `${greeting}Soy Olympia, tu experta en el Altitud Hub y asesora de la Oficina. ¿En qué te puedo ayudar hoy?`;
      if (currentModule === 'team') return `${greeting}Soy Olympia, tu asesora de Líder de Equipo. ¿En qué te puedo ayudar hoy?`;
      return `${greeting}Soy Olympia, tu coach y experta en el Altitud Hub. Puedes preguntarme cómo vas con tus metas, ideas de prospección o cómo usar el hub. 💪`;
    }
  }, [lang, currentModule, profile?.full_name]);

  // ── Fetch live OKR week summary ──────────────────────────
  const fetchOkrContext = useCallback(async () => {
    if (!profile?.id || !supabase) return null;
    try {
      const today = new Date();
      // Get last 30 days for historical context
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      const fromISO = from.toISOString().split('T')[0];
      const { data } = await supabase
        .from('agent_daily_okr_entries')
        .select('*')
        .eq('profile_id', profile.id)
        .gte('date', fromISO)
        .order('date', { ascending: false });
      return data || [];
    } catch (e) {
      console.warn('[Olympia] Could not fetch OKR context', e);
      return null;
    }
  }, [profile?.id, supabase]);

  // ── Load history ─────────────────────────────────────────
  useEffect(() => {
    async function loadHistory() {
      try {
        const initial = [{ role: 'assistant', content: getInitialMessage() }];
        let loadedMessages = null;

        const agentName = profile?.full_name || '';
        if (agentName) {
          try {
            const res = await fetch(`/api/olympia/history?agentName=${encodeURIComponent(agentName)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.messages && data.messages.length > 0) {
                loadedMessages = data.messages;
              }
            }
          } catch (fetchErr) {
            console.warn('[Olympia] Could not load chat history from Drive endpoint (credentials may not be configured locally):', fetchErr.message);
          }
        }

        if (!loadedMessages) {
          const localHistory = localStorage.getItem('olympia_coach_history');
          if (localHistory) loadedMessages = JSON.parse(localHistory);
        }

        setMessages(loadedMessages || initial);
      } catch (e) {
        console.warn('[Olympia] Error loading chat history:', e.message);
      }
    }
    if (typeof window !== 'undefined') loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // ── Save history on change ────────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem('olympia_coach_history', JSON.stringify(messages));
      const agentName = profile?.full_name;
      if (agentName) {
        fetch('/api/olympia/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentName, messages }),
        }).catch(() => {});
      }
    }
    scrollToBottom();
  }, [messages, profile?.full_name]);

  const clearHistory = () => {
    if (confirm('¿Estás seguro de que quieres borrar el historial del chat?')) {
      const initial = [{ role: 'assistant', content: getInitialMessage() }];
      setMessages(initial);
      localStorage.setItem('olympia_coach_history', JSON.stringify(initial));
      const agentName = profile?.full_name;
      if (agentName) {
        fetch('/api/olympia/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentName, messages: initial }),
        }).catch(() => {});
      }
    }
  };

  const handleSend = async (e, quickPrompt) => {
    if (e) e.preventDefault();
    const userMsg = quickPrompt || input.trim();
    if (!userMsg || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Build rich context
      const okrEntries = await fetchOkrContext();
      
      // Load business plan from localStorage (still valid for plan goals)
      let planData = null;
      try {
        const plan = localStorage.getItem('altitud_okr_plan') || localStorage.getItem('altitud_business_plan');
        if (plan) planData = JSON.parse(plan);
      } catch {}

      const agentContext = {
        plan: planData,
        agentId: profile?.id,
        agentEmail: profile?.email,
        agentName: profile?.full_name,
        agentRole: profile?.role,
        okrEntries: okrEntries,
        lang: lang || 'es',
        module: currentModule,
      };

      const response = await fetch('/api/olympia/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context: agentContext }),
      });

      if (!response.ok) throw new Error('Error al conectar con Olympia');
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: t('auto_sorry_i_had_a') }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = lang === 'en'
    ? ['How am I doing this week? 📊', 'Give me prospecting ideas 💡', 'How do I use the hub? 🛠️']
    : ['¿Cómo voy esta semana? 📊', 'Dame ideas de prospección 💡', '¿Cómo uso el hub? 🛠️'];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Bubble Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          id="olympia-bubble-btn"
          className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-all duration-200 flex items-center justify-center bg-brand-500 overflow-hidden ring-4 ring-white dark:ring-dark-bg group"
          title="Olympia - AI Hub Expert"
        >
          <Image src="/assets/olympia-avatar.png" alt="Olympia AI" className="w-full h-full object-cover" fill />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-dark-bg"></span>
          </span>
        </button>
      )}

      {/* Slide-over Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-[420px] bg-white dark:bg-dark-card shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-brand-50 via-white to-white dark:from-brand-900/20 dark:via-dark-card dark:to-dark-card shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-brand-400/40 shrink-0">
              <Image src="/assets/olympia-avatar.png" alt="Olympia" fill className="object-cover" />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-dark-card"></span>
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white">Olympia</h2>
              <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {t('auto_re_max_altitud_ai')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Link
              href="/olimpia"
              onClick={() => setIsOpen(false)}
              title={t('auto_open_full_olympia_page')}
              className="p-2 text-gray-400 hover:text-brand-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </Link>
            <button
              onClick={clearHistory}
              title="Borrar historial"
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-dark-bg">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mr-2 mt-1 relative ring-1 ring-brand-300/40">
                  <Image src="/assets/olympia-avatar.png" alt="Olympia" fill className="object-cover" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-brand-500 text-white rounded-tr-none'
                    : 'bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-800 dark:text-gray-200 rounded-tl-none'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-1 prose-strong:text-gray-900 dark:prose-strong:text-white">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mr-2 relative ring-1 ring-brand-300/40">
                <Image src="/assets/olympia-avatar.png" alt="Olympia" fill className="object-cover" />
              </div>
              <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-3 rounded-2xl rounded-tl-none flex space-x-1 items-center">
                <div className="w-2 h-2 bg-brand-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 2 && !isLoading && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 bg-gray-50 dark:bg-dark-bg shrink-0">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(null, prompt)}
                className="text-[10px] font-semibold px-3 py-1.5 rounded-full bg-white dark:bg-dark-card border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors shadow-sm"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border shrink-0">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('auto_ask_olympia')}
              className="w-full bg-gray-100 dark:bg-dark-bg border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-dark-card focus:ring-0 rounded-full pl-4 pr-12 py-3 text-sm text-gray-900 dark:text-white transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
