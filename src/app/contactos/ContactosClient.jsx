"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import TopNav from '@/components/layout/TopNav';
import Link from 'next/link';

export default function ContactosClient({ initialContacts = [] }) {
  const { t } = useApp();
  const [contacts] = useState(initialContacts);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos'); // 'Todos', 'Compradores', 'Vendedores', 'Top'

  // Derived Metrics
  const metrics = useMemo(() => {
    const total = contacts.length;
    const topClients = contacts.filter(c => c.contact_classification === 'A+' || c.contact_classification === 'A').length;
    
    // Calculate new this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = contacts.filter(c => new Date(c.created_at) >= firstDayOfMonth).length;

    return { total, topClients, newThisMonth };
  }, [contacts]);

  // Filter Logic
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      // 1. Search text
      const matchesSearch = `${c.first_name} ${c.last_name || ''}`.toLowerCase().includes(search.toLowerCase()) ||
                            (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
                            (c.phone && c.phone.includes(search));
      
      // 2. Tab Filter
      let matchesFilter = true;
      if (activeFilter === 'Compradores') {
        matchesFilter = c.type === 'Comprador' || c.type === 'Inversionista';
      } else if (activeFilter === 'Vendedores') {
        matchesFilter = c.type === 'Vendedor' || c.type === 'Desarrollador';
      } else if (activeFilter === 'Top') {
        matchesFilter = c.contact_classification === 'A+' || c.contact_classification === 'A';
      }

      return matchesSearch && matchesFilter;
    });
  }, [contacts, search, activeFilter]);

  // Export Contacts as CSV
  const handleExportCSV = () => {
    if (filteredContacts.length === 0) return;

    const headers = [
      'Nombre', 'Apellidos', 'Correo', 'Telefono', 'Perfil', 'Origen',
      'Mercado', 'IdiomaPrimario', 'IdiomaSecundario', 'IdiomaTerciario',
      'IdiomaFavorito', 'Clasificacion', 'Newsletter', 'Notas'
    ];
    
    const csvRows = filteredContacts.map(c => {
      const typeStr = Array.isArray(c.type) ? c.type.join(', ') : (c.type || '');
      return [
        c.first_name || '',
        c.last_name || '',
        c.email || '',
        c.phone || '',
        typeStr,
        c.lead_origin || '',
        c.market || '',
        c.primary_language || '',
        c.secondary_language || '',
        c.tertiary_language || '',
        c.favorite_language || '',
        c.contact_classification || '',
        c.newsletter_opt_in ? 'Sí' : 'No',
        (c.notes || '').replace(/"/g, '""')
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Contactos_AltitudHub_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper for Classification Colors
  const getClassificationBadge = (classification) => {
    switch (classification) {
      case 'A+': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 shadow-sm';
      case 'A': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'B': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'C': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <>
      <TopNav titleKey="nav_crm" subtitleKey="contact_dash_desc" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-7xl w-full mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="nexus-header text-3xl text-gray-800 dark:text-white mb-2">{t('contact_dash_title')}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t('contact_dash_desc')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/contactos/importar" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              {t('contact_btn_import')}
            </Link>
            <button 
              onClick={handleExportCSV}
              disabled={filteredContacts.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              {t('contact_btn_export')}
            </button>
            <Link href="/contactos/nuevo" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition-colors text-sm font-medium shadow-md shadow-brand-500/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              {t('contact_btn_new')}
            </Link>
          </div>
        </div>


        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-panel p-5 flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('contact_stat_total')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{metrics.total}</p>
            </div>
          </div>
          
          <div className="glass-panel p-5 flex items-center border border-amber-200/50 dark:border-amber-900/20">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
            </div>
            <div>
              <p className="text-sm text-amber-600 dark:text-amber-500 font-medium">{t('contact_stat_top')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{metrics.topClients}</p>
            </div>
          </div>

          <div className="glass-panel p-5 flex items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('contact_stat_new_month')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{metrics.newThisMonth}</p>
            </div>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="flex bg-gray-200/50 dark:bg-dark-border p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            {['Todos', 'Top', 'Compradores', 'Vendedores'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-4 md:px-6 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeFilter === tab 
                  ? 'bg-white dark:bg-dark-panel text-brand-600 dark:text-brand-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'Todos' ? t('contact_tab_all') : 
                 tab === 'Top' ? t('contact_tab_top') : 
                 tab === 'Compradores' ? t('contact_tab_buyers') : t('contact_tab_sellers')}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-72 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-panel text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors text-sm"
              placeholder={t('contact_search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="glass-panel overflow-hidden border border-gray-200/60 dark:border-dark-border shadow-sm">
          {filteredContacts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('contact_empty_title')}</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{t('contact_empty_desc')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                <thead className="bg-slate-50/50 dark:bg-[#1a2332]">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('contact_th_contact')}</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('contact_th_profile')}</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('contact_th_class')}</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('contact_th_last_touch')}</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('contact_th_action')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-panel divide-y divide-gray-100 dark:divide-dark-border">
                  {filteredContacts.map(contact => (
                    <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/40 dark:to-brand-800/20 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold uppercase shadow-sm">
                            {contact.first_name[0]}{contact.last_name ? contact.last_name[0] : ''}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              {contact.first_name} {contact.last_name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                              {contact.phone && <span>{contact.phone}</span>}
                              {contact.phone && contact.email && <span className="text-gray-300">•</span>}
                              {contact.email && <span>{contact.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white font-medium">{contact.type || '-'}</div>
                        <div className="text-xs text-gray-500">{contact.market === 'Nacional' ? t('contact_market_national') : contact.market === 'Extranjero' ? t('contact_market_foreign') : contact.market} • {contact.lead_origin || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${getClassificationBadge(contact.contact_classification)}`}>
                          {contact.contact_classification || 'B'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* Placeholder for future Activity Module */}
                        <div className="text-sm text-gray-900 dark:text-white">{t('contact_act_time_placeholder')}</div>
                        <div className="text-xs text-gray-500">{t('contact_act_via_placeholder')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link 
                          href={`/contactos/${contact.id}`} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:text-brand-300 dark:hover:bg-brand-900/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          {t('contact_btn_profile360')}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
