"use client";

import { useApp } from '@/lib/context';

/**
 * BuyerQualifyPrintForm
 *
 * Printer-friendly buyer qualification guide — "Calificando Compradores".
 * Designed for letter-size paper with RE/MAX Altitud branding.
 * Mirrors the PrelistingPrintForm pattern: inline styles for print fidelity.
 */
export default function BuyerQualifyPrintForm() {
  const { lang } = useApp();
  const today = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const lineStyle = {
    borderBottom: '1.5px solid #d1d5db',
    minHeight: '28px',
    display: 'flex',
    alignItems: 'flex-end',
    paddingBottom: '3px',
  };

  const bigLineStyle = {
    borderBottom: '1.5px solid #d1d5db',
    minHeight: '48px',
    display: 'flex',
    alignItems: 'flex-end',
    paddingBottom: '3px',
  };

  const sectionTitle = (number, text) => (
    <div style={{ borderBottom: '2px solid #003DA5', paddingBottom: '4px', marginBottom: '8px', marginTop: '28px' }}>
      <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {number}. {text}
      </h3>
    </div>
  );

  const sectionHint = (text) => (
    <p style={{ fontSize: '8px', color: '#9ca3af', fontStyle: 'italic', marginBottom: '14px', marginTop: '-2px', lineHeight: 1.6 }}>
      {text}
    </p>
  );

  const fieldRow = (label, colSpan = 1, large = false) => (
    <div style={{ gridColumn: `span ${colSpan}`, marginBottom: '12px' }}>
      <label style={{ fontSize: '9px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <div style={large ? bigLineStyle : lineStyle} />
    </div>
  );

  const checkboxRow = (label, options) => (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '9px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '14px', height: '14px', border: '1.5px solid #9ca3af', borderRadius: '3px', flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: '#374151', fontWeight: 500 }}>{opt}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const es = lang !== 'en';

  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Montserrat', sans-serif", color: '#1a1a2e', fontSize: '10px', lineHeight: 1.5 }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', borderBottom: '3px solid #003DA5', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#003DA5', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            RE<span style={{ color: '#CC0000' }}>/</span>MAX <span style={{ fontWeight: 400 }}>Altitud</span>
          </h1>
          <p style={{ fontSize: '8px', color: '#6b7280', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {es ? 'Guía para Compradores — Calificando Compradores' : 'Buyer Guide — Qualifying Buyers'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '8px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {es ? 'Fecha' : 'Date'}
          </p>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#374151' }}>{today}</p>
        </div>
      </div>

      {/* Intro blurb */}
      <div style={{ backgroundColor: '#f0f4ff', borderRadius: '8px', padding: '14px 16px', marginTop: '16px', marginBottom: '4px', border: '1px solid #dbeafe' }}>
        <p style={{ fontSize: '9px', color: '#1e3a5f', fontWeight: 600, lineHeight: 1.7 }}>
          {es
            ? 'Esta guía fue creada para ayudarte a entender mejor tus prioridades, deseos y necesidades al momento de comprar una propiedad. Cuanto más claro tengas lo que querés, más fácil será encontrar opciones que realmente se ajusten a vos y a tus planes.'
            : 'This guide was created to help you better understand your priorities, desires, and needs when purchasing a property. The clearer you are about what you want, the easier it will be to find options that truly fit you and your plans.'}
        </p>
      </div>

      {/* Agent / Client Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginTop: '16px' }}>
        {fieldRow(es ? 'Nombre del Agente' : 'Agent Name')}
        {fieldRow(es ? 'Nombre del Comprador' : 'Buyer Name')}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 1 — Motivation & Purpose                      */}
      {/* ══════════════════════════════════════════════════════ */}
      {sectionTitle('1', es ? 'Tu motivación y propósito' : 'Your motivation & purpose')}
      {sectionHint(es
        ? 'Conocer el por qué y el para qué de tu compra nos permite enfocarnos en lo que realmente suma valor para vos.'
        : 'Understanding the why and the purpose of your purchase lets us focus on what truly adds value for you.')}

      {fieldRow(es ? '¿Qué te inspira o motiva a comprar en este momento?' : 'What inspires or motivates you to buy right now?', 1, true)}

      {checkboxRow(
        es ? '¿Cuál es el propósito de esta compra?' : 'What is the purpose of this purchase?',
        es
          ? ['Residencia principal', 'Segunda casa / vacaciones', 'Inversión o rentas', 'Retiro / cambio de estilo de vida', 'Proyecto familiar o comunitario']
          : ['Primary residence', 'Second home / vacation', 'Investment / rental income', 'Retirement / lifestyle change', 'Family or community project']
      )}

      {fieldRow(es ? '¿Estás tomando esta decisión solo/a o con alguien más?' : 'Are you making this decision alone or with someone else?', 1)}

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 2 — Location & Lifestyle                      */}
      {/* ══════════════════════════════════════════════════════ */}
      {sectionTitle('2', es ? 'La zona y el estilo de vida que querés' : 'Location & lifestyle you want')}
      {sectionHint(es
        ? 'No se trata solo de una propiedad; se trata del tipo de vida que querés construir en ese lugar.'
        : "It's not just about a property; it's about the type of life you want to build there.")}

      {fieldRow(es ? '¿Hay alguna zona que ya conozcas o te llame la atención? ¿Por qué?' : 'Is there an area you already know or are drawn to? Why?', 1, true)}

      {checkboxRow(
        es ? '¿Qué tipo de entorno preferís?' : 'What type of environment do you prefer?',
        es
          ? ['Rural o campestre', 'Montañoso', 'Céntrico', 'Cercano al mar']
          : ['Rural / countryside', 'Mountains', 'Urban / central', 'Near the coast']
      )}

      {fieldRow(es ? '¿Qué servicios te gustaría tener cerca? (supermercados, hospitales, escuelas, aeropuerto…)' : 'What services would you like nearby? (supermarkets, hospitals, schools, airport…)', 1, true)}

      {fieldRow(es ? '¿Qué estilo de vida estás buscando? (Tranquilo, activo, conectado con la naturaleza, en comunidad…)' : 'What lifestyle are you looking for? (Quiet, active, nature-connected, community…)', 1, true)}

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 3 — Property Type & Use                       */}
      {/* ══════════════════════════════════════════════════════ */}
      {sectionTitle('3', es ? 'Tipo de propiedad y uso esperado' : 'Property type & expected use')}
      {sectionHint(es
        ? 'Este punto nos ayuda a filtrar desde el inicio las propiedades que no se ajustan a tus planes.'
        : 'This helps us filter out properties that don\'t match your plans from the start.')}

      {checkboxRow(
        es ? '¿Qué tipo de propiedad estás buscando?' : 'What type of property are you looking for?',
        es
          ? ['Lote', 'Casa', 'Finca', 'Proyecto o condominio']
          : ['Lot', 'House', 'Farm / estate', 'Development / condo']
      )}

      {checkboxRow(
        es ? '¿Qué uso pensás darle?' : 'What use do you plan for it?',
        es
          ? ['Residencial', 'Agricultura o permacultura', 'Desarrollo', 'Turismo']
          : ['Residential', 'Agriculture / permaculture', 'Development', 'Tourism']
      )}

      {fieldRow(es ? '¿Qué tamaño mínimo necesitás? (terreno o construcción)' : 'What minimum size do you need? (land or construction)', 1)}

      {checkboxRow(
        es ? '¿Preferís una propiedad lista para usar o estás dispuesto a construir / remodelar?' : 'Do you prefer move-in ready or are you willing to build / remodel?',
        es
          ? ['Lista para usar', 'Dispuesto/a a construir', 'Dispuesto/a a remodelar']
          : ['Move-in ready', 'Willing to build', 'Willing to remodel']
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 4 — Budget & Financing                        */}
      {/* ══════════════════════════════════════════════════════ */}
      {sectionTitle('4', es ? 'Presupuesto y financiamiento' : 'Budget & financing')}
      {sectionHint(es
        ? 'Tener claridad sobre el presupuesto disponible evita frustraciones y ayuda a avanzar con realismo y rapidez.'
        : 'Having clarity about your available budget avoids frustration and helps move forward realistically and quickly.')}

      {fieldRow(es ? '¿Cuál es el monto que tenés pensado destinar a esta compra?' : 'What amount are you planning to allocate for this purchase?', 1)}

      {checkboxRow(
        es ? '¿Incluye los gastos de traspaso y cierre?' : 'Does it include transfer and closing costs?',
        es ? ['Sí', 'No', 'No sé'] : ['Yes', 'No', 'Not sure']
      )}

      {checkboxRow(
        es ? '¿Planeás comprar en efectivo o con financiamiento?' : 'Do you plan to buy in cash or with financing?',
        es ? ['Efectivo', 'Financiamiento', 'Combinación'] : ['Cash', 'Financing', 'Combination']
      )}

      {fieldRow(es ? '¿Qué tan flexible sos con tu presupuesto si aparece una oportunidad que lo supere levemente?' : 'How flexible are you with your budget if a slightly higher opportunity appears?', 1, true)}

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 5 — Timeline & Urgency                        */}
      {/* ══════════════════════════════════════════════════════ */}
      {sectionTitle('5', es ? 'Plazo y urgencia' : 'Timeline & urgency')}
      {sectionHint(es
        ? 'Saber tu ritmo nos ayuda a organizar el proceso de forma eficiente y respetuosa con tu tiempo.'
        : 'Knowing your pace helps us organize the process efficiently and respectfully of your time.')}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        {fieldRow(es ? '¿Cuándo te gustaría concretar la compra?' : 'When would you like to close the purchase?')}
        {fieldRow(es ? '¿Tenés alguna fecha límite o compromiso relacionado?' : 'Do you have any deadlines or related commitments?')}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 6 — Legal & Accompaniment                     */}
      {/* ══════════════════════════════════════════════════════ */}
      {sectionTitle('6', es ? 'Situación legal y acompañamiento' : 'Legal situation & accompaniment')}
      {sectionHint(es
        ? 'Este punto es especialmente importante si estás comprando desde el extranjero o a través de una sociedad.'
        : 'This is especially important if you are buying from abroad or through a corporation.')}

      {checkboxRow(
        es ? '¿Vas a estar físicamente en Costa Rica durante el proceso de compra?' : 'Will you be physically in Costa Rica during the purchase process?',
        es ? ['Sí', 'No', 'Parcialmente'] : ['Yes', 'No', 'Partially']
      )}

      {checkboxRow(
        es ? '¿Tenés un abogado o notario que te acompañe legalmente?' : 'Do you have a lawyer or notary for legal accompaniment?',
        es ? ['Sí', 'No — necesito referencia'] : ['Yes', 'No — I need a referral']
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 7 — Needs vs. Desires                         */}
      {/* ══════════════════════════════════════════════════════ */}
      {sectionTitle('7', es ? 'Deseos y necesidades' : 'Desires & needs')}
      {sectionHint(es
        ? 'A veces lo que queremos y lo que realmente necesitamos no son lo mismo. Identificar esto con claridad te ayuda a tomar mejores decisiones.'
        : 'Sometimes what we want and what we truly need aren\'t the same. Identifying this clearly helps you make better decisions.')}

      {/* Needs sub-section */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '14px' }}>
        <p style={{ fontSize: '8px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
          {es ? 'Necesidades (imprescindibles)' : 'Needs (non-negotiable)'}
        </p>
        {fieldRow(es ? '¿Cuáles son los requisitos que no son negociables? (acceso todo el año, escritura en regla, servicios básicos…)' : 'What are your non-negotiable requirements? (year-round access, clear title, basic utilities…)', 1, true)}
        {fieldRow(es ? '¿Qué aspectos harían que descartes una propiedad de inmediato?' : 'What aspects would make you discard a property immediately?', 1, true)}
      </div>

      {/* Desires sub-section */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '14px' }}>
        <p style={{ fontSize: '8px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
          {es ? 'Deseos (deseables pero no indispensables)' : 'Desires (nice to have)'}
        </p>
        {fieldRow(es ? '¿Qué cosas te encantaría que tuviera la propiedad? (vista, río, árboles frutales, estilo arquitectónico…)' : 'What would you love the property to have? (views, river, fruit trees, architectural style…)', 1, true)}
        {fieldRow(es ? 'Si tuvieras que elegir entre una propiedad con todo lo que querés pero fuera de tu zona ideal, o una bien ubicada pero más simple, ¿qué priorizarías?' : 'If you had to choose between a property with everything you want but outside your ideal area, or one well-located but simpler, what would you prioritize?', 1, true)}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '2px solid #003DA5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '7px', color: '#9ca3af', fontWeight: 600 }}>
          RE/MAX Altitud — {es ? 'Confidencial' : 'Confidential'} — altitudhub.com
        </p>
        <p style={{ fontSize: '7px', color: '#9ca3af' }}>
          {es ? 'Firma' : 'Signature'}: __________________________
        </p>
      </div>
    </div>
  );
}
