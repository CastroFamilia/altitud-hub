"use client";

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

/* ═══════════════════════════════════════════════════════════════
   AGENT DATA IMPORT TAB
   Broker tool in the Office Panel to bulk-import historical data
   for agents: properties (active + sold), OKR history, and leads.
   ═══════════════════════════════════════════════════════════════ */

const IMPORT_TYPES = [
  { key: 'properties_sold', label_es: 'Propiedades Vendidas', label_en: 'Sold Properties', icon: '🏆', desc_es: 'Historial de cierres y comisiones', desc_en: 'Closing history and commissions' },
  { key: 'properties_active', label_es: 'Propiedades Activas', label_en: 'Active Properties', icon: '🏠', desc_es: 'Listings actuales del agente', desc_en: 'Agent current listings' },
  { key: 'okr_history', label_es: 'Historial OKR', label_en: 'OKR History', icon: '📊', desc_es: 'Actividades diarias del funnel', desc_en: 'Daily funnel activities' },
  { key: 'leads', label_es: 'Leads / Consultas', label_en: 'Leads / Inquiries', icon: '📬', desc_es: 'Consultas recibidas', desc_en: 'Received inquiries' },
  { key: 'historical_commissions', label_es: 'Comisiones Históricas', label_en: 'Historical Commissions', icon: '💰', desc_es: 'Planilla mensual de comisiones', desc_en: 'Monthly commissions spreadsheet' },
  { key: 'rcca_performance_dashboard', label_es: 'Performance Dashboard RCCA', label_en: 'RCCA Performance Dashboard', icon: '📊', desc_es: 'Planilla Excel (.xlsx) de métricas de oficina y comisiones de agentes', desc_en: 'Excel spreadsheet (.xlsx) with office metrics and agent commissions' },
];


const CSV_TEMPLATES = {
  properties_sold: 'name,precio,fecha_cierre,comprador,agente_comprador,comision_pct,split_agente,side,ubicacion,tipo\nCasa Escazú,350000,2026-01-15,Juan Pérez,María López,6,60,listing,Escazú,3',
  properties_active: 'name,precio,ubicacion,tipo,habitaciones,banos,terreno,construccion,descripcion\nApartamento Santa Ana,250000,Santa Ana,1,2,2,0,85,Moderno apartamento',
  okr_history: 'fecha,Llamados,PL,ACM,Listing,Exclusivas,Consultas,Muestras,Reservas,Transacciones,$$$$\n2026-01-06,5,2,1,1,0,3,1,0,0,0',
  leads: 'lead_name,lead_email,lead_phone,motivo,fuente,property_id,notas\nJuan García,juan@email.com,+506 8888-0000,propiedad,sitio_web,,Interesado en Escazú',
  historical_commissions: 'Asociado,Año,Ene,Feb,Mar,Abr,May,Jun,Jul,Ago,Sep,Oct,Nov,Dic\nAlejandra Castro,2026,20500,15250,21150,8000,0,0,0,0,0,0,0,0\nGustavo Valverde,2026,950,7500,0,1200,0,0,0,0,0,0,0,0',
};

export default function AgentDataImportTab({ profiles = [] }) {
  const { t, lang } = useApp();
  const fileInputRef = useRef(null);

  const [selectedAgent, setSelectedAgent] = useState('');
  const [importType, setImportType] = useState('properties_sold');
  const [csvData, setCsvData] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Auto-sync Google Sheet states
  const [syncSettings, setSyncSettings] = useState({ okr_sheet_url: '', okr_sheet_last_synced: '' });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Load sync settings
  useEffect(() => {
    const loadSyncSettings = async () => {
      setLoadingSettings(true);
      try {
        const { data, error } = await supabase
          .from('office_settings')
          .select('okr_sheet_url, okr_sheet_last_synced')
          .eq('office_id', 'altitud')
          .single();
        if (data) {
          setSyncSettings({
            okr_sheet_url: data.okr_sheet_url || '',
            okr_sheet_last_synced: data.okr_sheet_last_synced || ''
          });
        }
      } catch (err) {
        console.warn('Failed to load sheet sync settings', err);
      }
      setLoadingSettings(false);
    };
    loadSyncSettings();
  }, [syncResult, result]);

  // Load import history
  useEffect(() => {
    const loadHistory = async () => {
      setLoadingHistory(true);
      const { data } = await supabase
        .from('agent_history_imports')
        .select('*, profiles:agent_profile_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(20);
      setImportHistory(data || []);
      setLoadingHistory(false);
    };
    loadHistory();
  }, [result, syncResult]);

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    if (importType === 'rcca_performance_dashboard') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        const base64 = dataUrl.split(',')[1];
        setCsvHeaders([]);
        setCsvData({ base64 });
      };
      reader.onerror = (err) => {
        alert('File read error: ' + err.message);
      };
      reader.readAsDataURL(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvHeaders(results.meta.fields || []);
          setCsvData(results.data);
        },
        error: (err) => {
          alert('CSV parse error: ' + err.message);
        },
      });
    }
  };

  // Resolve template dynamically based on agent selection type
  const getCsvTemplate = (type, isMulti) => {
    if (type === 'okr_history' && isMulti) {
      return 'Timestamp,Email Address,Llamados,PL,ACM,Listing,Exclusivas,consultas,Muestras,Reservas,Transacciones,$$$$\n1/3/2026 5:29:05,kris@remax-altitud,5,2,1,1,0,3,1,0,0,0';
    }
    return CSV_TEMPLATES[type];
  };

  // Download template
  const downloadTemplate = (type) => {
    if (type === 'rcca_performance_dashboard') {
      alert(lang === 'en'
        ? 'The RCCA Performance Dashboard spreadsheet is provided directly by REMAX Central America. Please upload the unaltered Excel file (.xlsx).'
        : 'La planilla de Performance Dashboard de RCCA es provista directamente por REMAX Centroamérica. Por favor, suba el archivo Excel (.xlsx) sin modificaciones.');
      return;
    }
    const csv = getCsvTemplate(type, selectedAgent === 'multi_agent');
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    let filename = `template_${type}.csv`;
    if (selectedAgent === 'multi_agent' && type === 'okr_history') {
      filename = 'template_okr_central.csv';
    } else if (type === 'historical_commissions') {
      filename = 'template_comisiones_historicas.csv';
    }
    
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Execute import
  const handleImport = async () => {
    if (!selectedAgent || !csvData || (Array.isArray(csvData) && csvData.length === 0)) return;
    setImporting(true);
    setResult(null);

    try {
      let endpoint, payload;

      if (importType === 'properties_sold' || importType === 'properties_active') {
        endpoint = '/api/properties/bulk-import';
        payload = {
          properties: csvData,
          agentProfileId: selectedAgent,
          importedBy: profiles.find(p => p.role === 'broker')?.id || selectedAgent,
          importType,
          fileName,
        };
      } else if (importType === 'okr_history') {
        endpoint = '/api/okr/bulk-import';
        payload = {
          entries: csvData,
          profileId: selectedAgent,
        };
      } else if (importType === 'historical_commissions') {
        endpoint = '/api/oficina/import-performance';
        payload = {
          entries: csvData,
          fileName,
          importedBy: profiles.find(p => p.role === 'broker')?.id || (selectedAgent === 'multi_agent' ? null : selectedAgent),
        };
      } else if (importType === 'rcca_performance_dashboard') {
        endpoint = '/api/oficina/import-rcca-performance';
        payload = {
          fileBase64: csvData.base64,
          fileName,
          importedBy: profiles.find(p => p.role === 'broker')?.id || (selectedAgent === 'multi_agent' ? null : selectedAgent),
        };
      } else if (importType === 'leads') {
        // Direct insert into property_inquiries
        const records = csvData.map(row => ({
          lead_name: row.lead_name || row.nombre || '',
          lead_email: row.lead_email || row.email || '',
          lead_phone: row.lead_phone || row.telefono || '',
          reason: row.motivo || row.reason || 'propiedad',
          source: row.fuente || row.source || 'importacion',
          reconnect_listing_id: row.property_id || null,
          notes: row.notas || row.notes || '',
          assigned_agent_id: selectedAgent,
          status: 'new',
        }));

        const { data, error } = await supabase
          .from('property_inquiries')
          .insert(records);

        if (error) throw error;

        setResult({
          success: true,
          total: records.length,
          imported: records.length,
        });
        setCsvData(null);
        setFileName('');
        setImporting(false);
        return;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        setCsvData(null);
        setFileName('');
      }
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setImporting(false);
    }
  };

  const agentProfiles = profiles.filter(p => p.role !== 'broker' || true); // Show all for flexibility

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black italic text-slate-900 dark:text-white">
            📥 {t('auto_data_import')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'en'
              ? 'Upload historical data or synchronize with Google Sheets.'
              : 'Sube datos históricos o sincroniza con Google Sheets.'}
          </p>
        </div>
      </div>

      {/* Step 1: Select Agent */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
          {t('auto_1_select_target_agent')}
        </h3>
        <select
          value={selectedAgent}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedAgent(val);
            if (val === 'multi_agent') {
              setImportType('okr_history');
            }
            setCsvData(null);
            setFileName('');
            setResult(null);
          }}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('auto_select_target')}</option>
          <option value="multi_agent" className="font-bold text-blue-600 dark:text-blue-400">
            📊 {t('auto_central_okr_sheet_multi')}
          </option>
          {agentProfiles.map(p => (
            <option key={p.id} value={p.id}>
              {p.full_name} ({p.email}) — {p.role}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Import Type */}
      {selectedAgent && (
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            {t('auto_2_import_type')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {IMPORT_TYPES.map(type => {
              const isDisabled = selectedAgent === 'multi_agent' && type.key !== 'okr_history' && type.key !== 'historical_commissions' && type.key !== 'rcca_performance_dashboard';
              return (
                <button
                  key={type.key}
                  disabled={isDisabled}
                  onClick={() => { setImportType(type.key); setCsvData(null); setFileName(''); setResult(null); }}
                  className={`p-3 rounded-xl text-left transition-all border ${
                    importType === type.key
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 ring-2 ring-blue-400/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span className="text-xl">{type.icon}</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                    {lang === 'en' ? type.label_en : type.label_es}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {isDisabled 
                      ? (t('auto_only_supports_single_agent')) 
                      : (lang === 'en' ? type.desc_en : type.desc_es)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Google Sheets Sync Trigger (Special view for Central OKR Sheet) */}
      {selectedAgent === 'multi_agent' && importType === 'okr_history' && (
        <div className="glass-panel rounded-2xl p-6 bg-gradient-to-br from-blue-50/50 to-white dark:from-slate-900/50 dark:to-slate-950 border border-blue-200/50 dark:border-blue-800/30 shadow-xl">
          <div className="flex items-start gap-4">
            <span className="text-3xl shrink-0 mt-1">🔄</span>
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {t('auto_google_sheets_auto_sync')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === 'en' 
                  ? 'Fetch agent activities directly from your central Google Sheet in real time. No manual CSV uploads needed!' 
                  : 'Importa la actividad de todos los agentes directamente desde tu planilla central de Google Sheets en tiempo real sin subir archivos.'}
              </p>
            </div>
          </div>

          {syncSettings.okr_sheet_url ? (
            <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                    {t('auto_configured_sheet_link')}
                  </span>
                  <span className="text-[10px] text-blue-500 font-mono block truncate max-w-sm mt-0.5 select-all">
                    {syncSettings.okr_sheet_url}
                  </span>
                </div>
                {syncSettings.okr_sheet_last_synced && (
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                      {t('auto_last_synced')}
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium block mt-0.5">
                      {new Date(syncSettings.okr_sheet_last_synced).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={async () => {
                  setSyncingSheet(true);
                  setSyncResult(null);
                  try {
                    const broker = profiles.find(p => p.role === 'broker')?.id;
                    const res = await fetch('/api/okr/sync-sheet', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ officeId: 'altitud', triggeredBy: broker })
                    });
                    const data = await res.json();
                    setSyncResult(data);
                  } catch (err) {
                    setSyncResult({ error: err.message });
                  } finally {
                    setSyncingSheet(false);
                  }
                }}
                disabled={syncingSheet}
                className="w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-blue-600 to-indigo-50 text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-400 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {syncingSheet ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('auto_syncing')}
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    {t('auto_sync_live_google_sheet')}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-800/20 text-center">
              <span className="text-xl">⚠️</span>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400 mt-2">
                {t('auto_auto_sync_link_not')}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {lang === 'en'
                  ? 'To enable single-click syncing, paste your published Google Sheet CSV URL under the "API Integrations" settings tab.'
                  : 'Para habilitar la sincronización con un solo clic, pega la URL de CSV publicado de Google Sheets en la pestaña de configuraciones "Integraciones API".'}
              </p>
            </div>
          )}

          {syncResult && (
            <div className={`mt-4 p-4 rounded-xl ${syncResult.success ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30' : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30'}`}>
              {syncResult.success ? (
                <div className="text-center">
                  <span className="text-2xl">🎉</span>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mt-1">
                    {t('auto_google_sheets_sync_completed')}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {syncResult.imported} {t('auto_records_updated')}
                    {syncResult.skipped > 0 && ` · ${syncResult.skipped} ${t('auto_skipped')}`}
                  </p>
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="mt-2 text-left">
                      <p className="text-[9px] font-bold text-red-500 mb-0.5">{syncResult.errors.length} {t('auto_warnings')}:</p>
                      <div className="max-h-20 overflow-y-auto text-[8px] text-red-400 space-y-0.5 font-mono">
                        {syncResult.errors.slice(0, 10).map((e, idx) => (
                          <p key={idx}>Fila {e.row}: {e.error}</p>
                        ))}
                        {syncResult.errors.length > 10 && <p className="text-[8px] text-slate-400">...y {syncResult.errors.length - 10} más</p>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-2xl">❌</span>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">{syncResult.error}</p>
                  {syncResult.details && <p className="text-[9px] text-red-400 mt-0.5 max-w-md mx-auto font-medium">{syncResult.details}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Upload CSV */}
      {selectedAgent && importType && (
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {selectedAgent === 'multi_agent' 
                ? (t('auto_3_or_manually_upload'))
                : (t('auto_3_upload_csv_file'))}
            </h3>
            <button
              onClick={() => downloadTemplate(importType)}
              className="text-[10px] font-bold text-blue-500 hover:text-blue-600 transition-colors"
            >
              📄 {t('auto_download_template')}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={importType === 'rcca_performance_dashboard' ? '.xlsx,.xls' : '.csv,.txt'}
            onChange={handleFileUpload}
            className="hidden"
          />

          {!csvData ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-center"
            >
              <svg className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {importType === 'rcca_performance_dashboard'
                  ? (lang === 'en' ? 'Click to upload Excel spreadsheet' : 'Haz clic para subir planilla Excel')
                  : t('auto_click_to_upload_csv')}
              </p>
              <p className="text-[9px] text-slate-400 mt-1">
                {importType === 'rcca_performance_dashboard' ? '.xlsx, .xls' : '.csv, .txt'}
              </p>
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📄</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{fileName}</span>
                  {importType !== 'rcca_performance_dashboard' && (
                    <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                      {csvData.length} {t('auto_rows')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setCsvData(null); setFileName(''); setResult(null); }}
                  className="text-xs text-red-500 hover:text-red-600 font-bold"
                >
                  ✕ {t('auto_remove')}
                </button>
              </div>

              {/* Preview table or Excel Glassmorphic Info Card */}
              {importType === 'rcca_performance_dashboard' ? (
                <div className="glass-panel rounded-xl p-4 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-800/30 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {lang === 'en' ? 'REMAX Central America Performance Excel Sheet' : 'Planilla Excel de Rendimiento REMAX Centroamérica'}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {lang === 'en' ? 'Detected Excel spreadsheet. Ready for ingestion.' : 'Planilla Excel detectada. Lista para su procesamiento.'}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 grid grid-cols-2 gap-2 text-[10px] text-slate-600 dark:text-slate-400 text-left">
                    <div>
                      <span className="font-bold">Format:</span> Excel Spreadsheet (.xlsx)
                    </div>
                    <div>
                      <span className="font-bold">Target:</span> Altitud Office Dashboard + Agent Commissions
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden overflow-x-auto max-h-60">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800">
                          <th className="px-2 py-1.5 text-left text-slate-500 font-bold">#</th>
                          {csvHeaders.slice(0, 8).map(h => (
                            <th key={h} className="px-2 py-1.5 text-left text-slate-500 font-bold whitespace-nowrap">{h}</th>
                          ))}
                          {csvHeaders.length > 8 && <th className="px-2 py-1.5 text-slate-400">+{csvHeaders.length - 8}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                            {csvHeaders.slice(0, 8).map(h => (
                              <td key={h} className="px-2 py-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[120px] truncate">
                                {row[h] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvData.length > 5 && (
                    <p className="text-[9px] text-center text-slate-400 mt-1">
                      +{csvData.length - 5} {t('auto_more_rows')}
                    </p>
                  )}
                </>
              )}

              {/* Import button */}
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full mt-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {importing
                  ? (t('auto_importing'))
                  : importType === 'rcca_performance_dashboard'
                    ? (lang === 'en' ? 'Ingest & Process Performance Data' : 'Ingresar y Procesar Datos de Performance')
                    : (lang === 'en' ? `Import ${csvData.length} Records` : `Importar ${csvData.length} Registros`)
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`glass-panel rounded-2xl p-5 ${result.success ? 'border-emerald-300 dark:border-emerald-700' : 'border-red-300 dark:border-red-700'} border`}>
          {result.success ? (
            <div className="text-center">
              <span className="text-3xl">🎉</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {t('auto_import_successful')}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {result.imported} {t('auto_records_imported')}
                {result.skipped > 0 && ` · ${result.skipped} ${t('auto_skipped')}`}
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-3 text-left">
                  <p className="text-[10px] font-bold text-red-500 mb-1">{result.errors.length} {t('auto_errors')}:</p>
                  <div className="max-h-24 overflow-y-auto text-[9px] text-red-400 space-y-0.5">
                    {result.errors.map((e, i) => (
                      <p key={i}>Row {e.row}: {e.error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <span className="text-3xl">❌</span>
              <p className="text-sm font-bold text-red-500 mt-2">{result.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Import History */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
          {t('auto_import_history')}
        </h3>
        {loadingHistory ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : importHistory.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            {t('auto_no_imports_yet')}
          </p>
        ) : (
          <div className="space-y-2">
            {importHistory.map(h => (
              <div key={h.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm">{IMPORT_TYPES.find(t => t.key === h.import_type)?.icon || '📄'}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {h.profiles?.full_name || 'Agent'}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {lang === 'en'
                        ? IMPORT_TYPES.find(t => t.key === h.import_type)?.label_en
                        : IMPORT_TYPES.find(t => t.key === h.import_type)?.label_es}
                      {' · '}{h.file_name}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {h.imported_rows}/{h.total_rows}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    {new Date(h.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
