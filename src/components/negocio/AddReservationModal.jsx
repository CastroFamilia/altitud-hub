"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { insertContact } from '@/lib/dal/contacts';
import { useApp } from '@/lib/context';
import { trackOkrActivity } from '@/lib/okr-tracker';
import { useRouter } from 'next/navigation';

export default function AddReservationModal({ isOpen, onClose, initialData, contacts, user, profile }) {
  const { t } = useApp();
  const router = useRouter();

  const [formData, setFormData] = useState({
    property_address: '',
    buyer_name: '',
    buyer_contact_id: '',
    seller_name: '',
    seller_contact_id: '',
    registry_numbers: '',
    plan_numbers: '',
    type: 'LOI',
    side: 'listing',
    reservation_amount: '',
    sale_price: '',
    commission_pct: 5,
    expected_sign_date: '',
    close_deadline: '',
    earnest_money_deadline: '',
    earnest_money_non_refundable_date: '',
    buyer_agent_name: '',
    buyer_agent_office: '',
    seller_agent_name: '',
    seller_agent_office: '',
    buyer_notary_id: '',
    buyer_notary_name: '',
    seller_notary_id: '',
    seller_notary_name: '',
    negotiation_details: '',
    drive_folder_url: ''
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        property_address: '',
        buyer_name: '',
        buyer_contact_id: '',
        seller_name: '',
        seller_contact_id: '',
        registry_numbers: '',
        plan_numbers: '',
        type: 'LOI',
        side: 'listing',
        reservation_amount: '',
        sale_price: '',
        commission_pct: 5,
        expected_sign_date: '',
        close_deadline: '',
        earnest_money_deadline: '',
        earnest_money_non_refundable_date: '',
        buyer_agent_name: '',
        buyer_agent_office: '',
        seller_agent_name: '',
        seller_agent_office: '',
        buyer_notary_id: '',
        buyer_notary_name: '',
        seller_notary_id: '',
        seller_notary_name: '',
        negotiation_details: '',
        drive_folder_url: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  async function handleCreateDriveFolder() {
    if (!formData.property_address) {
      alert(t('neg_drive_alert_missing'));
      return;
    }
    const agentName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Agente';

    try {
      setIsCreatingFolder(true);
      const res = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: agentName,
          propertyName: `[${formData.type || 'LOI'}] ${formData.property_address}`
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('neg_drive_error'));
      
      setFormData(prev => ({ ...prev, drive_folder_url: data.folderUrl }));
      alert(`${t('neg_drive_success')} ${data.agentFolder}`);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function handleSaveReservation(e) {
    e.preventDefault();
    try {
      const isEditing = !!formData.id;
      
      const safeNumber = (val) => {
        if (!val) return 0;
        const num = Number(val.toString().replace(/[^0-9.-]+/g,""));
        return isNaN(num) ? 0 : num;
      };

      const safeDate = (val) => {
        if (!val || val.trim() === '') return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : val;
      };

      const price = safeNumber(formData.sale_price);
      const commission = safeNumber(formData.commission_pct);

      let finalBuyerNotaryId = formData.buyer_notary_id;
      if (!finalBuyerNotaryId && formData.buyer_notary_name) {
        const n1 = await insertContact({ first_name: formData.buyer_notary_name, type: 'Notary', user_id: user.id });
        if (n1) finalBuyerNotaryId = n1.id;
      }

      let finalSellerNotaryId = formData.seller_notary_id;
      if (!finalSellerNotaryId && formData.seller_notary_name) {
        const n2 = await insertContact({ first_name: formData.seller_notary_name, type: 'Notary', user_id: user.id });
        if (n2) finalSellerNotaryId = n2.id;
      }

      const payload = {
        profile_id: profile.id,
        property_address: formData.property_address,
        buyer_name: formData.buyer_name,
        buyer_contact_id: formData.buyer_contact_id || null,
        seller_name: formData.seller_name,
        seller_contact_id: formData.seller_contact_id || null,
        registry_numbers: formData.registry_numbers,
        plan_numbers: formData.plan_numbers,
        type: formData.type,
        side: formData.side,
        reservation_amount: safeNumber(formData.reservation_amount),
        sale_price: price,
        commission_pct: commission,
        expected_sign_date: safeDate(formData.expected_sign_date),
        close_deadline: safeDate(formData.close_deadline),
        earnest_money_deadline: safeDate(formData.earnest_money_deadline),
        earnest_money_non_refundable_date: safeDate(formData.earnest_money_non_refundable_date),
        buyer_agent_name: formData.buyer_agent_name,
        buyer_agent_office: formData.buyer_agent_office,
        seller_agent_name: formData.seller_agent_name,
        seller_agent_office: formData.seller_agent_office,
        buyer_notary_id: finalBuyerNotaryId || null,
        seller_notary_id: finalSellerNotaryId || null,
        negotiation_details: formData.negotiation_details,
        drive_folder_url: formData.drive_folder_url,
        agent_commission_amount: (price * (commission/100)) * 0.5
      };

      if (isEditing) {
        const { error } = await supabase
          .from('office_reservations')
          .update(payload)
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('office_reservations')
          .insert([payload]);
        if (error) throw error;
        await trackOkrActivity('reservas');
      }

      if (formData.buyer_contact_id && finalBuyerNotaryId) {
        await supabase.from('contact_relations').upsert({ contact_id: formData.buyer_contact_id, related_contact_id: finalBuyerNotaryId, relation_type: 'Notary' }, { onConflict: 'contact_id,related_contact_id' });
      }
      if (formData.seller_contact_id && finalSellerNotaryId) {
        await supabase.from('contact_relations').upsert({ contact_id: formData.seller_contact_id, related_contact_id: finalSellerNotaryId, relation_type: 'Notary' }, { onConflict: 'contact_id,related_contact_id' });
      }

      onClose();
      router.refresh(); // REPLACES fetchReservations()
    } catch (err) {
      console.error('Save error:', err);
      alert(t('neg_save_error') + err.message);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiLoading(true);
    try {
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/olympia/contract-extract', {
        method: 'POST',
        body: data,
      });

      const extracted = await res.json();
      if (!res.ok) throw new Error(extracted.error || t('neg_ai_extract_error'));
      
      setFormData(prev => ({
        ...prev,
        type: extracted.type || prev.type,
        property_address: extracted.property_address || prev.property_address,
        buyer_name: extracted.buyer_name || prev.buyer_name,
        seller_name: extracted.seller_name || prev.seller_name,
        registry_numbers: extracted.registry_numbers || prev.registry_numbers,
        plan_numbers: extracted.plan_numbers || prev.plan_numbers,
        side: extracted.side || prev.side,
        sale_price: extracted.sale_price || prev.sale_price,
        reservation_amount: extracted.reservation_amount || prev.reservation_amount,
        commission_pct: extracted.commission_pct || prev.commission_pct,
        expected_sign_date: extracted.expected_sign_date || prev.expected_sign_date,
        close_deadline: extracted.close_deadline || prev.close_deadline,
        earnest_money_deadline: extracted.earnest_money_deadline || prev.earnest_money_deadline,
        earnest_money_non_refundable_date: extracted.earnest_money_non_refundable_date || prev.earnest_money_non_refundable_date,
        counterpart_name: extracted.counterpart_name || prev.counterpart_name,
        counterpart_agent: extracted.counterpart_agent || prev.counterpart_agent,
        counterpart_office: extracted.counterpart_office || prev.counterpart_office,
        negotiation_details: extracted.negotiation_details || prev.negotiation_details
      }));

      alert(t('neg_ai_success'));
    } catch (err) {
      console.error(err);
      alert(err.message || t('neg_ai_error'));
    } finally {
      setAiLoading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-10 pb-10 px-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-white/10 my-auto">
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-10">
          <h2 className="text-xl font-bold">{formData.id ? t('neg_edit') : t('neg_new')}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <div className="p-6">
          <div className="mb-6 p-5 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-2xl border border-brand-100 dark:border-brand-800/30 flex flex-col md:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-2xl shrink-0">
              ✨
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">{t('neg_ai_title')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{t('neg_ai_desc')}</p>
            </div>
            <div>
              <label className="cursor-pointer px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 rounded-xl font-medium text-brand-600 dark:text-brand-400 transition-all shadow-sm block text-center mt-2 md:mt-0">
                {aiLoading ? t('neg_ai_processing') : t('neg_ai_btn')}
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} disabled={aiLoading} />
              </label>
            </div>
          </div>

          <form onSubmit={handleSaveReservation} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">{t('res_property')}</label>
                <input type="text" required value={formData.property_address || ''} onChange={e => setFormData({...formData, property_address: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('neg_seller_label')}</label>
                  <select 
                    value={formData.seller_contact_id || ''} 
                    onChange={e => {
                      const id = e.target.value;
                      const contact = contacts.find(c => c.id === id);
                      setFormData({...formData, seller_contact_id: id, seller_name: contact ? `${contact.first_name} ${contact.last_name||''}`.trim() : formData.seller_name});
                    }} 
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mb-2 text-sm"
                  >
                    <option value="">{t('neg_link_crm')}</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name||''}</option>)}
                  </select>
                  <input type="text" placeholder={t('neg_seller_placeholder')} required value={formData.seller_name || ''} onChange={e => setFormData({...formData, seller_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('neg_buyer_label')}</label>
                  <select 
                    value={formData.buyer_contact_id || ''} 
                    onChange={e => {
                      const id = e.target.value;
                      const contact = contacts.find(c => c.id === id);
                      setFormData({...formData, buyer_contact_id: id, buyer_name: contact ? `${contact.first_name} ${contact.last_name||''}`.trim() : formData.buyer_name});
                    }} 
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mb-2 text-sm"
                  >
                    <option value="">{t('neg_link_crm')}</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name||''}</option>)}
                  </select>
                  <input type="text" placeholder={t('neg_buyer_placeholder')} required value={formData.buyer_name || ''} onChange={e => setFormData({...formData, buyer_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('neg_registry_numbers')}</label>
                <input type="text" placeholder={t('neg_registry_placeholder')} value={formData.registry_numbers || ''} onChange={e => setFormData({...formData, registry_numbers: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('neg_plan_numbers')}</label>
                <input type="text" placeholder={t('neg_plan_placeholder')} value={formData.plan_numbers || ''} onChange={e => setFormData({...formData, plan_numbers: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('res_type')}</label>
                <select value={formData.type || 'LOI'} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent">
                  <option value="LOI">LOI</option>
                  <option value="SPA">SPA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('neg_side')}</label>
                <select value={formData.side || 'listing'} onChange={e => setFormData({...formData, side: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent">
                  <option value="listing">{t('neg_side_listing')}</option>
                  <option value="buying">{t('neg_side_buying')}</option>
                  <option value="both">{t('neg_side_both')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('neg_sale_price')} ($)</label>
                <input type="number" required value={formData.sale_price || ''} onChange={e => setFormData({...formData, sale_price: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('res_amount')} de Reserva ($)</label>
                <input type="number" required value={formData.reservation_amount || ''} onChange={e => setFormData({...formData, reservation_amount: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('neg_commission_pct')}</label>
                <input type="number" step="0.1" value={formData.commission_pct || ''} onChange={e => setFormData({...formData, commission_pct: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>
              <div className="md:col-span-2">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl mt-2">
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-2">💰 {t('neg_commission_projection')}</h4>
                  <div className="flex justify-between items-center text-sm mb-1 text-emerald-700 dark:text-emerald-300">
                    <span>{t('neg_sale_price')}:</span>
                    <span>${Number(formData.sale_price||0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-2 text-emerald-700 dark:text-emerald-300">
                    <span>{t('neg_commission_pct')}:</span>
                    <span>{formData.commission_pct||0}%</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50">
                    <span className="font-bold text-emerald-900 dark:text-emerald-100">{t('neg_gross_commission')}</span>
                    <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                      ${(Number(formData.sale_price||0) * (Number(formData.commission_pct||0)/100)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#0F9D58]" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                    {t('neg_drive_link')}
                  </span>
                  <button
                    type="button"
                    onClick={handleCreateDriveFolder}
                    disabled={isCreatingFolder || !!formData.drive_folder_url}
                    className="text-xs px-3 py-1 bg-[#0F9D58]/10 hover:bg-[#0F9D58]/20 text-[#0F9D58] rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingFolder ? t('neg_drive_creating') : t('neg_drive_auto_btn')}
                  </button>
                </label>
                <input type="url" placeholder="https://drive.google.com/drive/folders/..." value={formData.drive_folder_url || ''} onChange={e => setFormData({...formData, drive_folder_url: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/10">
              <h3 className="font-semibold mb-4 text-brand-600 flex items-center gap-2">{t('neg_timeline_title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t('neg_date_sign')}</label>
                  <input type="date" value={formData.expected_sign_date || ''} onChange={e => setFormData({...formData, expected_sign_date: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t('neg_date_close')}</label>
                  <input type="date" value={formData.close_deadline || ''} onChange={e => setFormData({...formData, close_deadline: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t('neg_date_deposit')}</label>
                  <input type="date" value={formData.earnest_money_deadline || ''} onChange={e => setFormData({...formData, earnest_money_deadline: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t('neg_date_dd')}</label>
                  <input type="date" value={formData.earnest_money_non_refundable_date || ''} onChange={e => setFormData({...formData, earnest_money_non_refundable_date: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/10">
              <h3 className="font-semibold mb-4 text-brand-600">{t('neg_seller_agent')} & {t('neg_seller_notary')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="text" placeholder={t('neg_seller_agent')} value={formData.seller_agent_name || ''} onChange={e => setFormData({...formData, seller_agent_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                <input type="text" placeholder={t('neg_seller_office')} value={formData.seller_agent_office || ''} onChange={e => setFormData({...formData, seller_agent_office: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select 
                    value={formData.seller_notary_id || ''} 
                    onChange={e => {
                      const id = e.target.value;
                      const contact = contacts.find(c => c.id === id);
                      setFormData({...formData, seller_notary_id: id, seller_notary_name: contact ? `${contact.first_name} ${contact.last_name||''}`.trim() : formData.seller_notary_name});
                    }} 
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm"
                  >
                    <option value="">{t('neg_link_notary')}</option>
                    {contacts.filter(c => c.type === 'Notary' || c.type?.toLowerCase().includes('abogad') || c.type?.toLowerCase().includes('notari')).map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name||''}</option>)}
                  </select>
                  <input type="text" placeholder={t('neg_seller_notary')} required={!formData.seller_notary_id} value={formData.seller_notary_name || ''} onChange={e => setFormData({...formData, seller_notary_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                </div>
              </div>

              <h3 className="font-semibold mb-4 text-brand-600 border-t border-slate-100 dark:border-white/5 pt-4">{t('neg_buyer_agent')} & {t('neg_buyer_notary')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder={t('neg_buyer_agent')} value={formData.buyer_agent_name || ''} onChange={e => setFormData({...formData, buyer_agent_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                <input type="text" placeholder={t('neg_buyer_office')} value={formData.buyer_agent_office || ''} onChange={e => setFormData({...formData, buyer_agent_office: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select 
                    value={formData.buyer_notary_id || ''} 
                    onChange={e => {
                      const id = e.target.value;
                      const contact = contacts.find(c => c.id === id);
                      setFormData({...formData, buyer_notary_id: id, buyer_notary_name: contact ? `${contact.first_name} ${contact.last_name||''}`.trim() : formData.buyer_notary_name});
                    }} 
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm"
                  >
                    <option value="">{t('neg_link_notary')}</option>
                    {contacts.filter(c => c.type === 'Notary' || c.type?.toLowerCase().includes('abogad') || c.type?.toLowerCase().includes('notari')).map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name||''}</option>)}
                  </select>
                  <input type="text" placeholder={t('neg_buyer_notary')} required={!formData.buyer_notary_id} value={formData.buyer_notary_name || ''} onChange={e => setFormData({...formData, buyer_notary_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/10">
              <label className="block text-sm font-medium mb-1">{t('neg_negotiation_details')}</label>
              <textarea rows="3" placeholder={t('neg_negotiation_placeholder')} value={formData.negotiation_details || ''} onChange={e => setFormData({...formData, negotiation_details: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">{t('neg_cancel')}</button>
              <button type="submit" className="px-5 py-2.5 rounded-xl font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">{t('res_save')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
