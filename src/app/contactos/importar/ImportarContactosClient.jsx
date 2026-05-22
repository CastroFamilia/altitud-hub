"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { insertMultipleContacts } from '@/lib/dal/contacts';
import { useAuth } from '@/lib/auth-context';
import TopNav from '@/components/layout/TopNav';
import Link from 'next/link';
import { useApp } from '@/lib/context';
import Papa from 'papaparse';

const SYSTEM_FIELDS = [
  { id: 'first_name', labelKey: 'imp_field_first_name', required: true },
  { id: 'last_name', labelKey: 'imp_field_last_name' },
  { id: 'email', labelKey: 'imp_field_email' },
  { id: 'phone', labelKey: 'imp_field_phone' },
  { id: 'type', labelKey: 'imp_field_type' },
  { id: 'lead_origin', labelKey: 'imp_field_lead_origin' },
  { id: 'market', labelKey: 'imp_field_market' },
  { id: 'primary_language', labelKey: 'imp_field_primary_language' },
  { id: 'secondary_language', labelKey: 'imp_field_secondary_language' },
  { id: 'tertiary_language', labelKey: 'imp_field_tertiary_language' },
  { id: 'favorite_language', labelKey: 'imp_field_favorite_language' },
  { id: 'contact_classification', labelKey: 'imp_field_classification' },
  { id: 'notes', labelKey: 'imp_field_notes' }
];

export default function ImportarContactosClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useApp();
  
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);
  const [globalDefaults, setGlobalDefaults] = useState({
    type: 'Comprador',
    lead_origin: 'Esfera de Influencia',
    market: 'Nacional',
    contact_classification: 'B',
    newsletter_opt_in: false
  });

  const fileInputRef = useRef(null);

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Nombre,Apellidos,Correo,Telefono,Perfil,Origen,Mercado,IdiomaPrimario,IdiomaSecundario,IdiomaTerciario,IdiomaFavorito,Clasificacion,Notas\n"
      + "Ejemplo,Cliente,correo@ejemplo.com,88888888,\"Comprador, Inversor\",Digital,Nacional,Español,Inglés,Ninguno,Español,A+,Cliente de prueba";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Plantilla_Contactos_AltitudHub.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // STEP 1: Handle File Upload
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        if (results.data && results.data.length > 0) {
          setCsvHeaders(results.meta.fields || []);
          setCsvData(results.data);
          
          // Auto-guess mapping based on common names
          const initialMapping = {};
          const lowerHeaders = (results.meta.fields || []).map(h => h.toLowerCase());
          
          SYSTEM_FIELDS.forEach(sysField => {
            const matchIndex = lowerHeaders.findIndex(h => 
              h.includes(sysField.id) || 
              (sysField.id === 'first_name' && h.includes('nombre')) ||
              (sysField.id === 'last_name' && h.includes('apellido')) ||
              (sysField.id === 'email' && (h.includes('correo') || h.includes('mail'))) ||
              (sysField.id === 'phone' && (h.includes('tel') || h.includes('cel')))
            );
            if (matchIndex !== -1) {
              initialMapping[sysField.id] = results.meta.fields[matchIndex];
            } else {
              initialMapping[sysField.id] = '';
            }
          });
          
          setMapping(initialMapping);
          setStep(2);
        } else {
          alert(t('contact_imp_err_empty'));
        }
      },
      error: function(err) {
        alert(t('contact_imp_err_read') + err.message);
      }
    });
  };

  // Handle Mapping Change
  const handleMapChange = (systemField, csvHeader) => {
    setMapping(prev => ({ ...prev, [systemField]: csvHeader }));
  };

  // STEP 3: Process and Import
  const handleImport = async () => {
    // We allow anonymous inserts if user is missing for open-access
    const finalUserId = user?.id || null;
    
    // Validate required fields
    if (!mapping.first_name) {
      alert(t('contact_imp_err_map'));
      return;
    }

    setLoading(true);

    try {
      const recordsToInsert = csvData.map(row => {
        // Fallback Logic Helper
        const extractValue = (sysField) => {
          const colName = mapping[sysField];
          return colName && row[colName] ? row[colName].trim() : '';
        };

        const firstName = extractValue('first_name') || 'Sin Nombre';
        let typeRaw = extractValue('type');
        let origin = extractValue('lead_origin');
        let market = extractValue('market');
        let primary_language = extractValue('primary_language');
        let secondary_language = extractValue('secondary_language');
        let tertiary_language = extractValue('tertiary_language');
        let favorite_language = extractValue('favorite_language');
        let classification = extractValue('contact_classification');
        let notes = extractValue('notes');
        let originDetails = '';

        // SMART FALLBACKS FOR TYPE (Array handling)
        const validTypes = ['Comprador', 'Vendedor', 'Inversor', 'Inversionista', 'Desarrollador', 'Otro'];
        let typeArray = [];
        if (typeRaw) {
          const splitTypes = typeRaw.split(',').map(t => t.trim());
          splitTypes.forEach(t => {
            // Map "Inversionista" to "Inversor" to standardize if needed, or just allow both
            const standardT = t === 'Inversionista' ? 'Inversor' : t;
            if (validTypes.includes(standardT)) {
              typeArray.push(standardT);
            } else {
              notes += `\n[Tipo no reconocido: ${t}]`;
            }
          });
        }
        if (typeArray.length === 0) {
          typeArray = [globalDefaults.type];
        }

        const validOrigins = ['Esfera de Influencia', 'Referido', 'Digital', 'Rótulo', 'Oficina', 'Manual'];
        let matchedOrigin = false;
        
        // Smart Matching for Origin
        if (origin) {
          const originLower = origin.toLowerCase();
          if (originLower.includes('fb') || originLower.includes('face') || originLower.includes('insta') || originLower.includes('web') || originLower.includes('digital')) {
            originDetails = origin;
            origin = 'Digital';
            matchedOrigin = true;
          } else if (originLower.includes('ref')) {
            origin = 'Referido';
            matchedOrigin = true;
          } else if (originLower.includes('rótulo') || originLower.includes('rotulo') || originLower.includes('letrero') || originLower.includes('valla')) {
            origin = 'Rótulo';
            matchedOrigin = true;
          }
        }

        if (!matchedOrigin && origin) {
          originDetails = origin; // Guardamos lo que escribieron
          origin = 'Manual'; // Categoría de fallback
        } else if (!origin) {
          origin = globalDefaults.lead_origin;
        }

        return {
          user_id: finalUserId,
          first_name: firstName,
          last_name: extractValue('last_name'),
          email: extractValue('email'),
          phone: extractValue('phone'),
          type: typeArray,
          lead_origin: origin,
          origin_details: originDetails,
          market: market || globalDefaults.market,
          primary_language: primary_language || 'Español',
          secondary_language: secondary_language || 'Ninguno',
          tertiary_language: tertiary_language || 'Ninguno',
          favorite_language: favorite_language || 'Español',
          contact_classification: classification || globalDefaults.contact_classification,
          notes: notes.trim(),
          newsletter_opt_in: globalDefaults.newsletter_opt_in,
          status: 'active'
        };
      });

      const data = await insertMultipleContacts(recordsToInsert);
      
      alert(t('contact_imp_success').replace('{n}', recordsToInsert.length));
      router.push('/contactos');

    } catch (err) {
      console.error(err);
      alert(t('contact_imp_err_import') + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopNav titleKey="contact_imp_title" subtitleKey="nav_crm" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/contactos" className="hover:text-brand-500 transition-colors">{t('nav_crm')}</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          <span className="text-gray-800 dark:text-white font-medium">{t('contact_imp_title')}</span>
        </div>

        <div className="glass-panel p-6 md:p-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 dark:border-dark-border">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('contact_imp_title_h1')}</h1>
            <div className="flex gap-2">
              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${step >= 1 ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>1</span>
              <div className={`w-8 h-px my-auto ${step >= 2 ? 'bg-brand-500' : 'bg-gray-200'}`}></div>
              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${step >= 2 ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>2</span>
              <div className={`w-8 h-px my-auto ${step >= 3 ? 'bg-brand-500' : 'bg-gray-200'}`}></div>
              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${step >= 3 ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>3</span>
            </div>
          </div>

          {/* DATA PRIVACY DISCLOSURE */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-5 mb-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">{t('contact_imp_disclosure_title')}</h4>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  {t('contact_imp_disclosure_text')}
                </p>
                <label className="flex items-center gap-2 mt-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={disclosureAccepted}
                    onChange={(e) => setDisclosureAccepted(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-300 group-hover:text-amber-900 dark:group-hover:text-amber-200 transition-colors">
                    {t('contact_imp_disclosure_accept')}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto bg-brand-50 dark:bg-brand-900/20 text-brand-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">{t('contact_imp_step1_title')}</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                {t('contact_imp_step1_desc')}
              </p>
              
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <div className="flex justify-center gap-3">
                <button 
                  onClick={downloadTemplate}
                  className="px-6 py-3 rounded-xl bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors text-sm font-medium shadow-sm flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  {t('contact_imp_btn_template')}
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!disclosureAccepted}
                  className={`px-6 py-3 rounded-xl text-white transition-colors text-sm font-medium shadow-md shadow-brand-500/20 ${disclosureAccepted ? 'bg-brand-500 hover:bg-brand-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none'}`}
                >
                  {t('contact_imp_btn_file')}
                </button>
              </div>
              {!disclosureAccepted && <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 font-medium">{t('contact_imp_disclosure_required')}</p>}
              <p className="text-xs text-gray-400 mt-4">*{t('contact_imp_csv_hint')}</p>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('contact_imp_step2_title')}</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
                {t('contact_imp_step2_desc')}
              </p>

              <div className="bg-slate-50 dark:bg-dark-panel p-6 rounded-2xl border border-gray-200 dark:border-dark-border mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {SYSTEM_FIELDS.map(sysField => (
                    <div key={sysField.id} className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        {t(sysField.labelKey)} {sysField.required && <span className="text-brand-500">*</span>}
                      </label>
                      <select
                        value={mapping[sysField.id]}
                        onChange={(e) => handleMapChange(sysField.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      >
                        <option value="">{t('contact_imp_ignore')}</option>
                        {csvHeaders.map((header, idx) => (
                          <option key={idx} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-brand-50 dark:bg-brand-900/10 p-6 rounded-2xl border border-brand-100 dark:border-brand-900/20 mb-8">
                <h4 className="text-sm font-semibold text-brand-800 dark:text-brand-300 mb-3">{t('contact_imp_defaults_title')}</h4>
                <p className="text-xs text-brand-600 dark:text-brand-400 mb-4">
                  {t('contact_imp_defaults_desc')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">{t('contact_imp_origin_gen')}</label>
                    <select
                      value={globalDefaults.lead_origin}
                      onChange={(e) => setGlobalDefaults({...globalDefaults, lead_origin: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
                    >
                      <option value="Esfera de Influencia">{t('contact_imp_origin_sphere')}</option>
                      <option value="Digital">{t('contact_imp_origin_digital')}</option>
                      <option value="Rótulo">{t('contact_imp_origin_sign')}</option>
                      <option value="Referido">{t('contact_imp_origin_referral')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">{t('contact_imp_class_basic')}</label>
                    <select
                      value={globalDefaults.contact_classification}
                      onChange={(e) => setGlobalDefaults({...globalDefaults, contact_classification: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
                    >
                      <option value="A+">A+</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Newsletter Opt-In Toggle */}
              <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/20 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">{t('contact_imp_newsletter_title')}</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">{t('contact_imp_newsletter_desc')}</p>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={globalDefaults.newsletter_opt_in}
                          onChange={(e) => setGlobalDefaults({...globalDefaults, newsletter_opt_in: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-brand-500 transition-colors"></div>
                        <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                      </div>
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        {globalDefaults.newsletter_opt_in ? t('contact_imp_newsletter_yes') : t('contact_imp_newsletter_no')}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setStep(1)} className="px-5 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5 rounded-xl transition-colors">{t('contact_imp_btn_back')}</button>
                <button onClick={() => setStep(3)} className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md">{t('contact_imp_btn_continue')}</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-green-50 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">{t('contact_imp_step3_title')}</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                {t('contact_imp_detected')} <strong>{csvData.length}</strong> {t('contact_imp_step3_desc')}
              </p>
              
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setStep(2)} 
                  disabled={loading}
                  className="px-6 py-2.5 text-sm text-gray-600 border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {t('contact_imp_btn_remap')}
                </button>
                <button 
                  onClick={handleImport}
                  disabled={loading}
                  className="px-8 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-brand-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      {t('contact_imp_importing')}
                    </>
                  ) : (
                    t('contact_imp_btn_confirm')
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      </div>
    </>
  );
}
