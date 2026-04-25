"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';

const PROMPTS = ['pw_s1_prompt1', 'pw_s1_prompt2', 'pw_s1_prompt3', 'pw_s1_prompt4', 'pw_s1_prompt5', 'pw_s1_prompt6'];

export default function StepParaQue({ plan, updatePlan }) {
  const { t } = useApp();
  const [activePrompt, setActivePrompt] = useState(0);
  const [showTextarea, setShowTextarea] = useState(!!plan.para_que);

  // Rotate prompts
  useEffect(() => {
    const id = setInterval(() => {
      setActivePrompt(p => (p + 1) % PROMPTS.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-8">
      {/* ── Hero Section ── */}
      <div className="relative max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl shadow-violet-500/30 overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
          
          <div className="relative z-10 text-center space-y-6">
            {/* Big title */}
            <div className="space-y-2">
              <span className="text-5xl md:text-6xl block mb-4">🔥</span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black italic uppercase tracking-tight leading-none">
                {t('pw_s1_title')}
              </h1>
            </div>

            {/* Coaching text */}
            <div className="max-w-xl mx-auto space-y-4">
              <p className="text-lg md:text-xl font-semibold text-white/90 leading-relaxed">
                {t('pw_s1_hero')}
              </p>
              <p className="text-sm md:text-base text-white/60 leading-relaxed">
                {t('pw_s1_hero2')}
              </p>
              <p className="text-sm md:text-base text-white/50 italic leading-relaxed">
                {t('pw_s1_hero3')}
              </p>
            </div>

            {/* Rotating inspiration */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 inline-block border border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">✨ Inspiración</p>
              <span className="text-base md:text-lg font-bold text-white/90 italic transition-all">
                &ldquo;{t(PROMPTS[activePrompt])}&rdquo;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA to reveal textarea ── */}
      {!showTextarea && !plan.para_que && (
        <div className="max-w-2xl mx-auto text-center">
          <button
            onClick={() => setShowTextarea(true)}
            className="px-8 py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-base font-bold shadow-xl shadow-violet-500/20 hover:shadow-2xl hover:shadow-violet-500/30 transition-all active:scale-95 hover:scale-105"
          >
            ✍️ {t('pw_s1_subtitle')}
          </button>
        </div>
      )}

      {/* ── Textarea ── */}
      {(showTextarea || plan.para_que) && (
        <div className="max-w-2xl mx-auto fade-in">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 text-center">
            {t('pw_s1_subtitle')}
          </p>
          <div className="bg-white dark:bg-dark-panel rounded-3xl shadow-xl border-2 border-violet-200 dark:border-violet-800 p-1 focus-within:border-violet-400 dark:focus-within:border-violet-600 transition-colors">
            <textarea
              value={plan.para_que || ''}
              onChange={(e) => updatePlan({ para_que: e.target.value })}
              placeholder={t('pw_s1_placeholder')}
              rows={6}
              autoFocus
              className="w-full bg-transparent resize-none rounded-2xl p-6 text-base md:text-lg text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-0 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* ── Inspiration Chips ── */}
      {(showTextarea || plan.para_que) && (
        <div className="max-w-2xl mx-auto fade-in">
          <div className="flex flex-wrap justify-center gap-2">
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  const text = plan.para_que || '';
                  const prompt = t(p);
                  if (!text.includes(prompt)) {
                    updatePlan({ para_que: text ? text + '\n' + prompt : prompt });
                  }
                }}
                className="px-4 py-2 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-500/20 hover:scale-105 transition-all active:scale-95"
              >
                {t(p)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
