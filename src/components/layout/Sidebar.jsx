"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';

function SidebarContent() {
  const { t, lang } = useApp();
  const { profile, isBroker, isTeamLeader, signOut } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = profile?.full_name || 'Agente';
  const displayEmail = profile?.email || '';
  const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5a82bf&color=fff`;

  const isAdminMode = pathname.startsWith('/oficina') || pathname.startsWith('/equipo');

  const navContent = (
    <>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`flex-shrink-0 h-16 md:h-20 flex items-center px-4 md:px-6 border-b border-gray-200 dark:border-dark-border transition-colors`}>
          {isAdminMode ? (
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded bg-gradient-to-br from-nexus-blue to-blue-600 flex items-center justify-center shadow-md">
                 <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
               </div>
               <h1 className="nexus-header text-[14px] text-slate-800 dark:text-white leading-tight uppercase tracking-widest mt-0.5">Admin<br/><span className="text-nexus-blue">ALTITUD</span></h1>
             </div>
           ) : (
             <>
               <div className="dark:bg-white/90 dark:p-1 dark:rounded-lg transition-colors inline-flex items-center p-1 rounded">
                 <Image src="/assets/logo-altitud.png" alt="RE/MAX Altitud" className="h-5 md:h-6 object-contain" id="brand-logo" width={100} height={100} unoptimized />
               </div>
               <div className="ml-3">
                 <h1 className="nexus-header text-lg text-nexus-blue dark:text-white leading-none">ALTITUD HUB</h1>
               </div>
             </>
           )}
          {/* Mobile close */}
          <button onClick={() => setMobileOpen(false)} className={`ml-auto md:hidden p-1.5 rounded-lg ${isAdminMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className={`flex-1 mt-4 md:mt-6 px-3 space-y-1 overflow-y-auto`}>
          {isAdminMode ? (
            /* ── ADMIN NAVIGATION ── */
            <>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">Gestión General</div>

              <Link href="/oficina?tab=dashboard" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'dashboard') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">🏢</span>
                <span className="nexus-header text-[11px] leading-none">Dashboard</span>
              </Link>
              
              <Link href="/oficina?tab=equipo" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'equipo') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">👥</span>
                <span className="nexus-header text-[11px] leading-none">{t('ofc_team') || 'Equipo'}</span>
              </Link>

              <Link href="/oficina?tab=propiedades" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'propiedades') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">🏠</span>
                <span className="nexus-header text-[11px] leading-none">{t('ofc_properties') || 'Propiedades'}</span>
              </Link>

              <Link href="/oficina?tab=leads" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'leads') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">📩</span>
                <span className="nexus-header text-[11px] leading-none">Leads</span>
              </Link>

              <Link href="/oficina?tab=importar" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'importar') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">📥</span>
                <span className="nexus-header text-[11px] leading-none">Importar</span>
              </Link>

              <Link href="/oficina?tab=finanzas" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'finanzas') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">💸</span>
                <span className="nexus-header text-[11px] leading-none">{t('ofc_tab_finance') || 'Finanzas'}</span>
              </Link>

              <Link href="/oficina?tab=comisiones" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'comisiones') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">💰</span>
                <span className="nexus-header text-[11px] leading-none">{t('neg_tab_comisiones') || 'Comisiones'}</span>
              </Link>

              <Link href="/oficina?tab=analytics" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'analytics') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">📊</span>
                <span className="nexus-header text-[11px] leading-none">{t('ofc_wa_title') || 'Analíticas Web'}</span>
              </Link>

              <Link href="/oficina?tab=referidos" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'referidos') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">🔗</span>
                <span className="nexus-header text-[11px] leading-none">{t('ref_tab') || 'Referidos'}</span>
              </Link>

              <Link href="/oficina?tab=velocidad" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'velocidad') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">⏱️</span>
                <span className="nexus-header text-[11px] leading-none">{t('ofc_velocity') || 'Velocidad'}</span>
              </Link>

              <Link href="/oficina?tab=eventos" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'eventos') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">📅</span>
                <span className="nexus-header text-[11px] leading-none">{t('ofc_hr_events_title') || 'Asistencia eventos'}</span>
              </Link>

              <Link href="/equipo" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname.startsWith('/equipo') ? 'active bg-nexus-blue/10 text-nexus-blue shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
                <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="nexus-header text-[11px] leading-none">Equipos y OKRs</span>
              </Link>

              <div className="mt-8 mb-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Soporte</div>

              <Link href="/oficina/soporte" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/oficina/soporte') ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
                <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <span className="font-medium text-slate-300">Tickets Soporte</span>
              </Link>

              <div className="mt-8 px-3 pb-6">
                <Link href="/contactos" className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest">Volver al CRM</span>
                </Link>
              </div>
            </>
          ) : (
            /* ── CRM NAVIGATION ── */
            <>
          {/* ── NEGOCIO ── */}
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">{t('nav_negocio')}</div>

          <Link href="/plan" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname.startsWith('/plan') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
            <span className="nexus-header text-[11px] leading-none">{t('nav_plan')}</span>
          </Link>

          <Link href="/" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname === '/' ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <span className="nexus-header text-[11px] leading-none">Dashboard OKR</span>
          </Link>

          <Link href="/negocio" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname.startsWith('/negocio') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            <span className="nexus-header text-[11px] leading-none">{t('neg_title')}</span>
          </Link>

          <Link href="/estado-cuenta" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname.startsWith('/estado-cuenta') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="nexus-header text-[11px] leading-none">ESTADO DE CUENTA</span>
          </Link>

          {/* ── HERRAMIENTAS ── */}
          <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('nav_tools')}</div>

          <Link href="/contactos" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname.startsWith('/contactos') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            <span className="nexus-header text-[11px] leading-none">CONTACTOS</span>
          </Link>

          <Link href="/prelisting" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname.startsWith('/prelisting') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2-2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            <span className="nexus-header text-[11px] leading-none">{t('nav_prelisting')}</span>
          </Link>

          <Link href={lang === 'en' ? '/cma' : '/acm'} onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname.startsWith('/acm') || pathname.startsWith('/cma') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            <span className="nexus-header text-[11px] leading-none">{t('nav_acm')}</span>
          </Link>

          <a href="https://remax-cobranding.vercel.app/" target="_blank" rel="noopener noreferrer" className="nav-item flex items-center px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            <span className="font-medium text-gray-800 dark:text-white">{t('nav_magic')}</span>
          </a>

          <Link href={lang === 'en' ? '/search' : '/busqueda'} onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname.startsWith('/busqueda') || pathname.startsWith('/search') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <span className="nexus-header text-[11px] leading-none">{t('nav_search') || 'BÚSQUEDA'}</span>
          </Link>

          <a href="#" className="nav-item flex items-center px-3 py-2.5 rounded-lg text-gray-400 dark:text-gray-400 transition-colors pointer-events-none opacity-50">
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span className="font-medium text-gray-700 dark:text-white text-[11px] leading-tight">Personalizar documentos legales</span>
            <span className="ml-auto text-[9px] bg-gray-200 dark:bg-dark-border px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">{t('nav_soon')}</span>
          </a>

          <Link href="/soporte" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname.startsWith('/soporte') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span className="nexus-header text-[11px] leading-none">{t('nav_support') || 'Soporte Técnico'}</span>
          </Link>

          {/* ── PORTAFOLIO ── */}
          <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('nav_portfolio')}</div>

          <Link href="/propiedades" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname === '/propiedades' ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            <span className="nexus-header text-[11px] leading-none">{t('nav_properties')}</span>
          </Link>

          <Link href="/propiedades/desarrollos" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${pathname.startsWith('/propiedades/desarrollos') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            <span className="nexus-header text-[11px] leading-none">{t('nav_developments') || (lang === 'en' ? 'Developments' : 'Desarrollos')}</span>
          </Link>

          {/* ── ADMIN (Role-based) ── */}
          {(true) && (
            <>
              <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">Administración</div>
              
              <Link href="/oficina" onClick={() => setMobileOpen(false)} className="nav-item flex items-center px-3 py-2.5 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group">
                <div className="w-6 h-6 mr-3 rounded bg-nexus-blue/10 flex items-center justify-center group-hover:bg-nexus-blue/20 transition-colors">
                  <svg className="w-4 h-4 text-nexus-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <span className="nexus-header text-[11px] text-gray-800 dark:text-white leading-none">Abrir Panel Office</span>
              </Link>
            </>
          )}
            </>
          )}
        </nav>
      </div>

      {/* User — now with real data */}
      <div className={`relative border-t border-gray-200 dark:border-dark-border`}>
        <div 
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={`h-16 md:h-20 flex items-center px-4 md:px-6 cursor-pointer transition-colors hover:bg-brand-50 dark:hover:bg-white/5`}
        >
          <Image src={avatarUrl} className="w-8 h-8 md:w-9 md:h-9 rounded-full mr-3 border-2 border-brand-200 dark:border-dark-border object-cover" alt="Avatar" width={32} height={32} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${isAdminMode ? 'text-white' : 'text-gray-800 dark:text-white'}`}>{displayName}</p>
            <p className={`text-[10px] truncate text-gray-500 dark:text-gray-400`}>
              {profile?.role === 'broker' ? '🏢 Broker' : profile?.role === 'team_leader' ? '👥 Team Leader' : t('agent_hq')}
            </p>
          </div>
          <svg className={`w-4 h-4 shrink-0 transition-transform ${showUserMenu ? 'rotate-180' : ''} text-gray-400 dark:text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
        </div>

        {/* User dropdown menu */}
        {showUserMenu && (
          <div className="absolute bottom-full left-0 right-0 mx-3 mb-1 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50">
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 truncate">{displayEmail}</p>
            </div>
            <button
              onClick={() => { signOut(); setShowUserMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        )}
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
      <aside className={`hidden md:flex w-64 flex-shrink-0 border-r border-gray-200 dark:border-dark-border flex-col justify-between transition-all duration-300 relative z-20 shadow-sm dark:shadow-none glass-panel`}>
        {navContent}
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className={`absolute inset-y-0 left-0 w-72 border-r border-gray-200 dark:border-dark-border flex flex-col justify-between shadow-2xl bg-white dark:bg-dark-panel`}
            onClick={e => e.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={<aside className="hidden md:flex w-64 flex-shrink-0 border-r border-gray-200 dark:border-dark-border glass-panel"></aside>}>
      <SidebarContent />
    </Suspense>
  );
}
