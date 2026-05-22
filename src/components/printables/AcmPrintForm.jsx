"use client";

import { useApp } from '@/lib/context';

/**
 * AcmPrintForm
 * 
 * A high-fidelity, luxury-tier printable version of the Comparative Market Analysis.
 * Supports individual methodologies (Comparables, Rentabilidad, Reposición) and
 * aggregates them into a gorgeous consolidated report with clean page breaks.
 */
export default function AcmPrintForm({ report }) {
  const { t, lang } = useApp();

  if (!report) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontFamily: "'Montserrat', sans-serif" }}>
        No report data provided.
      </div>
    );
  }

  // Extract variables
  const {
    client_name = '—',
    client_phone = '—',
    client_email = '—',
    property_address = '—',
    property_type = 'casa',
    suggested_price = 0,
    price_range_low = 0,
    price_range_high = 0,
    agent_name = 'Agente Altitud',
    agent_email = '',
    agent_notes = '',
    created_at,
    
    // Rentabilidad
    rental_units = 0,
    rental_price = 0,
    gross_income = 0,
    total_expenses = 0,
    noi = 0,
    cap_rate = 0,
    rental_value = 0,
    expenses_period = 'monthly',
    expenses_amount = 0,

    indicators = {}
  } = report;

  const activeMethods = indicators.active_methods || ['comparables'];
  const weights = indicators.weights || { comparables: 100, rentabilidad: 0, reposicion: 0 };
  const compProperties = indicators.comp_properties || [];
  
  // Reposición details
  const landArea = Number(indicators.land_area) || 0;
  const landPriceM2 = Number(indicators.land_price_m2) || 0;
  const constArea = Number(indicators.const_area) || 0;
  const constPriceM2 = Number(indicators.const_price_m2) || 0;
  const depreciationPct = Number(indicators.depreciation_pct) || 0;
  
  const landValueTotal = landArea * landPriceM2;
  const constNewVal = constArea * constPriceM2;
  const depreciationAmount = constNewVal * (depreciationPct / 100);
  const constDepreciatedVal = constNewVal - depreciationAmount;
  const replacementValueCalculated = landValueTotal + constDepreciatedVal;

  // Comparables summaries
  const compAvg = Number(indicators.comp_avg) || 0;
  const compMin = Number(indicators.comp_min) || 0;
  const compMax = Number(indicators.comp_max) || 0;
  const compSuggested = Number(indicators.comp_suggested) || 0;

  const today = new Date(created_at || Date.now()).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Styles
  const pageContainerStyle = {
    fontFamily: "'Montserrat', sans-serif",
    color: '#1e293b',
    lineHeight: 1.6,
  };

  const pageBreakStyle = {
    pageBreakAfter: 'always',
    padding: '40px 48px',
    minHeight: '10.5in',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '3px solid #003DA5',
    paddingBottom: '16px',
    marginBottom: '24px',
  };

  const footerStyle = {
    marginTop: 'auto',
    paddingTop: '16px',
    borderTop: '1.5px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '8px',
    color: '#94a3b8',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: 800,
    color: '#003DA5',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  };

  const sectionTitleStyle = (text) => (
    <div style={{ borderBottom: '2.5px solid #003DA5', paddingBottom: '6px', marginBottom: '20px', marginTop: '12px' }}>
      <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {text}
      </h3>
    </div>
  );

  const cardStyle = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '20px',
  };

  const valueDisplayGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  };

  const metricBox = (label, val, highlight = false) => (
    <div style={{
      background: highlight ? 'rgba(0, 61, 165, 0.04)' : '#f8fafc',
      border: highlight ? '2px solid #003DA5' : '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '14px',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '8px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        {label}
      </p>
      <p style={{ fontSize: highlight ? '20px' : '16px', fontWeight: 800, color: highlight ? '#003DA5' : '#1e293b', fontStyle: 'italic' }}>
        {val}
      </p>
    </div>
  );

  const fmt = (v) => v > 0 ? `$${Math.round(v).toLocaleString()}` : '—';

  return (
    <div style={pageContainerStyle}>
      
      {/* ========================================== */}
      {/* PAGE 1: COVER & GENERAL DATA               */}
      {/* ========================================== */}
      <div style={pageBreakStyle}>
        <div>
          {/* Logo & Header */}
          <div style={headerStyle}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#003DA5', lineHeight: 1.1 }}>
                RE<span style={{ color: '#CC0000' }}>/</span>MAX <span style={{ fontWeight: 400 }}>Altitud</span>
              </h1>
              <p style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Análisis Comparativo de Mercado (ACM)
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {lang === 'en' ? 'Date' : 'Fecha'}
              </p>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>{today}</p>
            </div>
          </div>

          {/* Luxury Cover Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0b1536 0%, #003DA5 100%)',
            borderRadius: '24px',
            padding: '48px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 10px 25px -5px rgba(0, 61, 165, 0.1)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
              Estudio de Valoración
            </p>
            <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2, fontStyle: 'italic', marginBottom: '16px' }}>
              DOSSIER PROFESIONAL DE MERCADO
            </h2>
            <div style={{ width: '60px', height: '4px', background: '#CC0000', borderRadius: '2px', marginBottom: '24px' }} />
            
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', maxWidth: '500px' }}>
              Este documento presenta un análisis estructurado de valoración inmobiliaria aplicando metodologías cruzadas para determinar el valor de mercado óptimo.
            </p>
          </div>

          {/* Client & Property Information */}
          {sectionTitleStyle(lang === 'en' ? 'General Information' : 'Información General')}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div style={cardStyle}>
              <h4 style={{ fontSize: '10px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                {lang === 'en' ? 'CLIENT & SPONSOR' : 'CLIENTE Y PROPIETARIO'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                <div><span style={{ fontWeight: 700, color: '#64748b' }}>Nombre:</span> <span style={{ fontWeight: 600 }}>{client_name}</span></div>
                <div><span style={{ fontWeight: 700, color: '#64748b' }}>Teléfono:</span> <span style={{ fontWeight: 600 }}>{client_phone}</span></div>
                <div><span style={{ fontWeight: 700, color: '#64748b' }}>Correo:</span> <span style={{ fontWeight: 600 }}>{client_email}</span></div>
              </div>
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: '10px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                {lang === 'en' ? 'PROPERTY DETAILS' : 'DETALLES DEL INMUEBLE'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                <div><span style={{ fontWeight: 700, color: '#64748b' }}>Dirección:</span> <span style={{ fontWeight: 600 }}>{property_address}</span></div>
                <div><span style={{ fontWeight: 700, color: '#64748b' }}>Categoría:</span> <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{property_category === 'residential' ? 'Residencial' : 'Comercial'}</span></div>
                <div><span style={{ fontWeight: 700, color: '#64748b' }}>Tipo:</span> <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{property_type}</span></div>
              </div>
            </div>
          </div>

          {/* Active Methodologies Summary */}
          <div style={cardStyle}>
            <h4 style={{ fontSize: '10px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              {lang === 'en' ? 'Applied Appraisal Methodologies' : 'Metodologías de Valoración Aplicadas'}
            </h4>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '8px' }}>
              {activeMethods.map((m) => (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700 }}>
                  <div style={{ width: '8px', height: '8px', background: '#003DA5', borderRadius: '50%' }} />
                  <span>
                    {m === 'comparables' && (lang === 'en' ? 'Comparable Market Study (CMA)' : 'Estudio de Mercado Comparativo')}
                    {m === 'rentabilidad' && (lang === 'en' ? 'Rental Capitalization Method' : 'Capitalización por Rentabilidad')}
                    {m === 'reposicion' && (lang === 'en' ? 'Replacement Cost Method' : 'Método de Costo / Reposición')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <span>RE/MAX ALTITUD — Confidencial</span>
          <span>Dossier de Mercado</span>
          <span>Página 1</span>
        </div>
      </div>

      {/* ========================================== */}
      {/* PAGE 2: COMPARABLES METHOD (IF ACTIVE)     */}
      {/* ========================================== */}
      {activeMethods.includes('comparables') && (
        <div style={pageBreakStyle}>
          <div>
            <div style={headerStyle}>
              <div>
                <h2 style={titleStyle}>{lang === 'en' ? 'Comparable Market Analysis' : 'Estudio de Comparables'}</h2>
                <p style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Metodología 1 — Comparación Directa de Oferta Activa y Cierres
                </p>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#475569', marginBottom: '20px' }}>
              Este método analiza propiedades similares actualmente en el mercado o vendidas recientemente en la misma zona geográfica para establecer parámetros de oferta competitiva.
            </p>

            {/* Comparables stats */}
            <div style={valueDisplayGrid}>
              {metricBox(lang === 'en' ? 'Min Comparable' : 'Precio Mínimo', fmt(compMin))}
              {metricBox(lang === 'en' ? 'Average Price' : 'Precio Promedio', fmt(compAvg))}
              {metricBox(lang === 'en' ? 'Max Comparable' : 'Precio Máximo', fmt(compMax))}
            </div>

            {metricBox(lang === 'en' ? 'Suggested Market Price (CMA)' : 'Precio Sugerido por Comparables', fmt(compSuggested || suggested_price), true)}

            {/* Comparable details table */}
            {compProperties.length > 0 && (
              <div style={{ marginTop: '28px' }}>
                <h4 style={{ fontSize: '10px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  {lang === 'en' ? 'Comparable Sample Inventory' : 'Muestra de Inmuebles de Referencia'}
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #003DA5', background: '#f1f5f9' }}>
                      <th style={{ padding: '10px', fontWeight: 700 }}>{lang === 'en' ? 'Property / Location' : 'Propiedad / Ubicación'}</th>
                      <th style={{ padding: '10px', fontWeight: 700 }}>{lang === 'en' ? 'Size' : 'Tamaño'}</th>
                      <th style={{ padding: '10px', fontWeight: 700 }}>{lang === 'en' ? 'Status' : 'Estado'}</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>{lang === 'en' ? 'Price' : 'Precio'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compProperties.map((prop, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{prop.address || 'Propiedad de Referencia'}</td>
                        <td style={{ padding: '10px' }}>{prop.size ? `${prop.size} m²` : '—'}</td>
                        <td style={{ padding: '10px', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, color: '#64748b' }}>{prop.status || 'Activo'}</td>
                        <td style={{ padding: '10px', fontWeight: 700, textAlign: 'right', color: '#003DA5' }}>{fmt(prop.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {agent_notes && (
              <div style={{ marginTop: '28px' }}>
                <h4 style={{ fontSize: '10px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  {lang === 'en' ? 'Market Analyst Comments' : 'Comentarios del Analista de Mercado'}
                </h4>
                <div style={{ borderLeft: '3px solid #CC0000', paddingLeft: '12px', fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>
                  {agent_notes}
                </div>
              </div>
            )}
          </div>

          <div style={footerStyle}>
            <span>RE/MAX ALTITUD</span>
            <span>Estudio de Comparables</span>
            <span>Página {activeMethods.indexOf('comparables') + 2}</span>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PAGE 3: RENTAL YIELD METHOD (IF ACTIVE)    */}
      {/* ========================================== */}
      {activeMethods.includes('rentabilidad') && (
        <div style={pageBreakStyle}>
          <div>
            <div style={headerStyle}>
              <div>
                <h2 style={titleStyle}>{lang === 'en' ? 'Yield Valuation Report' : 'Valoración por Rentabilidad'}</h2>
                <p style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Metodología 2 — Capitalización de Ingresos (Cap Rate)
                </p>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#475569', marginBottom: '24px' }}>
              Este método evalúa el inmueble como un activo financiero, derivando su valor teórico en función de los ingresos netos de alquiler que produce frente a una tasa de capitalización objetivo.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={cardStyle}>
                <h4 style={{ fontSize: '10px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  {lang === 'en' ? 'ANNUAL INCOME PROJECTION' : 'PROYECCIÓN DE INGRESOS'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#64748b' }}>Unidades de Alquiler:</span>
                    <span style={{ fontWeight: 700 }}>{rental_units}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#64748b' }}>Renta Mensual por Unidad:</span>
                    <span style={{ fontWeight: 700 }}>{fmt(rental_price)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                    <span style={{ fontWeight: 800, color: '#003DA5' }}>Ingreso Bruto Anual:</span>
                    <span style={{ fontWeight: 800, color: '#003DA5' }}>{fmt(gross_income)}</span>
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <h4 style={{ fontSize: '10px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  {lang === 'en' ? 'OPERATING EXPENSES' : 'GASTOS OPERATIVOS'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#64748b' }}>Gasto Registrado:</span>
                    <span style={{ fontWeight: 700 }}>{fmt(expenses_amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#64748b' }}>Frecuencia de Gastos:</span>
                    <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{expenses_period === 'monthly' ? 'Mensual' : 'Anual'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                    <span style={{ fontWeight: 800, color: '#dc2626' }}>Gasto Anual Total:</span>
                    <span style={{ fontWeight: 800, color: '#dc2626' }}>{fmt(total_expenses)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: '#f1f5f9',
              border: '1.5px solid #cbd5e1',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr',
              alignItems: 'center',
            }}>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ingreso Operativo Neto Anual (NOI)
                </span>
                <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', fontStyle: 'italic', margin: '4px 0' }}>
                  {fmt(noi)}
                </h3>
                <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                  Ingresos brutos anuales menos gastos operativos de administración y mantenimiento.
                </p>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1.5px solid #cbd5e1', paddingLeft: '16px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cap Rate Elegido
                </span>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#003DA5', fontStyle: 'italic' }}>
                  {cap_rate}%
                </div>
              </div>
            </div>

            {metricBox(lang === 'en' ? 'Yield-Based Property Value' : 'Valor Sugerido por Rentabilidad', fmt(rental_value), true)}

            {/* Cap Rate bracket guide */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '9px', fontWeight: 700, marginTop: '24px', textAlign: 'center' }}>
              <div style={{ border: '1px solid #ef4444', color: '#b91c1c', background: '#fef2f2', padding: '10px', borderRadius: '8px' }}>
                🔴 &lt; 8% — Rentabilidad Baja
              </div>
              <div style={{ border: '1px solid #f59e0b', color: '#b45309', background: '#fffbeb', padding: '10px', borderRadius: '8px' }}>
                🟡 8% a 12% — Rentabilidad Aceptable
              </div>
              <div style={{ border: '1px solid #10b981', color: '#047857', background: '#ecfdf5', padding: '10px', borderRadius: '8px' }}>
                🟢 &gt; 12% — Excelente Rentabilidad
              </div>
            </div>
          </div>

          <div style={footerStyle}>
            <span>RE/MAX ALTITUD</span>
            <span>Rentabilidad (Cap Rate)</span>
            <span>Página {activeMethods.indexOf('rentabilidad') + 2}</span>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PAGE 4: REPLACEMENT COST METHOD (IF ACTIVE)*/}
      {/* ========================================== */}
      {activeMethods.includes('reposicion') && (
        <div style={pageBreakStyle}>
          <div>
            <div style={headerStyle}>
              <div>
                <h2 style={titleStyle}>{lang === 'en' ? 'Cost Approach Valuation' : 'Valoración por Reposición'}</h2>
                <p style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Metodología 3 — Valor Físico / Costo de Reposición Depreciado
                </p>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#475569', marginBottom: '24px' }}>
              Este método calcula el valor físico del inmueble estimando el costo de adquirir un lote de terreno similar en la misma ubicación y sumando el costo actual de construir una estructura equivalente, aplicando un factor de depreciación por antigüedad y estado de conservación.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={cardStyle}>
                <h4 style={{ fontSize: '10px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  {lang === 'en' ? 'LAND ACQUISITION VALUE' : 'VALORACIÓN DEL TERRENO'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#64748b' }}>Área del Terreno:</span>
                    <span style={{ fontWeight: 700 }}>{landArea.toLocaleString()} m²</span>
                  </div>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#64748b' }}>Precio por m²:</span>
                    <span style={{ fontWeight: 700 }}>{fmt(landPriceM2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                    <span style={{ fontWeight: 800, color: '#003DA5' }}>Valor Total Terreno:</span>
                    <span style={{ fontWeight: 800, color: '#003DA5' }}>{fmt(landValueTotal)}</span>
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <h4 style={{ fontSize: '10px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  {lang === 'en' ? 'CONSTRUCTION COST' : 'COSTO DE CONSTRUCCIÓN'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#64748b' }}>Área de Construcción:</span>
                    <span style={{ fontWeight: 700 }}>{constArea.toLocaleString()} m²</span>
                  </div>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#64748b' }}>Costo de m² Nuevo:</span>
                    <span style={{ fontWeight: 700 }}>{fmt(constPriceM2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                    <span style={{ fontWeight: 800, color: '#475569' }}>Valor Construcción Nueva:</span>
                    <span style={{ fontWeight: 800 }}>{fmt(constNewVal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Depreciation breakdown */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Depreciación por Antigüedad y Estado
                </span>
                <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                  Tasa de desgaste físico calculada sobre la estructura.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626' }}>-{depreciationPct}%</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>(-{fmt(depreciationAmount)})</span>
              </div>
            </div>

            {/* Depreciated Structure Metric */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Costo de Construcción Depreciada:
                </span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                  {fmt(constDepreciatedVal)}
                </span>
              </div>
            </div>

            {metricBox(lang === 'en' ? 'Cost-Based Property Value' : 'Valor Sugerido por Reposición', fmt(replacementValueCalculated || replacementValueCalculated), true)}
          </div>

          <div style={footerStyle}>
            <span>RE/MAX ALTITUD</span>
            <span>Reposición (Costos)</span>
            <span>Página {activeMethods.indexOf('reposicion') + 2}</span>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PAGE 5: CONSOLIDATED VALUATION REPORT      */}
      {/* ========================================== */}
      <div style={pageBreakStyle}>
        <div>
          <div style={headerStyle}>
            <div>
              <h2 style={titleStyle}>{lang === 'en' ? 'Consolidated Valuation Summary' : 'Resumen de Valoración Consolidada'}</h2>
              <p style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Conclusión Técnica de Análisis de Valor Cruzado
              </p>
            </div>
          </div>

          <p style={{ fontSize: '11px', color: '#475569', marginBottom: '24px' }}>
            A continuación se presenta la recopilación de todos los enfoques de valoración aplicados. La ponderación de cada método ha sido determinada por el asesor inmobiliario en función de la naturaleza del activo y las condiciones de mercado.
          </p>

          {/* Table comparing active methods */}
          <div style={cardStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #003DA5' }}>
                  <th style={{ padding: '10px', fontWeight: 700 }}>{lang === 'en' ? 'Appraisal Methodology' : 'Metodología Aplicada'}</th>
                  <th style={{ padding: '10px', fontWeight: 700, textAlign: 'center' }}>{lang === 'en' ? 'Assigned Weight' : 'Peso Asignado'}</th>
                  <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>{lang === 'en' ? 'Calculated Value' : 'Valor Resultante'}</th>
                </tr>
              </thead>
              <tbody>
                {activeMethods.includes('comparables') && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{lang === 'en' ? 'Comparable Market Analysis (CMA)' : 'Estudio de Comparables'}</td>
                    <td style={{ padding: '10px', fontWeight: 700, textAlign: 'center', color: '#64748b' }}>{weights.comparables || 0}%</td>
                    <td style={{ padding: '10px', fontWeight: 700, textAlign: 'right', color: '#003DA5' }}>{fmt(compSuggested || suggested_price)}</td>
                  </tr>
                )}
                {activeMethods.includes('rentabilidad') && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{lang === 'en' ? 'Income Yield Capitalization (Cap Rate)' : 'Valor por Rentabilidad'}</td>
                    <td style={{ padding: '10px', fontWeight: 700, textAlign: 'center', color: '#64748b' }}>{weights.rentabilidad || 0}%</td>
                    <td style={{ padding: '10px', fontWeight: 700, textAlign: 'right', color: '#003DA5' }}>{fmt(rental_value)}</td>
                  </tr>
                )}
                {activeMethods.includes('reposicion') && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{lang === 'en' ? 'Replacement Cost Method (Depreciated)' : 'Valor de Costo / Reposición'}</td>
                    <td style={{ padding: '10px', fontWeight: 700, textAlign: 'center', color: '#64748b' }}>{weights.reposicion || 0}%</td>
                    <td style={{ padding: '10px', fontWeight: 700, textAlign: 'right', color: '#003DA5' }}>{fmt(replacementValueCalculated)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FINAL WEIGHTED SUGGESTION BOX */}
          <div style={{
            background: 'linear-gradient(135deg, #003DA5 0%, #0b1536 100%)',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '24px 28px',
            textAlign: 'center',
            boxShadow: '0 12px 30px -10px rgba(0, 61, 165, 0.3)',
            marginBottom: '28px',
          }}>
            <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255, 255, 255, 0.7)' }}>
              {lang === 'en' ? 'Suggested Consolidated Listing Price' : 'Precio Sugerido Consolidado de Venta'}
            </span>
            <h1 style={{ fontSize: '36px', fontWeight: 900, fontStyle: 'italic', margin: '6px 0', letterSpacing: '-0.02em' }}>
              {fmt(suggested_price)}
            </h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', marginTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '10px' }}>
              <div>{lang === 'en' ? 'Conservative Range' : 'Rango Conservador'}: <span style={{ color: '#ffffff' }}>{fmt(price_range_low)}</span></div>
              <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.2)' }} />
              <div>{lang === 'en' ? 'Optimistic Range' : 'Rango Optimista'}: <span style={{ color: '#ffffff' }}>{fmt(price_range_high)}</span></div>
            </div>
          </div>

          {/* Legal / Closing footer */}
          <div style={{ textAlign: 'center', padding: '0 24px', color: '#64748b', fontSize: '9px', marginTop: '24px' }}>
            <p style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#003DA5', marginBottom: '4px' }}>
              RE/MAX ALTITUD — DEPARTAMENTO DE VALORACIÓN Y ANÁLISIS
            </p>
            <p>
              Este informe es exclusivamente de carácter consultivo e indicativo y no constituye un aval oficial certificado por perito bancario.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <span>RE/MAX ALTITUD — CONFIDENCIAL</span>
          <span>VALORACIÓN CONSOLIDADA</span>
          <span>Página Final</span>
        </div>
      </div>

    </div>
  );
}
