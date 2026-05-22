import Image from 'next/image';
export default function CarpetaPage1({ cfg, agentName, agentPhone, agentEmail, agentPhoto, t }) {
  return (
    <div className="carpeta-page" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Color accent top */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0 }} />

      {/* ── HERO BANNER — full-width brand color ── */}
      <div style={{ background: cfg.accent, padding: '32px 44px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position:'absolute',top:-60,right:-60,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,0.04)' }} />
        <div style={{ position:'absolute',bottom:-40,right:100,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.03)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Image src={cfg.logo || '/assets/logo-altitud.png'} alt="Logo" style={{ height: 20, marginBottom: 16, filter: 'brightness(10)' }} width={100} height={100} unoptimized />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: 'white', letterSpacing: '0.02em', lineHeight: 1.1, textTransform: 'uppercase' }}>
              {t.p1_title1}<br/>{t.p1_title2}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
            {[{ n: '110+', l: t.p1_countries },{ n: '9,000+', l: t.p1_offices },{ n: '140K', l: t.p1_agents }].map((s,i)=>(
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'white', lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginTop: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, padding: '28px 44px 20px' }}>
        {/* World */}
        <p style={{ fontSize: 11, lineHeight: 1.85, color: '#4b5563', marginBottom: 24 }} dangerouslySetInnerHTML={{ __html: t.p1_worldDesc }} />

        {/* Two columns: CR + Office */}
        <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ width: 40, height: 3, background: '#DC1431', marginBottom: 12 }} />
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: '#1a1a2e', letterSpacing: '0.01em', marginBottom: 4 }}>{t.p1_crSub}</h3>
            <p style={{ fontSize: 9, color: '#DC1431', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>{t.p1_crTitle}</p>
            <p style={{ fontSize: 10.5, lineHeight: 1.8, color: '#64748b' }} dangerouslySetInnerHTML={{ __html: t.p1_crDesc }} />
          </div>
          <div style={{ width: 1, background: '#e5e7eb', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: 40, height: 3, background: cfg.accent, marginBottom: 12 }} />
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: '#1a1a2e', letterSpacing: '0.01em', marginBottom: 4 }}>{cfg.name}</h3>
            <p style={{ fontSize: 9, color: cfg.accent, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>{cfg.zone}</p>
            <p style={{ fontSize: 10.5, lineHeight: 1.8, color: '#64748b' }} dangerouslySetInnerHTML={{ __html: t.p1_officeDesc.replace('{{count}}', cfg.agentCount).replace('{{listings}}', cfg.listingCount) }} />
          </div>
        </div>

        {/* Separator line */}
        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 24 }} />

        {/* ── AGENT — editorial style ── */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: 16, overflow: 'hidden', flexShrink: 0, border: `3px solid ${cfg.accent}` }}>
            <Image src={agentPhoto} alt={agentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} fill />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 9, color: '#DC1431', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>{t.p1_yourAdvisor}</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, color: '#1a1a2e', letterSpacing: '0.01em' }}>{agentName}</h3>
            <p style={{ fontSize: 10.5, lineHeight: 1.75, color: '#64748b', marginTop: 6 }}>{t.p1_agentDesc}</p>
            <div style={{ display: 'flex', gap: 24, marginTop: 10 }}>
              <span style={{ fontSize: 10, color: '#1a1a2e', fontWeight: 600 }}>📞 {agentPhone}</span>
              <span style={{ fontSize: 10, color: '#1a1a2e', fontWeight: 600 }}>✉️ {agentEmail}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0, marginTop: 'auto' }} />
    </div>
  );
}
