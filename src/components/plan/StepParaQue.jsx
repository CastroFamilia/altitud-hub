"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';

const PROMPTS = ['pw_s1_prompt1', 'pw_s1_prompt2', 'pw_s1_prompt3', 'pw_s1_prompt4', 'pw_s1_prompt5', 'pw_s1_prompt6'];

export default function StepParaQue({ plan, updatePlan }) {
  const { t } = useApp();
  const [activePrompt, setActivePrompt] = useState(0);
  const [showTextarea, setShowTextarea] = useState(!!plan.para_que);
  const [isEditing, setIsEditing] = useState(!plan.para_que);

  // Rotate prompts
  useEffect(() => {
    const id = setInterval(() => {
      setActivePrompt(p => (p + 1) % PROMPTS.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-8">
      {/* ── Compact View: Shown when there is a saved purpose and we are not editing ── */}
      {!isEditing && plan.para_que ? (
        <div className="max-w-2xl mx-auto space-y-6 fade-in">
          {/* Small compact header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-xs font-black uppercase tracking-widest border border-violet-200/50 dark:border-violet-800/30">
              <span className="animate-pulse">🔥</span> {t('pw_s1_title')}
            </div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Tu motor de inspiración para tu plan
            </p>
          </div>

          {/* Premium quote card */}
          <div className="relative bg-gradient-to-br from-white to-slate-50 dark:from-dark-panel dark:to-slate-800 rounded-[2rem] p-8 md:p-12 border border-violet-100 dark:border-violet-900/40 shadow-2xl shadow-violet-500/5 overflow-hidden">
            {/* Soft decorative glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-8 text-center">
              {/* Big quote mark icon */}
              <span className="text-6xl text-violet-500/20 font-serif block -mb-6 leading-none">“</span>
              
              <blockquote className="text-xl md:text-2xl lg:text-3xl font-black italic text-gray-900 dark:text-white leading-relaxed max-w-lg mx-auto tracking-wide">
                {plan.para_que}
              </blockquote>
              
              <span className="text-6xl text-violet-500/20 font-serif block -mt-6 leading-none">”</span>

              {/* Action buttons */}
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowTextarea(true);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 text-xs font-bold hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                >
                  <span>✏️</span> Modificar propósito
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Full Coaching View: Shown the first time or when editing ── */
        <div className="space-y-8 fade-in">
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
            <div className="max-w-2xl mx-auto space-y-4">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 text-center">
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
            <div className="max-w-2xl mx-auto space-y-6">
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

              {/* Action to return to saved view */}
              {plan.para_que && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                  >
                    ✨ Listo, guardar y ver vista consolidada
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
