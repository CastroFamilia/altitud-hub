"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/layout/TopNav';
import PropertyStatusBadge from '@/components/propiedades/PropertyStatusBadge';
import PropertyTimeline from '@/components/propiedades/PropertyTimeline';
import { PROPERTY_TYPES, formatPrice } from '@/components/propiedades/PropertyCard';
import SyndicationPanel from '@/components/propiedades/SyndicationPanel';
import CommissionCalculator from '@/components/propiedades/CommissionCalculator';
import SoldCongratsModal from '@/components/propiedades/SoldCongratsModal';
import Link from 'next/link';

const AMENITY_LABELS = {
  pool_private: { es: 'Piscina', en: 'Pool' },
  garage: { es: 'Garaje', en: 'Garage' },
  cooling: { es: 'A/C', en: 'A/C' },
  has_view: { es: 'Vista', en: 'View' },
  gated_community: { es: 'Condominio', en: 'Gated Community' },
  furnished: { es: 'Amueblado', en: 'Furnished' },
  maid_room: { es: 'Cuarto Servicio', en: 'Maid Room' },
  property_new: { es: 'Nuevo', en: 'New Construction' },
};

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-border last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="glass-panel rounded-2xl p-5 mb-4">
      <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, lang } = useApp();
  const { user, isBroker } = useAuth();
  const [property, setProperty] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [milestones, setMilestones] = useState(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [syncingPhotos, setSyncingPhotos] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [soldResult, setSoldResult] = useState(null);

  const fetchProperty = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(id, image_url, thumbnail_url, priority, drive_file_id)')
      .eq('id', id)
      .single();
    if (error) { console.error(error); setLoading(false); return; }
    setProperty(data);
    setImages((data.property_images || []).sort((a, b) => a.priority - b.priority));
    // Fetch milestones
    const { data: msData } = await supabase
      .from('listing_milestones')
      .select('*')
      .eq('property_id', id)
      .single();
    if (msData) setMilestones(msData);
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    fetchProperty();
  }, [id]);

  const updateStatus = async (newStatus, notes = null) => {
    setActionLoading(true);
    try {
      const updates = { status: newStatus };
      if (newStatus === 'pending_approval') updates.submitted_at = new Date().toISOString();
      if (notes !== undefined && notes !== null) updates.broker_notes = notes;
      const { error } = await supabase.from('properties').update(updates).eq('id', id);
      if (error) throw error;
      setProperty(p => ({ ...p, ...updates }));

      // Auto-update listing milestones
      const milestoneUpdate = { property_id: id, agent_id: user?.id };
      if (newStatus === 'pending_approval') milestoneUpdate.submitted_at = new Date().toISOString();
      if (newStatus === 'approved') milestoneUpdate.broker_approved_at = new Date().toISOString();
      if (newStatus === 'published') milestoneUpdate.published_at = new Date().toISOString();
      await supabase.from('listing_milestones').upsert(milestoneUpdate, { onConflict: 'property_id' });

      // Re-fetch milestones to update the timeline
      const { data: msData } = await supabase.from('listing_milestones').select('*').eq('property_id', id).single();
      if (msData) setMilestones(msData);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Create Drive photo folder
  const handleCreateFolder = async () => {
    if (!property) return;
    setCreatingFolder(true);
    try {
      const agentName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Agent';
      const agentEmail = user?.email || null;
      const propertyName = property.name || property.listing_title_es || `Propiedad-${id.slice(0, 8)}`;

      const res = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName, agentEmail, propertyName }),
      });
      const data = await res.json();
      if (data.success) {
        const { error } = await supabase.from('properties').update({
          drive_photos_folder_id: data.folderId,
          drive_photos_folder_url: data.folderUrl,
        }).eq('id', id);
        if (!error) {
          setProperty(p => ({
            ...p,
            drive_photos_folder_id: data.folderId,
            drive_photos_folder_url: data.folderUrl,
          }));
        }
      } else {
        alert('Error: ' + (data.error || 'Failed to create folder'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  // Sync photos from Drive
  const handleSyncPhotos = async () => {
    setSyncingPhotos(true);
    try {
      const res = await fetch('/api/properties/sync-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: id }),
      });
      const data = await res.json();
      if (data.success) {
        alert(lang === 'en'
          ? `Synced ${data.synced} new photos (${data.total_images} total)`
          : `Sincronizadas ${data.synced} fotos nuevas (${data.total_images} total)`
        );
        fetchProperty(); // Reload to show new images
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSyncingPhotos(false);
    }
  };

  // Delete image
  const handleDeleteImage = async (imageId) => {
    if (!confirm(lang === 'en' ? 'Delete this photo?' : '¿Eliminar esta foto?')) return;
    const { error } = await supabase.from('property_images').delete().eq('id', imageId);
    if (!error) {
      setImages(prev => prev.filter(i => i.id !== imageId));
    }
  };

  if (loading) return (
    <>
      <TopNav titleKey="nav_properties" subtitleKey="nav_portfolio" />
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  );

  if (!property) return (
    <>
      <TopNav titleKey="nav_properties" subtitleKey="nav_portfolio" />
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
        <div className="text-center">
          <p className="text-gray-500">{lang === 'en' ? 'Property not found' : 'Propiedad no encontrada'}</p>
          <Link href="/propiedades" className="text-brand-500 text-sm mt-2 inline-block">← {t('nav_properties')}</Link>
        </div>
      </div>
    </>
  );

  const p = property;
  const title = (lang === 'en' ? p.listing_title_en : p.listing_title_es) || p.name;
  const typeLabel = p.property_type_id ? (PROPERTY_TYPES[p.property_type_id]?.[lang] || p.property_type || '') : '';
  const amenities = Object.entries(AMENITY_LABELS).filter(([k]) => p[k]).map(([k, v]) => lang === 'en' ? v.en : v.es);
  const canEdit = p.status === 'draft' || p.status === 'needs_changes';

  // Days on market
  const daysOnMarket = p.submitted_at
    ? Math.floor((Date.now() - new Date(p.submitted_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <>
      <TopNav titleKey="nav_properties" subtitleKey="nav_portfolio" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-5xl w-full mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href="/propiedades" className="hover:text-brand-500 transition-colors">{t('nav_properties')}</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-800 dark:text-white font-medium truncate max-w-[200px]">{title}</span>
          </div>

          {/* Broker Notes Banner */}
          {p.status === 'needs_changes' && p.broker_notes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-4 flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{lang === 'en' ? 'Changes Requested by Broker' : 'Cambios Solicitados por el Broker'}</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{p.broker_notes}</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <PropertyStatusBadge status={p.status} lang={lang} size="lg" />
                {typeLabel && <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">{typeLabel}</span>}
                {daysOnMarket !== null && (
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                    {daysOnMarket} {lang === 'en' ? 'days' : 'días'}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              {p.unparsed_address && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                  {p.unparsed_address}
                </p>
              )}
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">
                {formatPrice(p.list_price, p.list_price_currency_id)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {canEdit && (
                <button onClick={() => router.push(`/propiedades/nueva?edit=${p.id}`)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 text-sm font-medium text-gray-700 dark:text-white transition-colors">
                  ✏️ {lang === 'en' ? 'Edit' : 'Editar'}
                </button>
              )}
              {canEdit && (
                <button onClick={() => updateStatus('pending_approval')} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50">
                  {lang === 'en' ? 'Submit for Approval' : 'Enviar para Aprobación'}
                </button>
              )}
              {p.status === 'approved' && (
                <span className="px-4 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-semibold border border-green-200 dark:border-green-800">
                  ✅ {lang === 'en' ? 'Approved — Ready to Publish' : 'Aprobada — Lista para Publicar'}
                </span>
              )}
              {(p.status === 'published' || p.status === 'approved') && p.status !== 'sold' && (
                <button
                  onClick={() => setShowSoldModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                >
                  🎉 {lang === 'en' ? 'Mark as Sold' : 'Marcar como Vendida'}
                </button>
              )}
              {p.status === 'sold' && (
                <span className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold border border-emerald-200 dark:border-emerald-800">
                  🏆 {lang === 'en' ? 'SOLD' : 'VENDIDA'} — {p.sold_price ? formatPrice(p.sold_price, p.list_price_currency_id) : ''}
                </span>
              )}
            </div>
          </div>

          {/* Property Timeline */}
          <PropertyTimeline milestones={milestones} t={t} lang={lang} />

          {/* Photo Gallery */}
          <div className="glass-panel rounded-2xl overflow-hidden mb-4">
            {images.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                  {images.slice(0, 8).map((img, i) => (
                    <div key={img.id} className={`relative group ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                      <img src={img.image_url} alt="" className="w-full h-full object-cover aspect-square" />
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {images.length > 8 && (
                  <p className="text-center py-2 text-xs text-gray-500">+{images.length - 8} {lang === 'en' ? 'more photos' : 'fotos más'}</p>
                )}
              </>
            ) : (
              <div className="p-8 text-center">
                <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{lang === 'en' ? 'No photos yet' : 'Aún no hay fotos'}</p>
              </div>
            )}

            {/* Photo actions bar */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-white/5">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                🖼️ {images.length} {lang === 'en' ? 'photos' : 'fotos'}
                {p.photos_ready && <span className="text-green-500 ml-2">✓ {lang === 'en' ? 'Ready' : 'Listas'}</span>}
              </p>
              <div className="flex items-center gap-2">
                {!p.drive_photos_folder_id ? (
                  <button
                    onClick={handleCreateFolder}
                    disabled={creatingFolder}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {creatingFolder ? (
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                    )}
                    {lang === 'en' ? 'Create Drive Folder' : 'Crear Carpeta Drive'}
                  </button>
                ) : (
                  <>
                    <a
                      href={p.drive_photos_folder_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7.71 3.5L1.15 15l4.58 7.5h13.54l4.58-7.5L17.29 3.5H7.71z" /></svg>
                      {lang === 'en' ? 'Open Drive' : 'Abrir Drive'}
                    </a>
                    <button
                      onClick={handleSyncPhotos}
                      disabled={syncingPhotos}
                      className="px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-semibold hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {syncingPhotos ? (
                        <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      )}
                      {lang === 'en' ? 'Sync Photos' : 'Sincronizar Fotos'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Description */}
              {(p.public_remarks_es || p.public_remarks_en) && (
                <SectionCard title={lang === 'en' ? 'Description' : 'Descripción'} icon="📝">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {lang === 'en' ? (p.public_remarks_en || p.public_remarks_es) : (p.public_remarks_es || p.public_remarks_en)}
                  </p>
                </SectionCard>
              )}

              {/* Details */}
              <SectionCard title={lang === 'en' ? 'Property Details' : 'Detalles'} icon="📐">
                <InfoRow label={lang === 'en' ? 'Bedrooms' : 'Habitaciones'} value={p.bedrooms_total} />
                <InfoRow label={lang === 'en' ? 'Full Bathrooms' : 'Baños Completos'} value={p.bathrooms_full} />
                <InfoRow label={lang === 'en' ? 'Half Bathrooms' : 'Medios Baños'} value={p.bathrooms_half} />
                <InfoRow label={lang === 'en' ? 'Floors' : 'Pisos'} value={p.stories} />
                <InfoRow label={lang === 'en' ? 'Lot Size' : 'Terreno'} value={p.lot_size_area ? `${Number(p.lot_size_area).toLocaleString()} m²` : null} />
                <InfoRow label={lang === 'en' ? 'Construction' : 'Construcción'} value={p.construction_size ? `${Number(p.construction_size).toLocaleString()} m²` : null} />
                <InfoRow label={lang === 'en' ? 'Year Built' : 'Año'} value={p.year_built} />
                <InfoRow label={lang === 'en' ? 'Garage Spaces' : 'Espacios Garaje'} value={p.garage ? p.garage_spaces : null} />
              </SectionCard>

              {/* Amenities */}
              {amenities.length > 0 && (
                <SectionCard title={lang === 'en' ? 'Amenities' : 'Amenidades'} icon="✨">
                  <div className="flex flex-wrap gap-2">
                    {amenities.map(a => (
                      <span key={a} className="px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-semibold">
                        ✓ {a}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Owner Info */}
              <SectionCard title={lang === 'en' ? 'Owner' : 'Propietario'} icon="👤">
                <InfoRow label={lang === 'en' ? 'Name' : 'Nombre'} value={p.owner_name} />
                <InfoRow label={lang === 'en' ? 'Phone' : 'Teléfono'} value={p.owner_phones} />
                <InfoRow label={lang === 'en' ? 'Email' : 'Email'} value={p.owner_email} />
                <InfoRow label={lang === 'en' ? 'Agreement' : 'Contrato'} value={p.listing_agreement ? '✅ Firmado' : '❌ Pendiente'} />
              </SectionCard>

              {/* Commission */}
              <SectionCard title={lang === 'en' ? 'Commission' : 'Comisión'} icon="💰">
                <InfoRow label="Listing Side" value={p.listing_side_comm ? `${p.listing_side_comm}%` : null} />
                <InfoRow label="Selling Side" value={p.selling_side_comm ? `${p.selling_side_comm}%` : null} />
                <InfoRow label="Total" value={(p.listing_side_comm && p.selling_side_comm) ? `${Number(p.listing_side_comm) + Number(p.selling_side_comm)}%` : null} />
              </SectionCard>

              {/* Syndication Panel */}
              <SectionCard title={lang === 'en' ? 'Portals' : 'Portales'} icon="🔗">
                <SyndicationPanel
                  propertyId={p.id}
                  propertyStatus={p.status}
                  onPublish={() => fetchProperty()}
                />
              </SectionCard>

              {/* Office */}
              <SectionCard title={lang === 'en' ? 'Office' : 'Oficina'} icon="🏢">
                <InfoRow label={lang === 'en' ? 'Office Code' : 'Código'} value={p.office_code} />
                <InfoRow label="RECONNECT ID" value={p.reconnect_listing_id} />
                <InfoRow label="Finca" value={p.finca_number} />
                <InfoRow label="Plano" value={p.plano_number} />
                {p.reconnect_last_sync && (
                  <InfoRow
                    label={lang === 'en' ? 'Last Sync' : 'Última Sync'}
                    value={new Date(p.reconnect_last_sync).toLocaleDateString()}
                  />
                )}
              </SectionCard>

              {/* Video */}
              {p.video_link && (
                <SectionCard title="Video" icon="🎬">
                  <a href={p.video_link} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-500 hover:underline break-all">
                    {p.video_link}
                  </a>
                </SectionCard>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ═══ MARK AS SOLD MODAL ═══ */}
      {showSoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSoldModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black italic text-slate-900 dark:text-white">
                  🎉 {lang === 'en' ? 'Record Sale' : 'Registrar Venta'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{title}</p>
              </div>
              <button onClick={() => setShowSoldModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <CommissionCalculator
              property={p}
              agentProfile={profile}
              onConfirm={(result) => {
                setShowSoldModal(false);
                setSoldResult(result);
                setShowCongratsModal(true);
                fetchProperty();
              }}
              onCancel={() => setShowSoldModal(false)}
            />
          </div>
        </div>
      )}

      {/* ═══ CONGRATS MODAL ═══ */}
      <SoldCongratsModal
        isOpen={showCongratsModal}
        onClose={() => {
          setShowCongratsModal(false);
          setSoldResult(null);
        }}
        propertyTitle={title}
        agentAmount={soldResult?.agentAmount}
        officeAmount={soldResult?.officeAmount}
        grossCommission={soldResult?.grossCommission}
        closingDate={soldResult?.closingDate}
        buyerName={soldResult?.buyerName}
        lang={lang}
      />
    </>
  );
}
