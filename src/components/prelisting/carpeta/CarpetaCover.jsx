import Image from 'next/image';

export default function CarpetaCover({ cfg, agentName, agentPhoto, t }) {
  // Fallback for when t is not provided
  const tr = t || ((key) => {
    const fallback = { pre_carpeta_title: 'STRATEGIC ASSET VALUATION', pre_presented_by: 'PRESENTED BY' };
    return fallback[key] || key;
  });

  return (
    <div className="carpeta-page" style={{ padding: 0, display: 'flex', flexDirection: 'column', position: 'relative', fontFamily: "'Inter', sans-serif" }}>
      {/* Import Playfair Display for the premium serif look */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
      `}} />

      {/* Full-bleed hero image */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Image src={cfg.coverImage}
          alt={cfg.location}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} fill />
        {/* Dark gradient overlay to ensure text readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.85) 100%)'
        }} />
      </div>

      {/* Main Content Container - Centered */}
      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 60px' }}>
        
        {/* Title */}
        <h1 style={{ 
          fontFamily: "'Playfair Display', serif", 
          fontSize: 48, 
          fontWeight: 600, 
          color: 'white', 
          letterSpacing: '0.05em', 
          textTransform: 'uppercase', 
          marginBottom: 20,
          textShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          {tr('pre_carpeta_title')}
        </h1>
        
        {/* Elegant thin dividing line */}
        <div style={{ width: '60%', height: 1, background: 'rgba(255,255,255,0.4)', marginBottom: 20 }} />
        
        {/* Subtitle / Location */}
        <h2 style={{ 
          fontFamily: "'Playfair Display', serif", 
          fontSize: 28, 
          fontWeight: 400, 
          color: 'rgba(255,255,255,0.9)', 
          letterSpacing: '0.02em', 
          marginBottom: 60
        }}>
          {cfg.location}
        </h2>

        {/* Agent Info & Presentation Info */}
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {agentPhoto && (
            <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.8)', marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <Image src={agentPhoto} alt={agentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} fill />
            </div>
          )}
          
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 400, letterSpacing: '0.05em', marginBottom: 8, textTransform: 'uppercase' }}>
            {tr('pre_presented_by')}
          </p>
          <p style={{ fontSize: 16, color: 'white', fontWeight: 600, letterSpacing: '0.02em', marginBottom: 4 }}>
            {agentName}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>
            {cfg.name} | {cfg.zone}
          </p>
        </div>
      </div>

      {/* Logo at the very bottom */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <Image src="/assets/logo-altitud.png" alt="Logo" style={{ height: 40, filter: 'brightness(0) invert(1)', opacity: 0.9 }} width={100} height={100} unoptimized />
      </div>

    </div>
  );
}
