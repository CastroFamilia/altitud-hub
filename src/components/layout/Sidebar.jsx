"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useApp } from '@/lib/context';

export default function Sidebar() {
  const { t } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div>
        {/* Logo */}
        <div className="h-16 md:h-20 flex items-center px-4 md:px-6 border-b border-gray-200 dark:border-dark-border">
          <div className="dark:bg-white/90 dark:p-1 dark:rounded-lg transition-colors inline-flex items-center p-1 rounded">
            <img src="/assets/logo-altitud.png" alt="RE/MAX Altitud" className="h-5 md:h-6 object-contain" id="brand-logo" />
          </div>
          <div className="ml-3">
            <h1 className="nexus-header text-lg text-nexus-blue dark:text-white leading-none">ALTITUD HUB</h1>
          </div>
          {/* Mobile close */}
          <button onClick={() => setMobileOpen(false)} className="ml-auto md:hidden text-gray-400 hover:text-gray-600 dark:hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="mt-4 md:mt-6 px-3 space-y-1 overflow-y-auto">
          {/* ── PRINCIPAL ── */}
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">{t('nav_principal')}</div>

          <a href="#" className="nav-item flex items-center px-3 py-2.5 rounded-lg text-gray-400 dark:text-gray-400 transition-colors pointer-events-none opacity-50">
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            <span className="font-medium text-gray-700 dark:text-white">{t('nav_crm')}</span>
            <span className="ml-auto text-[9px] bg-gray-200 dark:bg-dark-border px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">{t('nav_soon')}</span>
          </a>

          <Link href="/plan" onClick={() => setMobileOpen(false)} className="nav-item flex items-center px-3 py-2.5 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
            <span className="nexus-header text-[11px] text-gray-800 dark:text-white leading-none">{t('nav_plan')}</span>
          </Link>

          <Link href="/okr" onClick={() => setMobileOpen(false)} className="nav-item flex items-center px-3 py-2.5 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <span className="nexus-header text-[11px] text-gray-800 dark:text-white leading-none">Dashboard OKR</span>
          </Link>

          {/* ── HERRAMIENTAS ── */}
          <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('nav_tools')}</div>

          <Link href="/prelisting" onClick={() => setMobileOpen(false)} className="nav-item flex items-center px-3 py-2.5 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            <span className="nexus-header text-[11px] text-gray-800 dark:text-white leading-none">{t('nav_prelisting')}</span>
          </Link>

          <Link href="/" onClick={() => setMobileOpen(false)} className="nav-item active flex items-center px-3 py-2.5 rounded-2xl transition-colors">
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            <span className="nexus-header text-[11px] leading-none">{t('nav_acm')}</span>
          </Link>

          <a href="https://remax-cobranding.vercel.app/" target="_blank" rel="noopener noreferrer" className="nav-item flex items-center px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            <span className="font-medium text-gray-800 dark:text-white">{t('nav_magic')}</span>
          </a>

          <a href="#" className="nav-item flex items-center px-3 py-2.5 rounded-lg text-gray-400 dark:text-gray-400 transition-colors pointer-events-none opacity-50">
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <span className="font-medium text-gray-700 dark:text-white">{t('nav_search')}</span>
            <span className="ml-auto text-[9px] bg-gray-200 dark:bg-dark-border px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">{t('nav_soon')}</span>
          </a>

          {/* ── PORTAFOLIO ── */}
          <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('nav_portfolio')}</div>

          <a href="#" className="nav-item flex items-center px-3 py-2.5 rounded-lg text-gray-400 dark:text-gray-400 transition-colors pointer-events-none opacity-50">
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            <span className="font-medium text-gray-700 dark:text-white">{t('nav_properties')}</span>
          </a>

          <a href="#" className="nav-item flex items-center px-3 py-2.5 rounded-lg text-gray-400 dark:text-gray-400 transition-colors pointer-events-none opacity-50">
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="font-medium text-gray-700 dark:text-white">{t('nav_transactions')}</span>
            <span className="ml-auto text-[9px] bg-gray-200 dark:bg-dark-border px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">{t('nav_soon')}</span>
          </a>

        </nav>
      </div>

      {/* User */}
      <div className="h-16 md:h-20 border-t border-gray-200 dark:border-dark-border flex items-center px-4 md:px-6 hover:bg-brand-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
        <img src="https://ui-avatars.com/api/?name=Agente+Top&background=5a82bf&color=fff" className="w-8 h-8 md:w-9 md:h-9 rounded-full mr-3 border-2 border-brand-200 dark:border-dark-border" alt="Avatar" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">Agente Top</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{t('agent_hq')}</p>
        </div>
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile hamburger button (fixed top-left) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 rounded-lg bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border flex items-center justify-center text-gray-600 dark:text-gray-400 shadow-lg"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 flex-shrink-0 glass-panel border-r border-gray-200 dark:border-dark-border flex-col justify-between transition-all duration-300 relative z-20 shadow-sm dark:shadow-none">
        {navContent}
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-dark-panel border-r border-gray-200 dark:border-dark-border flex flex-col justify-between shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
