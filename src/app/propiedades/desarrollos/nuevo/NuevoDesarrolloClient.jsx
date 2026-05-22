"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { insertDevelopment } from '@/lib/dal/developments';
import TopNav from '@/components/layout/TopNav';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   NUEVO DESARROLLO — Create Development Form
   ═══════════════════════════════════════════════════════════════ */

const UNIT_LABELS = ['Lotes', 'Unidades', 'Apartamentos', 'Casas', 'Locales'];

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export default function NuevoDesarrolloClient() {
  const { t, lang } = useApp();
  const { user, supabase } = useAuth();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    tagline_es: '',
    tagline_en: '',
    developer_name: '',
    developer_contact: '',
    unit_label: 'Lotes',
    custom_unit_label: '',
    total_units: '',
    logo_url: '',
    og_image_url: '',
    office_code: 'altitud',
  });

  const update = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && autoSlug) next.slug = slugify(value);
      return next;
    });
  };

  const handleSave = async (asDraft = true) => {
    if (!form.name.trim()) return alert(lang === 'en' ? 'Name is required' : 'El nombre es requerido');
    if (!form.slug.trim()) return alert(lang === 'en' ? 'Slug is required' : 'El slug es requerido');

    setSaving(true);
    try {
      const unitLabel = form.unit_label === 'custom' ? form.custom_unit_label : form.unit_label;
      const data = await insertDevelopment({
        name: form.name.trim(),
        slug: form.slug.trim(),
        tagline_es: form.tagline_es || null,
        tagline_en: form.tagline_en || null,
        developer_name: form.developer_name || null,
        developer_contact: form.developer_contact || null,
        unit_label: unitLabel || 'Lotes',
        total_units: form.total_units ? parseInt(form.total_units, 10) : 0,
        available_units: form.total_units ? parseInt(form.total_units, 10) : 0,
        logo_url: form.logo_url || null,
        og_image_url: form.og_image_url || null,
        office_code: form.office_code,
        agent_id: user.id,
        status: asDraft ? 'draft' : 'pending_approval',
        submitted_at: asDraft ? null : new Date().toISOString(),
        sections: [],
      }, supabase);

      router.push(`/propiedades/desarrollos/${data.id}`);
    } catch (err) {
      console.error('Save error:', err?.message || err);
      const msg = err?.message || JSON.stringify(err);
      alert(msg?.includes('unique') ? (lang === 'en' ? 'This slug is already in use' : 'Este slug ya está en uso') : (msg || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-slate-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors";
  const labelCls = "text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2";

  return (
    <>
      <TopNav title={lang === 'en' ? 'New Development' : 'Nuevo Desarrollo'} subtitle={lang === 'en' ? 'Create a marketing page for a real estate project' : 'Crea una página de marketing para un proyecto inmobiliario'} />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-3xl w-full mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href="/propiedades/desarrollos" className="hover:text-emerald-500 transition-colors">
              {lang === 'en' ? 'Developments' : 'Desarrollos'}
            </Link>
            <span>/</span>
            <span className="text-gray-600 dark:text-white">{lang === 'en' ? 'New' : 'Nuevo'}</span>
          </div>

          {/* Form Card */}
          <div className="glass-panel rounded-[24px] p-6 md:p-8 space-y-8">

            {/* Section: Basic Info */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-sm">1</span>
                {lang === 'en' ? 'Project Information' : 'Información del Proyecto'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>{lang === 'en' ? 'Development Name *' : 'Nombre del Desarrollo *'}</label>
                  <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ej: Monte Verde Residences" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Slug (URL) *</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">/d/</span>
                    <input type="text" value={form.slug}
                      onChange={e => { setAutoSlug(false); update('slug', slugify(e.target.value)); }}
                      placeholder="monte-verde" className={inputCls} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{lang === 'en' ? 'Public URL for the landing page' : 'URL pública para la página de aterrizaje'}</p>
                </div>

                <div>
                  <label className={labelCls}>{lang === 'en' ? 'Unit Type Label' : 'Etiqueta de Unidades'}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {UNIT_LABELS.map(label => (
                      <button key={label} onClick={() => update('unit_label', label)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.unit_label === label ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                        {label}
                      </button>
                    ))}
                    <button onClick={() => update('unit_label', 'custom')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.unit_label === 'custom' ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                      {lang === 'en' ? 'Custom' : 'Personalizado'}
                    </button>
                  </div>
                  {form.unit_label === 'custom' && (
                    <input type="text" value={form.custom_unit_label} onChange={e => update('custom_unit_label', e.target.value)}
                      placeholder={lang === 'en' ? 'Custom label...' : 'Etiqueta personalizada...'} className={`${inputCls} mt-2`} />
                  )}
                </div>

                <div>
                  <label className={labelCls}>{lang === 'en' ? 'Total Units in Development' : 'Cantidad Total de Unidades'}</label>
                  <input type="number" min="0" value={form.total_units} onChange={e => update('total_units', e.target.value)}
                    placeholder={lang === 'en' ? 'e.g. 24' : 'Ej: 24'} className={inputCls} />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {lang === 'en' ? 'How many units does the development have in total? Not all need to be listed.' : '¿Cuántas unidades tiene el desarrollo en total? No todas necesitan estar publicadas.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Section: Taglines */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-sm">2</span>
                {lang === 'en' ? 'Marketing Copy' : 'Textos de Marketing'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tagline (ES)</label>
                  <input type="text" value={form.tagline_es} onChange={e => update('tagline_es', e.target.value)} placeholder="Tu refugio en la montaña..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tagline (EN)</label>
                  <input type="text" value={form.tagline_en} onChange={e => update('tagline_en', e.target.value)} placeholder="Your mountain retreat..." className={inputCls} />
                </div>
              </div>
            </div>

            {/* Section: Developer */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-sm">3</span>
                {lang === 'en' ? 'Developer Info' : 'Información del Desarrollador'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{lang === 'en' ? 'Developer Name' : 'Nombre del Desarrollador'}</label>
                  <input type="text" value={form.developer_name} onChange={e => update('developer_name', e.target.value)} placeholder="Ej: Grupo Altitud" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{lang === 'en' ? 'Developer Contact' : 'Contacto del Desarrollador'}</label>
                  <input type="text" value={form.developer_contact} onChange={e => update('developer_contact', e.target.value)} placeholder="Email o teléfono" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Section: Media */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-sm">4</span>
                {lang === 'en' ? 'Media & Branding' : 'Medios y Marca'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{lang === 'en' ? 'Project Logo URL' : 'URL del Logo del Proyecto'}</label>
                  <input type="url" value={form.logo_url} onChange={e => update('logo_url', e.target.value)} placeholder="https://..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{lang === 'en' ? 'Cover Image URL (Open Graph)' : 'URL de Imagen de Portada (Open Graph)'}</label>
                  <input type="url" value={form.og_image_url} onChange={e => update('og_image_url', e.target.value)} placeholder="https://..." className={inputCls} />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                {lang === 'en' ? 'You can add more images and content blocks after creating the development.' : 'Podrás agregar más imágenes y bloques de contenido después de crear el desarrollo.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-gray-100 dark:border-dark-border">
              <button onClick={() => handleSave(true)} disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white text-sm font-semibold transition-all disabled:opacity-50">
                {saving ? (lang === 'en' ? 'Saving...' : 'Guardando...') : (lang === 'en' ? 'Save as Draft' : 'Guardar como Borrador')}
              </button>
              <button onClick={() => handleSave(false)} disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50">
                {saving ? (lang === 'en' ? 'Saving...' : 'Guardando...') : (lang === 'en' ? 'Save & Submit for Approval' : 'Guardar y Enviar a Aprobación')}
              </button>
              <Link href="/propiedades/desarrollos"
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-white text-center transition-colors">
                {lang === 'en' ? 'Cancel' : 'Cancelar'}
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
