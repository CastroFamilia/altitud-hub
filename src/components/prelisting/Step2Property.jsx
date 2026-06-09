import { useState } from 'react';
import { useApp } from '@/lib/context';

export default function Step2Property({ formData, updateForm, onNext, onPrev }) {
  const { t, lang } = useApp();
  const [isValidating, setIsValidating] = useState(false);
  const [nameError, setNameError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateForm(name, value);
    if (name === 'property_name') setNameError(null);
  };

  const handleNext = async () => {
    if (!formData.property_name || formData.property_name.trim() === '') {
      setNameError(lang === 'en' ? 'Property Name is required' : 'El nombre de fantasía es requerido');
      return;
    }

    setIsValidating(true);
    setNameError(null);

    try {
      const res = await fetch('/api/properties/check-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.property_name })
      });
      
      const data = await res.json();
      if (data.existsInProperties || data.existsInAcm) {
        setNameError(
          lang === 'en' 
            ? 'This name is already registered by another agent. Please choose a unique name.' 
            : 'Este nombre ya está registrado por otro agente en el sistema. Por favor, elige un nombre único.'
        );
        setIsValidating(false);
        return;
      }
    } catch (e) {
      console.error('Validation error:', e);
    }
    
    setIsValidating(false);
    onNext();
  };

  return (
    <div className="bg-white dark:bg-dark-panel p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border space-y-8 fade-in">
      <div>
        <div className="mb-8 flex items-center">
            <button onClick={onPrev} className="mr-4 w-10 h-10 rounded-full border border-gray-300 dark:border-dark-border flex justify-center items-center text-gray-500 hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pre_s2_title')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('pre_s2_subtitle')}</p>
            </div>
        </div>

        <h3 className="text-brand-600 dark:text-brand-400 font-bold uppercase text-xs tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">{t('pre_s2_id_title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-1 md:col-span-2">
                <label className="form-label">{lang === 'en' ? 'Internal Fantasy Name' : 'Nombre de Fantasía (Interno)'}</label>
                <input type="text" name="property_name" value={formData.property_name || ''} onChange={handleChange} className={`form-input text-lg font-semibold ${nameError ? 'border-red-500 ring-red-500' : ''}`} placeholder={t('pre_s2_prop_placeholder')} />
                {nameError && <p className="text-red-500 text-xs font-bold mt-1">{nameError}</p>}
                <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold bg-brand-50/50 dark:bg-brand-950/20 px-3 py-2 rounded-lg border border-brand-100/30 dark:border-brand-900/20 flex items-center gap-1.5 mt-2">
                  <span>💡</span> {lang === 'en' 
                    ? "This property name will be used to create the single base Google Drive folder. Avoid duplicates!" 
                    : "Este nombre se usará para crear la carpeta única de Google Drive en Pre-Listing. ¡Evita duplicados!"}
                </p>
            </div>
            <div>
                <label className="form-label">{t('pre_s2_finca')}</label>
                <input type="text" name="finca" value={formData.finca || ''} onChange={handleChange} className="form-input font-mono text-sm" placeholder={t('pre_s2_finca_placeholder')} />
            </div>
            <div>
                <label className="form-label">{t('pre_s2_plano')}</label>
                <input type="text" name="plano" value={formData.plano || ''} onChange={handleChange} className="form-input font-mono text-sm" placeholder={t('pre_s2_plano_placeholder')} />
            </div>
            <div className="col-span-1 md:col-span-2 mt-2">
                <label className="form-label font-bold text-gray-700 dark:text-gray-300">
                  {lang === 'en' ? 'Link Existing Google Drive Folder (Optional)' : 'Vincular Carpeta de Google Drive Existente (Opcional)'}
                </label>
                <input 
                  type="url" 
                  name="drive_folder_url" 
                  value={formData.drive_folder_url || ''} 
                  onChange={handleChange} 
                  className="form-input font-sans text-sm" 
                  placeholder="https://drive.google.com/drive/folders/..." 
                />
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  {lang === 'en' 
                    ? "If you already have a folder created for this property (e.g. from the photographer or a past record), paste the link here. We will link it and skip automatic creation."
                    : "Si ya tienes una carpeta de fotos o documentos para esta propiedad, pega el enlace aquí. La vincularemos directamente y no crearemos una duplicada."}
                </p>
            </div>
        </div>
      </div>

      <div>
        <h3 className="text-brand-600 dark:text-brand-400 font-bold uppercase text-xs tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">{t('pre_s2_type_title')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { id: 'house', label: t('pre_s2_type_house'), icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { id: 'condo', label: t('pre_s2_type_condo'), icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { id: 'land', label: t('pre_s2_type_land'), icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { id: 'commercial', label: t('pre_s2_type_com'), icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
              { id: 'farm', label: t('pre_s2_type_farm'), icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' }
            ].map(type => (
              <label key={type.id} className="relative cursor-pointer group">
                  <input type="radio" name="property_type" value={type.id} checked={formData.property_type === type.id} onChange={handleChange} className="peer sr-only" />
                  <div className="h-full flex flex-col p-4 rounded-xl border-2 border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input hover:border-brand-300 peer-checked:border-brand-500 peer-checked:bg-white dark:peer-checked:bg-dark-panel transition-all shadow-sm">
                      <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-lg flex items-center justify-center mb-3 peer-checked:bg-brand-600 peer-checked:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={type.icon}></path></svg>
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">{type.label}</h4>
                  </div>
              </label>
            ))}
        </div>
        <p className="text-[11px] text-gray-400 italic mt-3">{t('pre_s2_type_note')}</p>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={onPrev} className="bg-gray-100 dark:bg-dark-bg hover:bg-gray-200 dark:hover:bg-dark-input text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-lg text-sm font-bold transition-all">{t('pre_s2_prev')}</button>
          <button onClick={handleNext} disabled={isValidating} className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-lg text-sm font-bold shadow-lg shadow-brand-500/25 transition-all transform hover:scale-105 flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
              <span>{isValidating ? '...' : t('pre_s2_next')}</span> 
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
      </div>
    </div>
  );
}
