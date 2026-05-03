"use client";

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import CarpetaCover from '@/components/prelisting/carpeta/CarpetaCover';
import CarpetaPage1 from '@/components/prelisting/carpeta/CarpetaPage1';
import CarpetaPage2 from '@/components/prelisting/carpeta/CarpetaPage2';
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
    selectSub: 'Cada carpeta está personalizada con los datos de la zona, comisión y branding de la oficina seleccionada.',
    presentation: 'Carpeta de Presentación Pre-Listing',
    back: 'Volver a Pre-Listing',
    generate: 'Generar Carpeta',
    mainOffice: 'Oficina Principal',
    costaBallena: 'Costa Ballena',
    changeOffice: 'Cambiar Oficina',
    printPdf: 'Imprimir / PDF',
    // Page 1
    p1_header: 'Presencia Global, Poder Local',
    p1_title1: 'Respaldo',
    p1_title2: 'Internacional',
    p1_countries: 'Países', p1_offices: 'Oficinas', p1_agents: 'Agentes',
    p1_worldDesc: 'RE/MAX es la marca inmobiliaria más reconocida del mundo. Para compradores internacionales, el nombre RE/MAX transmite <b>confianza inmediata</b> — un estándar global de profesionalismo.',
    p1_crTitle: 'Costa Rica',
    p1_crSub: 'Líderes en el mercado costarricense',
    p1_crDesc: 'Con más de <b>150 agentes en 20 oficinas</b> a lo largo del país, RE/MAX Costa Rica es la red inmobiliaria más conectada y efectiva del mercado nacional.',
    p1_officeDesc: '<b>{{count}} agentes especializados</b> que conocen cada rincón de la zona. {{listings}} propiedades en listado con la mayor cobertura local.',
    p1_yourAdvisor: 'Su Asesor Inmobiliario',
    p1_agentDesc: 'Comprometido con brindar un servicio transparente, eficiente y personalizado para guiarle en la venta de su propiedad.',
    // Page 2
    p2_header: 'Entendiendo su Mercado',
    p2_title: 'El mercado define la estrategia',
    p2_intro: 'El mercado inmobiliario se mueve entre la <b>oferta</b> y la <b>demanda</b>. Entender dónde estamos es la diferencia entre una venta exitosa y meses de espera.',
    p2_buyersTitle: 'Mercado de Compradores',
    p2_buyersSub: 'Más oferta que demanda',
    p2_buyersDesc: 'Cuando hay más propiedades que compradores, los precios deben ser <b>competitivos</b>. Un <b>precio realista</b> y marketing activo es clave para atraer compradores serios.',
    p2_buyersQuote: 'Una propiedad bien valorada llama la atención. Una sobrevalorada se queda atrás.',
    p2_sellersTitle: 'Mercado de Vendedores',
    p2_sellersSub: 'Más demanda que oferta',
    p2_sellersDesc: 'Las propiedades se venden <b>más rápido</b> y a precios más altos. La <b>presentación profesional</b> y una estrategia bien ejecutada maximizan el resultado.',
    p2_sellersQuote: 'La ventaja está de su lado — la estrategia maximiza el resultado.',
    p2_pullQuote: 'Sin importar el tipo de mercado, una estrategia profesional marca la diferencia entre una venta exitosa y meses de espera.',
    // Page 3
    p3_header: 'Nuestra Estrategia',
    p3_sub: 'Metodología Probada',
    p3_title: 'Tres Pilares Fundamentales',
    p3_1title: 'Diagnosticar el Precio',
    p3_1sub: 'Análisis Comparativo de Mercado (ACM)',
    p3_1desc: 'Evaluamos las <b>propiedades activas</b> y las <b>ventas recientes</b> para fijar un precio que atraiga compradores serios y calificados.',
    p3_1a: 'Propiedades activas', p3_1aDesc: 'Su competencia actual',
    p3_1b: 'Ventas recientes', p3_1bDesc: 'El precio real del mercado',
    p3_2title: 'Estrategia de Marketing',
    p3_2sub: 'Exposición local e internacional',
    p3_2desc: 'Un <b>plan personalizado</b> para que su propiedad esté presente dondequiera que un comprador serio busque.',
    p3_items: ['Fotografía y video profesional con drone','Reels y contenido digital de marca','Portales nacionales e internacionales','El cartel más reconocido del mundo','Red RE/MAX: 150+ agentes en Costa Rica','Alerta MATCH con compradores calificados','Folletos y hojas informativas','Revista inmobiliaria impresa'],
    p3_3title: 'Medir y Ajustar',
    p3_3sub: 'Informe mensual de desempeño',
    p3_3desc: '<b>Informe mensual</b>: visitas, respuesta del mercado, competencia nueva y pasos a seguir. Los <b>resultados son lo que importa</b>.',
    // Page 4
    p4_header: '¿Por qué Exclusiva?',
    p4_title: 'Menos es Más',
    p4_intro: 'Con un listado exclusivo, recibe atención dedicada, comunicación directa y un plan estratégico personalizado — con acceso a toda la <b>red RE/MAX de 150+ agentes</b>.',
    p4_b1: 'Responsabilidad Clara', p4_b1d: 'Un solo profesional dedicado que responde por los resultados.',
    p4_b2: 'Comunicación Directa', p4_b2d: 'Un único punto de contacto para actualizaciones rápidas y sin confusión.',
    p4_b3: 'Marketing Inmediato', p4_b3d: 'Inversión desde el día uno en fotografía, video, contenido digital y promoción.',
    p4_b4: 'Compromiso Total', p4_b4d: 'No solo listamos — vendemos. Monitoreamos y ajustamos la estrategia.',
    p4_exTitle: 'EXCLUSIVA',
    p4_exItems: ['Un profesional 100% dedicado','Inversión inmediata en marketing','Informes mensuales de rendimiento','Acceso a toda la red RE/MAX','Estrategia personalizada','Imagen profesional y consistente'],
    p4_noTitle: 'SIN EXCLUSIVA',
    p4_noItems: ['Múltiples agentes sin compromiso','Nadie invierte — todos esperan','Sin reportes ni rendición de cuentas','Precios inconsistentes en portales','Confusión para compradores','Imagen poco profesional'],
    // Page 5
    p5_header: 'Cómo Trabajamos',
    p5_title: 'Modelo de Trabajo Exclusivo',
    p5_desc: 'Trabajamos bajo un modelo de exclusiva que garantiza <b>dedicación total</b>, inversión inmediata y resultados medibles. La comisión se cobra únicamente al momento de la venta exitosa.',
    p5_commission: 'Comisión', p5_onSale: 'Sobre precio de venta',
    p5_process: 'El Proceso',
    p5_steps: [{t:'Entrevista',d:'Conocemos su propiedad'},{t:'ACM',d:'Análisis de mercado'},{t:'Firma',d:'Exclusiva 6 meses'},{t:'Marketing',d:'Activación inmediata'},{t:'Venta',d:'Negociación y cierre'}],
    p5_thanks: 'Gracias por su confianza',
    p5_thanksSub: 'Será un honor trabajar juntos para lograr la venta exitosa de su propiedad.',
    p5_advisor: 'Asesor Inmobiliario',
    p5_sigOwner: 'Firma del Propietario', p5_sigAgent: 'Firma del Asesor', p5_sigDate: 'Fecha',
  },
  en: {
    selectOffice: 'Select Office',
    selectSub: 'Each folder is customized with the zone data, commission and branding of the selected office.',
    presentation: 'Pre-Listing Presentation Folder',
    back: 'Back to Pre-Listing',
    generate: 'Generate Folder',
    mainOffice: 'Main Office',
    costaBallena: 'Costa Ballena',
    changeOffice: 'Change Office',
    printPdf: 'Print / PDF',
    p1_header: 'Global Presence, Local Power',
    p1_title1: 'International',
    p1_title2: 'Backing',
    p1_countries: 'Countries', p1_offices: 'Offices', p1_agents: 'Agents',
    p1_worldDesc: 'RE/MAX is the most recognized real estate brand in the world. For international buyers, the RE/MAX name conveys <b>instant trust</b> — a global standard of professionalism.',
    p1_crTitle: 'Costa Rica',
    p1_crSub: 'Leaders in the Costa Rican market',
    p1_crDesc: 'With over <b>150 agents in 20 offices</b> across the country, RE/MAX Costa Rica is the most connected and effective real estate network in the national market.',
    p1_officeDesc: '<b>{{count}} specialized agents</b> who know every corner of the area. {{listings}} properties listed with the highest local coverage.',
    p1_yourAdvisor: 'Your Real Estate Advisor',
    p1_agentDesc: 'Committed to providing transparent, efficient and personalized service to guide you in selling your property.',
    p2_header: 'Understanding Your Market',
    p2_title: 'The market defines the strategy',
    p2_intro: 'The real estate market moves between <b>supply</b> and <b>demand</b>. Understanding where we stand is the difference between a successful sale and months of waiting.',
    p2_buyersTitle: "Buyer's Market",
    p2_buyersSub: 'More supply than demand',
    p2_buyersDesc: 'When there are more properties than buyers, prices must be <b>competitive</b>. A <b>realistic price</b> and active marketing are key to attracting serious buyers.',
    p2_buyersQuote: 'A well-priced property attracts attention. An overpriced one gets left behind.',
    p2_sellersTitle: "Seller's Market",
    p2_sellersSub: 'More demand than supply',
    p2_sellersDesc: 'Properties sell <b>faster</b> and at higher prices. <b>Professional presentation</b> and a well-executed strategy maximize the outcome.',
    p2_sellersQuote: 'The advantage is on your side — strategy maximizes the result.',
    p2_pullQuote: 'Regardless of market type, a professional strategy makes the difference between a successful sale and months of waiting.',
    p3_header: 'Our Strategy',
    p3_sub: 'Proven Methodology',
    p3_title: 'Three Fundamental Pillars',
    p3_1title: 'Price Diagnosis',
    p3_1sub: 'Comparative Market Analysis (CMA)',
    p3_1desc: 'We evaluate <b>active properties</b> and <b>recent sales</b> to set a price that attracts serious, qualified buyers.',
    p3_1a: 'Active properties', p3_1aDesc: 'Your current competition',
    p3_1b: 'Recent sales', p3_1bDesc: 'The real market price',
    p3_2title: 'Marketing Strategy',
    p3_2sub: 'Local and international exposure',
    p3_2desc: 'A <b>personalized plan</b> ensuring your property is present wherever a serious buyer is looking.',
    p3_items: ['Professional photography & video with drone','Branded reels & digital content','National & international portals','The most recognized sign in the world','RE/MAX network: 150+ agents in CR','MATCH alerts with qualified buyers','Brochures & information sheets','Printed real estate magazine'],
    p3_3title: 'Measure & Adjust',
    p3_3sub: 'Monthly performance report',
    p3_3desc: '<b>Monthly report</b>: visits, market response, new competition and next steps. <b>Results are what matter</b>.',
    p4_header: 'Why Exclusive?',
    p4_title: 'Less is More',
    p4_intro: 'With an exclusive listing, you receive dedicated attention, direct communication and a customized strategic plan — with access to the entire <b>RE/MAX network of 150+ agents</b>.',
    p4_b1: 'Clear Accountability', p4_b1d: 'One dedicated professional responsible for results.',
    p4_b2: 'Direct Communication', p4_b2d: 'A single point of contact for fast, clear updates.',
    p4_b3: 'Immediate Marketing', p4_b3d: 'Day-one investment in photography, video, digital content and promotion.',
    p4_b4: 'Total Commitment', p4_b4d: "We don't just list — we sell. We monitor and adjust the strategy.",
    p4_exTitle: 'EXCLUSIVE',
    p4_exItems: ['One 100% dedicated professional','Immediate marketing investment','Monthly performance reports','Access to entire RE/MAX network','Personalized strategy','Professional, consistent image'],
    p4_noTitle: 'NON-EXCLUSIVE',
    p4_noItems: ['Multiple agents, no commitment','Nobody invests — everyone waits','No reports or accountability','Inconsistent prices on portals','Confusion for buyers','Unprofessional image'],
    p5_header: 'How We Work',
    p5_title: 'Exclusive Work Model',
    p5_desc: 'We work under an exclusive model that guarantees <b>total dedication</b>, immediate investment and measurable results. Commission is charged only upon successful sale.',
    p5_commission: 'Commission', p5_onSale: 'On sale price',
    p5_process: 'The Process',
    p5_steps: [{t:'Interview',d:'We learn about your property'},{t:'CMA',d:'Market analysis'},{t:'Signing',d:'6-month exclusive'},{t:'Marketing',d:'Immediate activation'},{t:'Sale',d:'Negotiation & closing'}],
    p5_thanks: 'Thank you for your trust',
    p5_thanksSub: 'It will be an honor to work together to achieve the successful sale of your property.',
    p5_advisor: 'Real Estate Advisor',
    p5_sigOwner: 'Owner Signature', p5_sigAgent: 'Agent Signature', p5_sigDate: 'Date',
  }
};

export default function CarpetaPrelisting() {
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
        <CarpetaCover cfg={cfg} agentName={agentName} t={t} />
        <CarpetaPage1 cfg={cfg} agentName={agentName} agentPhone={agentPhone} agentEmail={agentEmail} agentPhoto={agentPhoto} t={t} />
        <CarpetaPage2 cfg={cfg} t={t} />
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
