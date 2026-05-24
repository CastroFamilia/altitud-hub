"use client";

import { useState, useEffect, useRef } from 'react';
import TopNav from '@/components/layout/TopNav';
import { useApp } from '@/lib/context';
import { trackOkrActivity } from '@/lib/okr-tracker';
import AcmPrintForm from '@/components/printables/AcmPrintForm';

import { useAuth } from '@/lib/auth-context';

// Extract Google Drive Folder ID from any valid Google Drive URL
export function extractDriveFolderId(url) {
  if (!url) return null;
  const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  return null;
}

// Premium color helper for Cap Rate
function getCapRateClass(rate) {
  const n = Number(rate);
  if (!n) return { text: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' };
  if (n >= 12) return { text: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  if (n >= 8)  return { text: 'text-amber-500',   bg: 'bg-amber-500/10' };
  return        { text: 'text-red-500',    bg: 'bg-red-500/10' };
}

export default function ACMClient({ initialProperties = [] }) {
  const { t, lang } = useApp();
  const { user, profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // general | comparables | rentabilidad | reposicion | consolidado
  const [filterTab, setFilterTab] = useState('all'); // all | draft | completed

  // Google Drive Integration States
  const [showDriveAlertModal, setShowDriveAlertModal] = useState(false);
  const [createdFolderUrl, setCreatedFolderUrl] = useState('');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const handleCloseDriveAlert = () => {
    if (dontShowAgain) {
      typeof window !== 'undefined' && localStorage.setItem('hide_drive_prelisting_alert', 'true');
    }
    setShowDriveAlertModal(false);
  };

  const handlePasteDriveUrl = (url) => {
    if (!url) {
      setAcmForm(prev => ({ ...prev, drive_folder_id: '', drive_folder_url: '' }));
      return;
    }
    const parsedId = extractDriveFolderId(url);
    if (parsedId) {
      setAcmForm(prev => ({ ...prev, drive_folder_id: parsedId, drive_folder_url: url }));
    } else {
      setAcmForm(prev => ({ ...prev, drive_folder_url: url }));
    }
  };

  const handleAutoCreateFolder = async () => {
    const propAddress = acmForm.property_address;
    if (!propAddress) {
      alert(lang === 'en' ? 'Please enter a property address first to name the folder.' : 'Por favor ingresa una dirección de propiedad primero para nombrar la carpeta.');
      return;
    }

    setIsCreatingFolder(true);
    try {
      const agentName = profile?.full_name || user?.user_metadata?.full_name || 'Agent';
      const agentEmail = user?.email || null;
      
      const driveRes = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName, agentEmail, propertyName: propAddress }),
      });
      const driveData = await driveRes.json();
      if (driveData.success) {
        setAcmForm(prev => ({
          ...prev,
          drive_folder_id: driveData.folderId,
          drive_folder_url: driveData.folderUrl
        }));

        const hideAlert = typeof window !== 'undefined' ? localStorage.getItem('hide_drive_prelisting_alert') === 'true' : false;
        if (!hideAlert) {
          setCreatedFolderUrl(driveData.folderUrl);
          setShowDriveAlertModal(true);
        } else {
          alert(lang === 'en' ? 'Google Drive folder successfully created and connected.' : 'Carpeta de Google Drive creada y conectada exitosamente.');
        }
      } else {
        alert('Error: ' + (driveData.error || 'No se pudo crear la carpeta.'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al crear la carpeta: ' + err.message);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleCreateFolderForExistingRow = async (report) => {
    const propAddress = report.property_address || 'Nueva Propiedad';
    try {
      const agentName = profile?.full_name || user?.user_metadata?.full_name || 'Agent';
      const agentEmail = user?.email || null;

      const driveRes = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName, agentEmail, propertyName: propAddress }),
      });
      const driveData = await driveRes.json();
      if (driveData.success) {
        const payload = {
          ...report,
          drive_folder_id: driveData.folderId,
          drive_folder_url: driveData.folderUrl
        };
        const saveRes = await fetch('/api/acm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (saveRes.ok) {
          setReports(prev => prev.map(r => {
            if (r.id === report.id) {
              return { ...r, drive_folder_id: driveData.folderId, drive_folder_url: driveData.folderUrl };
            }
            return r;
          }));

          const hideAlert = typeof window !== 'undefined' ? localStorage.getItem('hide_drive_prelisting_alert') === 'true' : false;
          if (!hideAlert) {
            setCreatedFolderUrl(driveData.folderUrl);
            setShowDriveAlertModal(true);
          } else {
            alert(lang === 'en' ? 'Google Drive folder successfully created and connected.' : 'Carpeta de Google Drive creada y conectada exitosamente.');
          }
        }
      } else {
        alert('Error: ' + (driveData.error || 'No se pudo crear la carpeta.'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al crear la carpeta: ' + err.message);
    }
  };

  const handleLinkExistingFolderForExistingRow = async (report) => {
    const urlPrompt = prompt(
      lang === 'en' 
        ? "Please paste the Google Drive folder URL for this property:" 
        : "Por favor, pega el enlace (URL) de la carpeta de Google Drive para esta propiedad:"
    );
    if (!urlPrompt) return;

    const parsedId = extractDriveFolderId(urlPrompt);
    if (!parsedId) {
      alert(
        lang === 'en'
          ? "Invalid Google Drive folder link. Please ensure it contains '/folders/ID' or '?id=ID'."
          : "Enlace de carpeta de Google Drive inválido. Por favor asegúrate de que contenga '/folders/ID' o '?id=ID'."
      );
      return;
    }

    try {
      const payload = {
        ...report,
        drive_folder_id: parsedId,
        drive_folder_url: urlPrompt
      };
      const saveRes = await fetch('/api/acm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (saveRes.ok) {
        setReports(prev => prev.map(r => {
          if (r.id === report.id) {
            return { ...r, drive_folder_id: parsedId, drive_folder_url: urlPrompt };
          }
          return r;
        }));

        alert(
          lang === 'en'
            ? "Google Drive folder successfully associated with this report!"
            : "¡Carpeta de Google Drive vinculada exitosamente con este reporte!"
        );
      }
    } catch (err) {
      console.error("Error linking Drive folder:", err);
      alert("Error: " + err.message);
    }
  };

  // Main ACM report state
  const [acmForm, setAcmForm] = useState({
    id: null,
    client_name: '',
    client_phone: '',
    client_email: '',
    property_address: '',
    property_type: 'casa',
    property_category: 'residential',
    office: 'altitud',
    suggested_price: '',
    price_range_low: '',
    price_range_high: '',
    agent_notes: '',
    status: 'draft',
    drive_folder_id: '',
    drive_folder_url: '',
    
    // Rentabilidad fields
    rental_units: '',
    rental_price: '',
    expenses_amount: '',
    expenses_period: 'monthly',
    cap_rate: '',
    gross_income: 0,
    total_expenses: 0,
    noi: 0,
    rental_value: 0,

    // Indicators for Reposicion & Comparables sample
    indicators: {
      active_methods: ['comparables'],
      weights: { comparables: 100, rentabilidad: 0, reposicion: 0 },
      comp_avg: '',
      comp_min: '',
      comp_max: '',
      comp_suggested: '',
      comp_properties: [
        { address: '', size: '', price: '', status: 'activo' },
        { address: '', size: '', price: '', status: 'activo' }
      ],
      land_area: '',
      land_price_m2: '',
      const_area: '',
      const_price_m2: '',
      depreciation_pct: ''
    }
  });

  const [savingStatus, setSavingStatus] = useState('idle'); // idle | saving | success | error
  const printRef = useRef(null);

  // Load ACM reports from database
  const loadReports = async () => {
    try {
      const res = await fetch('/api/acm');
      const data = await res.json();
      if (data.reports) setReports(data.reports);
    } catch (err) {
      console.error('Error fetching ACMs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReports();
  }, []);

  const handleEdit = (report) => {
    // Standardize structure for older databases
    const indicatorsRaw = report.indicators || {};
    const standardIndicators = {
      active_methods: indicatorsRaw.active_methods || ['comparables'],
      weights: indicatorsRaw.weights || { comparables: 100, rentabilidad: 0, reposicion: 0 },
      comp_avg: indicatorsRaw.comp_avg || '',
      comp_min: indicatorsRaw.comp_min || '',
      comp_max: indicatorsRaw.comp_max || '',
      comp_suggested: indicatorsRaw.comp_suggested || '',
      comp_properties: indicatorsRaw.comp_properties || [
        { address: '', size: '', price: '', status: 'activo' },
        { address: '', size: '', price: '', status: 'activo' }
      ],
      land_area: indicatorsRaw.land_area || '',
      land_price_m2: indicatorsRaw.land_price_m2 || '',
      const_area: indicatorsRaw.const_area || '',
      const_price_m2: indicatorsRaw.const_price_m2 || '',
      depreciation_pct: indicatorsRaw.depreciation_pct || ''
    };

    setAcmForm({
      id: report.id,
      client_name: report.client_name || '',
      client_phone: report.client_phone || '',
      client_email: report.client_email || '',
      property_address: report.property_address || '',
      property_type: report.property_type || 'casa',
      property_category: report.property_category || 'residential',
      office: report.office || 'altitud',
      suggested_price: report.suggested_price || '',
      price_range_low: report.price_range_low || '',
      price_range_high: report.price_range_high || '',
      agent_notes: report.agent_notes || '',
      status: report.status || 'draft',
      drive_folder_id: report.drive_folder_id || '',
      drive_folder_url: report.drive_folder_url || '',
      
      rental_units: report.rental_units || '',
      rental_price: report.rental_price || '',
      expenses_amount: report.expenses_amount || '',
      expenses_period: report.expenses_period || 'monthly',
      cap_rate: report.cap_rate || '',
      gross_income: report.gross_income || 0,
      total_expenses: report.total_expenses || 0,
      noi: report.noi || 0,
      rental_value: report.rental_value || 0,
      
      indicators: standardIndicators
    });
    setIsEditing(true);
    setActiveTab('general');
  };

  const handleNewACM = () => {
    setAcmForm({
      id: null,
      client_name: '',
      client_phone: '',
      client_email: '',
      property_address: '',
      property_type: 'casa',
      property_category: 'residential',
      office: 'altitud',
      suggested_price: '',
      price_range_low: '',
      price_range_high: '',
      agent_notes: '',
      status: 'draft',
      drive_folder_id: '',
      drive_folder_url: '',
      
      rental_units: '',
      rental_price: '',
      expenses_amount: '',
      expenses_period: 'monthly',
      cap_rate: '',
      gross_income: 0,
      total_expenses: 0,
      noi: 0,
      rental_value: 0,

      indicators: {
        active_methods: ['comparables'],
        weights: { comparables: 100, rentabilidad: 0, reposicion: 0 },
        comp_avg: '',
        comp_min: '',
        comp_max: '',
        comp_suggested: '',
        comp_properties: [
          { address: '', size: '', price: '', status: 'activo' },
          { address: '', size: '', price: '', status: 'activo' }
        ],
        land_area: '',
        land_price_m2: '',
        const_area: '',
        const_price_m2: '',
        depreciation_pct: ''
      }
    });
    setIsEditing(true);
    setActiveTab('general');
  };

  const handleDelete = async (id) => {
    if (!confirm(t('acm_confirm_delete'))) return;
    try {
      const res = await fetch(`/api/acm?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReports(reports.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Error deleting report:', err);
    }
  };

  // Perform live calculations whenever form variables change
  const calcForm = acmForm;
  
  // Rentabilidad math
  const units = Number(calcForm.rental_units) || 0;
  const rentPrice = Number(calcForm.rental_price) || 0;
  const grossIncome = units * rentPrice * 12;
  const expAmt = Number(calcForm.expenses_amount) || 0;
  const annualExpenses = calcForm.expenses_period === 'monthly' ? expAmt * 12 : expAmt;
  const noi = grossIncome - annualExpenses;
  const capRate = Number(calcForm.cap_rate) || 0;
  const rentalValue = capRate > 0 ? noi / (capRate / 100) : 0;

  // Reposicion math
  const landArea = Number(calcForm.indicators.land_area) || 0;
  const landPriceM2 = Number(calcForm.indicators.land_price_m2) || 0;
  const constArea = Number(calcForm.indicators.const_area) || 0;
  const constPriceM2 = Number(calcForm.indicators.const_price_m2) || 0;
  const depreciationPct = Number(calcForm.indicators.depreciation_pct) || 0;
  
  const landValueTotal = landArea * landPriceM2;
  const constNewVal = constArea * constPriceM2;
  const depreciationAmount = constNewVal * (depreciationPct / 100);
  const constDepreciatedVal = constNewVal - depreciationAmount;
  const replacementValue = landValueTotal + constDepreciatedVal;

  // Comparables math
  const compAvg = Number(calcForm.indicators.comp_avg) || 0;
  const compMin = Number(calcForm.indicators.comp_min) || 0;
  const compMax = Number(calcForm.indicators.comp_max) || 0;
  const compSuggested = Number(calcForm.indicators.comp_suggested) || 0;

  // Consolidated math
  const activeMethods = calcForm.indicators.active_methods || [];
  const weights = calcForm.indicators.weights || { comparables: 100, rentabilidad: 0, reposicion: 0 };
  
  // Calculate weighted valuation
  let totalWeightedValue = 0;
  let totalWeightSum = 0;
  
  if (activeMethods.includes('comparables')) {
    totalWeightedValue += compSuggested * (weights.comparables / 100);
    totalWeightSum += weights.comparables;
  }
  if (activeMethods.includes('rentabilidad')) {
    totalWeightedValue += rentalValue * (weights.rentabilidad / 100);
    totalWeightSum += weights.rentabilidad;
  }
  if (activeMethods.includes('reposicion')) {
    totalWeightedValue += replacementValue * (weights.reposicion / 100);
    totalWeightSum += weights.reposicion;
  }

  const finalConsolidatedValue = totalWeightSum > 0 ? (totalWeightedValue / (totalWeightSum / 100)) : 0;

  // Auto-fill suggested prices
  useEffect(() => {
    if (!isEditing) return;
    
    // Automatically pre-fill the final suggested price if consolidated calculation is active
    if (finalConsolidatedValue > 0) {
      setAcmForm(prev => ({
        ...prev,
        suggested_price: Math.round(finalConsolidatedValue),
        price_range_low: Math.round(finalConsolidatedValue * 0.95),
        price_range_high: Math.round(finalConsolidatedValue * 1.05)
      }));
    }
  }, [finalConsolidatedValue, isEditing]);

  const handleWeightChange = (method, value) => {
    const numVal = Number(value) || 0;
    setAcmForm(prev => {
      const nextWeights = { ...prev.indicators.weights, [method]: numVal };
      return {
        ...prev,
        indicators: {
          ...prev.indicators,
          weights: nextWeights
        }
      };
    });
  };

  const handleActiveMethodToggle = (method) => {
    setAcmForm(prev => {
      let nextActive = [...prev.indicators.active_methods];
      if (nextActive.includes(method)) {
        nextActive = nextActive.filter(m => m !== method);
      } else {
        nextActive.push(method);
      }

      // Re-distribute weights equally among active methods
      const count = nextActive.length;
      const equalWeight = count > 0 ? Math.round(100 / count) : 0;
      const nextWeights = { comparables: 0, rentabilidad: 0, reposicion: 0 };
      nextActive.forEach(m => {
        nextWeights[m] = equalWeight;
      });

      // Ensure sum is exactly 100
      const currentSum = Object.values(nextWeights).reduce((a, b) => a + b, 0);
      if (currentSum !== 100 && count > 0) {
        nextWeights[nextActive[0]] += (100 - currentSum);
      }

      return {
        ...prev,
        indicators: {
          ...prev.indicators,
          active_methods: nextActive,
          weights: nextWeights
        }
      };
    });
  };

  const handleSaveWorkspace = async () => {
    setSavingStatus('saving');
    try {
      const payload = {
        ...acmForm,
        gross_income: grossIncome || null,
        total_expenses: annualExpenses || null,
        noi: noi || null,
        rental_value: rentalValue || null,
        indicators: {
          ...acmForm.indicators,
          comp_avg: compAvg || null,
          comp_min: compMin || null,
          comp_max: compMax || null,
          comp_suggested: compSuggested || null,
          land_area: landArea || null,
          land_price_m2: landPriceM2 || null,
          const_area: constArea || null,
          const_price_m2: constPriceM2 || null,
          depreciation_pct: depreciationPct || null
        }
      };

      const res = await fetch('/api/acm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setSavingStatus('success');
      trackOkrActivity('acm');
      loadReports();
      setTimeout(() => {
        setSavingStatus('idle');
        setIsEditing(false);
      }, 1500);
    } catch (err) {
      console.error('Error saving workspace:', err);
      setSavingStatus('error');
      setTimeout(() => setSavingStatus('idle'), 3000);
    }
  };

  const handlePrintSelected = (report) => {
    // Trigger popup print stream directly for a report
    const printWindow = window.open('', '_blank');
    const container = document.createElement('div');
    
    // Create a temporary container
    document.body.appendChild(container);
    
    // Inject custom print content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ACM - ${report.property_address || 'REMAX Altitud'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Montserrat', sans-serif; color: #1e293b; background: #fff; }
          @page { size: letter; margin: 0.6in 0.7in; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div id="print-root"></div>
      </body>
      </html>
    `);
    
    // Render the React print form into the new window's DOM
    const printRoot = printWindow.document.getElementById('print-root');
    const printableHtml = document.getElementById(`printable-report-${report.id}`).innerHTML;
    printRoot.innerHTML = printableHtml;
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 450);
  };

  const handleFormArrayChange = (idx, field, val) => {
    setAcmForm(prev => {
      const nextProps = [...prev.indicators.comp_properties];
      nextProps[idx] = { ...nextProps[idx], [field]: val };
      return {
        ...prev,
        indicators: {
          ...prev.indicators,
          comp_properties: nextProps
        }
      };
    });
  };

  const addCompProperty = () => {
    setAcmForm(prev => ({
      ...prev,
      indicators: {
        ...prev.indicators,
        comp_properties: [...prev.indicators.comp_properties, { address: '', size: '', price: '', status: 'activo' }]
      }
    }));
  };

  const fmt = (v) => v > 0 ? `$${Math.round(v).toLocaleString()}` : '—';

  // Filters for lists
  const filteredReports = reports.filter(r => {
    if (filterTab === 'draft') return r.status === 'draft';
    if (filterTab === 'completed') return r.status === 'completed';
    return true;
  });

  return (
    <>
      <TopNav titleKey="header_title" subtitleKey="header_subtitle" />

      {/* Hidden printable templates in the background to render into the print stream */}
      <div style={{ display: 'none' }}>
        {reports.map(r => (
          <div key={r.id} id={`printable-report-${r.id}`}>
            <AcmPrintForm report={r} />
          </div>
        ))}
        {isEditing && (
          <div id="printable-active-form">
            <AcmPrintForm report={{
              ...acmForm,
              gross_income: grossIncome,
              total_expenses: annualExpenses,
              noi: noi,
              rental_value: rentalValue,
              indicators: {
                ...acmForm.indicators,
                comp_avg: compAvg,
                comp_min: compMin,
                comp_max: compMax,
                comp_suggested: compSuggested,
                land_area: landArea,
                land_price_m2: landPriceM2,
                const_area: constArea,
                const_price_m2: constPriceM2,
                depreciation_pct: depreciationPct
              }
            }} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 bg-slate-50 dark:bg-dark-bg relative z-0">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* VIEW A: SAVED ACM REPORTS DASHBOARD                              */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {!isEditing && (
            <div className="fade-in space-y-6">
              
              {/* Header section with actions */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-black italic tracking-tight text-gray-900 dark:text-white uppercase">
                    {t('dash_acm_title')}
                  </h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">
                    {t('dash_acm_subtitle')}
                  </p>
                </div>
                
                <button
                  onClick={handleNewACM}
                  className="px-6 py-3 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-95 whitespace-nowrap self-start sm:self-auto"
                >
                  + {t('dash_btn_new_acm')}
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t('dash_stat_acm_created'), val: reports.length, color: 'text-blue-600 dark:text-blue-400' },
                  { label: t('dash_stat_acm_draft'), val: reports.filter(r => r.status === 'draft').length, color: 'text-amber-500' },
                  { label: 'Completados', val: reports.filter(r => r.status === 'completed').length, color: 'text-emerald-500' },
                  { label: 'Valor Sugerido Promedio', val: fmt(reports.length > 0 ? reports.reduce((acc, curr) => acc + (curr.suggested_price || 0), 0) / reports.length : 0), color: 'text-indigo-500 font-black' },
                ].map((stat, idx) => (
                  <div key={idx} className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{stat.label}</p>
                    <h3 className={`text-2xl font-black mt-2 italic ${stat.color}`}>{stat.val}</h3>
                  </div>
                ))}
              </div>

              {/* Filtering tabs */}
              <div className="flex bg-slate-200 dark:bg-dark-panel p-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-inner w-full md:w-96">
                {[
                  { key: 'all', label: t('dash_acm_tab_all') },
                  { key: 'draft', label: t('dash_acm_tab_draft') },
                  { key: 'completed', label: 'Completados' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterTab(tab.key)}
                    className={`flex-1 py-2.5 rounded-lg transition-all ${
                      filterTab === tab.key
                        ? 'bg-white dark:bg-dark-bg text-blue-600 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ACM Reports Table/List */}
              {loading ? (
                <div className="text-center py-20 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('auto_loading_workspace')}</div>
              ) : filteredReports.length > 0 ? (
                <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-dark-panel border-b border-gray-200 dark:border-dark-border text-gray-400 font-bold uppercase tracking-wider">
                          <th className="p-4">{t('acm_linked_property')}</th>
                          <th className="p-4">{t('acm_client')}</th>
                          <th className="p-4">{t('acm_date')}</th>
                          <th className="p-4">{t('auto_active_methods')}</th>
                          <th className="p-4 text-center">Drive</th>
                          <th className="p-4 text-right">{t('acm_suggested_short')}</th>
                          <th className="p-4 text-center">{t('acm_actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReports.map(report => {
                          const repActive = report.indicators?.active_methods || ['comparables'];
                          return (
                            <tr key={report.id} className="border-b border-gray-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-input/50 transition-colors">
                              <td className="p-4 font-bold text-gray-900 dark:text-white">
                                {report.property_address || 'Sin Dirección'}
                              </td>
                              <td className="p-4 font-semibold text-gray-700 dark:text-gray-300">
                                {report.client_name || '—'}
                              </td>
                              <td className="p-4 text-gray-500 font-medium">
                                {new Date(report.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-4 flex gap-1.5 flex-wrap items-center mt-1">
                                {repActive.map(method => (
                                  <span key={method} className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                    {method}
                                  </span>
                                ))}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {report.drive_folder_url ? (
                                    <a 
                                      href={report.drive_folder_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                                      title={lang === 'en' ? "Open Google Drive Base Folder" : "Abrir Carpeta Base en Google Drive"}
                                    >
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7.71 3.5L1.15 15l4.58 7.5h13.54l4.58-7.5L17.29 3.5H7.71z" /></svg>
                                    </a>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleCreateFolderForExistingRow(report)}
                                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                                        title={lang === 'en' ? "Auto-Create Google Drive Folder" : "Auto-Crear Carpeta de Google Drive"}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                                      </button>
                                      <button
                                        onClick={() => handleLinkExistingFolderForExistingRow(report)}
                                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                                        title={lang === 'en' ? "Link Existing Google Drive Folder" : "Vincular Carpeta de Google Drive Existente"}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-right font-black italic text-sm text-blue-600 dark:text-blue-400">
                                {fmt(report.suggested_price)}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handlePrintSelected(report)}
                                    className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-panel dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-lg font-bold transition-all"
                                    title={t('acm_btn_print_single')}
                                  >
                                    🖨️
                                  </button>
                                  <button
                                    onClick={() => handleEdit(report)}
                                    className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg font-bold transition-all"
                                  >
                                    {t('auto_edit')}
                                  </button>
                                  <button
                                    onClick={() => handleDelete(report.id)}
                                    className="bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-500 p-2 rounded-lg font-bold transition-all"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="glass-panel rounded-2xl p-16 text-center border border-dashed border-gray-300 dark:border-dark-border">
                  <span className="text-3xl">📊</span>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-3">{t('dash_acm_empty')}</p>
                  <button
                    onClick={handleNewACM}
                    className="mt-4 text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold uppercase tracking-wider"
                  >
                    {t('dash_btn_new_acm')} →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* VIEW B: CONSOLIDATED APPRAISAL CREATOR / WORKSPACE                */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {isEditing && (
            <div className="fade-in space-y-6">
              
              {/* Creator Nav / Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-dark-panel p-5 rounded-2xl border border-gray-200 dark:border-dark-border shadow-sm">
                <div>
                  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full uppercase tracking-wider">
                    {acmForm.id ? t('acm_editing_mode') : t('acm_create_consolidated')}
                  </span>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mt-2">
                    {acmForm.property_address || t('acm_workspace_title')}
                  </h3>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const printActiveWindow = window.open('', '_blank');
                      printActiveWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>{t('acm_preview_print')}</title>
                          <style>
                            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { font-family: 'Montserrat', sans-serif; color: #1e293b; background: #fff; }
                            @page { size: letter; margin: 0.6in 0.7in; }
                            @media print {
                              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            }
                          </style>
                        </head>
                        <body>
                          <div id="print-root"></div>
                        </body>
                        </html>
                      `);
                      const activeHtml = document.getElementById('printable-active-form').innerHTML;
                      printActiveWindow.document.getElementById('print-root').innerHTML = activeHtml;
                      printActiveWindow.document.close();
                      setTimeout(() => {
                        printActiveWindow.focus();
                        printActiveWindow.print();
                      }, 450);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-dark-bg text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    {t('acm_preview_print')}
                  </button>

                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    {t('auto_back_to_list')}
                  </button>
                </div>
              </div>

              {/* Creator split panel (Sidebar + active sheet) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 1. Sidebar selector */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-6">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-white/5 pb-2">
                      {t('acm_report_control')}
                    </h4>

                    {/* Active methodologies checklists */}
                    <div className="space-y-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('acm_active_methods')}</p>
                      
                      {[
                        { id: 'comparables', label: t('acm_type_comparables'), desc: 'Estudio de mercado' },
                        { id: 'rentabilidad', label: t('acm_type_rental'), desc: 'Capitalización NOI' },
                        { id: 'reposicion', label: t('acm_type_replacement'), desc: 'Costo depreciado + terreno' },
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleActiveMethodToggle(m.id)}
                          className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                            activeMethods.includes(m.id)
                              ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500'
                              : 'border-slate-200 dark:border-dark-border bg-transparent opacity-60'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">{m.label}</p>
                            <p className="text-[9px] text-gray-400 font-semibold">{m.desc}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            activeMethods.includes(m.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-700 bg-transparent'
                          }`}>
                            {activeMethods.includes(m.id) && '✓'}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Report Navigation Tabs */}
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider border-t border-white/5 pt-4">{t('acm_sections')}</p>
                      {[
                        { id: 'general', label: t('acm_general_data'), icon: '📝' },
                        { id: 'comparables', label: t('acm_comparables_tab'), icon: '📊', disabled: !activeMethods.includes('comparables') },
                        { id: 'rentabilidad', label: t('acm_rental_tab'), icon: '💰', disabled: !activeMethods.includes('rentabilidad') },
                        { id: 'reposicion', label: t('acm_replacement_tab'), icon: '🧱', disabled: !activeMethods.includes('reposicion') },
                        { id: 'consolidado', label: t('acm_consolidated_tab'), icon: '⚡' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => !tab.disabled && setActiveTab(tab.id)}
                          disabled={tab.disabled}
                          className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                            activeTab === tab.id
                              ? 'bg-blue-600 text-white font-bold'
                              : tab.disabled
                                ? 'opacity-30 cursor-not-allowed'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-dark-input'
                          }`}
                        >
                          <span className="text-sm">{tab.icon}</span>
                          <span className="text-xs uppercase tracking-wider">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Active Sheet Editor */}
                <div className="lg:col-span-8">
                  <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/10 min-h-[500px] flex flex-col justify-between">
                    <div>
                      
                      {/* =================================================== */}
                      {/* SECTION 1: GENERAL DATA                             */}
                      {/* =================================================== */}
                      {activeTab === 'general' && (
                        <div className="space-y-6 fade-in">
                          <div className="border-b border-white/5 pb-2">
                            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">{t('acm_basic_info')}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{t('acm_basic_info_desc')}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_client_name')}</span>
                              <input
                                type="text"
                                value={acmForm.client_name}
                                onChange={e => setAcmForm({ ...acmForm, client_name: e.target.value })}
                                placeholder={t('acm_client_name_placeholder')}
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_prop_address')}</span>
                              <input
                                type="text"
                                value={acmForm.property_address}
                                onChange={e => setAcmForm({ ...acmForm, property_address: e.target.value })}
                                placeholder={t('acm_prop_address_placeholder')}
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_client_phone')}</span>
                              <input
                                type="text"
                                value={acmForm.client_phone}
                                onChange={e => setAcmForm({ ...acmForm, client_phone: e.target.value })}
                                placeholder={t('acm_client_phone_placeholder')}
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_client_email')}</span>
                              <input
                                type="email"
                                value={acmForm.client_email}
                                onChange={e => setAcmForm({ ...acmForm, client_email: e.target.value })}
                                placeholder={t('acm_client_email_placeholder')}
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_prop_category')}</span>
                              <select
                                value={acmForm.property_category}
                                onChange={e => setAcmForm({ ...acmForm, property_category: e.target.value })}
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="residential">{t('acm_cat_residential')}</option>
                                <option value="commercial">{t('acm_cat_commercial')}</option>
                              </select>
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_prop_type')}</span>
                              <select
                                value={acmForm.property_type}
                                onChange={e => setAcmForm({ ...acmForm, property_type: e.target.value })}
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="casa">{t('acm_type_house')}</option>
                                <option value="apartamento">{t('acm_type_apartment')}</option>
                                <option value="lote">{t('acm_type_lot')}</option>
                                <option value="oficina">{t('acm_type_office')}</option>
                                <option value="local">{t('acm_type_commercial')}</option>
                                <option value="finca">{t('acm_type_farm')}</option>
                              </select>
                            </label>
                          </div>

                          {/* ═══ GOOGLE DRIVE INTEGRATION PANEL ═══ */}
                          <div className="mt-8 border-t border-gray-150 dark:border-dark-border/50 pt-6">
                            <h5 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <span>📂</span> {lang === 'en' ? 'Google Drive & Photos Folder Integration' : 'Integración de Carpeta de Google Drive y Fotos'}
                            </h5>
                            
                            {acmForm.drive_folder_url ? (
                              <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="space-y-1 text-left">
                                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {lang === 'en' ? 'Centralized base folder connected!' : '¡Carpeta base centralizada conectada!'}
                                  </p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 max-w-xl">
                                    {lang === 'en'
                                      ? "This folder acts as the single source of truth for the entire property lifecycle (Photos, Pre-Listing, ACM, and active Listings) so Olympia AI can index the documents correctly."
                                      : "Esta carpeta es la fuente de verdad única para todo el ciclo de la propiedad (Fotos, Pre-Listing, ACM, y Captaciones) para que Olympia AI pueda indexar los documentos."}
                                  </p>
                                  <a href={acmForm.drive_folder_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline block break-all font-mono">
                                    {acmForm.drive_folder_url}
                                  </a>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-auto shrink-0">
                                  <a 
                                    href={acmForm.drive_folder_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap"
                                  >
                                    {lang === 'en' ? 'Open Drive' : 'Abrir Carpeta'}
                                  </a>
                                  <button
                                    onClick={() => setAcmForm(prev => ({ ...prev, drive_folder_id: '', drive_folder_url: '' }))}
                                    className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap"
                                    title={lang === 'en' ? 'Unlink Folder' : 'Desvincular Carpeta'}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="glass-panel p-5 rounded-xl border border-gray-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-panel/40 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-1.5 text-left">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                      {lang === 'en' ? 'Vincular Carpeta de Drive Existente' : 'Vincular Carpeta de Drive Existente'}
                                    </span>
                                    <input 
                                      type="url" 
                                      value={acmForm.drive_folder_url || ''} 
                                      onChange={e => handlePasteDriveUrl(e.target.value)} 
                                      placeholder="https://drive.google.com/drive/folders/..." 
                                      className="px-4 py-3 bg-white dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 w-full animate-pulse-subtle"
                                    />
                                    <p className="text-[9px] text-gray-400">
                                      {lang === 'en' 
                                        ? "Paste the link to an existing folder to link it directly and avoid duplication."
                                        : "Pega el enlace de una carpeta de Drive que ya tengas para vincularla directamente."}
                                    </p>
                                  </div>
                                  <div className="flex flex-col justify-end items-stretch md:items-start pb-1">
                                    <div className="hidden md:block text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center w-full mb-3">— {lang === 'en' ? 'OR' : 'O'} —</div>
                                    <button
                                      type="button"
                                      disabled={isCreatingFolder}
                                      onClick={handleAutoCreateFolder}
                                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 w-full md:w-auto"
                                    >
                                      {isCreatingFolder ? (
                                        <>
                                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                          <span>{lang === 'en' ? 'Creating...' : 'Creando...'}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span>✨</span>
                                          <span>{lang === 'en' ? 'Auto-Create Base Folder' : 'Auto-Crear Carpeta Base'}</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* =================================================== */}
                      {/* SECTION 2: COMPARABLES METHOD                       */}
                      {/* =================================================== */}
                      {activeTab === 'comparables' && (
                        <div className="space-y-6 fade-in">
                          <div className="border-b border-white/5 pb-2">
                            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">{t('acm_comparables_title')}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Registra los valores estadísticos del estudio comparativo</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_comp_min')}</span>
                              <input
                                type="number"
                                value={acmForm.indicators.comp_min}
                                onChange={e => setAcmForm({
                                  ...acmForm,
                                  indicators: { ...acmForm.indicators, comp_min: e.target.value }
                                })}
                                placeholder="150000"
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_comp_avg')}</span>
                              <input
                                type="number"
                                value={acmForm.indicators.comp_avg}
                                onChange={e => setAcmForm({
                                  ...acmForm,
                                  indicators: { ...acmForm.indicators, comp_avg: e.target.value }
                                })}
                                placeholder="185000"
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_comp_max')}</span>
                              <input
                                type="number"
                                value={acmForm.indicators.comp_max}
                                onChange={e => setAcmForm({
                                  ...acmForm,
                                  indicators: { ...acmForm.indicators, comp_max: e.target.value }
                                })}
                                placeholder="220000"
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sugerido Comparables</span>
                              <input
                                type="number"
                                value={acmForm.indicators.comp_suggested}
                                onChange={e => setAcmForm({
                                  ...acmForm,
                                  indicators: { ...acmForm.indicators, comp_suggested: e.target.value }
                                })}
                                placeholder="190000"
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border-2 border-blue-500 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>
                          </div>

                          {/* Comparables details list */}
                          <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Muestra de Propiedades Comparables</p>
                              <button
                                onClick={addCompProperty}
                                className="text-[10px] font-black text-blue-600 hover:text-blue-500 uppercase tracking-wider"
                              >
                                + Agregar Muestra
                              </button>
                            </div>

                            <div className="space-y-3">
                              {acmForm.indicators.comp_properties.map((prop, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-100 dark:bg-dark-panel p-3 rounded-xl border border-slate-200 dark:border-dark-border">
                                  <input
                                    type="text"
                                    value={prop.address}
                                    onChange={e => handleFormArrayChange(idx, 'address', e.target.value)}
                                    placeholder="Ej. Condominio El Cortijo"
                                    className="px-3 py-2 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-lg text-xs outline-none md:col-span-2"
                                  />
                                  <input
                                    type="number"
                                    value={prop.size}
                                    onChange={e => handleFormArrayChange(idx, 'size', e.target.value)}
                                    placeholder="m²"
                                    className="px-3 py-2 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-lg text-xs outline-none"
                                  />
                                  <input
                                    type="number"
                                    value={prop.price}
                                    onChange={e => handleFormArrayChange(idx, 'price', e.target.value)}
                                    placeholder="Precio USD"
                                    className="px-3 py-2 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-lg text-xs outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <label className="flex flex-col gap-1.5 mt-4">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Notas del Estudio de Mercado / Agente</span>
                            <textarea
                              rows="3"
                              value={acmForm.agent_notes}
                              onChange={e => setAcmForm({ ...acmForm, agent_notes: e.target.value })}
                              placeholder="Escribe comentarios sobre las tendencias de mercado en la zona..."
                              className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          </label>
                        </div>
                      )}

                      {/* =================================================== */}
                      {/* SECTION 3: RENTAL YIELD METHOD                      */}
                      {/* =================================================== */}
                      {activeTab === 'rentabilidad' && (
                        <div className="space-y-6 fade-in">
                          <div className="border-b border-white/5 pb-2">
                            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">{t('acm_rental_panel_title')}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{t('acm_rental_panel_desc')}</p>
                          </div>

                          {/* Rental inputs */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_rental_units')}</span>
                              <input
                                type="number"
                                value={acmForm.rental_units}
                                onChange={e => setAcmForm({ ...acmForm, rental_units: e.target.value })}
                                placeholder="4"
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_rental_price')}</span>
                              <input
                                type="number"
                                value={acmForm.rental_price}
                                onChange={e => setAcmForm({ ...acmForm, rental_price: e.target.value })}
                                placeholder="800"
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_expenses_label')}</span>
                              <input
                                type="number"
                                value={acmForm.expenses_amount}
                                onChange={e => setAcmForm({ ...acmForm, expenses_amount: e.target.value })}
                                placeholder="350"
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_expenses_period')}</span>
                              <select
                                value={acmForm.expenses_period}
                                onChange={e => setAcmForm({ ...acmForm, expenses_period: e.target.value })}
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="monthly">{t('acm_expenses_monthly')}</option>
                                <option value="annual">{t('acm_expenses_annual')}</option>
                              </select>
                            </label>
                          </div>

                          {/* Live Rentabilidad Results */}
                          {grossIncome > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                              <div className="bg-slate-100 dark:bg-dark-panel p-4 rounded-xl border border-slate-200 dark:border-dark-border flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('acm_gross_income')}</span>
                                <span className="text-sm font-black text-blue-600 dark:text-blue-400">{fmt(grossIncome)}</span>
                              </div>

                              <div className="bg-slate-100 dark:bg-dark-panel p-4 rounded-xl border border-slate-200 dark:border-dark-border flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('acm_noi')}</span>
                                <span className="text-sm font-black text-slate-800 dark:text-white">{fmt(noi)}</span>
                              </div>
                            </div>
                          )}

                          <label className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_cap_rate')}</span>
                            <div className="relative">
                              <input
                                type="number"
                                value={acmForm.cap_rate}
                                onChange={e => setAcmForm({ ...acmForm, cap_rate: e.target.value })}
                                placeholder="8.5"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                            </div>
                            <span className="text-[9px] text-gray-400 font-semibold">{t('acm_cap_rate_hint')}</span>
                          </label>

                          {/* Calculated Yield Value */}
                          {rentalValue > 0 && (
                            <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center ${getCapRateClass(capRate).bg} border-blue-500/10`}>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{t('acm_rental_value')}</span>
                              <h3 className="text-3xl font-black italic text-blue-600 dark:text-blue-400 mt-1">{fmt(rentalValue)}</h3>
                            </div>
                          )}
                        </div>
                      )}

                      {/* =================================================== */}
                      {/* SECTION 4: REPLACEMENT COST METHOD                  */}
                      {/* =================================================== */}
                      {activeTab === 'reposicion' && (
                        <div className="space-y-6 fade-in">
                          <div className="border-b border-white/5 pb-2">
                            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">{t('acm_type_replacement')}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{t('acm_type_replacement_desc')}</p>
                          </div>

                          {/* Land details */}
                          <div className="space-y-3">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">1. Terreno Físico</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_land_area')}</span>
                                <input
                                  type="number"
                                  value={acmForm.indicators.land_area}
                                  onChange={e => setAcmForm({
                                    ...acmForm,
                                    indicators: { ...acmForm.indicators, land_area: e.target.value }
                                  })}
                                  placeholder="450"
                                  className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </label>

                              <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_land_price_m2')}</span>
                                <input
                                  type="number"
                                  value={acmForm.indicators.land_price_m2}
                                  onChange={e => setAcmForm({
                                    ...acmForm,
                                    indicators: { ...acmForm.indicators, land_price_m2: e.target.value }
                                  })}
                                  placeholder="150"
                                  className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </label>
                            </div>
                            {landValueTotal > 0 && (
                              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 text-right">{t('acm_land_total_val')}: {fmt(landValueTotal)}</p>
                            )}
                          </div>

                          {/* Construction details */}
                          <div className="space-y-3 pt-4 border-t border-white/5">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">2. Edificación / Construcciones</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_const_area')}</span>
                                <input
                                  type="number"
                                  value={acmForm.indicators.const_area}
                                  onChange={e => setAcmForm({
                                    ...acmForm,
                                    indicators: { ...acmForm.indicators, const_area: e.target.value }
                                  })}
                                  placeholder="220"
                                  className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </label>

                              <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_const_price_m2')}</span>
                                <input
                                  type="number"
                                  value={acmForm.indicators.const_price_m2}
                                  onChange={e => setAcmForm({
                                    ...acmForm,
                                    indicators: { ...acmForm.indicators, const_price_m2: e.target.value }
                                  })}
                                  placeholder="750"
                                  className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </label>

                              <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('acm_depreciation_pct')}</span>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={acmForm.indicators.depreciation_pct}
                                    onChange={e => setAcmForm({
                                      ...acmForm,
                                      indicators: { ...acmForm.indicators, depreciation_pct: e.target.value }
                                    })}
                                    placeholder="20"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                                  />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                                </div>
                              </label>
                            </div>
                            {constNewVal > 0 && (
                              <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                <span>{t('acm_const_new_val')}: {fmt(constNewVal)}</span>
                                <span className="text-red-500">-{depreciationPct}% (Depreciación: {fmt(depreciationAmount)})</span>
                                <span className="text-slate-800 dark:text-white">{t('acm_depreciated_val')}: {fmt(constDepreciatedVal)}</span>
                              </div>
                            )}
                          </div>

                          {/* Calculated Cost Value */}
                          {replacementValue > 0 && (
                            <div className="p-5 bg-slate-100 dark:bg-dark-panel rounded-2xl border border-slate-200 dark:border-dark-border flex flex-col items-center justify-center text-center">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{t('acm_replacement_value')}</span>
                              <h3 className="text-3xl font-black italic text-blue-600 dark:text-blue-400 mt-1">{fmt(replacementValue)}</h3>
                            </div>
                          )}
                        </div>
                      )}

                      {/* =================================================== */}
                      {/* SECTION 5: CONSOLIDATED SUMMARY & WEIGHTS           */}
                      {/* =================================================== */}
                      {activeTab === 'consolidado' && (
                        <div className="space-y-6 fade-in">
                          <div className="border-b border-white/5 pb-2">
                            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">{t('acm_consolidated_value')}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{t('acm_consolidated_subtitle')}</p>
                          </div>

                          {/* List of active methods values & weights */}
                          <div className="space-y-4">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('acm_weight_sliders')}</p>
                            
                            <div className="space-y-4">
                              {activeMethods.includes('comparables') && (
                                <div className="bg-slate-100 dark:bg-dark-panel p-4 rounded-xl border border-slate-200 dark:border-dark-border flex flex-col gap-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-950 dark:text-white">{t('acm_type_comparables')}</span>
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">{fmt(compSuggested)}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={weights.comparables}
                                      onChange={e => handleWeightChange('comparables', e.target.value)}
                                      className="flex-1 accent-blue-600"
                                    />
                                    <span className="text-xs font-bold text-gray-500 w-10 text-right">{weights.comparables}%</span>
                                  </div>
                                </div>
                              )}

                              {activeMethods.includes('rentabilidad') && (
                                <div className="bg-slate-100 dark:bg-dark-panel p-4 rounded-xl border border-slate-200 dark:border-dark-border flex flex-col gap-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-950 dark:text-white">{t('acm_type_rental')}</span>
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">{fmt(rentalValue)}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={weights.rentabilidad}
                                      onChange={e => handleWeightChange('rentabilidad', e.target.value)}
                                      className="flex-1 accent-blue-600"
                                    />
                                    <span className="text-xs font-bold text-gray-500 w-10 text-right">{weights.rentabilidad}%</span>
                                  </div>
                                </div>
                              )}

                              {activeMethods.includes('reposicion') && (
                                <div className="bg-slate-100 dark:bg-dark-panel p-4 rounded-xl border border-slate-200 dark:border-dark-border flex flex-col gap-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-950 dark:text-white">{t('acm_type_replacement')}</span>
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">{fmt(replacementValue)}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={weights.reposicion}
                                      onChange={e => handleWeightChange('reposicion', e.target.value)}
                                      className="flex-1 accent-blue-600"
                                    />
                                    <span className="text-xs font-bold text-gray-500 w-10 text-right">{weights.reposicion}%</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Weight validation indicator */}
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-gray-400">SUMA DE PONDERACIONES (DEBE SUMAR 100%)</span>
                              <span className={totalWeightSum === 100 ? 'text-emerald-500' : 'text-red-500'}>
                                {totalWeightSum}% / 100% {totalWeightSum !== 100 && '(Ajustar Sliders)'}
                              </span>
                            </div>
                          </div>

                          {/* Suggested lists prices overrides */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rango Conservador (Bajo)</span>
                              <input
                                type="number"
                                value={acmForm.price_range_low}
                                onChange={e => setAcmForm({ ...acmForm, price_range_low: e.target.value })}
                                placeholder="175000"
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Precio Sugerido Final</span>
                              <input
                                type="number"
                                value={acmForm.suggested_price}
                                onChange={e => setAcmForm({ ...acmForm, suggested_price: e.target.value })}
                                placeholder="185000"
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border-2 border-blue-500 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rango Optimista (Alto)</span>
                              <input
                                type="number"
                                value={acmForm.price_range_high}
                                onChange={e => setAcmForm({ ...acmForm, price_range_high: e.target.value })}
                                placeholder="195000"
                                className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>
                          </div>

                          <label className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estatus del Reporte</span>
                            <select
                              value={acmForm.status}
                              onChange={e => setAcmForm({ ...acmForm, status: e.target.value })}
                              className="px-4 py-3 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 w-48"
                            >
                              <option value="draft">Borrador (Draft)</option>
                              <option value="completed">Completado (Ready)</option>
                            </select>
                          </label>
                        </div>
                      )}

                    </div>

                    {/* Bottom Save bar */}
                    <div className="pt-6 border-t border-white/5 mt-8 flex flex-col md:flex-row justify-between items-center gap-3">
                      <p className="text-[10px] text-gray-400 font-semibold text-center md:text-left">
                        {t('auto_review_all_sections_in')}
                      </p>
                      
                      <button
                        onClick={handleSaveWorkspace}
                        disabled={savingStatus === 'saving' || (activeTab === 'consolidado' && totalWeightSum !== 100)}
                        className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white font-bold uppercase tracking-wider text-[11px] rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-40 transition-all transform hover:scale-[1.02] active:scale-95"
                      >
                        {savingStatus === 'saving' ? t('acm_saving') :
                         savingStatus === 'success' ? t('acm_saved_success') :
                         savingStatus === 'error' ? t('acm_save_error') :
                         t('acm_save_workspace')}
                      </button>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>
      {/* ═══ GOOGLE DRIVE & OLYMPIA INTEGRATION ALERT MODAL ═══ */}
      {showDriveAlertModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 text-left" onClick={handleCloseDriveAlert}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 md:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M7.71 3.5L1.15 15l4.58 7.5h13.54l4.58-7.5L17.29 3.5H7.71z" /></svg>
                </div>
                <div>
                  <h3 className="text-base font-black italic text-slate-900 dark:text-white leading-tight">
                    {lang === 'en' ? 'Property Folder Created!' : '¡Carpeta de Propiedad Creada!'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">
                    {lang === 'en' ? 'Smart Hub Integration' : 'Integración Inteligente del Hub'}
                  </p>
                </div>
              </div>
              <button onClick={handleCloseDriveAlert} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {lang === 'en' 
                  ? "We have automatically created the base Google Drive folder for this property. This folder serves as the single source of truth for the entire lifecycle (Pre-Listing, ACM, Listing, and Photos) to avoid duplicates."
                  : "Hemos creado automáticamente la carpeta base de Google Drive para esta propiedad. Esta carpeta servirá como fuente única de verdad durante todo el ciclo (Pre-Listing, ACM, Captación y Fotos) para evitar duplicados."}
              </p>
              
              <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-950/20 dark:to-purple-950/20 border border-brand-100/50 dark:border-brand-900/30 flex items-start gap-3">
                <span className="text-xl shrink-0">💡</span>
                <div>
                  <h4 className="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider">Tip de Olympia AI</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {lang === 'en'
                      ? "Any document you upload here (National Registry document, Cadastral map, photos) will be read and indexed in real-time. Olympia will analyze it to assist you in CMAs and technical details!"
                      : "Cualquier documento que subas aquí (Folio real, Plano Catastrado, fotos) será leído e indexado en tiempo real. ¡Olympia los analizará para ayudarte con el ACM y los datos técnicos!"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="dont-show-again-checkbox-acm"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 bg-white dark:bg-slate-800 animate-none shrink-0"
                />
                <label htmlFor="dont-show-again-checkbox-acm" className="text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer">
                  {lang === 'en' ? "Don't show this explanation again" : "No volver a mostrar esta explicación"}
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCloseDriveAlert}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-bold transition-colors"
              >
                {lang === 'en' ? 'Close' : 'Cerrar'}
              </button>

              <a
                href={createdFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleCloseDriveAlert}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7.71 3.5L1.15 15l4.58 7.5h13.54l4.58-7.5L17.29 3.5H7.71z" /></svg>
                {lang === 'en' ? 'Open Drive Folder' : 'Abrir Carpeta'}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
