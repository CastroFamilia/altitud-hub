"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/layout/TopNav';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   EDITAR DESARROLLO — Edit Development Form
   Pre-populates from DB, saves updates via Supabase.
   ═══════════════════════════════════════════════════════════════ */

const UNIT_LABELS = ['Lotes', 'Unidades', 'Apartamentos', 'Casas', 'Locales'];

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export default function EditarDesarrolloPage() {
  const { id } = useParams();
  const { t, lang } = useApp();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalSlug, setOriginalSlug] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    tagline_es: '',
    tagline_en: '',
    developer_name: '',
    developer_contact: '',
    unit_label: 'Lotes',
    custom_unit_label: '',
    logo_url: '',
    og_image_url: '',
    office_code: 'altitud',
  });

  // Fetch existing development
  useEffect(() => {
    if (!id) return;
    const fetchDev = async () => {
      const { data, error } = await supabase
        .from('developments')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        console.error(error);
        router.push('/propiedades/desarrollos');
        return;
      }

      // Determine if unit_label is custom
      const isCustom = data.unit_label && !UNIT_LABELS.includes(data.unit_label);

      setForm({
        name: data.name || '',
        slug: data.slug || '',
        tagline_es: data.tagline_es || '',
        tagline_en: data.tagline_en || '',
        developer_name: data.developer_name || '',
        developer_contact: data.developer_contact || '',
        unit_label: isCustom ? 'custom' : (data.unit_label || 'Lotes'),
        custom_unit_label: isCustom ? data.unit_label : '',
        logo_url: data.logo_url || '',
        og_image_url: data.og_image_url || '',
        office_code: data.office_code || 'altitud',
      });
      setOriginalSlug(data.slug || '');
      setLoading(false);
    };
    fetchDev();
  }, [id, router]);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (asDraft = true) => {
    if (!form.name.trim()) return alert(t('dev_name_required'));
    if (!form.slug.trim()) return alert(t('dev_slug_required'));

    setSaving(true);
    try {
      const unitLabel = form.unit_label === 'custom' ? form.custom_unit_label : form.unit_label;
      const updates = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        tagline_es: form.tagline_es || null,
        tagline_en: form.tagline_en || null,
        developer_name: form.developer_name || null,
        developer_contact: form.developer_contact || null,
        unit_label: unitLabel || 'Lotes',
        logo_url: form.logo_url || null,
        og_image_url: form.og_image_url || null,
        office_code: form.office_code,
      };

      if (!asDraft) {
        updates.status = 'pending_approval';
        updates.submitted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('developments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      router.push(`/propiedades/desarrollos/${id}`);
    } catch (err) {
      console.error('Save error:', err);
      alert(err.message?.includes('unique') ? t('dev_slug_taken') : err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-slate-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors";
  const labelCls = "text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2";

  if (loading) return (
    <>
      <TopNav title={t('dev_edit_title')} subtitle={t('dev_subtitle')} />
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  );

  return (
    <>
      <TopNav title={t('dev_edit_title')} subtitle={t('dev_subtitle')} />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-3xl w-full mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href="/propiedades/desarrollos" className="hover:text-emerald-500 transition-colors">
              {t('dev_back_list')}
            </Link>
            <span>/</span>
            <Link href={`/propiedades/desarrollos/${id}`} className="hover:text-emerald-500 transition-colors truncate max-w-[120px]">
              {form.name || '...'}
            </Link>
            <span>/</span>
            <span className="text-gray-600 dark:text-white">{t('dev_edit')}</span>
          </div>

          {/* Form Card */}
          <div className="glass-panel rounded-[24px] p-6 md:p-8 space-y-8">

            {/* Section 1: Basic Info */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-sm">1</span>
                {t('dev_project_info')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>{t('dev_name')} *</label>
                  <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ej: Monte Verde Residences" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>{t('dev_slug')} *</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">/d/</span>
                    <input type="text" value={form.slug}
                      onChange={e => update('slug', slugify(e.target.value))}
                      placeholder="monte-verde" className={inputCls} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{t('dev_slug_desc')}</p>
                </div>

                <div>
                  <label className={labelCls}>{t('dev_unit_label')}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {UNIT_LABELS.map(label => (
                      <button key={label} onClick={() => update('unit_label', label)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.unit_label === label ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                        {label}
                      </button>
                    ))}
                    <button onClick={() => update('unit_label', 'custom')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.unit_label === 'custom' ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                      {t('dev_unit_custom')}
                    </button>
                  </div>
                  {form.unit_label === 'custom' && (
                    <input type="text" value={form.custom_unit_label} onChange={e => update('custom_unit_label', e.target.value)}
                      placeholder={lang === 'en' ? 'Custom label...' : 'Etiqueta personalizada...'} className={`${inputCls} mt-2`} />
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Taglines */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-sm">2</span>
                {t('dev_marketing_copy')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t('dev_tagline_es')}</label>
                  <input type="text" value={form.tagline_es} onChange={e => update('tagline_es', e.target.value)} placeholder="Tu refugio en la montaña..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t('dev_tagline_en')}</label>
                  <input type="text" value={form.tagline_en} onChange={e => update('tagline_en', e.target.value)} placeholder="Your mountain retreat..." className={inputCls} />
                </div>
              </div>
            </div>

            {/* Section 3: Developer */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-sm">3</span>
                {t('dev_developer_info')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t('dev_developer_name')}</label>
                  <input type="text" value={form.developer_name} onChange={e => update('developer_name', e.target.value)} placeholder="Ej: Grupo Altitud" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t('dev_developer_contact')}</label>
                  <input type="text" value={form.developer_contact} onChange={e => update('developer_contact', e.target.value)} placeholder="Email o teléfono" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Section 4: Media */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-sm">4</span>
                {t('dev_media_branding')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t('dev_logo_url')}</label>
                  <input type="url" value={form.logo_url} onChange={e => update('logo_url', e.target.value)} placeholder="https://..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t('dev_og_image_url')}</label>
                  <input type="url" value={form.og_image_url} onChange={e => update('og_image_url', e.target.value)} placeholder="https://..." className={inputCls} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-gray-100 dark:border-dark-border">
              <button onClick={() => handleSave(true)} disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white text-sm font-semibold transition-all disabled:opacity-50">
                {saving ? t('dev_saving') : t('dev_save_draft')}
              </button>
              <button onClick={() => handleSave(false)} disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50">
                {saving ? t('dev_saving') : t('dev_save_submit')}
              </button>
              <Link href={`/propiedades/desarrollos/${id}`}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-white text-center transition-colors">
                {t('dev_cancel')}
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
