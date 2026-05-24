"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { getOfficeSettings, upsertOfficeSettings } from '@/lib/dal/office';

export default function IntegrationSettingsTab({ officeId = 'altitud' }) {
  const { t, lang } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    reconnect_read_api_key: '',
    reconnect_write_api_key: '',
    agents_api_key: '',
    okr_sheet_url: '',
    photographer_calendar_url: ''
  });

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const data = await getOfficeSettings(officeId);
        if (data) {
          setSettings({
            reconnect_read_api_key: data.reconnect_read_api_key || '',
            reconnect_write_api_key: data.reconnect_write_api_key || '',
            agents_api_key: data.agents_api_key || '',
            okr_sheet_url: data.okr_sheet_url || '',
            photographer_calendar_url: data.photographer_calendar_url || ''
          });
        }
      } catch(err) {
        // error handling if needed
      }
      setLoading(false);
    }
    loadSettings();
  }, [officeId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertOfficeSettings({
        office_id: officeId,
        reconnect_read_api_key: settings.reconnect_read_api_key,
        reconnect_write_api_key: settings.reconnect_write_api_key,
        agents_api_key: settings.agents_api_key,
        okr_sheet_url: settings.okr_sheet_url,
        photographer_calendar_url: settings.photographer_calendar_url
      });
      alert(t('auto_settings_saved_successfully'));
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black italic text-slate-900 dark:text-white flex items-center gap-2">
            <span>🔌</span> {t('auto_api_integrations')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('auto_manage_external_api_keys')}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50"
        >
          {saving ? '...' : (t('auto_save_changes'))}
        </button>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl space-y-6">
        
        {/* Agents API */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{t('auto_agents_data_feed_api')}</h3>
          <p className="text-[10px] text-slate-500 mb-3">{t('auto_used_to_bring_agent')}</p>
          <input
            type="password"
            name="agents_api_key"
            value={settings.agents_api_key}
            onChange={handleChange}
            placeholder={t('auto_enter_api_key_for')}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-blue dark:text-white"
          />
        </div>

        {/* Read Properties */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{t('auto_reconnect_read_api_import')}</h3>
          <p className="text-[10px] text-slate-500 mb-3">{t('auto_used_to_fetch_properties')}</p>
          <input
            type="password"
            name="reconnect_read_api_key"
            value={settings.reconnect_read_api_key}
            onChange={handleChange}
            placeholder={t('auto_enter_read_api_key')}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-blue dark:text-white"
          />
        </div>

        {/* Write Properties */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{t('auto_reconnect_write_api_export')}</h3>
          <p className="text-[10px] text-slate-500 mb-3">{t('auto_used_to_push_approved')}</p>
          <input
            type="password"
            name="reconnect_write_api_key"
            value={settings.reconnect_write_api_key}
            onChange={handleChange}
            placeholder={t('auto_enter_write_api_key')}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-blue dark:text-white"
          />
        </div>

        {/* Google Sheets OKR Auto-Sync */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
            {t('auto_google_sheets_okr_auto')}
          </h3>
          <div className="text-[10px] text-slate-500 mb-3 space-y-1">
            <p>
              {lang === 'en' 
                ? 'Allows fetching OKR records directly from your central Google Sheet in real time.' 
                : 'Permite importar los registros de OKR directamente desde tu planilla central de Google Sheets en tiempo real.'}
            </p>
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-[9px] font-mono text-slate-600 dark:text-slate-400 mt-2 space-y-1">
              <p className="font-bold text-slate-700 dark:text-slate-300">
                {t('auto_how_to_get_the')}
              </p>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>{t('auto_open_your_central_google')}</li>
                <li>{t('auto_click_file_share_publish')}</li>
                <li>{t('auto_under_link_select_the')}</li>
                <li>{t('auto_select_comma_separated_values')}</li>
                <li>{t('auto_click_publish_copy_the')}</li>
              </ol>
            </div>
          </div>
          <input
            type="text"
            name="okr_sheet_url"
            value={settings.okr_sheet_url}
            onChange={handleChange}
            placeholder={t('auto_paste_the_published_csv')}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-blue dark:text-white"
          />
        </div>

        {/* photographer calendar config */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
            📸 {t('auto_photographer_calendar')}
          </h3>
          <p className="text-[10px] text-slate-500 mb-3">
            {t('auto_photographer_calendar_desc')}
          </p>
          <input
            type="text"
            name="photographer_calendar_url"
            value={settings.photographer_calendar_url}
            onChange={handleChange}
            placeholder={t('auto_photographer_calendar_placeholder')}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-blue dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}
