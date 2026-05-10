"use client";

import { useState } from 'react';
import { useApp } from '@/lib/context';
import OlympiaCoach from '@/components/olympia/OlympiaCoach';

export default function TopNav({ titleKey, subtitleKey, title, subtitle }) {
  const { t, lang, toggleLang, toggleTheme } = useApp();

  const displayTitle    = titleKey    ? t(titleKey)    : title;
  const displaySubtitle = subtitleKey ? t(subtitleKey) : subtitle;

  return (
    <>
      <header className="h-16 md:h-20 glass-panel border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-4 md:px-8 z-10 transition-colors shrink-0 shadow-xs dark:shadow-none">
        <div className="min-w-0 flex-1 mr-3">
          <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white tracking-wide truncate">{displayTitle}</h2>
          <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5 tracking-wide truncate">{displaySubtitle}</p>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
          {/* Search — hidden on small */}
          <div className="relative hidden lg:block">
            <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" placeholder={t('search_placeholder')} className="bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-xs rounded-full pl-9 pr-4 py-2 w-64 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-gray-800 dark:text-gray-300 placeholder-gray-400 transition-all shadow-sm" />
          </div>

          {/* Notifications */}
          <button 
            className="relative w-8 h-8 md:w-9 md:h-9 rounded-full bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors shadow-sm" 
            title="Notificaciones"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500 border border-white dark:border-dark-bg"></span>
            </span>
          </button>

          {/* Language Toggle */}
          <button onClick={toggleLang} className="w-11 md:w-14 h-8 md:h-9 rounded-full bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-white transition-colors shadow-sm">
            <span>{lang === 'es' ? 'EN' : 'ES'}</span>
          </button>

          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-white transition-colors shadow-sm">
            <svg className="w-4 h-4 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <svg className="w-4 h-4 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
          </button>
        </div>
      </header>
      <OlympiaCoach />
    </>
  );
}
