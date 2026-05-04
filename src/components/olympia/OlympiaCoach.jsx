"use client";

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/context';

export default function OlympiaCoach({ isOpen, onClose }) {
  const { t } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load history
  useEffect(() => {
    async function loadHistory() {
      try {
        let agentName = null;
        try {
          const planStr = localStorage.getItem('altitud_okr_plan') || localStorage.getItem('altitud_business_plan');
          if (planStr) {
            agentName = JSON.parse(planStr).agent_name;
          }
        } catch(e) {}

        const initial = [{
          role: 'assistant',
          content: '¡Hola! Soy Olympia, tu coach de RE/MAX Altitud. ¿En qué te puedo ayudar hoy con tu negocio? Si eres nuev@, te puedo dar algunas tareas de Onboarding, como revisar si ya creaste tu cuenta en el Registro de la Propiedad.',
        }];

        let loadedMessages = null;

        if (agentName) {
          // Attempt to load from Drive via API
          const res = await fetch(`/api/olympia/history?agentName=${encodeURIComponent(agentName)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.messages && data.messages.length > 0) {
              loadedMessages = data.messages;
            }
          }
        }

        if (!loadedMessages) {
          const localHistory = localStorage.getItem('olympia_coach_history');
          if (localHistory) {
            loadedMessages = JSON.parse(localHistory);
          }
        }

        setMessages(loadedMessages || initial);
      } catch (e) {
        console.error("Error loading chat history:", e);
      }
    }
    
    if (typeof window !== 'undefined') {
      loadHistory();
    }
  }, []);

  // Save history on change
  useEffect(() => {
    if (messages.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem('olympia_coach_history', JSON.stringify(messages));
      
      // Async sync to drive
      const syncToDrive = async () => {
        try {
          let agentName = null;
          try {
            const planStr = localStorage.getItem('altitud_okr_plan') || localStorage.getItem('altitud_business_plan');
            if (planStr) agentName = JSON.parse(planStr).agent_name;
          } catch(e) {}

          if (agentName) {
            await fetch('/api/olympia/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agentName, messages })
            });
          }
        } catch (e) {
          console.error("Failed to sync history to drive", e);
        }
      };

      // Debounce or just fire and forget (assuming not too many messages per second)
      // Since messages only change on user send or AI reply, firing twice per interaction is acceptable.
      syncToDrive();
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (confirm('¿Estás seguro de que quieres borrar el historial del chat?')) {
      const initial = [{
        role: 'assistant',
        content: '¡Hola! Soy Olympia, tu coach de RE/MAX Altitud. ¿En qué te puedo ayudar hoy con tu negocio? Si eres nuev@, te puedo dar algunas tareas de Onboarding, como revisar si ya creaste tu cuenta en el Registro de la Propiedad.',
      }];
      setMessages(initial);
      localStorage.setItem('olympia_coach_history', JSON.stringify(initial));
      
      // Also clear in drive
      try {
        let agentName = null;
        const planStr = localStorage.getItem('altitud_okr_plan') || localStorage.getItem('altitud_business_plan');
        if (planStr) agentName = JSON.parse(planStr).agent_name;
        if (agentName) {
          fetch('/api/olympia/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentName, messages: initial })
          });
        }
      } catch(e) {}
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Load context from localStorage
      let agentContext = {};
      try {
        const plan = localStorage.getItem('altitud_okr_plan') || localStorage.getItem('altitud_business_plan');
        if (plan) {
          agentContext.plan = JSON.parse(plan);
        }
      } catch(err) {}

      const response = await fetch('/api/olympia/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: agentContext,
        })
      });

      if (!response.ok) throw new Error('Error al conectar con Olympia');

      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Render markdown basically for line breaks
  const renderMessage = (content) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* Slide-over Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-96 bg-white dark:bg-dark-card shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border glass-panel">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Olympia Coach</h2>
              <p className="text-xs text-brand-500 font-medium">RE/MAX Altitud AI</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={clearHistory}
              title="Borrar historial"
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-dark-bg">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand-500 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-800 dark:text-gray-200 rounded-tl-none'
                }`}
              >
                {renderMessage(msg.content)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-3 rounded-2xl rounded-tl-none flex space-x-1">
                <div className="w-2 h-2 bg-brand-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border">
          <form onSubmit={handleSend} className="relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregúntale a Olympia..." 
              className="w-full bg-gray-100 dark:bg-dark-bg border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-dark-card focus:ring-0 rounded-full pl-4 pr-12 py-3 text-sm text-gray-900 dark:text-white transition-colors"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
