import { useApp } from '@/lib/context';

export default function Step1Owners({ formData, updateForm, onNext }) {
  const { t } = useApp();
  const handleChange = (e) => {
    const { name, value } = e.target;
    updateForm(name, value);
  };

  return (
    <div className="bg-white dark:bg-dark-panel p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border space-y-8 fade-in">
      {/* Contactos */}
      <div>
        <h3 className="text-brand-600 dark:text-brand-400 font-bold uppercase text-xs tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">{t('pre_s1_title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
              <label className="form-label">{t('pre_s1_owner_name')}</label>
              <input type="text" name="owner_name" value={formData.owner_name || ''} onChange={handleChange} className="form-input" placeholder={t('pre_s1_owner_placeholder')} />
          </div>
          <div>
              <label className="form-label">{t('pre_s1_occupation')}</label>
              <input type="text" name="occupation" value={formData.occupation || ''} onChange={handleChange} className="form-input" placeholder={t('pre_s1_occ_placeholder')} />
          </div>
          <div>
              <label className="form-label">{t('pre_s1_phones')}</label>
              <input type="text" name="phones" value={formData.phones || ''} onChange={handleChange} className="form-input" placeholder={t('pre_s1_phone_placeholder')} />
          </div>
          <div>
              <label className="form-label">{t('pre_s1_emails')}</label>
              <input type="email" name="emails" value={formData.emails || ''} onChange={handleChange} className="form-input" placeholder={t('pre_s1_email_placeholder')} />
          </div>
        </div>
      </div>

      {/* Acuerdos */}
      <div>
        <h3 className="text-brand-600 dark:text-brand-400 font-bold uppercase text-xs tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">{t('pre_s1_decision_title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col space-y-3">
              <label className="form-label">{t('pre_s1_agree_q')}</label>
              <div className="flex space-x-3">
                  <label className="flex-1 relative cursor-pointer">
                      <input type="radio" name="agreement" value="yes" checked={formData.agreement === 'yes'} onChange={handleChange} className="peer sr-only" />
                      <div className="text-center py-2 px-4 rounded-lg border border-gray-300 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-input peer-checked:border-brand-500 peer-checked:text-brand-600 peer-checked:bg-brand-50 dark:peer-checked:bg-brand-500/10 font-bold transition-all text-xs">{t('pre_s1_agree_yes')}</div>
                  </label>
                  <label className="flex-1 relative cursor-pointer">
                      <input type="radio" name="agreement" value="no" checked={formData.agreement === 'no'} onChange={handleChange} className="peer sr-only" />
                      <div className="text-center py-2 px-4 rounded-lg border border-gray-300 dark:border-dark-border text-red-600 hover:bg-gray-50 dark:hover:bg-dark-input peer-checked:border-red-500 peer-checked:bg-red-50 dark:peer-checked:bg-red-500/10 font-bold transition-all text-xs">{t('pre_s1_agree_no')}</div>
                  </label>
              </div>
          </div>
          <div className="flex flex-col space-y-3">
              <label className="form-label">{t('pre_s1_others_q')}</label>
              <input type="text" name="decision_makers" value={formData.decision_makers || ''} onChange={handleChange} className="form-input" placeholder={t('pre_s1_others_placeholder')} />
          </div>
          <div className="col-span-1 md:col-span-2 flex flex-col space-y-3">
              <label className="form-label">{t('pre_s1_notary_q')}</label>
              <input type="text" name="notary" value={formData.notary || ''} onChange={handleChange} className="form-input" placeholder={t('pre_s1_notary_placeholder')} />
          </div>
        </div>
      </div>

      {/* Motivación */}
      <div>
        <h3 className="text-brand-600 dark:text-brand-400 font-bold uppercase text-xs tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">{t('pre_s1_motivation_title')}</h3>
        <div className="grid grid-cols-1 gap-5">
          <div>
              <label className="form-label">{t('pre_s1_motive_q')}</label>
              <input type="text" name="motivation" value={formData.motivation || ''} onChange={handleChange} className="form-input" placeholder={t('pre_s1_motive_placeholder')} />
          </div>
          <div>
              <label className="form-label">{t('pre_s1_timeframe_q')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <label className="relative cursor-pointer">
                      <input type="radio" name="timeframe" value="1" checked={formData.timeframe === '1'} onChange={handleChange} className="peer sr-only" />
                      <div className="text-center py-3 px-4 rounded-lg border border-gray-300 dark:border-dark-border text-red-600 hover:bg-gray-50 peer-checked:border-red-500 peer-checked:bg-red-50 dark:peer-checked:bg-red-500/10 font-bold transition-all text-xs">{t('pre_s1_time_1')}</div>
                  </label>
                  <label className="relative cursor-pointer">
                      <input type="radio" name="timeframe" value="3" checked={formData.timeframe === '3'} onChange={handleChange} className="peer sr-only" />
                      <div className="text-center py-3 px-4 rounded-lg border border-gray-300 dark:border-dark-border text-brand-600 hover:bg-gray-50 peer-checked:border-brand-500 peer-checked:bg-brand-50 dark:peer-checked:bg-brand-500/10 font-bold transition-all text-xs">{t('pre_s1_time_3')}</div>
                  </label>
                  <label className="relative cursor-pointer">
                      <input type="radio" name="timeframe" value="6" checked={formData.timeframe === '6'} onChange={handleChange} className="peer sr-only" />
                      <div className="text-center py-3 px-4 rounded-lg border border-gray-300 dark:border-dark-border text-gray-500 hover:bg-gray-50 peer-checked:border-gray-500 peer-checked:bg-gray-100 dark:peer-checked:bg-gray-800 font-bold transition-all text-xs">{t('pre_s1_time_6')}</div>
                  </label>
              </div>
          </div>
          <div>
              <label className="form-label">{t('pre_s1_plan_b_q')}</label>
              <input type="text" name="plan_b" value={formData.plan_b || ''} onChange={handleChange} className="form-input" placeholder={t('pre_s1_plan_b_placeholder')} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={onNext} className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-lg text-sm font-bold shadow-lg shadow-brand-500/25 transition-all transform hover:scale-105 flex items-center">
              <span>{t('pre_s1_next')}</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
      </div>
    </div>
  );
}
