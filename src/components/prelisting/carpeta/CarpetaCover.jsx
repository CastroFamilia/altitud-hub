export default function CarpetaCover({ cfg, agentName }) {
  return (
    <div className="carpeta-page" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Full-bleed hero image */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <img
          src={cfg.coverImage}
          alt={cfg.location}
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
        {/* Dark gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0.92) 100%)'
        }} />

        {/* Top bar accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)` }} />

        {/* Logo top-left */}
        <div style={{ position: 'absolute', top: 24, left: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: '6px 12px', backdropFilter: 'blur(10px)' }}>
            <img src="/assets/logo-altitud.png" alt="Logo" style={{ height: 28 }} />
          </div>
        </div>

        {/* Content at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 36px 36px' }}>
          {/* Office name */}
          <h1 style={{ fontSize: 42, fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 4, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            {cfg.name}
          </h1>
          
          {/* Location */}
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: 500, letterSpacing: '0.02em', marginBottom: 20 }}>
            {cfg.location}
          </p>

          {/* Separator */}
          <div style={{ width: 60, height: 3, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, borderRadius: 2, marginBottom: 16 }} />

          {/* Title */}
          <h2 style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
            Carpeta de Presentación
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
            Preparado por <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{agentName}</strong>
          </p>
        </div>
      </div>

      {/* Bottom strip */}
      <div style={{ 
        height: 48, flexShrink: 0, 
        background: cfg.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 36px'
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          www.remax-altitud.cr
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {cfg.zone}
        </span>
      </div>
    </div>
  );
}
