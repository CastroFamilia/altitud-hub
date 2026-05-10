import re

with open('src/components/layout/Sidebar.jsx', 'r') as f:
    content = f.read()

import_old = """              <Link href="/oficina?tab=eventos" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'eventos') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">🗓️</span>
                <span className="nexus-header text-[11px] leading-none">{t('ofc_events') || 'Eventos y Asistencia'}</span>
              </Link>"""

import_new = """              <Link href="/oficina?tab=eventos" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'eventos') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">🗓️</span>
                <span className="nexus-header text-[11px] leading-none">{t('ofc_events') || 'Eventos y Asistencia'}</span>
              </Link>

              <Link href="/oficina?tab=integraciones" onClick={() => setMobileOpen(false)} className={`nav-item flex items-center px-3 py-2.5 rounded-2xl transition-colors ${(pathname === '/oficina' && activeTab === 'integraciones') ? 'active bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <span className="mr-3 text-lg leading-none">🔌</span>
                <span className="nexus-header text-[11px] leading-none">{t('ofc_integrations') || 'Integraciones'}</span>
              </Link>"""

content = content.replace(import_old, import_new)

with open('src/components/layout/Sidebar.jsx', 'w') as f:
    f.write(content)

print("Done")
