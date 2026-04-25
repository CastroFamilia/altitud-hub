"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/layout/TopNav';
import Step1Owners from '@/components/prelisting/Step1Owners';
import Step2Property from '@/components/prelisting/Step2Property';
import Step3Tech from '@/components/prelisting/Step3Tech';
import { supabase } from '@/lib/supabase';

export default function PrelistingDashboard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    property_type: 'house',
    status: 'draft',
  });

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
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
      
      // Redirigir al dashboard tras el éxito según lo pedido
      router.push('/');
    } catch (e) {
      console.error(e);
      alert('Error guardando en Supabase: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <TopNav title="Entrevista Pre-Listing" subtitle="Captura de perfil psicológico y datos de propiedad" />
      
      {/* Progress Indicator */}
      <div className="w-full bg-white dark:bg-[#1a1d24] border-b border-gray-100 dark:border-dark-border/50 shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider relative z-10">
          <div className={`flex items-center ${step >= 1 ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}>
            <span className={`w-5 h-5 rounded-full flex justify-center items-center mr-2 ${step >= 1 ? 'bg-brand-100 dark:bg-brand-500/20' : 'bg-gray-100 dark:bg-dark-input'}`}>1</span> 
            <span>Propietarios</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border mx-4"></div>
          <div className={`flex items-center ${step >= 2 ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}>
            <span className={`w-5 h-5 rounded-full flex justify-center items-center mr-2 ${step >= 2 ? 'bg-brand-100 dark:bg-brand-500/20' : 'bg-gray-100 dark:bg-dark-input'}`}>2</span> 
            <span>Propiedad</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border mx-4"></div>
          <div className={`flex items-center ${step >= 3 ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}>
            <span className={`w-5 h-5 rounded-full flex justify-center items-center mr-2 ${step >= 3 ? 'bg-brand-100 dark:bg-brand-500/20' : 'bg-gray-100 dark:bg-dark-input'}`}>3</span> 
            <span>Ficha Técnica</span>
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
