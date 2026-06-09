"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { getPropertyDetails, updateProperty, deletePropertyImage, getListingMilestone, upsertListingMilestone } from '@/lib/dal/properties';
import TopNav from '@/components/layout/TopNav';
import PropertyStatusBadge from '@/components/propiedades/PropertyStatusBadge';
import PropertyTimeline from '@/components/propiedades/PropertyTimeline';
import { PROPERTY_TYPES, formatPrice } from '@/components/propiedades/PropertyCard';
import SyndicationPanel from '@/components/propiedades/SyndicationPanel';
import PortalLinkManager from '@/components/propiedades/PortalLinkManager';
import CommissionCalculator from '@/components/propiedades/CommissionCalculator';
import SoldCongratsModal from '@/components/propiedades/SoldCongratsModal';
import ListingAnalyticsPanel from '@/components/propiedades/ListingAnalyticsPanel';
import PropertyInquiriesPanel from '@/components/propiedades/PropertyInquiriesPanel';
import Link from 'next/link';
import Image from 'next/image';
import WhatsAppSendButton from '@/components/propiedades/WhatsAppSendButton';
import QRCode from 'react-qr-code';

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

export default function PropertyDetailClient({ initialProperty, initialImages, initialMilestones }) {
  const { id } = useParams();
  const router = useRouter();
  const { t, lang } = useApp();
  const { user, isBroker } = useAuth();
  const [property, setProperty] = useState(initialProperty);
  const [images, setImages] = useState(initialImages || []);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [syncingPhotos, setSyncingPhotos] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [soldResult, setSoldResult] = useState(null);

  const [calendarUrl, setCalendarUrl] = useState('https://calendar.app.google/yYSUgBYr6Zv7Wrgn9');
  const [showWaPhotographerModal, setShowWaPhotographerModal] = useState(false);
  const [waPhotographerMsg, setWaPhotographerMsg] = useState('');
  const [copiedWaPhotographer, setCopiedWaPhotographer] = useState(false);
  const [copiedQrLink, setCopiedQrLink] = useState(false);

  useEffect(() => {
    async function loadOfficeSettings() {
      if (!property) return;
      try {
        const officeId = property.office_code?.toLowerCase()?.includes('cero') || property.office_code === 'R0700151' ? 'cero' : 'altitud';
        const { getOfficeSettings } = await import('@/lib/dal/office');
        const settings = await getOfficeSettings(officeId);
        if (settings?.photographer_calendar_url) {
          setCalendarUrl(settings.photographer_calendar_url);
        }
      } catch (err) {
        console.error("Failed to load photographer calendar settings:", err);
      }
    }
    loadOfficeSettings();
  }, [property]);

  const handleOpenWhatsAppPhotographerModal = () => {
    const propertyName = title || property?.name || 'Nueva Propiedad';
    const driveUrl = property?.drive_photos_folder_url || '';
    
    let template = lang === 'en' 
      ? t('auto_wa_photographer_msg_en') 
      : t('auto_wa_photographer_msg');
      
    if (!template) {
      template = lang === 'en'
        ? "Hello! I need to schedule photos for the property: *{name}*.\n\n📂 Google Drive folder to upload photos:\n{driveUrl}\n\n📅 Please schedule in your calendar:\n{calendarUrl}\n\nThank you!"
        : "¡Hola! Necesito agendar las fotos para la propiedad: *{name}*.\n\n📂 Carpeta de Google Drive para subir las fotos:\n{driveUrl}\n\n📅 Por favor agendar en tu calendario:\n{calendarUrl}\n\n¡Gracias!";
    }
    
    const driveUrlStr = driveUrl || (lang === 'en' ? '[Please create Drive folder first]' : '[Por favor crea la carpeta de Drive primero]');

    const filledMsg = template
      .replace('{name}', propertyName)
      .replace('{driveUrl}', driveUrlStr)
      .replace('{calendarUrl}', calendarUrl);
      
    setWaPhotographerMsg(filledMsg);
    setShowWaPhotographerModal(true);
  };

  const handleSendWhatsAppPhotographer = () => {
    const encoded = encodeURIComponent(waPhotographerMsg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
    
    try {
      upsertListingMilestone({
        property_id: id,
        agent_id: user?.id,
        photos_requested_at: new Date().toISOString(),
      }).then(() => {
        getListingMilestone(id).then(msData => {
          if (msData) setMilestones(msData);
        });
      });
    } catch (err) {
      console.error("Failed to update milestone", err);
    }
    setShowWaPhotographerModal(false);
  };

  const handleCopyWaPhotographer = async () => {
    try {
      await navigator.clipboard.writeText(waPhotographerMsg);
      setCopiedWaPhotographer(true);
      setTimeout(() => setCopiedWaPhotographer(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProperty = async () => {
    try {
      const data = await getPropertyDetails(id);
      setProperty(data);
      setImages((data.property_images || []).sort((a, b) => a.priority - b.priority));
      // Fetch milestones
      const msData = await getListingMilestone(id);
      if (msData) setMilestones(msData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Removed initial fetch useEffect, keep fetchProperty for refreshing data

  const updateStatus = async (newStatus, notes = null) => {
    setActionLoading(true);
    try {
      const updates = { status: newStatus };
      if (newStatus === 'pending_approval') updates.submitted_at = new Date().toISOString();
      if (notes !== undefined && notes !== null) updates.broker_notes = notes;
      await updateProperty(id, updates);
      setProperty(p => ({ ...p, ...updates }));

      // Auto-update listing milestones
      const milestoneUpdate = { property_id: id, agent_id: user?.id };
      if (newStatus === 'pending_approval') milestoneUpdate.submitted_at = new Date().toISOString();
      if (newStatus === 'approved') milestoneUpdate.broker_approved_at = new Date().toISOString();
      if (newStatus === 'published') milestoneUpdate.published_at = new Date().toISOString();
      await upsertListingMilestone(milestoneUpdate);

      // Re-fetch milestones to update the timeline
      const msData = await getListingMilestone(id);
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
        try {
          await updateProperty(id, {
            drive_photos_folder_id: data.folderId,
            drive_photos_folder_url: data.folderUrl,
          });
          setProperty(p => ({
            ...p,
            drive_photos_folder_id: data.folderId,
            drive_photos_folder_url: data.folderUrl,
          }));
        } catch (updateErr) {
          console.error(updateErr);
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

  // Schedule Photographer
  const handleSchedulePhotographer = async () => {
    try {
      await upsertListingMilestone({
        property_id: id,
        agent_id: user?.id,
        photos_requested_at: new Date().toISOString(),
      });
      const msData = await getListingMilestone(id);
      if (msData) setMilestones(msData);
    } catch (err) {
      console.error("Failed to update milestone", err);
    }
    window.open(calendarUrl, "_blank");
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
        alert(t('pd_synced_msg').replace('{synced}', data.synced).replace('{total}', data.total_images));
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

  const handleDeleteImage = async (imageId) => {
    if (!confirm(t('pd_delete_photo'))) return;
    try {
      await deletePropertyImage(imageId);
      setImages(prev => prev.filter(i => i.id !== imageId));
    } catch (err) {
      alert('Error deleting image: ' + err.message);
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
          <p className="text-gray-500">{t('pd_not_found')}</p>
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
    // eslint-disable-next-line react-hooks/purity
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
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{t('pd_broker_changes')}</p>
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
                    {daysOnMarket} {t('pd_days')}
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
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {/* WhatsApp Quick-Send */}
              <WhatsAppSendButton
                property={p}
                contactPhone={p.owner_phones || ''}
                contactName={p.owner_name || ''}
                variant="detail"
                lang={lang}
              />
              {canEdit && (
                <button onClick={() => router.push(`/propiedades/nueva?edit=${p.id}`)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 text-sm font-medium text-gray-700 dark:text-white transition-colors">
                  ✏️ {t('pd_edit')}
                </button>
              )}
              {canEdit && (
                <button onClick={() => updateStatus('pending_approval')} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50">
                  {t('pd_submit_approval')}
                </button>
              )}
              {p.status === 'approved' && (
                <span className="px-4 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-semibold border border-green-200 dark:border-green-800">
                  ✅ {t('pd_approved_ready')}
                </span>
              )}
              {p.status === 'published' && p.slug && (
                <a
                  href={`https://www.remax-altitud.cr/${lang === 'es' ? 'es/propiedad' : 'en/property'}/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
                  title="Ver en la Web Pública"
                >
                  🌐 {t('pd_view_website') || 'Ver en Web'}
                </a>
              )}
              {(p.status === 'published' || p.status === 'approved') && p.status !== 'sold' && (
                <button
                  onClick={() => setShowSoldModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                >
                  🎉 {t('pd_mark_sold')}
                </button>
              )}
              {p.status === 'sold' && (
                <span className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold border border-emerald-200 dark:border-emerald-800">
                  🏆 {t('pd_sold_label')} — {p.sold_price ? formatPrice(p.sold_price, p.list_price_currency_id) : ''}
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
                      <Image src={img.image_url} alt="" className="w-full h-full object-cover aspect-square" fill />
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
                  <p className="text-center py-2 text-xs text-gray-500">+{images.length - 8} {t('pd_more_photos')}</p>
                )}
              </>
            ) : (
              <div className="p-8 text-center">
                <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('pd_no_photos')}</p>
              </div>
            )}

            {/* Photo actions bar */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-white/5">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                🖼️ {images.length} {t('pd_photos')}
                {p.photos_ready && <span className="text-green-500 ml-2">✓ {t('pd_photos_ready')}</span>}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSchedulePhotographer}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-1.5"
                >
                  🗓️ {t('pd_schedule_photographer') || 'Schedule'}
                </button>
                <button
                  onClick={handleOpenWhatsAppPhotographerModal}
                  className="px-3 py-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] text-xs font-semibold hover:bg-[#25D366] hover:text-white transition-all flex items-center gap-1.5"
                >
                  💬 {t('pd_send_whatsapp_photographer') || 'Coordinate'}
                </button>
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
                    {t('pd_create_drive')}
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
                      {t('pd_open_drive')}
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
                      {t('pd_sync_photos')}
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
                <SectionCard title={t('pd_section_description')} icon="📝">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {lang === 'en' ? (p.public_remarks_en || p.public_remarks_es) : (p.public_remarks_es || p.public_remarks_en)}
                  </p>
                </SectionCard>
              )}

              {/* Details */}
              <SectionCard title={t('pd_section_details')} icon="📐">
                <InfoRow label={t('pd_bedrooms')} value={p.bedrooms_total} />
                <InfoRow label={t('pd_bathrooms_full')} value={p.bathrooms_full} />
                <InfoRow label={t('pd_bathrooms_half')} value={p.bathrooms_half} />
                <InfoRow label={t('pd_floors')} value={p.stories} />
                <InfoRow label={t('pd_lot_size')} value={p.lot_size_area ? `${Number(p.lot_size_area).toLocaleString()} m²` : null} />
                <InfoRow label={t('pd_construction')} value={p.construction_size ? `${Number(p.construction_size).toLocaleString()} m²` : null} />
                <InfoRow label={t('pd_year_built')} value={p.year_built} />
                <InfoRow label={t('pd_garage_spaces')} value={p.garage ? p.garage_spaces : null} />
              </SectionCard>

              {/* Amenities */}
              {amenities.length > 0 && (
                <SectionCard title={t('pd_section_amenities')} icon="✨">
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
              <SectionCard title={t('pd_section_owner')} icon="👤">
                <InfoRow label={t('pd_owner_name')} value={p.owner_name} />
                <InfoRow label={t('pd_owner_phone')} value={p.owner_phones} />
                <InfoRow label={t('pd_owner_email')} value={p.owner_email} />
                <InfoRow label={t('pd_agreement')} value={p.listing_agreement ? t('pd_agreement_signed') : t('pd_agreement_pending')} />
              </SectionCard>

              {/* Commission */}
              <SectionCard title={t('pd_section_commission')} icon="💰">
                <InfoRow label="Listing Side" value={p.listing_side_comm ? `${p.listing_side_comm}%` : null} />
                <InfoRow label="Selling Side" value={p.selling_side_comm ? `${p.selling_side_comm}%` : null} />
                <InfoRow label="Total" value={(p.listing_side_comm && p.selling_side_comm) ? `${Number(p.listing_side_comm) + Number(p.selling_side_comm)}%` : null} />
              </SectionCard>

              {/* Syndication Panel — Multi-Portal Dashboard */}
              <SectionCard title={t('pd_section_portals')} icon="🔗">
                <SyndicationPanel
                  propertyId={p.id}
                  propertyStatus={p.status}
                  onPublish={() => fetchProperty()}
                  agentId={user?.id}
                  agentName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                  propertyTitle={title}
                  office={p.office_code?.toLowerCase()?.includes('cero') ? 'cero' : 'altitud'}
                />
                {/* Broker-only: manage portal links */}
                {isBroker && (
                  <PortalLinkManager
                    propertyId={p.id}
                    onUpdate={() => fetchProperty()}
                  />
                )}
              </SectionCard>

              {/* Office */}
              <SectionCard title={t('pd_section_office')} icon="🏢">
                <InfoRow label={t('pd_office_code')} value={p.office_code} />
                <InfoRow label="RECONNECT ID" value={p.reconnect_listing_id} />
                <InfoRow label="Finca" value={p.finca_number} />
                <InfoRow label="Plano" value={p.plano_number} />
                {p.reconnect_last_sync && (
                  <InfoRow
                    label={t('pd_last_sync')}
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

              {/* Analytics */}
              <SectionCard title={t('pd_section_analytics')} icon="📊">
                <ListingAnalyticsPanel propertyId={p.id} />
              </SectionCard>

              {/* QR Tracking & Print */}
              {p.slug && (
                <SectionCard title="Print & QR Tracking" icon="🖨️">
                  <div className="flex flex-col items-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-dark-border">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 mb-4">
                      <QRCode 
                        value={`https://www.remax-altitud.cr/api/tracking/qr?propertyId=${p.id}&slug=${p.slug}&locale=${lang || 'en'}`} 
                        size={120} 
                        level="M" 
                      />
                    </div>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3">
                      This QR code links directly to the property and tracks scans in your analytics.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`https://www.remax-altitud.cr/api/tracking/qr?propertyId=${p.id}&slug=${p.slug}&locale=${lang || 'en'}`);
                          setCopiedQrLink(true);
                          setTimeout(() => setCopiedQrLink(false), 2000);
                        } catch (err) {
                          console.error('Failed to copy QR link', err);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                      {copiedQrLink ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          Copy Trackable Link
                        </>
                      )}
                    </button>
                  </div>
                </SectionCard>
              )}
            </div>
        </div>

          {/* ═══ PROPERTY INQUIRIES — Prominent Section ═══ */}
          <div className="mt-6 mb-2">
            <div className="p-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 shadow-xl shadow-blue-500/10">
              <div className="bg-white dark:bg-dark-panel rounded-[15px] p-5">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">📩</span> {t('auto_property_inquiries')}
                </h3>
                <PropertyInquiriesPanel propertyId={p.id} />
              </div>
            </div>
          </div>        </div>
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
                  🎉 {t('pd_record_sale')}
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

      {/* ═══ WHATSAPP PHOTOGRAPHER COORDINATION MODAL ═══ */}
      {showWaPhotographerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowWaPhotographerModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 md:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center shadow-md shadow-[#25D366]/30">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black italic text-slate-900 dark:text-white leading-tight">
                    {t('pd_photographer_coordination') || 'Coordinación del Fotógrafo'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">
                    {t('pd_send_whatsapp_photographer') || 'Enviar por WhatsApp'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowWaPhotographerModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                  🏢 {property?.office_code?.toLowerCase()?.includes('cero') || property?.office_code === 'R0700151' ? 'Altitud Cero' : 'REMAX Altitud'}
                </span>
                <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-200/55 dark:bg-white/10 px-2 py-0.5 rounded">
                  {lang === 'en' ? 'Photographer Session' : 'Sesión del Fotógrafo'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  {lang === 'en' ? 'Message Template' : 'Mensaje de WhatsApp'}
                </label>
                <textarea
                  rows={6}
                  value={waPhotographerMsg}
                  onChange={(e) => setWaPhotographerMsg(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 transition-colors leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyWaPhotographer}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-semibold transition-colors shrink-0"
              >
                {copiedWaPhotographer ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    {t('wa_copied') || '¡Copiado!'}
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    {t('wa_copy') || 'Copiar'}
                  </>
                )}
              </button>

              <button
                onClick={handleSendWhatsAppPhotographer}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-bold transition-all shadow-md shadow-[#25D366]/20"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                {t('wa_open') || 'Abrir en WhatsApp'}
              </button>
            </div>
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
