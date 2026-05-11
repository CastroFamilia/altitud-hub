"use client";

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import CarpetaCover from '@/components/prelisting/carpeta/CarpetaCover';
import CarpetaPage1 from '@/components/prelisting/carpeta/CarpetaPage1';
import CarpetaPage2 from '@/components/prelisting/carpeta/CarpetaPage2';
import CarpetaPage2b from '@/components/prelisting/carpeta/CarpetaPage2b';
import CarpetaPage3 from '@/components/prelisting/carpeta/CarpetaPage3';
import CarpetaPage4 from '@/components/prelisting/carpeta/CarpetaPage4';
import CarpetaPage5 from '@/components/prelisting/carpeta/CarpetaPage5';

const OFFICES = {
  altitud: {
    name: 'RE/MAX Altitud',
    zone: 'Pérez Zeledón',
    location: 'San Isidro de El General',
    commission: '6%',
    coverImage: '/assets/carpeta-cover-pz.png',
    agentCount: '13', listingCount: '300+',
    accent: '#003DA5',
  },
  cero: {
    name: 'RE/MAX Altitud Cero',
    zone: 'Costa Ballena',
    location: 'Dominical · Uvita · Ojochal',
    commission: '8%',
    coverImage: '/assets/carpeta-cover-dominical.png',
    agentCount: '8', listingCount: '200+',
    accent: '#0C4A6E',
  }
};

/* ════════════════════════════════════════════
   TRANSLATIONS
   ════════════════════════════════════════════ */
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
    // Page 1
    p1_header: 'Alcance Global, Impacto Local',
    p1_title1: 'Una marca que',
    p1_title2: 'abre puertas',
    p1_countries: 'Países', p1_offices: 'Oficinas', p1_agents: 'Agentes',
    p1_worldDesc: 'Cuando un comprador de cualquier parte del mundo ve el nombre RE/MAX, no necesita explicación. Reconoce <b>credibilidad, trayectoria y estándares internacionales</b>. Esa ventaja competitiva empieza antes de la primera visita.',
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
    // Page 2b — Developer Vision
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
    p1_header: 'Global Reach, Local Impact',
    p1_title1: 'A brand that',
    p1_title2: 'opens doors',
    p1_countries: 'Countries', p1_offices: 'Offices', p1_agents: 'Agents',
    p1_worldDesc: 'When a buyer from anywhere in the world sees the RE/MAX name, no explanation is needed. They recognize <b>credibility, track record and international standards</b>. That competitive edge begins before the first showing.',
    p1_crTitle: 'Costa Rica',
    p1_crSub: 'The market the world is watching',
    p1_crDesc: 'Costa Rica is attracting global investment like never before. With <b>20 offices and an interconnected network</b>, every property listed with us reaches buyers that other agencies simply cannot.',
    p1_officeDesc: '<b>{{count}} advisors with deep local expertise</b> and {{listings}} active listings. We don\'t sell from a desk — we know every street, every view, every opportunity.',
    p1_yourAdvisor: 'Who will guide you',
    p1_agentDesc: 'Your strategic partner in every decision: from the right price to a successful closing. No shortcuts, no empty promises.',
    p2_header: 'Market Intelligence',
    p2_title: 'The numbers tell the story',
    p2_intro: 'Every property exists within a context. Ignoring it is the most expensive mistake an owner can make. <b>We decode it for you</b>.',
    p2_buyersTitle: "Buyer's Market",
    p2_buyersSub: 'More supply than demand',
    p2_buyersDesc: 'In this scenario, every day counts. Mispriced properties <b>don\'t just sit — they lose value</b>. Precision and speed define who closes.',
    p2_buyersQuote: 'Time doesn\'t wait. Every week without the right strategy is money left on the table.',
    p2_sellersTitle: "Seller's Market",
    p2_sellersSub: 'More demand than supply',
    p2_sellersDesc: 'Demand outpaces inventory. But even here, <b>the gap between a good price and the best price</b> comes down to presentation quality and negotiation.',
    p2_sellersQuote: 'Selling fast is easy. Selling at the price your property truly deserves takes mastery.',
    p2_pullQuote: 'The properties that sell fastest and at the highest price all have one thing in common: behind them is a strategy, not improvisation.',
    p3_header: 'The System',
    p3_sub: 'What sets us apart',
    p3_title: 'Three Pillars That Drive Results',
    p3_1title: 'Price Intelligence',
    p3_1sub: 'Comparative Market Analysis (CMA)',
    p3_1desc: 'We don\'t guess — we diagnose. We cross-reference <b>real transaction data</b> with market behavior to position your property where buyers find it first.',
    p3_1a: 'Active competition', p3_1aDesc: 'What you face today',
    p3_1b: 'Recent closings', p3_1bDesc: 'What buyers actually pay',
    p3_2title: 'Exposure Engine',
    p3_2sub: 'Where others post, we position',
    p3_2desc: 'Your property can\'t be sold by someone who hasn\'t seen it. We activate <b>every channel simultaneously</b> to generate demand, not just visibility.',
    p3_items: ['Cinematic drone production & professional photography','High-impact reels & branded content','Presence on the portals that move the market','The most recognized real estate sign on the planet','Direct access to buyers across the national network','Automated alerts to agents with ready buyers','Premium printed presentation materials','Feature in exclusive real estate magazine'],
    p3_3title: 'Monitoring & Optimization',
    p3_3sub: 'Monthly reports with action plan',
    p3_3desc: 'Every month you receive a <b>clear diagnosis</b>: what\'s working, what isn\'t, and exactly what we\'re going to do about it. No surprises, no excuses.',
    p4_header: 'Why Exclusive?',
    p4_title: 'The difference between listing and selling',
    p4_intro: 'The most valuable properties in the world are sold under exclusive agreements. That\'s not a coincidence — it\'s because it works. You deserve <b>a focused team, not a list of names with no skin in the game</b>.',
    p4_b1: 'One Owner of Results', p4_b1d: 'You know exactly who works for you and who is accountable.',
    p4_b2: 'Direct Line', p4_b2d: 'No middlemen. One clear, fast, noise-free communication channel.',
    p4_b3: 'Day-One Investment', p4_b3d: 'Professional production, active campaigns and digital presence before the week is over.',
    p4_b4: 'Skin in the Game', p4_b4d: 'Our success depends on yours. That\'s why we measure, adjust and don\'t rest until closing.',
    p4_exTitle: 'EXCLUSIVE',
    p4_exItems: ['One advisor with complete dedication','Production & investment from day one','Performance reports every 30 days','The entire national network working for you','A plan designed for your property','Coherent, high-level positioning'],
    p4_noTitle: 'NON-EXCLUSIVE',
    p4_noItems: ['Multiple agents, none committed','Zero investment — everyone waits for someone else to sell','No reports, no tracking, no control','Different prices on every portal','Confused buyers who lose interest','A fragmented image that pushes the market away'],
    p5_header: 'Next Step',
    p5_title: 'How we make it happen',
    p5_desc: 'Our model is designed for one thing: <b>selling your property at the best price, in the shortest time</b>. No upfront costs — our investment proves our commitment.',
    p5_commission: 'Commission', p5_onSale: 'On closing price',
    p5_process: 'From signing to closing',
    p5_steps: [{t:'Discovery',d:'Deep dive into your property'},{t:'Valuation',d:'CMA with real data'},{t:'Agreement',d:'6-month exclusive'},{t:'Launch',d:'Immediate active campaign'},{t:'Closing',d:'Negotiation & success'}],
    p5_thanks: 'The time is now',
    p5_thanksSub: 'The best opportunities don\'t wait. Let\'s take the first step together.',
    p5_advisor: 'Real Estate Advisor',
    p5_sigOwner: 'Owner Signature', p5_sigAgent: 'Agent Signature', p5_sigDate: 'Date',
    // Page 2b — Developer Vision
    p2b_header: 'The Development Vision',
    p2b_sub: 'What your land can offer',
    p2b_title: 'A community that sells itself',
    p2b_intro: 'Whoever develops this land won\'t be selling lots — they\'ll be selling a <b>lifestyle that already exists</b>. The infrastructure, access and amenities in this area make it one of the most compelling destinations in the Southern Zone.',
    p2b_amenities: [
      { icon: '🏔️', title: 'Breathtaking views', desc: 'Mountain and valley panoramas that position every lot as premium.' },
      { icon: '🏞️', title: '20 km river access', desc: 'A unique differentiator: navigable river as a natural project amenity.' },
      { icon: '🛣️', title: 'Easy city access', desc: 'Direct connection to San Isidro without sacrificing privacy or nature.' },
      { icon: '🎓', title: 'RISE School', desc: 'International education minutes away. The deciding factor for foreign families.' },
      { icon: '✈️', title: 'Private airstrip', desc: 'Private air access: a privilege that multiplies project value.' },
      { icon: '🏨', title: 'Kinkara', desc: 'World-class resort as a neighbor. The market has already validated this location.' },
    ],
    p2b_quote: 'It\'s not about what you build — it\'s about what already exists around it. And what exists here is unrepeatable.',
    p2b_videoTitle: 'Area presentation video',
    p2b_videoSub: 'Scan the QR code or request the link from your advisor',
  }
};

export default function CarpetaClient() {
  const { profile } = useAuth();
  const [office, setOffice] = useState(null);
  const [lang, setLang] = useState('es');
  const printRef = useRef(null);

  const agentName = profile?.full_name || 'Agente RE/MAX Altitud';
  const agentPhone = profile?.phone || '+506 0000 0000';
  const agentEmail = profile?.email || 'agente@remax-altitud.cr';
  const agentPhoto = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agentName)}&background=003DA5&color=fff&size=200`;

  const handlePrint = () => window.print();
  const cfg = office ? OFFICES[office] : null;
  const t = T[lang];

  /* ── OFFICE SELECTOR ── */
  if (!office) {
    return (
      <div style={{ minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:40,background:'linear-gradient(135deg,#0a0a0f 0%,#1a1a2e 50%,#0a0a0f 100%)',fontFamily:"'Inter',sans-serif" }}>
        <a href="/prelisting" style={{ position:'absolute',top:24,left:24,color:'rgba(255,255,255,0.5)',fontSize:13,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:8 }}>
          ← {t.back}
        </a>
        {/* Language toggle */}
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
            <button key={o.key} onClick={()=>setOffice(o.key)} style={{ width:320,borderRadius:20,overflow:'hidden',cursor:'pointer',background:'#111',border:'1px solid rgba(255,255,255,0.08)',transition:'all 0.3s',textAlign:'left' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.borderColor=o.accent;e.currentTarget.style.boxShadow=`0 20px 60px ${o.accent}40`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';e.currentTarget.style.boxShadow='none';}}>
              <div style={{ height:180,overflow:'hidden' }}><img src={OFFICES[o.key].coverImage} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} /></div>
              <div style={{ padding:'20px 24px 24px' }}>
                <p style={{ fontSize:10,color:o.accent,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase' }}>{o.label}</p>
                <h3 style={{ fontSize:20,fontWeight:900,color:'white',marginTop:4 }}>{OFFICES[o.key].name}</h3>
                <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:6 }}>{o.sub}</p>
                <span style={{ display:'inline-block',marginTop:16,fontSize:11,color:o.accent,fontWeight:600,background:`${o.accent}18`,padding:'4px 12px',borderRadius:20 }}>{t.generate} →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── PRESENTATION ── */
  return (
    <>
      <div className="no-print" style={{ position:'fixed',top:0,left:0,right:0,zIndex:50,height:56,background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',fontFamily:"'Inter',sans-serif" }}>
        <button onClick={()=>setOffice(null)} style={{ color:'#64748b',fontSize:13,fontWeight:600,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:8 }}>← {t.changeOffice}</button>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          {/* Language toggle */}
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
        <CarpetaCover cfg={cfg} agentName={agentName} agentPhoto={agentPhoto} t={t} />
        <CarpetaPage1 cfg={cfg} agentName={agentName} agentPhone={agentPhone} agentEmail={agentEmail} agentPhoto={agentPhoto} t={t} />
        <CarpetaPage2 cfg={cfg} t={t} />
        <CarpetaPage2b cfg={cfg} t={t} />
        <CarpetaPage3 cfg={cfg} t={t} />
        <CarpetaPage4 cfg={cfg} t={t} />
        <CarpetaPage5 cfg={cfg} agentName={agentName} agentPhone={agentPhone} agentEmail={agentEmail} t={t} />
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
