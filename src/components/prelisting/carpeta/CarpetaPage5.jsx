export default function CarpetaPage5({ cfg, agentName, agentPhone, agentEmail, t }) {
  return (
    <div className="carpeta-page" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '14px 44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <img src="/assets/logo-altitud.png" alt="Logo" style={{ height: 20 }} />
        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{t.p5_header}</span>
      </div>

      <div style={{ flex: 1, padding: '28px 44px 20px' }}>
        {/* Title + Commission side by side */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginBottom: 32 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 9, color: '#DC1431', fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>{cfg.zone}</p>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 12 }}>{t.p5_title}</h2>
            <p style={{ fontSize: 11, lineHeight: 1.85, color: '#4b5563' }} dangerouslySetInnerHTML={{ __html: t.p5_desc }} />
          </div>
          {/* Commission — light color card */}
          <div style={{ flexShrink: 0, width: 130, textAlign: 'center', border: `2px solid ${cfg.accent}`, borderRadius: 16, padding: '24px 16px' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: cfg.accent, lineHeight: 1 }}>{cfg.commission}</div>
            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, marginTop: 4 }}>{t.p5_commission}</div>
            <div style={{ width: 24, height: 1, background: '#e5e7eb', margin: '10px auto' }} />
            <div style={{ fontSize: 8.5, color: '#94a3b8', lineHeight: 1.5 }}>{t.p5_onSale}</div>
          </div>
        </div>

        {/* ── PROCESS ── */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 9, color: cfg.accent, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 14 }}>{t.p5_process}</p>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {t.p5_steps.map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                {i < 4 && <div style={{ position: 'absolute', top: 14, left: '50%', width: '100%', height: 2, background: '#e5e7eb' }} />}
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: i < 2 ? cfg.accent : i < 4 ? '#DC1431' : '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: 'white', margin: '0 auto 8px', position: 'relative', zIndex: 1 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <p style={{ fontSize: 10, fontWeight: 800, color: '#1a1a2e' }}>{s.t}</p>
                <p style={{ fontSize: 8.5, color: '#94a3b8', marginTop: 2 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── THANK YOU — brand-color section ── */}
        <div style={{ background: cfg.accent, padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.04)' }} />
          <h3 style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: '-0.02em', marginBottom: 6 }}>{t.p5_thanks}</h3>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 14 }}>{t.p5_thanksSub}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>{agentName}</p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{t.p5_advisor} · {cfg.name}</p>
            </div>
            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />
            <div>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>📞 {agentPhone}</p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>✉️ {agentEmail}</p>
            </div>
          </div>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 12, letterSpacing: '0.15em' }}>www.remax-altitud.cr</p>
        </div>

        {/* ── SIGNATURES ── */}
        <div style={{ display: 'flex', gap: 40, marginTop: 24 }}>
          <div style={{ flex: 1 }}><div style={{ borderBottom: '1px solid #cbd5e1', height: 32 }} /><p style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>{t.p5_sigOwner}</p></div>
          <div style={{ flex: 1 }}><div style={{ borderBottom: '1px solid #cbd5e1', height: 32 }} /><p style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>{t.p5_sigAgent}</p></div>
          <div style={{ width: 100, flexShrink: 0 }}><div style={{ borderBottom: '1px solid #cbd5e1', height: 32 }} /><p style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>{t.p5_sigDate}</p></div>
        </div>
      </div>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0, marginTop: 'auto' }} />
    </div>
  );
}
