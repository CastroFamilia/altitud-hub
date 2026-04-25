import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 glass-panel border-r border-gray-200 dark:border-dark-border flex flex-col justify-between transition-all duration-300 relative z-20 shadow-sm dark:shadow-none">
      <div>
        <div className="h-20 flex items-center px-6 border-b border-gray-200 dark:border-dark-border">
          <div className="dark:bg-white/90 dark:p-1 dark:rounded-lg transition-colors inline-flex items-center bg-white p-1 rounded border border-gray-100 dark:border-none">
            <img src="/assets/logo-altitud.png" alt="RE/MAX Altitud" className="h-6 object-contain" id="brand-logo" />
          </div>
          <div className="ml-3 hidden lg:block">
            <h1 className="text-[13px] font-black text-gray-900 dark:text-white tracking-widest uppercase">ALTITUD HUB</h1>
          </div>
        </div>

        <nav className="mt-6 px-3 space-y-1">
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">Principal</div>
          
          <Link href="/" className="nav-item active flex items-center px-3 py-2.5 rounded-lg text-brand-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            <span className="font-medium text-brand-700 dark:text-white">Registro ACM</span>
          </Link>

          <Link href="/prelisting" className="nav-item flex items-center px-3 py-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            <span className="font-medium text-gray-900 dark:text-white">Pre-Listing</span>
          </Link>

        </nav>
      </div>

      <div className="h-20 border-t border-gray-200 dark:border-dark-border flex items-center px-6 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-colors user-select-none">
          <img src="https://ui-avatars.com/api/?name=Agente+Top&background=5a82bf&color=fff" className="w-9 h-9 rounded-full mr-3 border border-gray-300 dark:border-dark-border" alt="Avatar" />
          <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">Agente Top</p>
              <p className="text-[10px] text-gray-500 truncate">Sede Altitud</p>
          </div>
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
      </div>
    </aside>
  );
}
