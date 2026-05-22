"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { insertContact } from '@/lib/dal/contacts';
import { useAuth } from '@/lib/auth-context';
import TopNav from '@/components/layout/TopNav';
import Link from 'next/link';

export default function NuevoContactoClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useApp();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    type: ['Comprador'],
    lead_origin: 'Esfera de Influencia',
    origin_details: '',
    referred_by_name: '',
    market: 'Nacional',
    primary_language: 'Español',
    secondary_language: 'Ninguno',
    tertiary_language: 'Ninguno',
    favorite_language: 'Español',
    contact_classification: 'B',
    newsletter_opt_in: false,
    notes: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleTypeChange = (typeOption) => {
    setFormData(prev => {
      const isSelected = prev.type.includes(typeOption);
      let newType = [];
      if (isSelected) {
        newType = prev.type.filter(t => t !== typeOption);
      } else {
        newType = [...prev.type, typeOption];
      }
      // Aseguramos que siempre haya al menos una opción seleccionada
      if (newType.length === 0) newType = [typeOption];
      return { ...prev, type: newType };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const data = await insertContact({
        user_id: user?.id || null,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        type: formData.type,
        lead_origin: formData.lead_origin,
        origin_details: formData.origin_details,
        referred_by_name: formData.referred_by_name,
        market: formData.market,
        primary_language: formData.primary_language,
        secondary_language: formData.secondary_language,
        tertiary_language: formData.tertiary_language,
        favorite_language: formData.favorite_language,
        contact_classification: formData.contact_classification,
        newsletter_opt_in: formData.newsletter_opt_in,
        notes: formData.notes,
        status: 'active'
      });
      
      // Redirect to the new contact's profile
      router.push(`/contactos/${data.id}`);
      
    } catch (error) {
      console.error('Error creating contact:', error);
      alert(t('contact_new_err_create') + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopNav titleKey="contact_btn_new" subtitleKey="nav_crm" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/contactos" className="hover:text-brand-500 transition-colors">{t('nav_crm')}</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          <span className="text-gray-800 dark:text-white font-medium">{t('contact_btn_new')}</span>
        </div>

        <div className="glass-panel p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('contact_new_title')}</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_name')}</label>
                <input
                  required
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors"
                  placeholder="Ej. Juan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_lastname')}</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors"
                  placeholder="Ej. Pérez"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_email')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors"
                  placeholder="juan@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_phone')}</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors"
                  placeholder="+506 8888 8888"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_market_label')}</label>
                <select
                  name="market"
                  value={formData.market}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option value="Nacional">{t('contact_mkt_national')}</option>
                  <option value="Extranjero residente">{t('contact_mkt_resident')}</option>
                  <option value="Extranjero">{t('contact_mkt_foreign')}</option>
                  <option value="Otro / No lo sé">{t('contact_mkt_unknown')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_primary_lang')}</label>
                <select
                  name="primary_language"
                  value={formData.primary_language}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option value="Español">{t('contact_lang_spanish')}</option>
                  <option value="Inglés">{t('contact_lang_english')}</option>
                  <option value="Francés">{t('contact_lang_french')}</option>
                  <option value="Alemán">{t('contact_lang_german')}</option>
                  <option value="Portugués">{t('contact_lang_portuguese')}</option>
                  <option value="Otro">{t('contact_lang_other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_secondary_lang')}</label>
                <select
                  name="secondary_language"
                  value={formData.secondary_language}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option value="Ninguno">{t('contact_lang_none')}</option>
                  <option value="Español">{t('contact_lang_spanish')}</option>
                  <option value="Inglés">{t('contact_lang_english')}</option>
                  <option value="Francés">{t('contact_lang_french')}</option>
                  <option value="Alemán">{t('contact_lang_german')}</option>
                  <option value="Portugués">{t('contact_lang_portuguese')}</option>
                  <option value="Otro">{t('contact_lang_other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_tertiary_lang')}</label>
                <select
                  name="tertiary_language"
                  value={formData.tertiary_language}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option value="Ninguno">{t('contact_lang_none')}</option>
                  <option value="Español">{t('contact_lang_spanish')}</option>
                  <option value="Inglés">{t('contact_lang_english')}</option>
                  <option value="Francés">{t('contact_lang_french')}</option>
                  <option value="Alemán">{t('contact_lang_german')}</option>
                  <option value="Portugués">{t('contact_lang_portuguese')}</option>
                  <option value="Otro">{t('contact_lang_other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_favorite_lang')}</label>
                <select
                  name="favorite_language"
                  value={formData.favorite_language}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option value="Español">{t('contact_lang_spanish')}</option>
                  <option value="Inglés">{t('contact_lang_english')}</option>
                  <option value="Francés">{t('contact_lang_french')}</option>
                  <option value="Alemán">{t('contact_lang_german')}</option>
                  <option value="Portugués">{t('contact_lang_portuguese')}</option>
                  <option value="Otro">{t('contact_lang_other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_class')}</label>
                <select
                  name="contact_classification"
                  value={formData.contact_classification}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option value="A+">{t('contact_class_a_plus')}</option>
                  <option value="A">{t('contact_class_a')}</option>
                  <option value="B">{t('contact_class_b')}</option>
                  <option value="C">{t('contact_class_c')}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('contact_new_type_label')}</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { value: 'Comprador', key: 'contact_type_buyer' },
                    { value: 'Vendedor', key: 'contact_type_seller' },
                    { value: 'Desarrollador', key: 'contact_type_developer' },
                    { value: 'Inversor', key: 'contact_type_investor' },
                    { value: 'Otro', key: 'contact_type_other' },
                  ].map(option => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => handleTypeChange(option.value)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                        formData.type.includes(option.value)
                          ? 'bg-brand-500 border-brand-500 text-white shadow-md'
                          : 'bg-white dark:bg-dark-panel border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      {t(option.key)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_origin')}</label>
                <select
                  name="lead_origin"
                  value={formData.lead_origin}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option value="Esfera de Influencia">{t('contact_origin_sphere')}</option>
                  <option value="Referido">{t('contact_origin_referral')}</option>
                  <option value="Digital">{t('contact_origin_digital')}</option>
                  <option value="Rótulo">{t('contact_origin_sign')}</option>
                  <option value="Oficina">{t('contact_origin_walkin')}</option>
                </select>
              </div>

              {formData.lead_origin === 'Digital' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_tag')}</label>
                  <input
                    type="text"
                    name="origin_details"
                    value={formData.origin_details}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors"
                    placeholder="Ej. Encuentra24, Facebook Ads, Agente externo..."
                  />
                </div>
              )}

              {formData.lead_origin === 'Referido' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_referred')}</label>
                  <input
                    type="text"
                    name="referred_by_name"
                    value={formData.referred_by_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors"
                    placeholder="Nombre de la persona que lo refirió..."
                  />
                </div>
              )}
            </div>

            {/* Newsletter Opt-In */}
            <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/20">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">{t('contact_newsletter_title')}</h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">{t('contact_newsletter_desc')}</p>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.newsletter_opt_in}
                        onChange={(e) => setFormData(prev => ({ ...prev, newsletter_opt_in: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-brand-500 transition-colors"></div>
                      <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                    </div>
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      {formData.newsletter_opt_in ? t('contact_newsletter_yes') : t('contact_newsletter_no')}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_notes')}</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors resize-none"
                placeholder="Información adicional sobre qué busca o detalles relevantes..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
              <Link 
                href="/contactos"
                className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium text-gray-700 dark:text-white"
              >
                {t('contact_new_cancel')}
              </Link>
              <button 
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition-colors text-sm font-medium shadow-md shadow-brand-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? t('contact_new_saving') : t('contact_new_save')}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </>
  );
}
