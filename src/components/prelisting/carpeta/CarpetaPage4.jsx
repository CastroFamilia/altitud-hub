import Image from 'next/image';
export default function CarpetaPage4({ cfg, t }) {
  return (
    <div className="carpeta-page" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0 }} />

      {/* ── Full-width brand banner ── */}
      <div style={{ background: cfg.accent, padding: '28px 44px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position:'absolute',top:-40,right:-40,width:140,height:140,borderRadius:'50%',background:'rgba(255,255,255,0.04)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Image src={cfg.logo || '/assets/logo-altitud.png'} alt="Logo" style={{ height: 18, marginBottom: 12, filter: 'brightness(10)' }} width={100} height={100} unoptimized />
            <h2 style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{t.p4_header}</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8, fontWeight: 500 }}>{t.p4_title}</p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 44px 20px' }}>
        <p style={{ fontSize: 11.5, lineHeight: 1.85, color: '#4b5563', marginBottom: 24 }} dangerouslySetInnerHTML={{ __html: t.p4_intro }} />

        {/* Benefits — 2x2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px', marginBottom: 24 }}>
          {[
            { icon: '🎯', title: t.p4_b1, desc: t.p4_b1d },
            { icon: '📞', title: t.p4_b2, desc: t.p4_b2d },
            { icon: '📊', title: t.p4_b3, desc: t.p4_b3d },
            { icon: '🤝', title: t.p4_b4, desc: t.p4_b4d },
          ].map((b, i) => (
            <div key={i} style={{ paddingLeft: 16, borderLeft: `3px solid ${i % 2 === 0 ? cfg.accent : '#DC1431'}` }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{b.icon}</div>
              <h4 style={{ fontSize: 12, fontWeight: 900, color: '#1a1a2e', marginBottom: 4 }}>{b.title}</h4>
              <p style={{ fontSize: 10, lineHeight: 1.7, color: '#64748b' }}>{b.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Full-width comparison ── */}
        <div style={{ display: 'flex', gap: 0, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Exclusive */}
          <div style={{ flex: 1, padding: '18px 22px', borderRight: `3px solid ${cfg.accent}` }}>
            <h4 style={{ fontSize: 12, fontWeight: 900, color: cfg.accent, marginBottom: 10, letterSpacing: '0.08em' }}>✅ {t.p4_exTitle}</h4>
            {t.p4_exItems.map((item, i) => (
              <p key={i} style={{ fontSize: 10, color: '#374151', padding: '3px 0', lineHeight: 1.6 }}>
                <span style={{ color: '#22c55e', marginRight: 6, fontWeight: 700 }}>✓</span>{item}
              </p>
            ))}
          </div>
          {/* Non-exclusive */}
          <div style={{ flex: 1, padding: '18px 22px', background: '#fafafa' }}>
            <h4 style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', marginBottom: 10, letterSpacing: '0.08em' }}>⚠️ {t.p4_noTitle}</h4>
            {t.p4_noItems.map((item, i) => (
              <p key={i} style={{ fontSize: 10, color: '#94a3b8', padding: '3px 0', lineHeight: 1.6 }}>
                <span style={{ color: '#ef4444', marginRight: 6, fontWeight: 700 }}>✗</span>{item}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0, marginTop: 'auto' }} />
    </div>
  );
}
