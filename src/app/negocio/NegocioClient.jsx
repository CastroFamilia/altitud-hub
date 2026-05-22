'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/context';
import AgentCommissionsPanel from '@/components/negocio/AgentCommissionsPanel';
import AgentReferralsPanel from '@/components/negocio/AgentReferralsPanel';
import AddReservationModal from '@/components/negocio/AddReservationModal';
import ReservationDetailDrawer from '@/components/negocio/ReservationDetailDrawer';

export default function NegocioClient({ initialReservations = [], initialContacts = [], initialCommissions = [], initialTiers = [], initialReferrals = [], initialEvents = [], initialAttendance = [] }) {
  const { user, profile } = useAuth();
  const { t } = useApp();
  
  // Directly use the Server Component data without manual fetching
  const reservations = initialReservations;
  const contacts = initialContacts;
  
  // Modals/Drawers state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState(null);
  const [editData, setEditData] = useState(null);
  const [activeTab, setActiveTab] = useState('reservas');

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

  // Calculate Attendance Percentage
  const attendanceRate = (() => {
    let totalCounted = 0;
    let totalPresent = 0;
    initialAttendance.forEach(att => {
      if (att.status === 'no_obligatoria') return;
      totalCounted++;
      if (att.status === 'presente') totalPresent++;
    });
    return totalCounted === 0 ? 100 : Math.round((totalPresent / totalCounted) * 100);
  })();

  const openNewModal = () => {
    setEditData(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (res) => {
    setEditData(res);
    setIsAddModalOpen(true);
    setSelectedRes(null); // optionally close drawer if editing
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-brand-500">💼</span> {t('neg_title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('neg_subtitle')}</p>
        </div>
        <button
          onClick={openNewModal}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-lg shadow-brand-500/20 font-medium transition-all"
        >
          {t('neg_new')}
        </button>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex bg-white dark:bg-slate-800/50 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-white/10 w-fit mb-8">
        {[
          { key: 'reservas', label: t('neg_tab_reservas'), icon: '📋' },
          { key: 'comisiones', label: t('neg_tab_comisiones'), icon: '💰' },
          { key: 'referidos', label: t('ref_tab'), icon: '🔗' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.key ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'referidos' ? (
        <AgentReferralsPanel initialReferrals={initialReferrals} />
      ) : activeTab === 'comisiones' ? (
        <AgentCommissionsPanel initialCommissions={initialCommissions} initialTiers={initialTiers} />
      ) : (
      <>
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
            <p className="text-xs text-slate-500 mt-2">{t('neg_estimated_splits')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t('ofc_hr_attendance_rate') || 'Tasa de Asistencia'}</p>
            <h3 className={`text-3xl font-bold ${attendanceRate >= 80 ? 'text-emerald-600' : attendanceRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {attendanceRate}%
            </h3>
            <p className="text-xs text-slate-500 mt-2">Eventos de Oficina</p>
          </div>
        </div>

        {/* Reservations List */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          {reservations.length === 0 ? (
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
                        <div className="font-semibold text-slate-900 dark:text-white">{res.property_address || t('neg_no_address')}</div>
                        <div className="text-xs text-slate-500 mt-1 flex gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 font-medium">{res.type}</span>
                          {res.broker_help_requested && <span className="text-red-500 font-bold" title="Ayuda del broker solicitada">🚨</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        <div><span className="font-semibold">V:</span> {res.seller_name || '-'}</div>
                        <div><span className="font-semibold">C:</span> {res.buyer_name || '-'}</div>
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
                          {t('neg_view_detail')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
      )}

      {/* Extracted Modals */}
      <AddReservationModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        initialData={editData}
        contacts={contacts}
        user={user}
        profile={profile}
      />

      <ReservationDetailDrawer 
        selectedRes={selectedRes} 
        onClose={() => setSelectedRes(null)} 
        onRequestEdit={openEditModal}
      />
    </>
  );
}
