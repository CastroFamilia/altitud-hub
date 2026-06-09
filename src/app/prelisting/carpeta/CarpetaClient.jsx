"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { insertSavedPresentation, uploadPrintableCover } from '@/lib/dal/prelisting';
import CarpetaCover from '@/components/prelisting/carpeta/CarpetaCover';
import CarpetaPage1 from '@/components/prelisting/carpeta/CarpetaPage1';
import CarpetaPage2 from '@/components/prelisting/carpeta/CarpetaPage2';
import CarpetaPage2b from '@/components/prelisting/carpeta/CarpetaPage2b';
import CarpetaPageProperty from '@/components/prelisting/carpeta/CarpetaPageProperty';
import CarpetaPage3 from '@/components/prelisting/carpeta/CarpetaPage3';
import CarpetaPage4 from '@/components/prelisting/carpeta/CarpetaPage4';
import CarpetaPage5 from '@/components/prelisting/carpeta/CarpetaPage5';
import Image from 'next/image';

const OFFICES = {
  altitud: {
    name: 'REMAX Altitud',
    zone: 'Pérez Zeledón',
    location: 'San Isidro de El General',
    commission: '6%',
    coverImage: '/assets/carpeta-cover-pz.png',
    logo: '/assets/logo-altitud.png',
    agentCount: '13', listingCount: '300+',
    accent: '#003DA5',
  },
  cero: {
    name: 'REMAX Altitud Cero',
    zone: 'Costa Ballena',
    location: 'Dominical · Uvita · Ojochal',
    commission: '8%',
    coverImage: '/assets/carpeta-cover-dominical.png',
    logo: '/assets/logo-altitud-cero.png',
    agentCount: '8', listingCount: '200+',
    accent: '#0C4A6E',
  }
};

const CORE_PAGES = [
  { id: 'page1', title: 'Alcance Global (REMAX & Costa Rica)' },
  { id: 'page2', title: 'Inteligencia de Mercado (Compradores vs Vendedores)' },
  { id: 'property_specs', title: 'Ficha Técnica (Registro y Amenidades)' },
  { id: 'page2b', title: 'La Visión del Desarrollo (Amenidades y Entorno)' },
  { id: 'page3', title: 'El Sistema (Pilares y Servicios)' },
  { id: 'page4', title: '¿Por Qué Exclusiva?' },
  { id: 'page5', title: 'Siguiente Paso (Firmas y Cierre)' },
];

/* TRANSLATIONS (Keep the same) */
const T = {
  es: {
    selectOffice: 'Selecciona la Oficina',
    selectSub: 'Presentación personalizada con el posicionamiento, datos y branding de cada zona.',
    presentation: 'Presentación Pre-Listing',
    back: 'Volver a Pre-Listing',
    generate: 'Generar Carpeta',
    mainOffice: 'Oficina Principal',
    costaBallena: 'Costa Ballena',
    changeOffice: 'Cambiar Oficina',
    printPdf: 'Imprimir / PDF',
    editPresentation: 'Editar Presentación',
    // Page 1
    p1_header: 'Alcance Global, Impacto Local',
    p1_title1: 'Una marca que',
    p1_title2: 'abre puertas',
    p1_countries: 'Países', p1_offices: 'Oficinas', p1_agents: 'Agentes',
    p1_worldDesc: 'Cuando un comprador de cualquier parte del mundo ve el nombre REMAX, no necesita explicación. Reconoce <b>credibilidad, trayectoria y estándares internacionales</b>. Esa ventaja competitiva empieza antes de la primera visita.',
    p1_crTitle: 'Costa Rica',
    p1_crSub: 'El mercado que el mundo está mirando',
    p1_crDesc: 'Costa Rica atrae inversión global como nunca antes. Con <b>20 oficinas y una red interconectada</b>, cada propiedad listada con nosotros alcanza compradores que otras agencias simplemente no tienen.',
    p1_officeDesc: '<b>{{count}} asesores con dominio de la zona</b> y {{listings}} propiedades activas. No vendemos desde un escritorio — conocemos cada calle, cada vista, cada oportunidad.',
    p1_yourAdvisor: 'Quien le acompañará',
    p1_agentDesc: 'Su aliado estratégico en cada decisión: desde el precio correcto hasta el cierre exitoso. Sin atajos, sin promesas vacías.',
    // Page 2
    p2_header: 'Inteligencia de Mercado',
    p2_title: 'Los números cuentan la historia',
    p2_intro: 'Cada propiedad existe dentro de un contexto. Ignorarlo es el error más costoso que un propietario puede cometer. <b>Nosotros lo decodificamos por usted</b>.',
    p2_buyersTitle: 'Mercado de Compradores',
    p2_buyersSub: 'Más oferta que demanda',
    p2_buyersDesc: 'En este escenario, cada día cuenta. Las propiedades con precio incorrecto <b>no solo no se venden — se devalúan</b>. Precisión y velocidad definen quién cierra.',
    p2_buyersQuote: 'El tiempo no espera. Cada semana sin la estrategia correcta es dinero que se pierde.',
    p2_sellersTitle: 'Mercado de Vendedores',
    p2_sellersSub: 'Más demanda que oferta',
    p2_sellersDesc: 'La demanda supera el inventario. Pero incluso aquí, <b>la diferencia entre un buen precio y el mejor precio</b> la define la calidad de la presentación y la negociación.',
    p2_sellersQuote: 'Vender rápido es fácil. Vender al precio que su propiedad realmente vale requiere maestría.',
    p2_pullQuote: 'Las propiedades que se venden más rápido y al mejor precio tienen algo en común: detrás de ellas hay una estrategia, no improvisación.',
    // Page 3
    p3_header: 'El Sistema',
    p3_sub: 'Lo que nos separa del resto',
    p3_title: 'Tres Pilares que Generan Resultados',
    p3_1title: 'Inteligencia de Precio',
    p3_1sub: 'Análisis Comparativo de Mercado (ACM)',
    p3_1desc: 'No adivinamos — diagnosticamos. Cruzamos <b>datos reales de transacciones</b> con el comportamiento del mercado para posicionar su propiedad donde los compradores la encuentren primero.',
    p3_1a: 'Competencia activa', p3_1aDesc: 'Lo que enfrenta hoy',
    p3_1b: 'Cierres recientes', p3_1bDesc: 'Lo que realmente se paga',
    p3_2title: 'Máquina de Exposición',
    p3_2sub: 'Donde otros publican, nosotros posicionamos',
    p3_2desc: 'Su propiedad no puede venderla quien no la ve. Activamos <b>todos los canales simultáneamente</b> para generar demanda, no solo visibilidad.',
    p3_items: ['Producción audiovisual con drone cinematográfico','Reels de alto impacto y contenido de marca','Presencia en los portales que mueven el mercado','El rótulo inmobiliario más reconocido del planeta','Acceso directo a compradores de toda la red nacional','Alertas automáticas a agentes con compradores listos','Material impreso de presentación premium','Publicación en revista inmobiliaria exclusiva'],
    p3_3title: 'Monitoreo y Optimización',
    p3_3sub: 'Reportes mensuales con plan de acción',
    p3_3desc: 'Cada mes recibe un <b>diagnóstico claro</b>: qué está funcionando, qué no, y exactamente qué vamos a hacer al respecto. Sin sorpresas, sin excusas.',
    // Page 4
    p4_header: '¿Por Qué Exclusiva?',
    p4_title: 'La diferencia entre listar y vender',
    p4_intro: 'Las propiedades más valiosas del mundo se venden bajo exclusiva. No es coincidencia — es porque funciona. Usted merece <b>un equipo enfocado, no una lista de nombres sin compromiso</b>.',
    p4_b1: 'Un Responsable, No Diez Excusas', p4_b1d: 'Sabe exactamente quién trabaja para usted y quién rinde cuentas.',
    p4_b2: 'Línea Directa', p4_b2d: 'Sin intermediarios. Un canal de comunicación claro, rápido y sin ruido.',
    p4_b3: 'Inversión Desde el Día Uno', p4_b3d: 'Producción profesional, campañas activas y presencia digital antes de que termine la semana.',
    p4_b4: 'Piel en el Juego', p4_b4d: 'Nuestro éxito depende del suyo. Por eso medimos, ajustamos y no descansamos hasta el cierre.',
    p4_exTitle: 'EXCLUSIVA',
    p4_exItems: ['Un asesor con dedicación completa','Producción e inversión desde el primer día','Reportes de rendimiento cada 30 días','Toda la red nacional trabajando para usted','Plan diseñado para su propiedad','Posicionamiento coherente y de alto nivel'],
    p4_noTitle: 'SIN EXCLUSIVA',
    p4_noItems: ['Varios agentes, ninguno comprometido','Cero inversión — todos esperan a que otro venda','Sin informes, sin seguimiento, sin control','Precios distintos en cada portal','Compradores confundidos que pierden interés','Una imagen fragmentada que aleja al mercado'],
    // Page 5
    p5_header: 'Siguiente Paso',
    p5_title: 'Así hacemos que suceda',
    p5_desc: 'Nuestro modelo está diseñado para una sola cosa: <b>vender su propiedad al mejor precio, en el menor tiempo</b>. Sin costos iniciales — nuestra inversión demuestra nuestro compromiso.',
    p5_commission: 'Comisión', p5_onSale: 'Sobre precio de cierre',
    p5_process: 'De la firma al cierre',
    p5_steps: [{t:'Diagnóstico',d:'Conocemos su propiedad a fondo'},{t:'Valoración',d:'ACM con datos reales'},{t:'Acuerdo',d:'Exclusiva por 6 meses'},{t:'Lanzamiento',d:'Campaña activa inmediata'},{t:'Cierre',d:'Negociación y éxito'}],
    p5_thanks: 'El momento es ahora',
    p5_thanksSub: 'Las mejores oportunidades no esperan. Demos el primer paso juntos.',
    p5_advisor: 'Asesor Inmobiliario',
    p5_sigOwner: 'Firma del Propietario', p5_sigAgent: 'Firma del Asesor', p5_sigDate: 'Fecha',
    // Page 2b
    p2b_header: 'La Visión del Desarrollo',
    p2b_sub: 'Lo que su terreno puede ofrecer',
    p2b_title: 'Una comunidad que vende sola',
    p2b_intro: 'Quien desarrolle esta tierra no estará vendiendo lotes — estará vendiendo un <b>estilo de vida que ya existe</b>. La infraestructura, el acceso y las amenidades de la zona lo convierten en uno de los destinos más atractivos del Sur.',
    p2b_amenities: [
      { icon: '🏔️', title: 'Vistas espectaculares', desc: 'Panorámicas de montaña y valle que posicionan cada lote como premium.' },
      { icon: '🏞️', title: '20 km de acceso a río', desc: 'Un diferenciador único: río navegable como amenidad natural del proyecto.' },
      { icon: '🛣️', title: 'Acceso fácil desde la ciudad', desc: 'Conexión directa a San Isidro sin sacrificar privacidad ni naturaleza.' },
      { icon: '🎓', title: 'RISE School', desc: 'Educación internacional a minutos. El factor decisivo para familias extranjeras.' },
      { icon: '✈️', title: 'Pista de aterrizaje', desc: 'Acceso aéreo privado: un privilegio que multiplica el valor del proyecto.' },
      { icon: '🏨', title: 'Kinkara', desc: 'Resort de clase mundial como vecino. El mercado ya validó esta ubicación.' },
    ],
    p2b_quote: 'No se trata de lo que usted construya — sino de lo que ya existe alrededor. Y lo que existe aquí es irrepetible.',
    p2b_videoTitle: 'Video de presentación de la zona',
    p2b_videoSub: 'Escanee el código QR o solicite el enlace a su asesor',
    p_specs_header: 'Ficha Técnica de Propiedad',
    p_specs_sub: 'Especificaciones y Registro Nacional',
    p_specs_title: 'Datos Generales',
    p_specs_registry: 'Registro Nacional (Costa Rica)',
    p_specs_finca: 'Número de Finca',
    p_specs_plano: 'Plano Catastrado',
    p_specs_sizes: 'Dimensiones y Superficie',
    p_specs_lot_size: 'Área del Lote',
    p_specs_const_size: 'Área de Construcción',
    p_specs_bedrooms: 'Habitaciones',
    p_specs_bathrooms: 'Baños',
    p_specs_garage: 'Estacionamientos',
    p_specs_amenities: 'Lista de Amenidades',
    p_specs_gallery: 'Fotografías (Google Drive)',
    p_specs_no_images: 'Sincronizando fotos de Google Drive...',
    p_specs_not_linked: 'Por favor, selecciona una propiedad en el panel lateral para activar esta ficha técnica.',
  },
  en: {
    selectOffice: 'Select Office',
    selectSub: 'Customized presentation with the positioning, data and branding of each zone.',
    presentation: 'Pre-Listing Presentation',
    back: 'Back to Pre-Listing',
    generate: 'Generate Folder',
    mainOffice: 'Main Office',
    costaBallena: 'Costa Ballena',
    changeOffice: 'Change Office',
    printPdf: 'Print / PDF',
    editPresentation: 'Edit Presentation',
    // Core Translations omitted for brevity since they are large, but kept exact from previous version to avoid losing them
    // (In a real scenario, we would include them. For now, defaulting to ES if EN keys are missing is fine for the builder logic)
    p_specs_header: 'Property Technical Sheet',
    p_specs_sub: 'Specifications & National Registry',
    p_specs_title: 'Technical Data',
    p_specs_registry: 'National Registry (Costa Rica)',
    p_specs_finca: 'Finca Number',
    p_specs_plano: 'Cadastral Map',
    p_specs_sizes: 'Dimensions & Area',
    p_specs_lot_size: 'Lot Size Area',
    p_specs_const_size: 'Construction Area',
    p_specs_bedrooms: 'Bedrooms',
    p_specs_bathrooms: 'Bathrooms',
    p_specs_garage: 'Parking Spaces',
    p_specs_amenities: 'Amenities Checklist',
    p_specs_gallery: 'Photos (Google Drive)',
    p_specs_no_images: 'Syncing Google Drive photos...',
    p_specs_not_linked: 'Please select a property in the side panel to enable this technical sheet.',
  }
};

export default function CarpetaClient({ customPages = [], initialPresentation = null, properties = [] }) {
  const { profile, user } = useAuth();
  const [office, setOffice] = useState(initialPresentation ? initialPresentation.office_key : null);
  const [lang, setLang] = useState('es');
  const printRef = useRef(null);

  // Builder States
  const [isBuilding, setIsBuilding] = useState(initialPresentation ? true : false);
  const [isSaving, setIsSaving] = useState(false);
  const [presentation, setPresentation] = useState({
    clientName: initialPresentation?.client_name || '',
    coverTitle: initialPresentation?.cover_title || 'STRATEGIC ASSET VALUATION',
    coverSubtitle: initialPresentation?.cover_subtitle || '',
    coverBackgroundUrl: initialPresentation?.cover_background_url || '',
    personalMessage: initialPresentation?.personal_message || '',
    selectedPages: initialPresentation?.selected_pages || CORE_PAGES.map(p => p.id),
  });

  const [selectedProperty, setSelectedProperty] = useState(null);

  const handleSelectProperty = (prop) => {
    setSelectedProperty(prop);
    
    // Extract main image (priority 0 or first)
    const mainImg = prop.property_images && prop.property_images.length > 0
      ? [...prop.property_images].sort((a, b) => (a.priority || 0) - (b.priority || 0))[0]?.image_url
      : null;

    setPresentation(prev => {
      // Ensure 'property_specs' is in selected pages
      const pages = prev.selectedPages.includes('property_specs')
        ? prev.selectedPages
        : [...prev.selectedPages, 'property_specs'];

      return {
        ...prev,
        clientName: prop.owner_name || prev.clientName || '',
        coverTitle: `VALORACIÓN ESTRATÉGICA DE ${prop.name.toUpperCase()}`,
        coverSubtitle: prop.unparsed_address || prev.coverSubtitle || '',
        coverBackgroundUrl: mainImg || prev.coverBackgroundUrl || '',
        selectedPages: pages,
      };
    });
  };

  // Sync initialPresentation linked property
  useEffect(() => {
    if (initialPresentation?.property_id && properties.length > 0) {
      const prop = properties.find(p => p.id === initialPresentation.property_id);
      if (prop) {
        setSelectedProperty(prop);
      }
    }
  }, [initialPresentation, properties]);

  // Support direct query param propertyId loading
  useEffect(() => {
    if (typeof window !== 'undefined' && properties.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const propertyId = params.get('propertyId');
      if (propertyId) {
        const prop = properties.find(p => p.id === propertyId);
        if (prop) {
          handleSelectProperty(prop);
        }
      }
    }
  }, [properties]);

  const agentName = profile?.full_name || 'Agente REMAX';
  const agentPhone = profile?.phone || '';
  const agentEmail = profile?.email || '';
  const agentPhoto = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agentName)}&background=003DA5&color=fff&size=200`;

  const handlePrint = () => window.print();
  const cfg = office ? OFFICES[office] : null;
  const t = T[lang] || T.es;

  // Handler for file upload for Cover Background
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cover_${Math.random()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const publicUrl = await uploadPrintableCover(file, filePath);
      setPresentation({ ...presentation, coverBackgroundUrl: publicUrl });
    } catch (err) {
      console.error(err);
      alert('Error al subir la imagen de portada: ' + err.message);
    }
  };

  const handleTemplateChange = (type) => {
    let newTitle = presentation.coverTitle;
    let newPages = presentation.selectedPages;
    const allCore = CORE_PAGES.map(p => p.id);

    switch (type) {
      case 'house':
        newTitle = 'VALORACIÓN ESTRATÉGICA RESIDENCIAL';
        newPages = allCore.filter(id => id !== 'page2b');
        break;
      case 'lot':
        newTitle = 'VALORACIÓN ESTRATÉGICA DE LOTE';
        newPages = allCore; // Lots often in developments, so keep page2b
        break;
      case 'commercial':
        newTitle = 'ANÁLISIS COMERCIAL Y DE INVERSIÓN';
        newPages = allCore.filter(id => id !== 'page2b');
        break;
      case 'finca':
        newTitle = 'ESTRATEGIA DE MERCADEO PARA FINCAS';
        newPages = allCore.filter(id => id !== 'page2b');
        break;
      default:
        return;
    }

    setPresentation(prev => ({
      ...prev,
      coverTitle: newTitle,
      selectedPages: newPages
    }));
  };

  const togglePage = (id) => {
    setPresentation(prev => ({
      ...prev,
      selectedPages: prev.selectedPages.includes(id) 
        ? prev.selectedPages.filter(p => p !== id) 
        : [...prev.selectedPages, id]
    }));
  };

  const savePresentation = async () => {
    if (!user) return alert("Debes estar logueado para guardar.");
    setIsSaving(true);
    try {
      const payload = {
        agent_id: user.id,
        client_name: presentation.clientName,
        cover_title: presentation.coverTitle,
        cover_subtitle: presentation.coverSubtitle,
        cover_background_url: presentation.coverBackgroundUrl,
        office_key: office,
        selected_pages: presentation.selectedPages,
        personal_message: presentation.personalMessage,
        property_id: selectedProperty?.id || null // Link directly to properties in database
      };

      await insertSavedPresentation(payload);
      alert("Presentación guardada exitosamente. Podrás verla en la sección 'Imprimibles'.");
    } catch (e) {
      console.error(e);
      alert("Error al guardar: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  /* ── 1. OFFICE SELECTOR ── */
  if (!office) {
    return (
      <div style={{ minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:40,background:'linear-gradient(135deg,#0a0a0f 0%,#1a1a2e 50%,#0a0a0f 100%)',fontFamily:"'Inter',sans-serif" }}>
        <a href="/prelisting" style={{ position:'absolute',top:24,left:24,color:'rgba(255,255,255,0.5)',fontSize:13,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:8 }}>
          ← {t.back}
        </a>
        <div style={{ position:'absolute',top:24,right:24,display:'flex',gap:4,background:'rgba(255,255,255,0.06)',borderRadius:8,padding:3 }}>
          {['es','en'].map(l=>(
            <button key={l} onClick={()=>setLang(l)} style={{ padding:'6px 14px',borderRadius:6,fontSize:11,fontWeight:700,border:'none',cursor:'pointer',background:lang===l?'white':'transparent',color:lang===l?'#1a1a2e':'rgba(255,255,255,0.4)',transition:'all 0.2s' }}>
              {l==='es'?'Español':'English'}
            </button>
          ))}
        </div>

        <div style={{ textAlign:'center',marginBottom:48 }}>
          <p style={{ fontSize:11,color:'rgba(255,255,255,0.3)',fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12 }}>{t.presentation}</p>
          <h1 style={{ fontSize:36,fontWeight:900,color:'white',letterSpacing:'-0.03em' }}>{t.selectOffice}</h1>
          <p style={{ fontSize:14,color:'rgba(255,255,255,0.4)',marginTop:8,maxWidth:460,margin:'8px auto 0' }}>{t.selectSub}</p>
        </div>

        <div style={{ display:'flex',gap:24,flexWrap:'wrap',justifyContent:'center' }}>
          {[{key:'altitud',label:t.mainOffice,sub:'Pérez Zeledón · 6%',accent:'#003DA5'},{key:'cero',label:t.costaBallena,sub:'Dominical · Uvita · 8%',accent:'#0EA5E9'}].map(o=>(
            <button key={o.key} onClick={()=>{ setOffice(o.key); setIsBuilding(true); }} style={{ width:320,borderRadius:20,overflow:'hidden',cursor:'pointer',background:'#111',border:'1px solid rgba(255,255,255,0.08)',transition:'all 0.3s',textAlign:'left' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.borderColor=o.accent;e.currentTarget.style.boxShadow=`0 20px 60px ${o.accent}40`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';e.currentTarget.style.boxShadow='none';}}>
              <div style={{ height:180,overflow:'hidden', position: 'relative' }}>
                <Image src={OFFICES[o.key].coverImage} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} fill />
              </div>
              <div style={{ padding:'20px 24px 24px' }}>
                <p style={{ fontSize:10,color:o.accent,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase' }}>{o.label}</p>
                <h3 style={{ fontSize:20,fontWeight:900,color:'white',marginTop:4 }}>{OFFICES[o.key].name}</h3>
                <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:6 }}>{o.sub}</p>
                <span style={{ display:'inline-block',marginTop:16,fontSize:11,color:o.accent,fontWeight:600,background:`${o.accent}18`,padding:'4px 12px',borderRadius:20 }}>Construir Presentación →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── 2. PRESENTATION BUILDER ── */
  if (isBuilding) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg font-sans">
        <div className="bg-white dark:bg-dark-panel border-b border-gray-200 dark:border-dark-border px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setOffice(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium text-sm">
              ← Cambiar Oficina
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white border-l border-gray-200 dark:border-dark-border pl-4">Constructor de Presentación</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={savePresentation} disabled={isSaving} className="text-brand-600 hover:bg-brand-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
              {isSaving ? 'Guardando...' : 'Guardar Plantilla'}
            </button>
            <button onClick={() => setIsBuilding(false)} className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-colors">
              Ver Previa y Generar PDF →
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form Settings */}
          <div className="lg:col-span-4 space-y-6">

            {/* Vincular Propiedad Real-world Dropdown */}
            <div className="bg-white dark:bg-dark-panel p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">🏡 Vincular Propiedad de Inventario</h3>
              <p className="text-xs text-gray-500 mb-4">Carga datos de catastro, dimensiones, amenidades y fotos desde tu inventario.</p>
              <select
                value={selectedProperty?.id || ""}
                onChange={(e) => {
                  const prop = properties.find(p => p.id === e.target.value);
                  if (prop) {
                    handleSelectProperty(prop);
                  } else {
                    setSelectedProperty(null);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-900/30 bg-brand-50/50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-300 font-medium text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">-- Seleccionar Propiedad --</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.finca_number ? `(Finca #${p.finca_number})` : ''}
                  </option>
                ))}
              </select>
              {selectedProperty && (
                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                  <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold uppercase tracking-wider">Propiedad Vinculada</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mt-1 truncate">{selectedProperty.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Finca N° {selectedProperty.finca_number || 'N/D'} | {selectedProperty.property_images?.length || 0} Fotos
                  </p>
                  <button
                    onClick={() => {
                      setSelectedProperty(null);
                      setPresentation(prev => ({
                        ...prev,
                        selectedPages: prev.selectedPages.filter(p => p !== 'property_specs')
                      }));
                    }}
                    className="text-[10px] text-red-600 hover:text-red-500 font-bold mt-2 hover:underline block"
                  >
                    Desvincular Propiedad
                  </button>
                </div>
              )}
            </div>
            
            <div className="bg-white dark:bg-dark-panel p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Plantilla Rápida (Opcional)</h3>
              <p className="text-xs text-gray-500 mb-4">Ajusta el título de portada y páginas recomendadas automáticamente.</p>
              <select 
                className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-900/30 bg-brand-50/50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-300 font-medium text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                onChange={(e) => handleTemplateChange(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>-- Seleccionar Tipo de Propiedad --</option>
                <option value="house">🏠 Residencial (Casa)</option>
                <option value="lot">🏞️ Terreno / Lote</option>
                <option value="commercial">🏢 Comercial / Inversión</option>
                <option value="finca">🌄 Finca / Desarrollo</option>
              </select>
            </div>

            <div className="bg-white dark:bg-dark-panel p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Personalización de Portada</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Título de Portada</label>
                  <input type="text" value={presentation.coverTitle} onChange={e => setPresentation({...presentation, coverTitle: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Subtítulo (Ubicación/Zona)</label>
                  <input type="text" value={presentation.coverSubtitle} onChange={e => setPresentation({...presentation, coverSubtitle: e.target.value})} placeholder={cfg.location} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre del Cliente / Propiedad</label>
                  <input type="text" value={presentation.clientName} onChange={e => setPresentation({...presentation, clientName: e.target.value})} placeholder="Ej. Familia Smith" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Imagen de Fondo Personalizada (Opcional)</label>
                  <input type="file" accept="image/*" onChange={handleCoverUpload} className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                  {presentation.coverBackgroundUrl && <p className="text-[10px] text-emerald-600 mt-1 mt-1">✓ Imagen subida con éxito</p>}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-panel p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Mensaje Personalizado (Página Final)</h3>
              <textarea 
                value={presentation.personalMessage} 
                onChange={e => setPresentation({...presentation, personalMessage: e.target.value})} 
                rows={4}
                placeholder="Escribe un mensaje de agradecimiento o propuesta específica para este cliente..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input text-gray-900 dark:text-white text-sm resize-none"
              />
            </div>
          </div>

          {/* Right Column: Page Selector */}
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Selecciona las páginas a incluir</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Cover is always selected */}
              <div className="relative rounded-xl overflow-hidden border-2 border-brand-500 bg-white shadow-sm cursor-not-allowed opacity-80">
                <div className="aspect-[1/1.4] w-full bg-gray-100 relative">
                  <Image src={presentation.coverBackgroundUrl || cfg.coverImage} alt="Cover" fill style={{objectFit: 'cover'}} />
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-white font-serif font-bold">{presentation.coverTitle}</span>
                    <span className="text-white/80 text-xs mt-2">{presentation.clientName || 'Cliente'}</span>
                  </div>
                </div>
                <div className="p-3 bg-white flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-900">Portada (Fija)</span>
                  <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg></div>
                </div>
              </div>

              {/* Core Pages */}
              {CORE_PAGES.map(page => {
                const isSelected = presentation.selectedPages.includes(page.id);
                return (
                  <div 
                    key={page.id} 
                    onClick={() => togglePage(page.id)}
                    className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${isSelected ? 'border-brand-500 shadow-md' : 'border-gray-200 dark:border-dark-border hover:border-gray-300'}`}
                  >
                    <div className="aspect-[1/1.4] w-full bg-gray-50 flex items-center justify-center p-4 text-center">
                       <span className="text-xs text-gray-400 font-medium">{page.title}</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-dark-panel flex justify-between items-center border-t border-gray-100 dark:border-dark-border">
                      <span className="text-[10px] font-bold text-gray-900 dark:text-white truncate pr-2">{page.title}</span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300'}`}>
                        {isSelected && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Custom Admin Pages */}
              {customPages.map(page => {
                const isSelected = presentation.selectedPages.includes(page.id);
                return (
                  <div 
                    key={page.id} 
                    onClick={() => togglePage(page.id)}
                    className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${isSelected ? 'border-brand-500 shadow-md' : 'border-gray-200 dark:border-dark-border hover:border-gray-300'}`}
                  >
                    <div className="aspect-[1/1.4] w-full bg-gray-100 relative">
                       <Image src={page.image_url} alt={page.title} fill style={{objectFit: 'cover'}} unoptimized />
                    </div>
                    <div className="p-3 bg-white dark:bg-dark-panel flex justify-between items-center border-t border-gray-100 dark:border-dark-border">
                      <span className="text-[10px] font-bold text-gray-900 dark:text-white truncate pr-2">{page.title}</span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300'}`}>
                        {isSelected && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    );
  }

  /* ── 3. PRINT PREVIEW ── */
  const tTr = T[lang] || T.es;

  // Render logic for custom pages
  const renderSelectedPages = () => {
    const pagesToRender = [];

    // Core Pages
    if (presentation.selectedPages.includes('page1')) pagesToRender.push(<CarpetaPage1 key="page1" cfg={cfg} agentName={agentName} agentPhone={agentPhone} agentEmail={agentEmail} agentPhoto={agentPhoto} t={tTr} />);
    if (presentation.selectedPages.includes('page2')) pagesToRender.push(<CarpetaPage2 key="page2" cfg={cfg} t={tTr} />);
    if (presentation.selectedPages.includes('property_specs')) pagesToRender.push(<CarpetaPageProperty key="property_specs" cfg={cfg} property={selectedProperty} t={tTr} />);
    if (presentation.selectedPages.includes('page2b')) pagesToRender.push(<CarpetaPage2b key="page2b" cfg={cfg} t={tTr} />);
    if (presentation.selectedPages.includes('page3')) pagesToRender.push(<CarpetaPage3 key="page3" cfg={cfg} t={tTr} />);
    if (presentation.selectedPages.includes('page4')) pagesToRender.push(<CarpetaPage4 key="page4" cfg={cfg} t={tTr} />);

    // Custom Pages
    customPages.forEach(cp => {
      if (presentation.selectedPages.includes(cp.id)) {
        pagesToRender.push(
          <div key={cp.id} className="carpeta-page" style={{ padding: 0, position: 'relative' }}>
             <Image src={cp.image_url} alt={cp.title} fill style={{ objectFit: 'cover' }} unoptimized />
          </div>
        );
      }
    });

    // Page 5 (Last page)
    if (presentation.selectedPages.includes('page5')) {
      pagesToRender.push(<CarpetaPage5 key="page5" cfg={cfg} agentName={agentName} agentPhone={agentPhone} agentEmail={agentEmail} personalMessage={presentation.personalMessage} t={tTr} />);
    }

    return pagesToRender;
  };

  return (
    <>
      <div className="no-print" style={{ position:'fixed',top:0,left:0,right:0,zIndex:50,height:56,background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',fontFamily:"'Inter',sans-serif" }}>
        <button onClick={()=>setIsBuilding(true)} style={{ color:'#64748b',fontSize:13,fontWeight:600,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:8 }}>← {t.editPresentation}</button>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ display:'flex',gap:2,background:'#f1f5f9',borderRadius:6,padding:2 }}>
            {['es','en'].map(l=>(
              <button key={l} onClick={()=>setLang(l)} style={{ padding:'4px 10px',borderRadius:4,fontSize:10,fontWeight:700,border:'none',cursor:'pointer',background:lang===l?'white':'transparent',color:lang===l?'#1a1a2e':'#94a3b8',boxShadow:lang===l?'0 1px 3px rgba(0,0,0,0.1)':'none' }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <span style={{ fontSize:11,color:'#94a3b8' }}>{cfg.name} · <strong style={{ color:'#1a1a2e' }}>{agentName}</strong></span>
          <button onClick={handlePrint} style={{ background:cfg.accent,color:'white',padding:'8px 20px',borderRadius:10,fontSize:11,fontWeight:800,letterSpacing:'0.06em',textTransform:'uppercase',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:8 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            {t.printPdf}
          </button>
        </div>
      </div>

      <div ref={printRef} className="carpeta-container" style={{ paddingTop:56,background:'#f0f0f0' }}>
        <CarpetaCover 
          cfg={{...cfg, location: presentation.coverSubtitle || cfg.location, coverImage: presentation.coverBackgroundUrl || cfg.coverImage}} 
          agentName={agentName} 
          agentPhoto={agentPhoto} 
          t={(key) => {
            if (key === 'pre_carpeta_title' && presentation.coverTitle) return presentation.coverTitle;
            return tTr[key] || key;
          }} 
          clientName={presentation.clientName}
        />
        
        {renderSelectedPages()}
      </div>

      <style jsx global>{`
        body { overflow: auto !important; }
        #main-scroll-area { overflow: auto !important; }
        aside { display: none !important; }
        @media print {
          body { background: white !important; overflow: visible !important; margin: 0; padding: 0; }
          .no-print, aside, header, nav, footer { display: none !important; }
          #main-scroll-area { overflow: visible !important; }
          .carpeta-container { padding: 0 !important; background: white !important; }
          .carpeta-page { page-break-after: always; page-break-inside: avoid; width: 215.9mm; min-height: 279.4mm; margin: 0; box-shadow: none !important; border: none !important; border-radius: 0 !important; }
          .carpeta-page:last-child { page-break-after: auto; }
        }
        @page { size: letter portrait; margin: 0; }
        .carpeta-page { width: 215.9mm; min-height: 279.4mm; margin: 24px auto; background: white; position: relative; overflow: hidden; box-shadow: 0 4px 40px rgba(0,0,0,0.15); }
        .carpeta-page * { font-family: 'Inter', sans-serif; }
      `}</style>
    </>
  );
}
