"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase-browser';

export default function TicketForm({ onClose, onSuccess }) {
  const { profile } = useAuth();
  const { t } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

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

      // 2. Insert ticket
      const { error: insertError } = await supabase
        .from('support_tickets')
        .insert([{
          agent_id: profile.id,
          title: formData.title,
          description: formData.description,
          image_url: imageUrl,
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
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
          
          <form id="ticket-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('sup_form_title') || 'Título del problema'} *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-dark-bg dark:border-dark-border dark:text-white"
                placeholder="Ej. Error al guardar contacto"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('sup_form_desc') || 'Descripción detallada'} *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-dark-bg dark:border-dark-border dark:text-white resize-none"
                placeholder="Describe qué estabas haciendo y qué sucedió..."
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
