import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   404 PAGE — Branded not-found page.
   
   Server Component — no "use client" needed. Uses the app's
   CSS since the layout renders normally for 404s.
   ═══════════════════════════════════════════════════════════════ */

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-dark-bg min-h-screen">
      <div className="w-20 h-20 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h1 className="text-6xl font-black text-gray-200 dark:text-gray-700 mb-2">404</h1>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
        Página no encontrada
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
        La página que buscas no existe o fue movida. Verifica la URL o regresa al panel principal.
      </p>

      <div className="flex gap-3">
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium shadow-md shadow-brand-500/20 transition-colors"
        >
          Ir al Dashboard
        </Link>
        <Link
          href="/soporte"
          className="px-6 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel text-gray-700 dark:text-gray-300 font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          Reportar Problema
        </Link>
      </div>
    </div>
  );
}
