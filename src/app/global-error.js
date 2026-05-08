"use client";

/* ═══════════════════════════════════════════════════════════════
   GLOBAL ERROR — Catches root layout crashes.
   
   Uses inline styles only (no CSS imports) because the layout
   itself may have failed to load. This is the last line of defense.
   ═══════════════════════════════════════════════════════════════ */

export default function GlobalError({ error, reset }) {
  return (
    <html lang="es">
      <body style={{
        margin: 0, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#e2e8f0',
      }}>
        <div style={{ textAlign: 'center', padding: '48px 24px', maxWidth: 480 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(220,20,60,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 32px', lineHeight: 1.6 }}>
            La aplicación encontró un error inesperado. Tu trabajo no se ha perdido — intenta recargar la página.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '12px 28px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
              }}
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 28px', borderRadius: 12,
                border: '1px solid #334155', background: '#1e293b',
                color: '#94a3b8', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Ir al Inicio
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <details style={{
              marginTop: 32, textAlign: 'left', background: 'rgba(239,68,68,0.1)',
              borderRadius: 12, padding: 16, fontSize: 12, color: '#fca5a5',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Error técnico (dev only)
              </summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
                {error.message}
                {error.digest && `\n\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}
