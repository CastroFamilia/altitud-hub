"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import TopNav from '@/components/layout/TopNav';
import Link from 'next/link';

export default function NuevoContactoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useApp();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    type: 'Comprador',
    lead_origin: 'Esfera de Influencia',
    origin_details: '',
    referred_by_name: '',
    market: 'Nacional',
    contact_classification: 'B',
    notes: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert([
          {
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
            contact_classification: formData.contact_classification,
            notes: formData.notes,
            status: 'active'
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Redirect to the new contact's profile
      router.push(`/contactos/${data.id}`);
      
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Error al crear el contacto: ' + error.message);
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_market')}</label>
                <select
                  name="market"
                  value={formData.market}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option value="Nacional">{t('contact_market_national')}</option>
                  <option value="Extranjero">{t('contact_market_foreign')}</option>
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
                  <option value="A+">A+ (Promotor activo)</option>
                  <option value="A">A (Referidor ocasional)</option>
                  <option value="B">B (Buena relación)</option>
                  <option value="C">C (Contacto básico)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_type')}</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option value="Comprador">Comprador</option>
                  <option value="Vendedor">Vendedor</option>
                  <option value="Inversionista">Inversionista / Inversor</option>
                  <option value="Desarrollador">Desarrollador</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_new_origin')}</label>
                <select
                  name="lead_origin"
                  value={formData.lead_origin}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option value="Esfera de Influencia">Esfera de Influencia</option>
                  <option value="Referido">Referido</option>
                  <option value="Digital">Digital (Portales/Redes)</option>
                  <option value="Rótulo">Rótulo</option>
                  <option value="Oficina">Oficina (Walk-in)</option>
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
