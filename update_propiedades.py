import re

with open('src/app/propiedades/nueva/page.js', 'r') as f:
    content = f.read()

# 1. Update INITIAL_FORM
initial_form_old = """const INITIAL_FORM = {
  name: '', listing_title_es: '', listing_title_en: '',
  property_type_id: 3, listing_contract_type: 1,
  owner_name: '', owner_phones: '', owner_email: '', listing_agreement: false,
  unparsed_address: '', latitude: '', longitude: '',
  bedrooms_total: 0, bathrooms_full: 0, bathrooms_half: 0, stories: 1,
  lot_size_area: '', construction_size: '', year_built: '',
  list_price: '', list_price_currency_id: 2,
  listing_side_comm: 3, selling_side_comm: 3,
  public_remarks_es: '', public_remarks_en: '',
  private_remarks_es: '', private_remarks_en: '',
  video_link: '',
  pool_private: false, garage: false, garage_spaces: 0,
  cooling: false, has_view: false, gated_community: false,
  furnished: false, maid_room: false, property_new: false,
  office_code: '',
};"""

initial_form_new = """const INITIAL_FORM = {
  name: '', listing_title_es: '', listing_title_en: '',
  property_type_id: 3, listing_contract_type: 1,
  owner_name: '', owner_phones: '', owner_email: '', listing_agreement: false,
  unparsed_address: '', latitude: '', longitude: '',
  bedrooms_total: 0, bathrooms_full: 0, bathrooms_half: 0, stories: 1,
  lot_size_area: '', construction_size: '', year_built: '',
  list_price: '', list_price_currency_id: 2,
  listing_side_comm: 3, selling_side_comm: 3,
  public_remarks_es: '', public_remarks_en: '',
  private_remarks_es: '', private_remarks_en: '',
  video_link: '', drive_photos_folder_url: '',
  pool_private: false, garage: false, garage_spaces: 0,
  cooling: false, has_view: false, gated_community: false,
  furnished: false, maid_room: false, property_new: false,
  office_code: '',
};"""

content = content.replace(initial_form_old, initial_form_new)

# 2. Add state for acm_reports and selection
state_old = """  const [step, setStep] = useState(0); // 0=basics, 1=details, 2=marketing

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));"""

state_new = """  const [step, setStep] = useState(0); // 0=basics, 1=details, 2=marketing
  const [acmReports, setAcmReports] = useState([]);
  const [selectedAcmId, setSelectedAcmId] = useState('');

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    const fetchAcm = async () => {
      const { data } = await supabase.from('acm_reports').select('*').order('created_at', { ascending: false }).limit(20);
      if (data) setAcmReports(data);
    };
    fetchAcm();
  }, []);

  const handleSelectAcm = (e) => {
    const acmId = e.target.value;
    setSelectedAcmId(acmId);
    if (!acmId) return;
    const report = acmReports.find(r => r.id === acmId);
    if (report) {
      setForm(prev => ({
        ...prev,
        owner_name: report.client_name || prev.owner_name,
        owner_phones: report.client_phone || prev.owner_phones,
        owner_email: report.client_email || prev.owner_email,
        unparsed_address: report.property_address || prev.unparsed_address,
        name: report.property_address || prev.name,
        property_type_id: report.property_type === 'house' ? 1 : report.property_type === 'commercial' ? 5 : report.property_type === 'land' ? 10 : prev.property_type_id,
        lot_size_area: report.indicators?.tech?.m2_lot || prev.lot_size_area,
        construction_size: report.indicators?.tech?.m2_const || prev.construction_size,
        bedrooms_total: report.indicators?.tech?.bedrooms || prev.bedrooms_total,
        bathrooms_full: report.indicators?.tech?.bathrooms || prev.bathrooms_full,
        year_built: report.indicators?.tech?.year_built || prev.year_built,
        garage_spaces: report.indicators?.tech?.parking || prev.garage_spaces,
      }));
    }
  };"""

content = content.replace(state_old, state_new)

# 3. Add Import Dropdown in Step 0
step0_old = """            {/* ── STEP 0: Basics & Owner ── */}
            {step === 0 && (
              <>
                <SectionTitle icon="🏠" title={lang === 'en' ? 'Property Basics' : 'Datos Básicos'} subtitle={lang === 'en' ? 'Type, title, and classification' : 'Tipo, título y clasificación'} />"""

step0_new = """            {/* ── STEP 0: Basics & Owner ── */}
            {step === 0 && (
              <>
                <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                  <label className={labelCls}>⚡ {lang === 'en' ? 'Import from Pre-Listing / ACM Report' : 'Importar de Carpeta Pre-Listing / Reporte ACM'}</label>
                  <select value={selectedAcmId} onChange={handleSelectAcm} className={inputCls}>
                    <option value="">{lang === 'en' ? 'Select a report to auto-fill...' : 'Selecciona un reporte para auto-completar...'}</option>
                    {acmReports.map(r => (
                      <option key={r.id} value={r.id}>{r.client_name} - {r.property_address} ({new Date(r.created_at).toLocaleDateString()})</option>
                    ))}
                  </select>
                </div>

                <SectionTitle icon="🏠" title={lang === 'en' ? 'Property Basics' : 'Datos Básicos'} subtitle={lang === 'en' ? 'Type, title, and classification' : 'Tipo, título y clasificación'} />"""

content = content.replace(step0_old, step0_new)

# 4. Add Gemini integration & Drive link in Step 2
step2_old = """                <SectionTitle icon="📢" title={lang === 'en' ? 'Public Description' : 'Descripción Pública'} subtitle={lang === 'en' ? 'Visible on RECONNECT and portals' : 'Visible en RECONNECT y portales'} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Description (Spanish)' : 'Descripción (Español)'}</label>
                    <textarea rows={5} value={form.public_remarks_es} onChange={e => set('public_remarks_es', e.target.value)} className={inputCls + ' resize-none'} placeholder="Describa la propiedad..." />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Description (English)' : 'Descripción (Inglés)'}</label>
                    <textarea rows={5} value={form.public_remarks_en} onChange={e => set('public_remarks_en', e.target.value)} className={inputCls + ' resize-none'} placeholder="Describe the property..." />
                  </div>
                </div>

                <SectionTitle icon="🎬" title={lang === 'en' ? 'Video & Media' : 'Video y Medios'} />
                <div>
                  <label className={labelCls}>{lang === 'en' ? 'Video Link (YouTube)' : 'Link de Video (YouTube)'}</label>
                  <input value={form.video_link} onChange={e => set('video_link', e.target.value)} className={inputCls} placeholder="https://youtube.com/watch?v=..." />
                </div>

                {/* Photo section placeholder */}
                <SectionTitle icon="📸" title={lang === 'en' ? 'Photos' : 'Fotos'} subtitle={lang === 'en' ? 'Photos will be managed via Google Drive after saving' : 'Las fotos se gestionarán vía Google Drive después de guardar'} />
                <div className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-2xl p-8 text-center">
                  <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{lang === 'en' ? 'Save as draft first, then create a photo folder for your photographer' : 'Guarda como borrador primero, luego crea una carpeta de fotos para tu fotógrafo'}</p>
                </div>"""

step2_new = """                <SectionTitle icon="📢" title={lang === 'en' ? 'Public Description' : 'Descripción Pública'} subtitle={lang === 'en' ? 'Visible on RECONNECT and portals' : 'Visible en RECONNECT y portales'} />
                <div className="mb-3 text-right">
                  <a href="https://gemini.google.com/gem/1AEmVQwvskiJS32T5KX9A4VoVZWqfhW-V?usp=sharing" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 rounded-lg transition-colors">
                    ✨ {lang === 'en' ? 'Write with Gemini AI' : 'Escribir con Gemini AI'}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Description (Spanish)' : 'Descripción (Español)'}</label>
                    <textarea rows={5} value={form.public_remarks_es} onChange={e => set('public_remarks_es', e.target.value)} className={inputCls + ' resize-none'} placeholder="Describa la propiedad..." />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Description (English)' : 'Descripción (Inglés)'}</label>
                    <textarea rows={5} value={form.public_remarks_en} onChange={e => set('public_remarks_en', e.target.value)} className={inputCls + ' resize-none'} placeholder="Describe the property..." />
                  </div>
                </div>

                <SectionTitle icon="🎬" title={lang === 'en' ? 'Video & Media' : 'Video y Medios'} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Video Link (YouTube)' : 'Link de Video (YouTube)'}</label>
                    <input value={form.video_link} onChange={e => set('video_link', e.target.value)} className={inputCls} placeholder="https://youtube.com/watch?v=..." />
                  </div>
                  <div>
                    <label className={labelCls}>{lang === 'en' ? 'Google Drive Link (Photos)' : 'Link de Google Drive (Fotos)'}</label>
                    <input value={form.drive_photos_folder_url} onChange={e => set('drive_photos_folder_url', e.target.value)} className={inputCls} placeholder="https://drive.google.com/drive/folders/..." />
                  </div>
                </div>

                {/* Photo section placeholder */}
                <SectionTitle icon="📸" title={lang === 'en' ? 'Photos' : 'Fotos'} subtitle={lang === 'en' ? 'Photos will be managed via Google Drive after saving' : 'Las fotos se gestionarán vía Google Drive después de guardar'} />
                <div className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-2xl p-8 text-center">
                  <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{lang === 'en' ? 'Paste your Drive folder link above. Once submitted, the system can sync them.' : 'Pega el enlace de la carpeta de Drive arriba. Una vez enviada, el sistema podrá sincronizarlas.'}</p>
                </div>"""

content = content.replace(step2_old, step2_new)

# 5. Handle submission payload and status changes
handle_submit_old = """  const handleSubmit = async (asDraft) => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        agent_id: user?.id,
        status: asDraft ? 'draft' : 'pending_approval',"""

handle_submit_new = """  const handleSubmit = async (statusOverride = null) => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        agent_id: user?.id,
        status: statusOverride || 'pending_approval',"""

content = content.replace(handle_submit_old, handle_submit_new)

payload_old = """        submitted_at: asDraft ? null : new Date().toISOString(),"""
payload_new = """        submitted_at: (statusOverride === 'draft' || statusOverride === 'paused' || statusOverride === 'cancelled') ? null : new Date().toISOString(),"""
content = content.replace(payload_old, payload_new)

buttons_old = """                    <button onClick={() => handleSubmit(true)} disabled={loading} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium text-gray-700 dark:text-white disabled:opacity-50">
                      {loading ? '...' : (editId ? (lang === 'en' ? 'Save Changes' : 'Guardar Cambios') : (lang === 'en' ? 'Save Draft' : 'Guardar Borrador'))}
                    </button>
                    <button onClick={() => handleSubmit(false)} disabled={loading} className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50">
                      {loading ? '...' : (lang === 'en' ? 'Submit for Approval' : 'Enviar para Aprobación')}
                    </button>"""

buttons_new = """                    <div className="flex gap-2">
                      <button onClick={() => handleSubmit('draft')} disabled={loading} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium text-gray-700 dark:text-white disabled:opacity-50">
                        {loading ? '...' : (lang === 'en' ? 'Draft' : 'Borrador')}
                      </button>
                      <button onClick={() => handleSubmit('paused')} disabled={loading} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium text-amber-600 dark:text-amber-500 disabled:opacity-50">
                        {loading ? '...' : (lang === 'en' ? 'Pause' : 'Pausar')}
                      </button>
                      <button onClick={() => handleSubmit('cancelled')} disabled={loading} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-panel hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium text-red-600 dark:text-red-500 disabled:opacity-50">
                        {loading ? '...' : (lang === 'en' ? 'Cancel' : 'Cancelar')}
                      </button>
                    </div>
                    <button onClick={() => handleSubmit('pending_approval')} disabled={loading} className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50">
                      {loading ? '...' : (lang === 'en' ? 'Submit for Approval' : 'Enviar para Aprobación')}
                    </button>"""

content = content.replace(buttons_old, buttons_new)

auto_milestones_old = """        // Auto-update milestones on status change
        if (!asDraft) {"""
auto_milestones_new = """        // Auto-update milestones on status change
        if (statusOverride !== 'draft' && statusOverride !== 'paused' && statusOverride !== 'cancelled') {"""
content = content.replace(auto_milestones_old, auto_milestones_new)

auto_create_old = """        if (!asDraft) milestonePayload.submitted_at = new Date().toISOString();"""
auto_create_new = """        if (statusOverride !== 'draft' && statusOverride !== 'paused' && statusOverride !== 'cancelled') milestonePayload.submitted_at = new Date().toISOString();"""
content = content.replace(auto_create_old, auto_create_new)

with open('src/app/propiedades/nueva/page.js', 'w') as f:
    f.write(content)

print("Done")
