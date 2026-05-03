'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';

export default function NegocioPage() {
  const { user, profile } = useAuth();
  const { t } = useApp();
  
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals/Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    property_address: '',
    client_name: '',
    type: 'LOI',
    side: 'listing',
    reservation_amount: '',
    sale_price: '',
    commission_pct: 5,
    expected_sign_date: '',
    close_deadline: '',
    earnest_money_deadline: '',
    earnest_money_non_refundable_date: '',
    counterpart_name: '',
    counterpart_agent: '',
    counterpart_office: '',
    negotiation_details: '',
    drive_folder_url: ''
  });

  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchReservations();
    }
  }, [profile?.id]);

  async function fetchReservations() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('office_reservations')
        .select(`
          *,
          due_diligence_items (*)
        `)
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate Pipeline Metrics
  const activeReservations = reservations.filter(r => r.status === 'pending' || r.status === 'signed');
  const pipelineValue = activeReservations.reduce((acc, r) => acc + (Number(r.sale_price) || 0), 0);
  const expectedCommission = activeReservations.reduce((acc, r) => {
    const comPct = Number(r.commission_pct) || 0;
    const price = Number(r.sale_price) || 0;
    let agentCom = r.agent_commission_amount;
    if (!agentCom) {
      // rough estimate if not set explicitly
      agentCom = (price * (comPct/100)) * 0.5; // assuming ~50% split for estimation
    }
    return acc + Number(agentCom);
  }, 0);

  async function handleSaveReservation(e) {
    e.preventDefault();
    try {
      const isEditing = !!formData.id;
      
      const payload = {
        profile_id: profile.id,
        property_address: formData.property_address,
        client_name: formData.client_name,
        type: formData.type,
        side: formData.side,
        reservation_amount: Number(formData.reservation_amount),
        sale_price: Number(formData.sale_price),
        commission_pct: Number(formData.commission_pct),
        expected_sign_date: formData.expected_sign_date || null,
        close_deadline: formData.close_deadline || null,
        earnest_money_deadline: formData.earnest_money_deadline || null,
        earnest_money_non_refundable_date: formData.earnest_money_non_refundable_date || null,
        counterpart_name: formData.counterpart_name,
        counterpart_agent: formData.counterpart_agent,
        counterpart_office: formData.counterpart_office,
        negotiation_details: formData.negotiation_details,
        drive_folder_url: formData.drive_folder_url,
        agent_commission_amount: (Number(formData.sale_price) * (Number(formData.commission_pct)/100)) * 0.5 // Rough calc
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
      }

      setIsAddModalOpen(false);
      fetchReservations();
    } catch (err) {
      console.error('Save error:', err);
      alert('Error guardando reserva');
    }
  }

  async function requestBrokerHelp(resId) {
    const note = prompt(t('neg_broker_help_note'));
    if (note === null) return;
    
    try {
      const { error } = await supabase
        .from('office_reservations')
        .update({
          broker_help_requested: true,
          broker_help_note: note,
          broker_help_date: new Date().toISOString()
        })
        .eq('id', resId);
        
      if (error) throw error;
      alert(t('neg_broker_help_sent'));
      fetchReservations();
      if (selectedRes && selectedRes.id === resId) {
        setSelectedRes(prev => ({...prev, broker_help_requested: true}));
      }
    } catch (err) {
      console.error(err);
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

      if (!res.ok) throw new Error('Error al extraer datos');
      const extracted = await res.json();
      
      // Merge extracted data into formData
      setFormData(prev => ({
        ...prev,
        type: extracted.type || prev.type,
        property_address: extracted.property_address || prev.property_address,
        client_name: extracted.client_name || prev.client_name,
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
      alert(t('neg_ai_error'));
    } finally {
      setAiLoading(false);
      // reset file input
      e.target.value = '';
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <span className="text-brand-500">💼</span> {t('neg_title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('neg_subtitle')}</p>
          </div>
          <button
            onClick={() => {
              setFormData({ type: 'LOI', side: 'listing', commission_pct: 5 });
              setIsAddModalOpen(true);
            }}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-lg shadow-brand-500/20 font-medium transition-all"
          >
            {t('neg_new')}
          </button>
        </div>

        {/* Pipeline Summary (Reservómetro) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t('neg_pipeline_value')}</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
              ${pipelineValue.toLocaleString()}
            </h3>
            <p className="text-xs text-brand-600 dark:text-brand-400 mt-2 font-medium">{activeReservations.length} {t('neg_active_deals')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t('neg_expected_commission')}</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white text-emerald-600 dark:text-emerald-400">
              ${expectedCommission.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 mt-2">Estimado basado en splits</p>
          </div>
        </div>

        {/* Reservations List */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Cargando...</div>
          ) : reservations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('neg_empty_title')}</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{t('neg_empty_desc')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/10">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('res_property')}</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('res_client')}</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio / {t('res_amount')}</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('neg_side')}</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {reservations.map(res => (
                    <tr key={res.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{res.property_address || 'Sin dirección'}</div>
                        <div className="text-xs text-slate-500 mt-1 flex gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 font-medium">{res.type}</span>
                          {res.broker_help_requested && <span className="text-red-500 font-bold" title="Ayuda del broker solicitada">🚨</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {res.client_name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">${Number(res.sale_price||0).toLocaleString()}</div>
                        <div className="text-xs text-brand-600 dark:text-brand-400 mt-0.5">Res: ${Number(res.reservation_amount||0).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {res.side === 'listing' ? t('neg_side_listing') : res.side === 'buying' ? t('neg_side_buying') : t('neg_side_both')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          res.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                          res.status === 'signed' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                          res.status === 'closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                          'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                        }`}>
                          {res.status === 'pending' ? t('res_status_pending') :
                           res.status === 'signed' ? t('res_status_signed') :
                           res.status === 'closed' ? t('res_status_closed') : t('res_status_fallen')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedRes(res)}
                          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                        >
                          Ver Detalle →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-10 pb-10 px-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-white/10 my-auto">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-10">
              <h2 className="text-xl font-bold">{formData.id ? t('neg_edit') : t('neg_new')}</h2>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-6">
              {/* Olympia AI Helper Box */}
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
                    <input type="text" required value={formData.property_address} onChange={e => setFormData({...formData, property_address: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('res_client')}</label>
                    <input type="text" required value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('res_type')}</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent">
                      <option value="LOI">LOI</option>
                      <option value="SPA">SPA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('neg_side')}</label>
                    <select value={formData.side} onChange={e => setFormData({...formData, side: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent">
                      <option value="listing">{t('neg_side_listing')}</option>
                      <option value="buying">{t('neg_side_buying')}</option>
                      <option value="both">{t('neg_side_both')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('neg_sale_price')} ($)</label>
                    <input type="number" required value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('res_amount')} de Reserva ($)</label>
                    <input type="number" required value={formData.reservation_amount} onChange={e => setFormData({...formData, reservation_amount: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('neg_commission_pct')}</label>
                    <input type="number" step="0.1" value={formData.commission_pct} onChange={e => setFormData({...formData, commission_pct: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#0F9D58]" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                      {t('neg_drive_link')}
                    </label>
                    <input type="url" placeholder="https://drive.google.com/drive/folders/..." value={formData.drive_folder_url || ''} onChange={e => setFormData({...formData, drive_folder_url: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <h3 className="font-semibold mb-4 text-brand-600 flex items-center gap-2">{t('neg_timeline_title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('neg_date_sign')}</label>
                      <input type="date" value={formData.expected_sign_date} onChange={e => setFormData({...formData, expected_sign_date: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('neg_date_close')}</label>
                      <input type="date" value={formData.close_deadline} onChange={e => setFormData({...formData, close_deadline: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('neg_date_deposit')}</label>
                      <input type="date" value={formData.earnest_money_deadline} onChange={e => setFormData({...formData, earnest_money_deadline: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('neg_date_dd')}</label>
                      <input type="date" value={formData.earnest_money_non_refundable_date} onChange={e => setFormData({...formData, earnest_money_non_refundable_date: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <h3 className="font-semibold mb-4 text-brand-600">{t('neg_counterpart')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder={t('neg_counterpart_name')} value={formData.counterpart_name || ''} onChange={e => setFormData({...formData, counterpart_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                    <input type="text" placeholder={t('neg_counterpart_agent')} value={formData.counterpart_agent || ''} onChange={e => setFormData({...formData, counterpart_agent: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                    <input type="text" placeholder={t('neg_counterpart_office')} value={formData.counterpart_office || ''} onChange={e => setFormData({...formData, counterpart_office: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <label className="block text-sm font-medium mb-1">{t('neg_negotiation_details')}</label>
                  <textarea rows="3" placeholder={t('neg_negotiation_placeholder')} value={formData.negotiation_details || ''} onChange={e => setFormData({...formData, negotiation_details: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">{t('neg_cancel')}</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">{t('res_save')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedRes && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-white/10 flex flex-col animate-slide-in-right">
            
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-2xl font-bold">{selectedRes.property_address}</h2>
                <p className="text-slate-500 mt-1">{selectedRes.client_name} • {selectedRes.type}</p>
              </div>
              <button onClick={() => setSelectedRes(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => requestBrokerHelp(selectedRes.id)}
                  disabled={selectedRes.broker_help_requested}
                  className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl font-bold border-2 transition-all ${
                    selectedRes.broker_help_requested 
                    ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600' 
                    : 'border-slate-200 dark:border-white/10 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-700 dark:text-slate-300 hover:text-red-600'
                  }`}
                >
                  {selectedRes.broker_help_requested ? t('neg_broker_help_sent') : t('neg_broker_help')}
                </button>
                <button 
                  onClick={() => {
                    setFormData(selectedRes);
                    setIsAddModalOpen(true);
                  }}
                  className="px-4 py-3 rounded-xl font-medium border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  ✏️ {t('neg_edit')}
                </button>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{t('neg_sale_price')}</p>
                  <p className="font-semibold text-lg">${Number(selectedRes.sale_price||0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{t('res_amount')}</p>
                  <p className="font-semibold text-lg">${Number(selectedRes.reservation_amount||0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{t('neg_commission_pct')}</p>
                  <p className="font-semibold">{selectedRes.commission_pct}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{t('res_expected_date')}</p>
                  <p className="font-semibold">{selectedRes.expected_sign_date ? new Date(selectedRes.expected_sign_date).toLocaleDateString() : 'No definida'}</p>
                </div>
                <div className="col-span-2 pt-2 mt-2 border-t border-slate-200 dark:border-white/10">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{t('neg_negotiation_details')}</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedRes.negotiation_details || 'Sin detalles'}</p>
                </div>
              </div>

              {/* Due Diligence Section placeholder */}
              <div>
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">📑 {t('neg_dd_title')}</h3>
                    <p className="text-sm text-slate-500">{t('neg_dd_subtitle')}</p>
                  </div>
                  {/* We would render DD items here in a separate component */}
                  <div className="text-sm text-brand-600 font-medium cursor-pointer">
                    Gestión en construcción...
                  </div>
                </div>
                
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-white/10 border-dashed">
                  <p className="text-slate-500 text-sm">La funcionalidad completa de checklist y compartir con notario está en desarrollo.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
