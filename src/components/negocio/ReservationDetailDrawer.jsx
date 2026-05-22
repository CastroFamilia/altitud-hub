"use client";

import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ReservationDetailDrawer({ selectedRes, onClose, onRequestEdit }) {
  const { t } = useApp();
  const router = useRouter();

  if (!selectedRes) return null;

  async function requestBrokerHelp() {
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
        .eq('id', selectedRes.id);
        
      if (error) throw error;
      alert(t('neg_broker_help_sent'));
      onClose(); // Close drawer after request so it refreshes with accurate state
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-white/10 flex flex-col animate-slide-in-right">
        
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-2xl font-bold">{selectedRes.property_address}</h2>
            <p className="text-slate-500 mt-1"><span className="font-medium">{t('neg_detail_seller')}:</span> {selectedRes.seller_name || '-'} • <span className="font-medium">{t('neg_detail_buyer')}:</span> {selectedRes.buyer_name || '-'} • {selectedRes.type}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={requestBrokerHelp}
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
                const url = `${window.location.origin}/negocio/transaccion/${selectedRes.id}`;
                navigator.clipboard.writeText(url);
                alert('Deal Room link copied!');
              }}
              className="px-4 py-3 rounded-xl font-medium border-2 border-brand-500 bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 text-brand-600 transition-colors"
            >
              🔗 {t('neg_share_deal_room')}
            </button>
            <button 
              onClick={() => {
                onRequestEdit(selectedRes);
              }}
              className="px-4 py-3 rounded-xl font-medium border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              ✏️ {t('neg_edit')}
            </button>
          </div>

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
              <p className="font-semibold">{selectedRes.expected_sign_date ? new Date(selectedRes.expected_sign_date).toLocaleDateString() : t('neg_detail_date_undef')}</p>
            </div>
            <div className="col-span-2 pt-2 mt-2 border-t border-slate-200 dark:border-white/10">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{t('neg_negotiation_details')}</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{selectedRes.negotiation_details || t('neg_detail_no_notes')}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">📑 {t('neg_dd_title')}</h3>
                <p className="text-sm text-slate-500">{t('neg_dd_subtitle')}</p>
              </div>
              <div className="text-sm text-brand-600 font-medium cursor-pointer">
                {t('neg_under_construction')}
              </div>
            </div>
            
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-white/10 border-dashed">
              <p className="text-slate-500 text-sm">{t('neg_dd_in_development')}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
