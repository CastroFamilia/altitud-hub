import Image from 'next/image';
export default function CarpetaPage2({ cfg, t }) {
  return (
    <div className="carpeta-page" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0 }} />

      {/* ── HERO IMAGE ── */}
      <div style={{ position: 'relative', height: 200, flexShrink: 0, overflow: 'hidden' }}>
        <Image src="/assets/carpeta-luxury-villa.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} fill />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.95) 100%)' }} />
        <div style={{ position: 'absolute', top: 16, left: 44, right: 44, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Image src="/assets/logo-altitud.png" alt="Logo" style={{ height: 20 }} width={100} height={100} unoptimized />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{t.p2_header}</span>
        </div>
        <div style={{ position: 'absolute', bottom: 16, left: 44 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1a1a2e', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{t.p2_title}</h2>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, padding: '20px 44px 20px' }}>
        <p style={{ fontSize: 11.5, lineHeight: 1.85, color: '#4b5563', marginBottom: 24 }} dangerouslySetInnerHTML={{ __html: t.p2_intro }} />

        {/* Two magazine columns */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
          {/* Buyers */}
          <div style={{ flex: 1, paddingRight: 28, borderRight: `2px solid ${cfg.accent}` }}>
            <div style={{ background: `${cfg.accent}0A`, padding: '10px 14px', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: cfg.accent, letterSpacing: '-0.01em' }}>{t.p2_buyersTitle}</h3>
              <p style={{ fontSize: 9, color: cfg.accent, fontWeight: 600, marginTop: 2 }}>{t.p2_buyersSub}</p>
            </div>
            <p style={{ fontSize: 10.5, lineHeight: 1.8, color: '#4b5563' }} dangerouslySetInnerHTML={{ __html: t.p2_buyersDesc }} />
            <div style={{ marginTop: 14, paddingLeft: 14, borderLeft: `3px solid ${cfg.accent}` }}>
              <p style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', lineHeight: 1.6 }}>&quot;{t.p2_buyersQuote}&quot;</p>
            </div>
          </div>

          {/* Sellers */}
          <div style={{ flex: 1, paddingLeft: 28 }}>
            <div style={{ background: '#DC14310A', padding: '10px 14px', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#DC1431', letterSpacing: '-0.01em' }}>{t.p2_sellersTitle}</h3>
              <p style={{ fontSize: 9, color: '#DC1431', fontWeight: 600, marginTop: 2 }}>{t.p2_sellersSub}</p>
            </div>
            <p style={{ fontSize: 10.5, lineHeight: 1.8, color: '#4b5563' }} dangerouslySetInnerHTML={{ __html: t.p2_sellersDesc }} />
            <div style={{ marginTop: 14, paddingLeft: 14, borderLeft: '3px solid #DC1431' }}>
              <p style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', lineHeight: 1.6 }}>&quot;{t.p2_sellersQuote}&quot;</p>
            </div>
          </div>
        </div>

        {/* Pull quote — light brand color background */}
        <div style={{ background: `${cfg.accent}08`, padding: '20px 28px', borderLeft: `4px solid ${cfg.accent}` }}>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#1a1a2e', lineHeight: 1.7, fontStyle: 'italic' }}>
            &quot;{t.p2_pullQuote}&quot;
          </p>
          <p style={{ fontSize: 9, color: cfg.accent, fontWeight: 700, marginTop: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>— {cfg.name}</p>
        </div>
      </div>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0, marginTop: 'auto' }} />
    </div>
  );
}
