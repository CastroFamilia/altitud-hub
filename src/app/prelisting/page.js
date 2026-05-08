"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/layout/TopNav';
import Step1Owners from '@/components/prelisting/Step1Owners';
import Step2Property from '@/components/prelisting/Step2Property';
import Step3Tech from '@/components/prelisting/Step3Tech';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/context';

/* ── Interviews state (real data to be fetched from Supabase) ── */

const STATUS_STYLES = {
  followup: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  pendientes: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  realizadas: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  rechazadas: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  acm: 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300',
};

const TABS = [
  { id: 'all', labelKey: 'pre_tab_all' },
  { id: 'pendientes', labelKey: 'pre_tab_pending' },
  { id: 'realizadas', labelKey: 'pre_tab_done' },
  { id: 'rechazadas', labelKey: 'pre_tab_rejected' },
  { id: 'followup', labelKey: 'pre_tab_followup' },
  { id: 'acm', labelKey: 'pre_tab_acm' },
];

export default function PrelistingDashboard() {
  const router = useRouter();
  const { t } = useApp();
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [interviews, setInterviews] = useState([]);
  const [formData, setFormData] = useState({
    property_type: 'house',
    status: 'draft',
  });
  const [availableProperties, setAvailableProperties] = useState([]);

  useEffect(() => {
    async function fetchProperties() {
      const { data } = await supabase
        .from('properties')
        .select('*, contacts(first_name, last_name, phone, email)')
        .order('created_at', { ascending: false });
      if (data) setAvailableProperties(data);
    }
    fetchProperties();
  }, []);

  const handleSelectProperty = (e) => {
    const propId = e.target.value;
    if (!propId) return;
    const prop = availableProperties.find(p => p.id === propId);
    if (prop) {
      setFormData(prev => ({
        ...prev,
        property_name: prop.name,
        property_type: prop.property_type === 'Comercial' ? 'commercial' : prop.property_type === 'Lote' ? 'land' : 'house',
        owner_name: prop.contacts ? `${prop.contacts.first_name} ${prop.contacts.last_name || ''}`.trim() : '',
        phones: prop.contacts?.phone || '',
        emails: prop.contacts?.email || '',
        finca: prop.finca_number || '',
        plano: prop.plano_number || '',
        m2_lot: prop.size_sqm || ''
      }));
    }
  };

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const resetWizard = () => {
    setShowWizard(false);
    setStep(1);
    setFormData({ property_type: 'house', status: 'draft' });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const dbPayload = {
        agent_name: 'Agente de Prueba', 
        office: 'altitud',
        property_category: ['commercial','farm','land'].includes(formData.property_type) ? 'commercial' : 'residential',
        property_type: formData.property_type || 'house',
        property_address: formData.property_name || 'Sin Título',
        client_name: formData.owner_name || 'Desconocido',
        client_phone: formData.phones,
        client_email: formData.emails,
        property_finca: formData.finca,
        property_plano: formData.plano,
        status: formData.status || 'draft',
        indicators: {
          psychology: {
            occupation: formData.occupation,
            agreement: formData.agreement,
            decision_makers: formData.decision_makers,
            notary: formData.notary,
            motivation: formData.motivation,
            timeframe: formData.timeframe,
            plan_b: formData.plan_b
          },
          tech: {
            m2_const: formData.m2_const,
            m2_lot: formData.m2_lot,
            year_built: formData.year_built,
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            parking: formData.parking,
            hoa_fee: formData.hoa_fee,
            area_ha: formData.area_ha,
            water: formData.water,
            power: formData.power,
            commercial_type: formData.commercial_type
          }
        }
      };

      const { error } = await supabase.from('acm_reports').insert([dbPayload]);
      if (error) throw error;
      
      resetWizard();
    } catch (e) {
      console.error(e);
      alert(t('pre_save_error') + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Wizard Overlay ── */
  if (showWizard) {
    return (
      <>
        <TopNav title={t('pre_wizard_title')} subtitle={t('pre_wizard_subtitle')} />
        
        {/* Back button */}
        <div className="w-full bg-white dark:bg-[#1a1d24] border-b border-gray-100 dark:border-dark-border/50 shrink-0">
          <div className="max-w-4xl mx-auto px-6 pt-3 pb-1">
            <button 
              onClick={resetWizard}
              className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
               {t('pre_back_to_list')}
            </button>
          </div>
        </div>

        {/* Property Selector */}
        <div className="w-full bg-slate-50 dark:bg-dark-bg border-b border-gray-100 dark:border-dark-border/50 shrink-0">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">{t('pre_link_property')}</span>
            <select 
              onChange={handleSelectProperty}
              className="flex-1 max-w-sm px-3 py-1.5 text-sm border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-panel focus:ring-2 focus:ring-brand-500 outline-none text-gray-700 dark:text-white"
            >
              <option value="">{t('pre_select_contact')}</option>
              {availableProperties.map(prop => (
                <option key={prop.id} value={prop.id}>
                  {prop.name} ({prop.contacts?.first_name} {prop.contacts?.last_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="w-full bg-white dark:bg-[#1a1d24] border-b border-gray-100 dark:border-dark-border/50 shrink-0">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider relative z-10">
            <div className={`flex items-center ${step >= 1 ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}>
              <span className={`w-5 h-5 rounded-full flex justify-center items-center mr-2 ${step >= 1 ? 'bg-brand-100 dark:bg-brand-500/20' : 'bg-gray-100 dark:bg-dark-input'}`}>1</span>               <span>{t('pre_step_owners')}</span>
            </div>
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border mx-4"></div>
            <div className={`flex items-center ${step >= 2 ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}>
              <span className={`w-5 h-5 rounded-full flex justify-center items-center mr-2 ${step >= 2 ? 'bg-brand-100 dark:bg-brand-500/20' : 'bg-gray-100 dark:bg-dark-input'}`}>2</span>               <span>{t('pre_step_property')}</span>
            </div>
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border mx-4"></div>
            <div className={`flex items-center ${step >= 3 ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}>
              <span className={`w-5 h-5 rounded-full flex justify-center items-center mr-2 ${step >= 3 ? 'bg-brand-100 dark:bg-brand-500/20' : 'bg-gray-100 dark:bg-dark-input'}`}>3</span>               <span>{t('pre_step_tech')}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full relative">
          <div className="max-w-3xl mx-auto px-6 py-10 relative">
            {step === 1 && <Step1Owners formData={formData} updateForm={updateForm} onNext={() => setStep(2)} />}
            {step === 2 && <Step2Property formData={formData} updateForm={updateForm} onNext={() => setStep(3)} onPrev={() => setStep(1)} />}
            {step === 3 && <Step3Tech formData={formData} updateForm={updateForm} onPrev={() => setStep(2)} onSubmit={handleSubmit} isSubmitting={isSubmitting} />}
          </div>
        </div>
      </>
    );
  }

  /* ── List / Table View ── */
  const filteredInterviews = activeTab === 'all' 
    ? interviews 
    : interviews.filter(i => i.status === activeTab);

  const handleStatusChange = (id, newStatus) => {
    setInterviews(prev => prev.map(item => {
      if (item.id === id) {
        const tab = TABS.find(t => t.id === newStatus);
        return { ...item, status: newStatus, status_label: tab ? t(tab.labelKey).toUpperCase() : newStatus.toUpperCase() };
      }
      return item;
    }));
  };

  return (
    <>
      <TopNav title={t('nav_prelisting')} subtitle={t('pre_section_desc')} />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 relative z-0">
        <div className="fade-in max-w-6xl mx-auto space-y-8">

          {/* ── Statistics Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-2">
            <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-lg bg-gradient-to-br from-white/5 to-white/[0.02] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-brand-500/20 transition-all duration-700"></div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.1em] mb-1">{t('pre_stat_month')}</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">{interviews.length}</h3>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">{t('pre_stat_total')}</p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-lg bg-gradient-to-br from-white/5 to-white/[0.02] col-span-1 md:col-span-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-10 -mt-10 blur-3xl"></div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.1em] mb-3">{t('pre_stat_origin')}</p>
              <div className="flex flex-wrap gap-6">
                {(() => {
                  const total = interviews.length || 1;
                  const origins = interviews.reduce((acc, i) => { acc[i.origin || 'Sin origen'] = (acc[i.origin || 'Sin origen'] || 0) + 1; return acc; }, {});
                  const colorMap = { 'Digital': 'bg-brand-500', 'Referido': 'bg-indigo-500', 'Prospección': 'bg-emerald-500' };
                  const entries = Object.entries(origins);
                  if (entries.length === 0) return <span className="text-[10px] text-gray-400">{t('pre_stat_no_data')}</span>;
                  return entries.map(([label, count], idx) => (
                    <div key={idx} className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`w-2 h-2 rounded-full ${colorMap[label] || 'bg-gray-400'}`}></div>
                        <span className="text-[11px] font-bold text-gray-900 dark:text-white">{Math.round((count/total)*100)}%</span>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{label}</span>
                    </div>
                  ));
                })()}
              </div>
              <div className="flex gap-1 h-1.5 w-full bg-brand-50 dark:bg-white/5 rounded-full overflow-hidden mt-4">
                {(() => {
                  const total = interviews.length || 1;
                  const origins = interviews.reduce((acc, i) => { acc[i.origin || 'Sin origen'] = (acc[i.origin || 'Sin origen'] || 0) + 1; return acc; }, {});
                  const colorMap = { 'Digital': 'bg-brand-500', 'Referido': 'bg-indigo-500', 'Prospección': 'bg-emerald-500' };
                  return Object.entries(origins).map(([label, count], idx) => (
                    <div key={idx} className={`h-full ${colorMap[label] || 'bg-gray-400'}`} style={{ width: `${Math.round((count/total)*100)}%` }}></div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Section Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{t('pre_section_title')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('pre_section_desc')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/prelisting/carpeta')}
                className="bg-white dark:bg-dark-panel border-2 border-nexus-blue text-nexus-blue hover:bg-nexus-blue hover:text-white dark:hover:bg-nexus-blue px-5 py-3 rounded-xl text-xs font-bold shadow-lg flex items-center transition-all transform hover:scale-[1.02] active:scale-95"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                {t('pre_btn_carpeta')}
              </button>
              <button 
                onClick={() => setShowWizard(true)}
                className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-xl shadow-brand-500/20 flex items-center transition-all transform hover:scale-[1.02] active:scale-95"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                {t('pre_btn_new')}
              </button>
            </div>
          </div>

          {/* ── Status Filtering Tabs ── */}
          <div className="flex items-center gap-1 bg-white border border-gray-100 dark:border-white/5 dark:bg-white/5 p-1 rounded-xl w-fit mb-6 overflow-x-auto no-scrollbar shadow-sm">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-brand-50 dark:bg-brand-500 text-brand-600 dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-dark-panel rounded-xl shadow-xl border border-gray-200 dark:border-dark-border transition-colors">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-dark-bg/50 border-b border-gray-100 dark:border-dark-border">
                  <th className="py-4 px-5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('pre_th_client')}</th>
                  <th className="py-4 px-5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('pre_th_zone')}</th>
                  <th className="py-4 px-5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">{t('pre_th_origin')}</th>
                  <th className="py-4 px-5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('pre_th_status')}</th>
                  <th className="py-4 px-5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">{t('pre_th_action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {filteredInterviews.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                    {/* Cliente / Interés */}
                    <td className="py-4 px-5">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-700 dark:text-brand-300 text-xs font-bold mr-3 shrink-0">
                          {item.initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.client_name}</p>
                          <p className="text-xs text-brand-500 dark:text-brand-400 mt-0.5">{item.interest}</p>
                        </div>
                      </div>
                    </td>
                    {/* Zona Geográfica */}
                    <td className="py-4 px-5">
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item.zone}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-500">{item.last_contact}</p>
                    </td>
                    {/* Origen */}
                    <td className="py-4 px-5 text-center">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-white border border-gray-100 dark:bg-white/5 dark:border-none px-2 py-1 rounded-md">{item.origin || 'Digital'}</span>
                    </td>
                    {/* Status Pipeline */}
                    <td className="py-4 px-5">
                      <div className="relative inline-block group/select">
                        <select 
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`appearance-none cursor-pointer pl-4 pr-10 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider border-none focus:ring-2 focus:ring-brand-500/50 transition-all ${STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {TABS.filter(t => t.id !== 'all').map(opt => (
                            <option key={opt.id} value={opt.id} className="bg-white dark:bg-dark-panel text-gray-900 dark:text-white font-sans uppercase font-bold text-[10px]">{opt.label}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </td>
                    {/* Acción */}
                    <td className="py-4 px-5 text-center">
                      <button className="text-gray-400 dark:text-gray-500 hover:text-brand-500 dark:hover:text-brand-400 transition-colors p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  );
}
