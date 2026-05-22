"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { updateContact } from '@/lib/dal/contacts';
import { insertPropertyInquiry, insertProperty, updateProperty } from '@/lib/dal/properties';
import { useAuth } from '@/lib/auth-context';
import TopNav from '@/components/layout/TopNav';
import Link from 'next/link';
import WhatsAppSendButton from '@/components/propiedades/WhatsAppSendButton';
import { supabase } from '@/lib/supabase';

export default function ContactProfileClient({ initialContact, initialProperties, initialAcms, initialInquiries, initialReservations = [] }) {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useApp();
  
  const [contact, setContact] = useState(initialContact);
  const [properties, setProperties] = useState(initialProperties || []);
  const [acms, setAcms] = useState(initialAcms || []);
  const [inquiries, setInquiries] = useState(initialInquiries || []);
  const [reservations, setReservations] = useState(initialReservations || []);
  const [loading, setLoading] = useState(false);
  const [updatingNewsletter, setUpdatingNewsletter] = useState(false);
  const [updatingDdItemId, setUpdatingDdItemId] = useState(null);

  // Update Due Diligence document status inline
  const updateDdItemStatus = async (reservationId, itemId, currentStatus) => {
    const statuses = ['pending', 'requested', 'in_progress', 'ready'];
    const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];
    
    setUpdatingDdItemId(itemId);
    try {
      const { error } = await supabase
        .from('due_diligence_items')
        .update({ 
          status: nextStatus,
          completed_date: nextStatus === 'ready' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', itemId);
        
      if (error) throw error;
      
      // Update local state
      setReservations(prev => prev.map(res => {
        if (res.id !== reservationId) return res;
        return {
          ...res,
          due_diligence_items: res.due_diligence_items.map(item => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              status: nextStatus,
              completed_date: nextStatus === 'ready' ? new Date().toISOString().split('T')[0] : null
            };
          })
        };
      }));
    } catch (err) {
      console.error('Error updating due diligence status:', err);
      alert('Error al actualizar el estado del documento: ' + err.message);
    } finally {
      setUpdatingDdItemId(null);
    }
  };

  // Request Broker Help inline
  const handleBrokerHelp = async (reservationId) => {
    const note = prompt(t('neg_broker_help_note') || 'Describe en qué necesitas ayuda del Broker:');
    if (note === null) return;
    
    try {
      const { error } = await supabase
        .from('office_reservations')
        .update({
          broker_help_requested: true,
          broker_help_note: note,
          broker_help_date: new Date().toISOString()
        })
        .eq('id', reservationId);
        
      if (error) throw error;
      
      // Update local state
      setReservations(prev => prev.map(res => {
        if (res.id !== reservationId) return res;
        return {
          ...res,
          broker_help_requested: true,
          broker_help_note: note,
          broker_help_date: new Date().toISOString()
        };
      }));
      alert(t('neg_broker_help_sent') || 'Ayuda solicitada con éxito.');
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
    }
  };

  // Inquiry Modal State
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ remax_property_id: '', notes: '' });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  // Property Modal State
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propertyForm, setPropertyForm] = useState({ name: '', property_type: 'Lote' });
  const [submittingProperty, setSubmittingProperty] = useState(false);
  const [syncingPropertyId, setSyncingPropertyId] = useState(null);

  // Olympia State
  const [olympiaSuggestion, setOlympiaSuggestion] = useState('');
  const [loadingOlympia, setLoadingOlympia] = useState(false);

  // Olympia Data Dump State
  const [showDumpModal, setShowDumpModal] = useState(false);
  const [dumpText, setDumpText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // removed useEffect fetchContactData

  const handleNewsletterToggle = async (newValue) => {
    if (updatingNewsletter) return;
    setUpdatingNewsletter(true);
    try {
      const updatedContact = await updateContact(contact.id, { newsletter_opt_in: newValue });
      setContact(updatedContact);
    } catch (err) {
      console.error('Error updating newsletter opt-in:', err);
      alert('Error al actualizar preferencia de newsletter.');
    } finally {
      setUpdatingNewsletter(false);
    }
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!inquiryForm.remax_property_id) return;
    
    setSubmittingInquiry(true);
    try {
      const data = await insertPropertyInquiry({
        contact_id: contact?.id,
        remax_property_id: inquiryForm.remax_property_id,
        notes: inquiryForm.notes,
        status: 'new'
      });
      
      setInquiries([data, ...inquiries]);
      setShowInquiryModal(false);
      setInquiryForm({ remax_property_id: '', notes: '' });
    } catch (err) {
      console.error(err);
      alert(t('contact_prof_err_inquiry'));
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    if (!propertyForm.name) return;
    
    setSubmittingProperty(true);
    try {
      const driveRes = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: profile?.full_name || profile?.email?.split('@')[0] || 'Agente Local',
          propertyName: propertyForm.name
        })
      });
      const driveData = await driveRes.json();
      if (!driveRes.ok) throw new Error(driveData.error || t('contact_prof_err_drive'));

      const data = await insertProperty({
        agent_id: profile?.id || null,
        contact_id: contact?.id,
        name: propertyForm.name,
        property_type: propertyForm.property_type,
        drive_folder_id: driveData.folderId,
        drive_folder_url: driveData.folderUrl
      });
      
      setProperties([data, ...properties]);
      setShowPropertyModal(false);
      setPropertyForm({ name: '', property_type: 'Lote' });
    } catch (err) {
      console.error(err);
      alert(t('contact_prof_err_assign') + err.message);
    } finally {
      setSubmittingProperty(false);
    }
  };

  const handleSyncProperty = async (property) => {
    if (!property.drive_folder_id) return;
    setSyncingPropertyId(property.id);
    
    try {
      const readRes = await fetch('/api/drive/read-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: property.drive_folder_id })
      });
      const readData = await readRes.json();
      if (!readData.success || !readData.files || readData.files.length === 0) {
        throw new Error(t('contact_prof_err_no_pdf'));
      }
      
      const fileId = readData.files[0].id;

      const extractRes = await fetch('/api/olympia/extract-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      });
      const extractData = await extractRes.json();
      if (!extractData.success) {
        throw new Error(extractData.error || t('contact_prof_err_extract'));
      }
      
      const { size_sqm, finca_number, plano_number } = extractData.data;

      const updatedProp = await updateProperty(property.id, {
        size_sqm: size_sqm !== null ? size_sqm : property.size_sqm,
        finca_number: finca_number || property.finca_number,
        plano_number: plano_number || property.plano_number
      });
      
      setProperties(properties.map(p => p.id === updatedProp.id ? updatedProp : p));
      alert(t('contact_prof_msg_olympia_prop'));
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setSyncingPropertyId(null);
    }
  };

  const askOlympia = async () => {
    if (!contact) return;
    setLoadingOlympia(true);
    try {
      const response = await fetch('/api/olympia/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, acms, inquiries })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setOlympiaSuggestion(data.suggestion);
    } catch (err) {
      console.error(err);
      alert(t('contact_prof_err_olympia') + err.message);
    } finally {
      setLoadingOlympia(false);
    }
  };

  const handleExtract = async () => {
    if (!dumpText.trim() || !contact) return;
    setIsExtracting(true);
    
    try {
      const response = await fetch('/api/olympia/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: dumpText, currentNotes: contact.notes })
      });
      
      const extractedData = await response.json();
      if (extractedData.error) throw new Error(extractedData.error);
      
      // Update Supabase
      const updates = {
        notes: extractedData.new_notes || contact.notes
      };
      if (extractedData.social_instagram) updates.social_instagram = extractedData.social_instagram;
      if (extractedData.social_linkedin) updates.social_linkedin = extractedData.social_linkedin;

      const updatedContact = await updateContact(contact.id, updates);
      
      setContact(updatedContact);
      setShowDumpModal(false);
      setDumpText('');
      alert(t('contact_prof_msg_olympia_prof'));
    } catch (err) {
      console.error(err);
      alert(t('contact_prof_err_extract_prof') + err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">{t('contact_prof_loading')}</div>;
  }

  if (!contact) {
    return (
      <div className="p-8 text-center flex flex-col items-center">
        <h2 className="text-xl font-semibold mb-4">{t('contact_prof_not_found')}</h2>
        <button onClick={() => router.push('/contactos')} className="text-brand-500 hover:underline">{t('contact_prof_back')}</button>
      </div>
    );
  }

  return (
    <>
      <TopNav title={contact ? `${contact.first_name} ${contact.last_name}` : t('contact_prof_not_found')} subtitleKey="nav_crm" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-6xl w-full mx-auto">
        
        {/* Header / Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/contactos" className="hover:text-brand-500 transition-colors">{t('nav_crm')}</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          <span className="text-gray-800 dark:text-white font-medium">{contact.first_name} {contact.last_name}</span>
        </div>

        {/* Profile Card */}
        <div className="glass-panel p-6 md:p-8 mb-8 flex flex-col md:flex-row gap-6 items-start relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="flex-shrink-0 w-24 h-24 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-brand-500/30">
            {contact.first_name[0]}{contact.last_name ? contact.last_name[0] : ''}
          </div>
          
          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{contact.first_name} {contact.last_name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  {contact.email && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      <a href={`mailto:${contact.email}`} className="hover:text-brand-500">{contact.email}</a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                      <a href={`tel:${contact.phone}`} className="hover:text-brand-500">{contact.phone}</a>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {Array.isArray(contact.type) ? contact.type.map(t => (
                  <span key={t} className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {t}
                  </span>
                )) : (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {contact.type || t('contact_prof_undef')}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Residencia: {contact.market || 'Local'}
                </span>
                {contact.primary_language && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                    🗣️ {contact.primary_language}
                    {contact.secondary_language && contact.secondary_language !== 'Ninguno' ? ` / ${contact.secondary_language}` : ''}
                    {contact.tertiary_language && contact.tertiary_language !== 'Ninguno' ? ` / ${contact.tertiary_language}` : ''}
                    {contact.favorite_language && contact.favorite_language !== 'Ninguno' ? ` (Fav: ${contact.favorite_language})` : ''}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {t('contact_th_class')} {contact.contact_classification || 'B'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {t('contact_prof_origin')} {contact.lead_origin || 'Manual'}
                  {contact.origin_details && ` (${contact.origin_details})`}
                  {contact.referred_by_name && ` por ${contact.referred_by_name}`}
                </span>
              </div>
              
              {/* Newsletter Opt-In Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-dark-border">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contact_newsletter_title')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* NO button */}
                  <button
                    id={`newsletter-no-${contact.id}`}
                    onClick={() => handleNewsletterToggle(false)}
                    disabled={updatingNewsletter}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      !contact.newsletter_opt_in
                        ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20'
                        : 'bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:border-red-300 hover:text-red-500'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {updatingNewsletter && !contact.newsletter_opt_in ? (
                      <span className="flex items-center gap-1"><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>No</span>
                    ) : 'No'}
                  </button>
                  {/* YES button */}
                  <button
                    id={`newsletter-yes-${contact.id}`}
                    onClick={() => handleNewsletterToggle(true)}
                    disabled={updatingNewsletter}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      contact.newsletter_opt_in
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:border-emerald-300 hover:text-emerald-600'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {updatingNewsletter && contact.newsletter_opt_in ? (
                      <span className="flex items-center gap-1"><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Sí</span>
                    ) : 'Sí'}
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {contact.phone && (
                  <a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    WhatsApp
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-xl transition-colors shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    Email
                  </a>
                )}
                {contact.social_instagram && (
                  <a href={`https://instagram.com/${contact.social_instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] hover:opacity-90 text-white text-sm font-bold rounded-xl transition-opacity shadow-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    Instagram
                  </a>
                )}
                {contact.social_linkedin && (
                  <a href={`https://linkedin.com/in/${contact.social_linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#0077B5] hover:bg-[#005E93] text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                )}
                {(!contact.social_instagram || !contact.social_linkedin) && (
                  <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors">
                    {t('contact_prof_add_social')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* DASHBOARD CONTENT - ALL VISIBLE */}
        <div className="space-y-8 mb-12">
          
          {/* OLYMPIA PROSPECTING PANEL */}
          <div className="glass-panel p-1 rounded-2xl bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 shadow-xl shadow-brand-500/10">
            <div className="bg-white dark:bg-dark-panel p-6 rounded-xl h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-400">{t('contact_prof_olympia_title')}</h3>
                    <p className="text-xs text-gray-500">{t('contact_prof_olympia_desc')}</p>
                  </div>
                </div>
                {!olympiaSuggestion && (
                  <button 
                    onClick={askOlympia}
                    disabled={loadingOlympia}
                    className="px-4 py-2 bg-gradient-to-r from-brand-500 to-purple-600 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loadingOlympia ? t('contact_prof_olympia_loading') : t('contact_prof_olympia_btn')}
                  </button>
                )}
              </div>

              {olympiaSuggestion && (
                <div className="mt-4 p-5 rounded-xl bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/30 prose prose-sm dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: olympiaSuggestion.replace(/\n/g, '<br />') }} />
                  <div className="mt-4 pt-4 border-t border-brand-200/50 dark:border-brand-800/50 text-right">
                    <button 
                      onClick={askOlympia}
                      disabled={loadingOlympia}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400"
                    >
                      {loadingOlympia ? t('contact_prof_olympia_loading') : t('contact_prof_olympia_regen')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 1: GENERAL (Datos & Relaciones) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* OLYMPIA DATA DUMP MODAL */}
              {showDumpModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-dark-panel rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <span className="text-2xl">🧠</span> {t('contact_prof_dump_title')}
                      </h3>
                      <button onClick={() => setShowDumpModal(false)} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">{t('contact_prof_dump_desc')}</p>
                    
                    <textarea 
                      rows="8"
                      value={dumpText}
                      onChange={(e) => setDumpText(e.target.value)}
                      placeholder="Ej. Hola Alejandra, mi esposa y yo estamos buscando algo en Escazú por $400k. Mi instagram es @juanperez..."
                      className="w-full p-4 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-purple-500 outline-none resize-none mb-4 text-sm"
                    />
                    
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowDumpModal(false)} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">{t('contact_prof_dump_cancel')}</button>
                      <button 
                        onClick={handleExtract}
                        disabled={isExtracting || !dumpText.trim()}
                        className="px-6 py-2 bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isExtracting ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            {t('contact_prof_dump_processing')}
                          </>
                        ) : t('contact_prof_dump_analyze')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="glass-panel p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('contact_prof_notes_title')}</h3>
                  <button 
                    onClick={() => setShowDumpModal(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-purple-500 px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    {t('contact_prof_notes_sync')}
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 flex-1 text-sm text-gray-700 dark:text-gray-300 overflow-y-auto max-h-[300px] prose prose-sm dark:prose-invert">
                  {contact.notes ? <div dangerouslySetInnerHTML={{ __html: contact.notes.replace(/\n/g, '<br />') }} /> : <span className="text-gray-400 italic">{t('contact_prof_notes_empty')}</span>}
                </div>
              </div>
              
              <div className="glass-panel p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('contact_prof_rel_title')}</h3>
                  <button className="text-sm text-brand-500 hover:underline">{t('contact_prof_rel_add')}</button>
                </div>
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  </div>
                  {t('contact_prof_rel_empty')}
                </div>
              </div>
            </div>

          {/* PROPERTY MODAL OVERLAY */}
          {showPropertyModal && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-dark-panel rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                    {t('contact_prof_assign_prop')}
                  </h3>
                  <button onClick={() => setShowPropertyModal(false)} className="text-gray-500 hover:text-gray-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <form onSubmit={handlePropertySubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_prof_prop_name')}</label>
                    <input 
                      required
                      type="text" 
                      value={propertyForm.name}
                      onChange={(e) => setPropertyForm({...propertyForm, name: e.target.value})}
                      placeholder={t('contact_prof_prop_name_desc')} 
                      className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none" 
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_prof_prop_type')}</label>
                    <select 
                      value={propertyForm.property_type}
                      onChange={(e) => setPropertyForm({...propertyForm, property_type: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                      <option value="Lote">Lote</option>
                      <option value="Casa">Casa</option>
                      <option value="Apartamento">Apartamento</option>
                      <option value="Comercial">Comercial</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowPropertyModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                      {t('contact_prof_btn_cancel')}
                    </button>
                    <button 
                      type="submit" 
                      disabled={submittingProperty}
                      className="px-6 py-2 text-sm font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
                    >
                      {submittingProperty ? t('contact_prof_btn_creating') : t('contact_prof_btn_assign')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SECTION 1.5: PROPIEDADES ASIGNADAS */}
          <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('contact_prof_props_title')}</h3>
                  <p className="text-xs text-gray-500">{t('contact_prof_props_desc')}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPropertyModal(true)}
                className="text-sm bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 px-3 py-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors shadow-sm"
              >
                {t('contact_prof_props_add')}
              </button>
            </div>
            
            {properties.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-dark-bg rounded-xl border border-dashed border-gray-200 dark:border-dark-border">
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('contact_prof_props_empty')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {properties.map(prop => (
                  <div key={prop.id} className="border border-gray-200 dark:border-dark-border rounded-xl p-5 bg-white dark:bg-white/5 relative flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg">{prop.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300">
                          {prop.property_type}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4 mt-3">
                        <div className="bg-gray-50 dark:bg-dark-bg p-2 rounded-lg">
                          <span className="block text-xs text-gray-400">{t('contact_prof_area')}</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{prop.size_sqm ? `${prop.size_sqm} m²` : '--'}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-dark-bg p-2 rounded-lg">
                          <span className="block text-xs text-gray-400">{t('contact_prof_finca')}</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{prop.finca_number || '--'}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-dark-bg p-2 rounded-lg col-span-2">
                          <span className="block text-xs text-gray-400">{t('contact_prof_plano')}</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{prop.plano_number || '--'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 pt-4 mt-2">
                      <div className="flex gap-2">
                        {prop.drive_folder_url && (
                          <a 
                            href={prop.drive_folder_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded"
                          >
                            {t('contact_prof_open_drive')}
                          </a>
                        )}
                        {/* WhatsApp Quick-Send for this property */}
                        <WhatsAppSendButton
                          property={prop}
                          contactPhone={contact?.phone || ''}
                          contactName={`${contact?.first_name || ''} ${contact?.last_name || ''}`.trim()}
                          variant="detail"
                          lang="es"
                        />
                      </div>
                      <button 
                        onClick={() => handleSyncProperty(prop)}
                        disabled={syncingPropertyId === prop.id}
                        className="text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-purple-600 hover:shadow-md transition-all px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
                      >
                        {syncingPropertyId === prop.id ? t('contact_prof_syncing') : t('contact_prof_extract')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: ACMS & PRELISTINGS (Vendedor) */}
          <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('contact_prof_acm_title')}</h3>
                  <p className="text-xs text-gray-500">{t('contact_prof_acm_desc')}</p>
                </div>
              </div>
              <Link href="/" className="text-sm bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 px-3 py-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors shadow-sm">
                {t('contact_prof_acm_new')}
              </Link>
            </div>
            
            {acms.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-dark-bg rounded-xl border border-dashed border-gray-200 dark:border-dark-border">
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('contact_prof_acm_empty')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {acms.map(acm => (
                  <div key={acm.id} className="border border-gray-200 dark:border-dark-border rounded-xl p-4 hover:shadow-md transition-shadow bg-white dark:bg-white/5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-1" title={acm.property_address}>{acm.property_address || 'Sin Dirección'}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${acm.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {acm.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">Creado: {new Date(acm.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 pt-3 mt-2">
                      <div className="text-sm">
                        <span className="text-gray-500">{t('contact_prof_acm_suggested')} </span>
                        <span className="font-bold text-gray-900 dark:text-white">${acm.suggested_price?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <button className="text-xs font-medium text-brand-600 hover:text-brand-800">{t('contact_prof_acm_view')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: INQUIRIES (Comprador) */}
          <div className="glass-panel p-6 relative">
              
              {/* Inquiry Modal Overlay */}
              {showInquiryModal && (
                <div className="absolute inset-0 bg-white/95 dark:bg-dark-panel/95 backdrop-blur-sm z-10 p-6 rounded-2xl border border-gray-200 dark:border-dark-border flex flex-col justify-center">
                  <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t('contact_prof_inq_modal_title')}</h3>
                  <form onSubmit={handleInquirySubmit}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_prof_inq_modal_id')}</label>
                      <input 
                        required
                        type="text" 
                        value={inquiryForm.remax_property_id}
                        onChange={(e) => setInquiryForm({...inquiryForm, remax_property_id: e.target.value})}
                        placeholder="Ej. 102434053-12" 
                        className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none" 
                      />
                      <p className="text-xs text-gray-500 mt-1">{t('contact_prof_inq_modal_id_desc')}</p>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact_prof_inq_modal_notes')}</label>
                      <textarea 
                        rows="3"
                        value={inquiryForm.notes}
                        onChange={(e) => setInquiryForm({...inquiryForm, notes: e.target.value})}
                        placeholder="" 
                        className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl bg-slate-50 dark:bg-dark-bg focus:ring-2 focus:ring-brand-500 outline-none resize-none" 
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button 
                        type="button" 
                        onClick={() => setShowInquiryModal(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                      >
                        {t('contact_new_cancel')}
                      </button>
                      <button 
                        type="submit" 
                        disabled={submittingInquiry}
                        className="px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
                      >
                        {submittingInquiry ? t('contact_prof_inq_modal_saving') : t('contact_prof_inq_modal_save')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('contact_prof_inq_title')}</h3>
                    <p className="text-xs text-gray-500">{t('contact_prof_inq_desc')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowInquiryModal(true)}
                  className="text-sm bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 px-3 py-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors shadow-sm"
                >
                  {t('contact_prof_inq_new')}
                </button>
              </div>
              
              {inquiries.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                  <p className="text-gray-500 dark:text-gray-400">{t('contact_prof_inq_empty')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {inquiries.map(inquiry => (
                    <div key={inquiry.id} className="border border-gray-100 dark:border-dark-border rounded-xl p-4 hover:shadow-md transition-shadow bg-white dark:bg-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">{t('contact_prof_inq_id')} {inquiry.remax_property_id}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                              {inquiry.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mb-2">{t('contact_prof_inq_date')} {new Date(inquiry.inquiry_date).toLocaleDateString()}</p>
                          {inquiry.notes && <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 bg-slate-50 dark:bg-black/20 p-2 rounded">{inquiry.notes}</p>}
                        </div>
                        <a 
                          href={`https://global.remax.com/es/propiedades/?id=${inquiry.remax_property_id}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-sm text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
                        >
                          {t('contact_prof_inq_view')} <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          {/* SECTION 4: TRANSACCIONES Y PIPELINE (Negocio Hub) */}
          <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('neg_title') || 'Mi Negocio'}</h3>
                  <p className="text-xs text-gray-500">{t('neg_subtitle') || 'Administra tus reservas, negociaciones y due diligence'}</p>
                </div>
              </div>
              
              <Link 
                href="/negocio" 
                className="text-sm bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 px-3 py-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors shadow-sm font-bold"
              >
                {t('neg_title') || 'Ir a Negocio'} →
              </Link>
            </div>

            {reservations.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-dark-bg rounded-xl border border-dashed border-gray-200 dark:border-dark-border">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Este contacto no tiene transacciones o reservas vinculadas en el pipeline.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reservations.map(res => {
                  const ddItems = res.due_diligence_items || [];
                  const readyItems = ddItems.filter(i => i.status === 'ready').length;
                  const totalItems = ddItems.length;
                  const progressPct = totalItems > 0 ? Math.round((readyItems / totalItems) * 100) : 0;

                  return (
                    <div key={res.id} className="border border-gray-200 dark:border-dark-border rounded-2xl p-6 bg-white dark:bg-white/5 relative hover:shadow-md transition-shadow">
                      
                      {/* Top Meta info */}
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 pb-4 border-b border-gray-100 dark:border-white/5 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg">{res.property_address || t('neg_no_address')}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-300">
                              {res.type}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              res.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                              res.status === 'signed' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                              res.status === 'closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                              'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                            }`}>
                              {res.status === 'pending' ? t('res_status_pending') :
                               res.status === 'signed' ? t('res_status_signed') :
                               res.status === 'closed' ? t('res_status_closed') : t('res_status_fallen')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-2">
                            <span>Lado: <span className="font-semibold text-gray-700 dark:text-gray-300">{res.side === 'listing' ? t('neg_side_listing') : res.side === 'buying' ? t('neg_side_buying') : t('neg_side_both')}</span></span>
                            <span>•</span>
                            <span>Creado: <span className="font-semibold text-gray-700 dark:text-gray-300">{new Date(res.created_at).toLocaleDateString()}</span></span>
                          </p>
                        </div>
                        
                        {/* Financial Metrics */}
                        <div className="flex gap-4 self-start lg:self-auto flex-wrap">
                          <div className="bg-slate-50 dark:bg-dark-bg px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5">
                            <span className="block text-[10px] text-gray-400 font-semibold uppercase">{t('neg_sale_price') || 'Precio de Venta'}</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">${Number(res.sale_price || 0).toLocaleString()}</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-dark-bg px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5">
                            <span className="block text-[10px] text-gray-400 font-semibold uppercase">{t('res_amount') || 'Reserva'}</span>
                            <span className="font-bold text-brand-600 dark:text-brand-400 text-sm">${Number(res.reservation_amount || 0).toLocaleString()}</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-dark-bg px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5">
                            <span className="block text-[10px] text-gray-400 font-semibold uppercase">{t('neg_close_date') || 'Cierre'}</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{res.expected_sign_date ? new Date(res.expected_sign_date).toLocaleDateString() : '--'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Broker Oversight alert box */}
                      {res.broker_help_requested && (
                        <div className="mb-5 p-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 text-red-800 dark:text-red-300 relative overflow-hidden flex items-start gap-3">
                          <span className="text-xl mt-0.5 shrink-0">🚨</span>
                          <div className="flex-1 text-sm">
                            <div className="font-bold uppercase tracking-wider text-xs mb-1">Ayuda del Broker Solicitada</div>
                            <p className="italic text-gray-600 dark:text-gray-400">&quot;{res.broker_help_note || 'Sin nota específica.'}&quot;</p>
                            {res.broker_help_date && (
                              <span className="block text-[10px] text-red-500/80 dark:text-red-400/80 mt-2 font-medium">Solicitado el {new Date(res.broker_help_date).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Due Diligence section */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            📑 {t('neg_dd_title') || 'Due Diligence'} <span className="text-xs text-gray-400 font-normal">({t('neg_dd_progress_label') || 'documentos listos'} {readyItems} de {totalItems})</span>
                          </span>
                          <span className="text-sm font-black text-brand-600 dark:text-brand-400">{progressPct}%</span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-4">
                          <div 
                            className="h-full bg-brand-500 transition-all duration-500 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          ></div>
                        </div>

                        {/* Due Diligence Document Checklist */}
                        {totalItems === 0 ? (
                          <div className="text-center py-4 bg-slate-50 dark:bg-dark-bg rounded-xl text-gray-500 italic text-xs">
                            No hay checklist de Due Diligence definido para esta transacción.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                            {ddItems.map(item => {
                              const isUpdating = updatingDdItemId === item.id;
                              return (
                                <div key={item.id} className="flex items-start md:items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/10 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex-col md:flex-row gap-3">
                                  <div className="flex items-start gap-3">
                                    <button
                                      onClick={() => updateDdItemStatus(res.id, item.id, item.status)}
                                      disabled={isUpdating}
                                      className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                        item.status === 'ready' 
                                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                                          : item.status === 'in_progress' 
                                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-500' 
                                          : item.status === 'requested'
                                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-500'
                                          : 'border-slate-300 dark:border-slate-600 hover:border-brand-400'
                                      }`}
                                      title="Haz clic para cambiar estado"
                                    >
                                      {isUpdating ? (
                                        <svg className="animate-spin w-3 h-3 text-current" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                      ) : item.status === 'ready' ? (
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                      ) : null}
                                    </button>
                                    <div>
                                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{item.document_name || item.item_name}</p>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {item.notes ? `${item.notes}` : ''}
                                        {item.responsible && ` [Resp: ${item.responsible}]`}
                                        {item.completed_date && ` • Completado: ${new Date(item.completed_date).toLocaleDateString()}`}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end pl-8 md:pl-0">
                                    {/* Interactive cycle button */}
                                    <button 
                                      onClick={() => updateDdItemStatus(res.id, item.id, item.status)}
                                      disabled={isUpdating}
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                        item.status === 'ready' 
                                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                                          : item.status === 'in_progress' 
                                          ? 'bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20' 
                                          : item.status === 'requested'
                                          ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/5'
                                      }`}
                                    >
                                      {item.status === 'ready' ? t('neg_dd_status_ready') || 'Listo' 
                                       : item.status === 'in_progress' ? t('neg_dd_status_in_progress') || 'En Camino' 
                                       : item.status === 'requested' ? t('neg_dd_status_requested') || 'Pedido'
                                       : t('neg_dd_status_pending') || 'Pendiente'}
                                    </button>

                                    {item.file_url && (
                                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors" title="Abrir Documento">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Bottom action row */}
                      <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4 mt-4 flex-wrap gap-3">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleBrokerHelp(res.id)}
                            disabled={res.broker_help_requested}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                              res.broker_help_requested 
                                ? 'bg-red-50 text-red-500 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30' 
                                : 'bg-white dark:bg-dark-bg text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all font-bold'
                            }`}
                          >
                            {res.broker_help_requested ? '🚨 Ayuda Solicitada' : '🚨 Pedir Ayuda al Broker'}
                          </button>

                          <button 
                            onClick={() => {
                              const url = `${window.location.origin}/negocio/transaccion/${res.id}`;
                              navigator.clipboard.writeText(url);
                              alert('Deal Room link copied!');
                            }}
                            className="text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                          >
                            🔗 {t('neg_share_deal_room') || 'Compartir Link'}
                          </button>
                        </div>

                        <a 
                          href={`/negocio/transaccion/${res.id}`} 
                          className="text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-purple-600 px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          Entrar al Deal Room →
                        </a>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
      </div>
    </>
  );
}
