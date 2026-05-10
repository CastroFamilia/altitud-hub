"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/context';

export default function IntegrationSettingsTab({ officeId = 'altitud' }) {
  const { lang } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    reconnect_read_api_key: '',
    reconnect_write_api_key: '',
    agents_api_key: ''
  });

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('office_settings')
        .select('*')
        .eq('office_id', officeId)
        .single();
      
      if (data) {
        setSettings({
          reconnect_read_api_key: data.reconnect_read_api_key || '',
          reconnect_write_api_key: data.reconnect_write_api_key || '',
          agents_api_key: data.agents_api_key || ''
        });
      }
      setLoading(false);
    }
    loadSettings();
  }, [officeId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('office_settings')
        .upsert({
          office_id: officeId,
          reconnect_read_api_key: settings.reconnect_read_api_key,
          reconnect_write_api_key: settings.reconnect_write_api_key,
          agents_api_key: settings.agents_api_key
        }, { onConflict: 'office_id' });
      
      if (error) throw error;
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

      </div>
    </div>
  );
}
