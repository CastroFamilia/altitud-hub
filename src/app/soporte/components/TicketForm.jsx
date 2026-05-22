"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';

const TICKET_CATEGORIES = [
  { id: 'bug', es: '🐛 Error / Bug', en: '🐛 Bug / Error' },
  { id: 'location_request', es: '📍 Solicitar Ubicación', en: '📍 Request Location' },
  { id: 'feature_request', es: '💡 Solicitud de Función', en: '💡 Feature Request' },
  { id: 'other', es: '📋 Otro', en: '📋 Other' },
];

const CR_PROVINCES = [
  'San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'
];

export default function TicketForm({ onClose, onSuccess }) {
  const { profile, supabase } = useAuth();
  const { t, lang } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('bug');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [locationData, setLocationData] = useState({
    provincia: '',
    canton: '',
    distrito: '',
    barrio: '',
    nombre_lugar: '',
  });
  const [imageFile, setImageFile] = useState(null);

  const isLocationRequest = category === 'location_request';

  // Auto-generate title for location requests
  const getAutoTitle = () => {
    if (!isLocationRequest) return formData.title;
    const parts = [locationData.nombre_lugar, locationData.barrio, locationData.distrito, locationData.canton, locationData.provincia].filter(Boolean);
    return parts.length > 0 ? `📍 Solicitud: ${parts.join(', ')}` : formData.title;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLocationRequest) {
      if (!locationData.provincia || !locationData.canton) {
        setError(lang === 'en' ? 'Province and Canton are required for location requests.' : 'Provincia y Cantón son requeridos para solicitudes de ubicación.');
        return;
      }
    } else {
      if (!formData.title || !formData.description) return;
    }

    try {
      setLoading(true);
      setError(null);
      let imageUrl = null;

      // 1. Upload image if exists
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${profile.id}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('support_images')
          .upload(filePath, imageFile);

        if (uploadError) {
          throw new Error('Error al subir la imagen: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('support_images')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl;
      }

      // 2. Build the ticket payload
      const ticketTitle = isLocationRequest ? getAutoTitle() : formData.title;
      const ticketDescription = isLocationRequest
        ? buildLocationDescription()
        : formData.description;

      const { error: insertError } = await supabase
        .from('support_tickets')
        .insert([{
          agent_id: profile.id,
          title: ticketTitle,
          description: ticketDescription,
          image_url: imageUrl,
          category,
          location_data: isLocationRequest ? locationData : null,
          status: 'pending'
        }]);

      if (insertError) throw insertError;

      onSuccess();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al enviar el ticket.');
    } finally {
      setLoading(false);
    }
  };

  const buildLocationDescription = () => {
    const l = locationData;
    const lines = [
      `**${lang === 'en' ? 'Location Request' : 'Solicitud de Ubicación'}**`,
      '',
      `${lang === 'en' ? 'Province' : 'Provincia'}: ${l.provincia || '—'}`,
      `${lang === 'en' ? 'Canton' : 'Cantón'}: ${l.canton || '—'}`,
      `${lang === 'en' ? 'District' : 'Distrito'}: ${l.distrito || '—'}`,
      `${lang === 'en' ? 'Barrio/Community' : 'Barrio/Comunidad'}: ${l.barrio || '—'}`,
      `${lang === 'en' ? 'Place/Development Name' : 'Nombre del Lugar/Desarrollo'}: ${l.nombre_lugar || '—'}`,
    ];
    if (formData.description) {
      lines.push('', `${lang === 'en' ? 'Additional Notes' : 'Notas Adicionales'}: ${formData.description}`);
    }
    return lines.join('\n');
  };

  const setLoc = (key, val) => setLocationData(prev => ({ ...prev, [key]: val }));

  const inputCls = "w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-dark-bg dark:border-dark-border dark:text-white text-sm";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-panel rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-bg/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('sup_new_ticket') || 'Nuevo Ticket de Soporte'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30">
              {error}
            </div>
          )}
          
          <form id="ticket-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selector */}
            <div>
              <label className={labelCls}>
                {t('sup_form_category') || (lang === 'en' ? 'Category' : 'Categoría')} *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TICKET_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      category === cat.id
                        ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/20'
                        : 'bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {lang === 'en' ? cat.en : cat.es}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Request Fields */}
            {isLocationRequest && (
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                    {lang === 'en' ? 'Location Hierarchy' : 'Jerarquía de Ubicación'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>
                      {lang === 'en' ? 'Province' : 'Provincia'} *
                    </label>
                    <select
                      value={locationData.provincia}
                      onChange={e => setLoc('provincia', e.target.value)}
                      className={inputCls}
                      required
                    >
                      <option value="">{lang === 'en' ? 'Select...' : 'Seleccionar...'}</option>
                      {CR_PROVINCES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>
                      {lang === 'en' ? 'Canton' : 'Cantón'} *
                    </label>
                    <input
                      type="text"
                      required={isLocationRequest}
                      value={locationData.canton}
                      onChange={e => setLoc('canton', e.target.value)}
                      className={inputCls}
                      placeholder={lang === 'en' ? 'e.g. Pérez Zeledón' : 'Ej. Pérez Zeledón'}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      {lang === 'en' ? 'District' : 'Distrito'}
                    </label>
                    <input
                      type="text"
                      value={locationData.distrito}
                      onChange={e => setLoc('distrito', e.target.value)}
                      className={inputCls}
                      placeholder={lang === 'en' ? 'e.g. General Viejo' : 'Ej. General Viejo'}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      {lang === 'en' ? 'Barrio / Community' : 'Barrio / Comunidad'}
                    </label>
                    <input
                      type="text"
                      value={locationData.barrio}
                      onChange={e => setLoc('barrio', e.target.value)}
                      className={inputCls}
                      placeholder={lang === 'en' ? 'e.g. Santa Elena' : 'Ej. Santa Elena de El General'}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    <span className="flex items-center gap-1.5">
                      {lang === 'en' ? 'Place / Development Name' : 'Nombre del Lugar / Desarrollo'}
                      <span className="text-[10px] font-normal text-gray-400">{lang === 'en' ? '(if applicable)' : '(si aplica)'}</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={locationData.nombre_lugar}
                    onChange={e => setLoc('nombre_lugar', e.target.value)}
                    className={inputCls}
                    placeholder={lang === 'en' ? 'e.g. RISE Costa Rica' : 'Ej. RISE Costa Rica'}
                  />
                </div>
              </div>
            )}

            {/* Standard Title (hidden for location_request) */}
            {!isLocationRequest && (
              <div>
                <label className={labelCls}>
                  {t('sup_form_title') || 'Título del problema'} *
                </label>
                <input
                  type="text"
                  required={!isLocationRequest}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={inputCls}
                  placeholder="Ej. Error al guardar contacto"
                />
              </div>
            )}
            
            <div>
              <label className={labelCls}>
                {isLocationRequest
                  ? (lang === 'en' ? 'Additional Notes (Optional)' : 'Notas Adicionales (Opcional)')
                  : (t('sup_form_desc') || 'Descripción detallada')} {!isLocationRequest && '*'}
              </label>
              <textarea
                required={!isLocationRequest}
                rows={isLocationRequest ? 2 : 4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`${inputCls} resize-none`}
                placeholder={isLocationRequest
                  ? (lang === 'en' ? 'Any extra context about this location...' : 'Cualquier contexto adicional sobre esta ubicación...')
                  : 'Describe qué estabas haciendo y qué sucedió...'}
              ></textarea>
            </div>
            
            <div>
              <label className={labelCls}>
                {t('sup_form_image') || 'Subir captura de pantalla (Opcional)'}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-brand-50 file:text-brand-700
                  hover:file:bg-brand-100 dark:file:bg-brand-900/20 dark:file:text-brand-400"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:bg-dark-panel dark:text-gray-300 dark:border-dark-border dark:hover:bg-gray-800"
          >
            {t('sup_form_cancel') || 'Cancelar'}
          </button>
          <button
            type="submit"
            form="ticket-form"
            disabled={loading}
            className="btn-primary text-sm px-6 py-2"
          >
            {loading ? t('sup_form_submitting') || 'Enviando...' : t('sup_form_submit') || 'Enviar Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}
