"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/layout/TopNav';
import Link from 'next/link';

const PROPERTY_TYPES = [
  { id: 1, es: 'Casa', en: 'House' },
  { id: 2, es: 'Apartamento', en: 'Apartment' },
  { id: 3, es: 'Lote', en: 'Lot' },
  { id: 4, es: 'Finca', en: 'Farm' },
  { id: 5, es: 'Comercial', en: 'Commercial' },
  { id: 6, es: 'Bodega', en: 'Warehouse' },
  { id: 7, es: 'Oficina', en: 'Office' },
  { id: 10, es: 'Terreno', en: 'Land' },
];

const AMENITY_FIELDS = [
  { key: 'pool_private', es: 'Piscina', en: 'Pool' },
  { key: 'garage', es: 'Garaje', en: 'Garage' },
  { key: 'cooling', es: 'A/C', en: 'A/C' },
  { key: 'has_view', es: 'Vista', en: 'View' },
  { key: 'gated_community', es: 'Condominio', en: 'Gated' },
  { key: 'furnished', es: 'Amueblado', en: 'Furnished' },
  { key: 'maid_room', es: 'Cuarto Servicio', en: 'Maid Room' },
  { key: 'property_new', es: 'Nuevo', en: 'New' },
];

const INITIAL_FORM = {
  name: '', listing_title_es: '', listing_title_en: '',
  property_type_id: 3, listing_contract_type: 1,
  owner_name: '', owner_phones: '', owner_email: '', listing_agreement: false,
  unparsed_address: '', latitude: '', longitude: '',
  bedrooms_total: 0, bathrooms_full: 0, bathrooms_half: 0, stories: 1,
  lot_size_area: '', construction_size: '', year_built: '',
  list_price: '', list_price_currency_id: 2,
  listing_side_comm: 3, selling_side_comm: 3,
  public_remarks_es: '', public_remarks_en: '',
  private_remarks_es: '', private_remarks_en: '',
  video_link: '', drive_photos_folder_url: '',
  pool_private: false, garage: false, garage_spaces: 0,
  cooling: false, has_view: false, gated_community: false,
  furnished: false, maid_room: false, property_new: false,
  office_code: '',
};

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4 mt-8 first:mt-0">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function NuevaPropiedadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { user, profile } = useAuth();
  const { t, lang } = useApp();
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(!!editId);
  const [form, setForm] = useState(INITIAL_FORM);
  const [step, setStep] = useState(0); // 0=basics, 1=details, 2=marketing
  const [acmReports, setAcmReports] = useState([]);
  const [selectedAcmId, setSelectedAcmId] = useState('');

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    const fetchAcm = async () => {
      const { data } = await supabase.from('acm_reports').select('*').order('created_at', { ascending: false }).limit(20);
      if (data) setAcmReports(data);
    };
    fetchAcm();
  }, []);

  useEffect(() => {
    if (profile?.office && !editId) {
      const officeCode = profile.office === 'cero' ? 'R0700151' : 'R0700130';
      set('office_code', officeCode);
    }
  }, [profile?.office, editId]);

  const handleSelectAcm = (e) => {
    const acmId = e.target.value;
    setSelectedAcmId(acmId);
    if (!acmId) return;
    const report = acmReports.find(r => r.id === acmId);
    if (report) {
      setForm(prev => ({
        ...prev,
        owner_name: report.client_name || prev.owner_name,
        owner_phones: report.client_phone || prev.owner_phones,
        owner_email: report.client_email || prev.owner_email,
        unparsed_address: report.property_address || prev.unparsed_address,
        name: report.property_address || prev.name,
        property_type_id: report.property_type === 'house' ? 1 : report.property_type === 'commercial' ? 5 : report.property_type === 'land' ? 10 : prev.property_type_id,
        lot_size_area: report.indicators?.tech?.m2_lot || prev.lot_size_area,
        construction_size: report.indicators?.tech?.m2_const || prev.construction_size,
        bedrooms_total: report.indicators?.tech?.bedrooms || prev.bedrooms_total,
        bathrooms_full: report.indicators?.tech?.bathrooms || prev.bathrooms_full,
        year_built: report.indicators?.tech?.year_built || prev.year_built,
        garage_spaces: report.indicators?.tech?.parking || prev.garage_spaces,
      }));
    }
  };
  const setNum = (key, val) => set(key, val === '' ? '' : Number(val));

  // Load existing property for edit mode
  useEffect(() => {
    if (!editId) return;
    const loadProperty = async () => {
      setEditLoading(true);
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', editId)
          .single();
        if (error) throw error;
        if (data) {
          const editForm = {};
          Object.keys(INITIAL_FORM).forEach(key => {
            editForm[key] = data[key] !== null && data[key] !== undefined ? data[key] : INITIAL_FORM[key];
          });
          setForm(editForm);
        }
      } catch (err) {
        console.error('Error loading property for edit:', err);
        alert('Error loading property');
        router.push('/propiedades');
      } finally {
        setEditLoading(false);
      }
    };
    loadProperty();
  }, [editId, router]);

  const handleSubmit = async (statusOverride = null) => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        agent_id: user?.id,
        status: statusOverride || 'pending_approval',
        submitted_at: (statusOverride === 'draft' || statusOverride === 'paused' || statusOverride === 'cancelled') ? null : new Date().toISOString(),
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        lot_size_area: form.lot_size_area ? Number(form.lot_size_area) : null,
        construction_size: form.construction_size ? Number(form.construction_size) : null,
        list_price: form.list_price ? Number(form.list_price) : null,
        year_built: form.year_built ? Number(form.year_built) : null,
      };

      let resultId;
      if (editId) {
        // Update existing property
        const { error } = await supabase.from('properties').update(payload).eq('id', editId);
        if (error) throw error;
        resultId = editId;
        // Auto-update milestones on status change
        if (statusOverride !== 'draft' && statusOverride !== 'paused' && statusOverride !== 'cancelled') {
          await supabase.from('listing_milestones').upsert({
            property_id: editId,
            agent_id: user?.id,
            submitted_at: new Date().toISOString(),
          }, { onConflict: 'property_id' });
        }
        if (payload.listing_agreement) {
          await supabase.from('listing_milestones').upsert({
            property_id: editId,
            agent_id: user?.id,
            authorization_signed_at: new Date().toISOString(),
          }, { onConflict: 'property_id' });
        }
      } else {
        // Create new property
        const { data, error } = await supabase.from('properties').insert([payload]).select().single();
        if (error) throw error;
        resultId = data.id;
        // Auto-create milestone row
        const milestonePayload = {
          property_id: data.id,
          agent_id: user?.id,
          listing_created_at: new Date().toISOString(),
        };
        if (statusOverride !== 'draft' && statusOverride !== 'paused' && statusOverride !== 'cancelled') milestonePayload.submitted_at = new Date().toISOString();
        if (payload.listing_agreement) milestonePayload.authorization_signed_at = new Date().toISOString();
        await supabase.from('listing_milestones').insert([milestonePayload]);

        // Auto-create Google Drive Folder for Photos in background
        try {
          fetch('/api/properties/create-drive-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId: data.id }),
          });
        } catch (e) {
          console.error('Failed to trigger Drive folder creation:', e);
        }
      }
      router.push(`/propiedades/${resultId}`);
    } catch (err) {
      console.error('Error saving property:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { label: lang === 'en' ? 'Basics & Owner' : 'Básicos y Propietario' },
    { label: lang === 'en' ? 'Details & Amenities' : 'Detalles y Amenidades' },
    { label: lang === 'en' ? 'Marketing & Pricing' : 'Marketing y Precio' },
  ];

  const inputCls = "w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-sm";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <>
      <TopNav titleKey="nav_properties" subtitleKey="nav_portfolio" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-3xl w-full mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <Link href="/propiedades" className="hover:text-brand-500 transition-colors">{t('nav_properties')}</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-800 dark:text-white font-medium">
              {editId
                ? (lang === 'en' ? `Editing: ${form.name || 'Property'}` : `Editando: ${form.name || 'Propiedad'}`)
                : (lang === 'en' ? 'New Property' : 'Nueva Propiedad')}
            </span>
          </div>

          {editLoading && (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{lang === 'en' ? 'Loading property...' : 'Cargando propiedad...'}</p>
            </div>
          )}

          {!editLoading && (<>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((s, i) => (
              <button key={i} onClick={() => setStep(i)} className={`flex-1 py-2 rounded-xl text-xs font-semibold text-center transition-all ${step === i ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                {i + 1}. {s.label}
              </button>
            ))}
          </div>

          <div className="glass-panel p-6 md:p-8 rounded-2xl">

            {/* ── STEP 0: Basics & Owner ── */}
            {step === 0 && (
              <>
                <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                  <label className={labelCls}>⚡ {lang === 'en' ? 'Import from Pre-Listing / ACM Report' : 'Importar de Carpeta Pre-Listing / Reporte ACM'}</label>
                  <select value={selectedAcmId} onChange={handleSelectAcm} className={inputCls}>
                    <option value="">{lang === 'en' ? 'Select a report to auto-fill...' : 'Selecciona un reporte para auto-completar...'}</option>
                    {acmReports.map(r => (
                      <option key={r.id} value={r.id}>{r.client_name} - {r.property_address} ({new Date(r.created_at).toLocaleDateString()})</option>
                    ))}
                  </select>
                </div>

                <SectionTitle icon="🏠" title={lang === 'en' ? 'Property Basics' : 'Datos Básicos'} subtitle={lang === 'en' ? 'Type, title, and classification' : 'Tipo, título y clasificación'} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Internal Name *' : 'Nombre Interno *'}</label>
                    <input required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Ej: Lote Vista Chirripó #12" />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Property Type' : 'Tipo de Propiedad'}</label>
                    <select value={form.property_type_id} onChange={e => setNum('property_type_id', e.target.value)} className={inputCls}>
                      {PROPERTY_TYPES.map(pt => (<option key={pt.id} value={pt.id}>{lang === 'en' ? pt.en : pt.es}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Title (Spanish)' : 'Título (Español)'}</label>
                    <input value={form.listing_title_es} onChange={e => set('listing_title_es', e.target.value)} className={inputCls} placeholder="Lote con vista panorámica en..." />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Title (English)' : 'Título (Inglés)'}</label>
                    <input value={form.listing_title_en} onChange={e => set('listing_title_en', e.target.value)} className={inputCls} placeholder="Panoramic view lot in..." />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Contract Type' : 'Tipo de Contrato'}</label>
                    <select value={form.listing_contract_type} onChange={e => setNum('listing_contract_type', e.target.value)} className={inputCls}>
                      <option value={1}>{lang === 'en' ? 'Sale' : 'Venta'}</option>
                      <option value={2}>{lang === 'en' ? 'Rent' : 'Alquiler'}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Office' : 'Oficina'}</label>
                    <select value={form.office_code} onChange={e => set('office_code', e.target.value)} className={`${inputCls} opacity-70 cursor-not-allowed`} disabled>
                      <option value="">—</option>
                      <option value="R0700130">RE/MAX Altitud</option>
                      <option value="R0700151">Altitud Cero</option>
                    </select>
                  </div>
                </div>

                <SectionTitle icon="👤" title={lang === 'en' ? 'Owner Information' : 'Información del Propietario'} subtitle={lang === 'en' ? 'Required for broker approval' : 'Requerido para aprobación del broker'} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Owner Name *' : 'Nombre del Propietario *'}</label>
                    <input value={form.owner_name} onChange={e => set('owner_name', e.target.value)} className={inputCls} placeholder="Juan Pérez" />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Owner Phone' : 'Teléfono del Propietario'}</label>
                    <input value={form.owner_phones} onChange={e => set('owner_phones', e.target.value)} className={inputCls} placeholder="+506 8888 8888" />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Owner Email' : 'Email del Propietario'}</label>
                    <input type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} className={inputCls} placeholder="owner@email.com" />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <button type="button" onClick={() => set('listing_agreement', !form.listing_agreement)} className={`w-10 h-6 rounded-full transition-colors relative ${form.listing_agreement ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.listing_agreement ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'en' ? 'Listing Agreement Signed' : 'Contrato de Exclusiva Firmado'}</span>
                  </div>
                </div>

                <SectionTitle icon="📍" title={lang === 'en' ? 'Location' : 'Ubicación'} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelCls}>{lang === 'en' ? 'Address' : 'Dirección'}</label>
                    <input value={form.unparsed_address} onChange={e => set('unparsed_address', e.target.value)} className={inputCls} placeholder="San Isidro de El General, Pérez Zeledón..." />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Latitude' : 'Latitud'}</label>
                    <input type="number" step="any" value={form.latitude} onChange={e => set('latitude', e.target.value)} className={inputCls} placeholder="9.3780" />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Longitude' : 'Longitud'}</label>
                    <input type="number" step="any" value={form.longitude} onChange={e => set('longitude', e.target.value)} className={inputCls} placeholder="-83.7024" />
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 1: Details & Amenities ── */}
            {step === 1 && (
              <>
                <SectionTitle icon="📐" title={lang === 'en' ? 'Property Details' : 'Detalles de la Propiedad'} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'bedrooms_total', label: lang === 'en' ? 'Bedrooms' : 'Habitaciones' },
                    { key: 'bathrooms_full', label: lang === 'en' ? 'Full Baths' : 'Baños Completos' },
                    { key: 'bathrooms_half', label: lang === 'en' ? 'Half Baths' : 'Medios Baños' },
                    { key: 'stories', label: lang === 'en' ? 'Floors' : 'Pisos' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className={labelCls}>{f.label}</label>
                      <input type="number" min="0" value={form[f.key]} onChange={e => setNum(f.key, e.target.value)} className={inputCls} />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Lot Size (m²)' : 'Terreno (m²)'}</label>
                    <input type="number" value={form.lot_size_area} onChange={e => set('lot_size_area', e.target.value)} className={inputCls} placeholder="500" />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Construction (m²)' : 'Construcción (m²)'}</label>
                    <input type="number" value={form.construction_size} onChange={e => set('construction_size', e.target.value)} className={inputCls} placeholder="180" />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Year Built' : 'Año de Construcción'}</label>
                    <input type="number" value={form.year_built} onChange={e => set('year_built', e.target.value)} className={inputCls} placeholder="2020" />
                  </div>
                </div>

                <SectionTitle icon="✨" title={lang === 'en' ? 'Amenities' : 'Amenidades'} subtitle={lang === 'en' ? 'Select all that apply' : 'Selecciona las que apliquen'} />
                <div className="flex flex-wrap gap-3">
                  {AMENITY_FIELDS.map(a => (
                    <button key={a.key} type="button" onClick={() => set(a.key, !form[a.key])}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${form[a.key] ? 'bg-brand-500 border-brand-500 text-white shadow-md' : 'bg-white dark:bg-dark-panel border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                      {lang === 'en' ? a.en : a.es}
                    </button>
                  ))}
                </div>

                {form.garage && (
                  <div className="mt-4 max-w-xs">
                    <label className={labelCls}>{lang === 'en' ? 'Garage Spaces' : 'Espacios de Garaje'}</label>
                    <input type="number" min="0" value={form.garage_spaces} onChange={e => setNum('garage_spaces', e.target.value)} className={inputCls} />
                  </div>
                )}

                <SectionTitle icon="📝" title={lang === 'en' ? 'Internal Notes' : 'Notas Internas'} subtitle={lang === 'en' ? 'Only visible to you and broker' : 'Solo visible para ti y el broker'} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Private Notes (ES)' : 'Notas Privadas (ES)'}</label>
                    <textarea rows={3} value={form.private_remarks_es} onChange={e => set('private_remarks_es', e.target.value)} className={inputCls + ' resize-none'} placeholder="Notas internas..." />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Private Notes (EN)' : 'Notas Privadas (EN)'}</label>
                    <textarea rows={3} value={form.private_remarks_en} onChange={e => set('private_remarks_en', e.target.value)} className={inputCls + ' resize-none'} placeholder="Internal notes..." />
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2: Marketing & Pricing ── */}
            {step === 2 && (
              <>
                <SectionTitle icon="💰" title={lang === 'en' ? 'Pricing & Commission' : 'Precio y Comisión'} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'List Price' : 'Precio de Lista'}</label>
                    <input type="number" value={form.list_price} onChange={e => set('list_price', e.target.value)} className={inputCls} placeholder="250000" />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Currency' : 'Moneda'}</label>
                    <select value={form.list_price_currency_id} onChange={e => setNum('list_price_currency_id', e.target.value)} className={inputCls}>
                      <option value={2}>USD ($)</option>
                      <option value={1}>CRC (₡)</option>
                    </select>
                  </div>
                  <div className="hidden md:block" />
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Listing Side Comm (%)' : 'Comisión Listing (%)'}</label>
                    <input type="number" step="0.5" value={form.listing_side_comm} onChange={e => setNum('listing_side_comm', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Selling Side Comm (%)' : 'Comisión Selling (%)'}</label>
                    <input type="number" step="0.5" value={form.selling_side_comm} onChange={e => setNum('selling_side_comm', e.target.value)} className={inputCls} />
                  </div>
                </div>

                <SectionTitle icon="📢" title={lang === 'en' ? 'Public Description' : 'Descripción Pública'} subtitle={lang === 'en' ? 'Visible on RECONNECT and portals' : 'Visible en RECONNECT y portales'} />
                <div className="mb-3 text-right">
                  <a href="https://gemini.google.com/gem/1AEmVQwvskiJS32T5KX9A4VoVZWqfhW-V?usp=sharing" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 rounded-lg transition-colors">
                    ✨ {lang === 'en' ? 'Write with Gemini AI' : 'Escribir con Gemini AI'}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Description (Spanish)' : 'Descripción (Español)'}</label>
                    <textarea rows={5} value={form.public_remarks_es} onChange={e => set('public_remarks_es', e.target.value)} className={inputCls + ' resize-none'} placeholder="Describa la propiedad..." />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Description (English)' : 'Descripción (Inglés)'}</label>
                    <textarea rows={5} value={form.public_remarks_en} onChange={e => set('public_remarks_en', e.target.value)} className={inputCls + ' resize-none'} placeholder="Describe the property..." />
                  </div>
                </div>

                <SectionTitle icon="🎬" title={lang === 'en' ? 'Video & Media' : 'Video y Medios'} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Video Link (YouTube)' : 'Link de Video (YouTube)'}</label>
                    <input value={form.video_link} onChange={e => set('video_link', e.target.value)} className={inputCls} placeholder="https://youtube.com/watch?v=..." />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Google Drive Link (Photos)' : 'Link de Google Drive (Fotos)'}</label>
                    <input value={form.drive_photos_folder_url} onChange={e => set('drive_photos_folder_url', e.target.value)} className={inputCls} placeholder="https://drive.google.com/drive/folders/..." />
                  </div>
                </div>

                {/* Photo section placeholder */}
                <SectionTitle icon="📸" title={lang === 'en' ? 'Photos' : 'Fotos'} subtitle={lang === 'en' ? 'Photos will be managed via Google Drive after saving' : 'Las fotos se gestionarán vía Google Drive después de guardar'} />
                <div className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-2xl p-8 text-center">
                  <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{lang === 'en' ? 'Paste your Drive folder link above. Once submitted, the system can sync them.' : 'Pega el enlace de la carpeta de Drive arriba. Una vez enviada, el sistema podrá sincronizarlas.'}</p>
                </div>
              </>
            )}

            {/* Navigation & Actions */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-dark-border">
              <div>
                {step > 0 && (
                  <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium text-gray-700 dark:text-white">
                    ← {lang === 'en' ? 'Back' : 'Anterior'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {step < 2 ? (
                  <button onClick={() => setStep(step + 1)} className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all">
                    {lang === 'en' ? 'Next' : 'Siguiente'} →
                  </button>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button onClick={() => handleSubmit('draft')} disabled={loading} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium text-gray-700 dark:text-white disabled:opacity-50">
                        {loading ? '...' : (lang === 'en' ? 'Draft' : 'Borrador')}
                      </button>
                      <button onClick={() => handleSubmit('paused')} disabled={loading} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium text-amber-600 dark:text-amber-500 disabled:opacity-50">
                        {loading ? '...' : (lang === 'en' ? 'Pause' : 'Pausar')}
                      </button>
                      <button onClick={() => handleSubmit('cancelled')} disabled={loading} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium text-red-600 dark:text-red-500 disabled:opacity-50">
                        {loading ? '...' : (lang === 'en' ? 'Cancel' : 'Cancelar')}
                      </button>
                    </div>
                    <button onClick={() => handleSubmit('pending_approval')} disabled={loading} className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50">
                      {loading ? '...' : (lang === 'en' ? 'Submit for Approval' : 'Enviar para Aprobación')}
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
          </>)}
        </div>
      </div>
    </>
  );
}

export default function NuevaPropiedad() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NuevaPropiedadContent />
    </Suspense>
  );
}
