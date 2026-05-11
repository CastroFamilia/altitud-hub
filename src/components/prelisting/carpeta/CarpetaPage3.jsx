import Image from 'next/image';
export default function CarpetaPage3({ cfg, t }) {
  return (
    <div className="carpeta-page" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '14px 44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <Image src="/assets/logo-altitud.png" alt="Logo" style={{ height: 20 }} width={100} height={100} unoptimized />
        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{t.p3_header}</span>
      </div>

      <div style={{ flex: 1, padding: '28px 44px 20px' }}>
        {/* Title */}
        <p style={{ fontSize: 9, color: '#DC1431', fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>{t.p3_sub}</p>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1a1a2e', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 28 }}>{t.p3_title}</h2>

        {/* ── PILLAR 1 ── */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: cfg.accent, lineHeight: 1, flexShrink: 0, width: 50, textAlign: 'right', opacity: 0.8 }}>01</div>
          <div style={{ flex: 1, borderLeft: `2px solid ${cfg.accent}`, paddingLeft: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e', marginBottom: 2 }}>{t.p3_1title}</h3>
            <p style={{ fontSize: 9, color: cfg.accent, fontWeight: 600, marginBottom: 8 }}>{t.p3_1sub}</p>
            <p style={{ fontSize: 10.5, lineHeight: 1.8, color: '#4b5563', marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: t.p3_1desc }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, padding: '8px 12px', background: `${cfg.accent}06`, borderLeft: `3px solid ${cfg.accent}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: cfg.accent }}>{t.p3_1a}</p>
                <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{t.p3_1aDesc}</p>
              </div>
              <div style={{ flex: 1, padding: '8px 12px', background: '#DC143106', borderLeft: '3px solid #DC1431' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#DC1431' }}>{t.p3_1b}</p>
                <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{t.p3_1bDesc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── PILLAR 2 ── */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: '#DC1431', lineHeight: 1, flexShrink: 0, width: 50, textAlign: 'right', opacity: 0.8 }}>02</div>
          <div style={{ flex: 1, borderLeft: '2px solid #DC1431', paddingLeft: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e', marginBottom: 2 }}>{t.p3_2title}</h3>
            <p style={{ fontSize: 9, color: '#DC1431', fontWeight: 600, marginBottom: 8 }}>{t.p3_2sub}</p>
            <p style={{ fontSize: 10.5, lineHeight: 1.8, color: '#4b5563', marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: t.p3_2desc }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
              {t.p3_items.map((item, i) => (
                <p key={i} style={{ fontSize: 9.5, color: '#374151', lineHeight: 1.6, paddingLeft: 10, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: cfg.accent, fontWeight: 800 }}>—</span>{item}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* ── PILLAR 3 ── */}
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: '#94a3b8', lineHeight: 1, flexShrink: 0, width: 50, textAlign: 'right', opacity: 0.5 }}>03</div>
          <div style={{ flex: 1, borderLeft: '2px solid #94a3b8', paddingLeft: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e', marginBottom: 2 }}>{t.p3_3title}</h3>
            <p style={{ fontSize: 9, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>{t.p3_3sub}</p>
            <p style={{ fontSize: 10.5, lineHeight: 1.8, color: '#4b5563' }} dangerouslySetInnerHTML={{ __html: t.p3_3desc }} />
          </div>
        </div>
      </div>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0, marginTop: 'auto' }} />
    </div>
  );
}
