import Image from 'next/image';
export default function CarpetaPage2b({ cfg, t }) {
  const isEs = t.p2b_header === 'La Visión del Desarrollo';
  
  return (
    <div className="carpeta-page" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '14px 44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <Image src="/assets/logo-altitud.png" alt="Logo" style={{ height: 20 }} width={100} height={100} unoptimized />
        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{t.p2b_header}</span>
      </div>

      <div style={{ flex: 1, padding: '24px 44px 20px' }}>
        {/* Title */}
        <p style={{ fontSize: 9, color: '#DC1431', fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>{t.p2b_sub}</p>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>{t.p2b_title}</h2>
        <p style={{ fontSize: 11, lineHeight: 1.8, color: '#4b5563', marginBottom: 20 }} dangerouslySetInnerHTML={{ __html: t.p2b_intro }} />

        {/* Amenities grid — 3 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 20px', marginBottom: 20 }}>
          {t.p2b_amenities.map((a, i) => (
            <div key={i} style={{ paddingLeft: 14, borderLeft: `3px solid ${i % 2 === 0 ? cfg.accent : '#DC1431'}` }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{a.icon}</div>
              <h4 style={{ fontSize: 11, fontWeight: 900, color: '#1a1a2e', marginBottom: 3, lineHeight: 1.3 }}>{a.title}</h4>
              <p style={{ fontSize: 9, lineHeight: 1.6, color: '#64748b' }}>{a.desc}</p>
            </div>
          ))}
        </div>

        {/* Pull quote */}
        <div style={{ background: `${cfg.accent}08`, padding: '16px 24px', borderLeft: `4px solid ${cfg.accent}`, marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 400, color: '#1a1a2e', lineHeight: 1.7, fontStyle: 'italic' }}>
            &quot;{t.p2b_quote}&quot;
          </p>
        </div>

        {/* Video placeholder */}
        <div style={{ 
          background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '28px 20px', textAlign: 'center'
        }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: cfg.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#1a1a2e' }}>{t.p2b_videoTitle}</p>
          <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>{t.p2b_videoSub}</p>
        </div>
      </div>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0, marginTop: 'auto' }} />
    </div>
  );
}
