"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { getOfficeSettings, upsertOfficeSettings } from '@/lib/dal/office';

export default function IntegrationSettingsTab({ officeId = 'altitud' }) {
  const { lang } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    reconnect_read_api_key: '',
    reconnect_write_api_key: '',
    agents_api_key: '',
    okr_sheet_url: ''
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
            okr_sheet_url: data.okr_sheet_url || ''
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
        okr_sheet_url: settings.okr_sheet_url
      });
      alert(lang === 'en' ? 'Settings saved successfully' : 'Configuraciones guardadas exitosamente');
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
            <span>🔌</span> {lang === 'en' ? 'API Integrations' : 'Integraciones API'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'en' ? 'Manage external API keys to connect with RECONNECT and other services.' : 'Administre claves API externas para conectar con RECONNECT y otros servicios.'}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50"
        >
          {saving ? '...' : (lang === 'en' ? 'Save Changes' : 'Guardar Cambios')}
        </button>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl space-y-6">
        
        {/* Agents API */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{lang === 'en' ? 'Agents Data Feed API' : 'API de Importación de Agentes'}</h3>
          <p className="text-[10px] text-slate-500 mb-3">{lang === 'en' ? 'Used to bring agent rosters from external directories.' : 'Se utiliza para importar la lista de agentes de directorios externos.'}</p>
          <input
            type="password"
            name="agents_api_key"
            value={settings.agents_api_key}
            onChange={handleChange}
            placeholder={lang === 'en' ? 'Enter API Key for agents' : 'Ingresa la clave API para agentes'}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-blue dark:text-white"
          />
        </div>

        {/* Read Properties */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{lang === 'en' ? 'RECONNECT Read API (Import Properties)' : 'RECONNECT Read API (Importar Propiedades)'}</h3>
          <p className="text-[10px] text-slate-500 mb-3">{lang === 'en' ? 'Used to fetch properties from RECONNECT and load them into the Hub.' : 'Se utiliza para leer las propiedades de RECONNECT y cargarlas en el Hub.'}</p>
          <input
            type="password"
            name="reconnect_read_api_key"
            value={settings.reconnect_read_api_key}
            onChange={handleChange}
            placeholder={lang === 'en' ? 'Enter Read API Key' : 'Ingresa la clave API de lectura'}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-blue dark:text-white"
          />
        </div>

        {/* Write Properties */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{lang === 'en' ? 'RECONNECT Write API (Export Properties)' : 'RECONNECT Write API (Exportar Propiedades)'}</h3>
          <p className="text-[10px] text-slate-500 mb-3">{lang === 'en' ? 'Used to push approved Hub properties to RECONNECT.' : 'Se utiliza para enviar las propiedades aprobadas del Hub a RECONNECT.'}</p>
          <input
            type="password"
            name="reconnect_write_api_key"
            value={settings.reconnect_write_api_key}
            onChange={handleChange}
            placeholder={lang === 'en' ? 'Enter Write API Key' : 'Ingresa la clave API de escritura'}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-blue dark:text-white"
          />
        </div>

        {/* Google Sheets OKR Auto-Sync */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
            {lang === 'en' ? 'Google Sheets OKR Auto-Sync' : 'Sincronización Automática de OKR de Google Sheets'}
          </h3>
          <div className="text-[10px] text-slate-500 mb-3 space-y-1">
            <p>
              {lang === 'en' 
                ? 'Allows fetching OKR records directly from your central Google Sheet in real time.' 
                : 'Permite importar los registros de OKR directamente desde tu planilla central de Google Sheets en tiempo real.'}
            </p>
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-[9px] font-mono text-slate-600 dark:text-slate-400 mt-2 space-y-1">
              <p className="font-bold text-slate-700 dark:text-slate-300">
                {lang === 'en' ? 'How to get the link:' : 'Cómo obtener el enlace:'}
              </p>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>{lang === 'en' ? 'Open your central Google Sheet.' : 'Abre tu planilla central de Google Sheets.'}</li>
                <li>{lang === 'en' ? 'Click File -> Share -> Publish to the web.' : 'Haz clic en Archivo -> Compartir -> Publicar en la web.'}</li>
                <li>{lang === 'en' ? 'Under "Link", select the OKR tab instead of "Entire Document".' : 'En la sección "Enlace", selecciona la pestaña de OKR en lugar de "Todo el documento".'}</li>
                <li>{lang === 'en' ? 'Select "Comma-separated values (.csv)" as the format.' : 'Selecciona "Valores separados por comas (.csv)" como formato.'}</li>
                <li>{lang === 'en' ? 'Click Publish, copy the generated URL, and paste it below.' : 'Haz clic en Publicar, copia la URL generada y pégala aquí abajo.'}</li>
              </ol>
            </div>
          </div>
          <input
            type="text"
            name="okr_sheet_url"
            value={settings.okr_sheet_url}
            onChange={handleChange}
            placeholder={lang === 'en' ? 'Paste the published CSV URL (https://docs.google.com/spreadsheets/.../pub?output=csv)' : 'Pega la URL de CSV publicado (https://docs.google.com/spreadsheets/.../pub?output=csv)'}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-blue dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}
