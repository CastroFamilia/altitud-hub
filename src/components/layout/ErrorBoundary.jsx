"use client";

import { Component } from 'react';

/* ═══════════════════════════════════════════════════════════════
   ERROR BOUNDARY — Catches React rendering errors per-module.
   
   Usage:
     <ErrorBoundary module="Olympia Coach">
       <OlympiaCoach />
     </ErrorBoundary>
   ═══════════════════════════════════════════════════════════════ */

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary: ${this.props.module || 'Unknown'}]`, error, errorInfo);
    
    // Optionally report to Supabase error_tickets table
    if (typeof window !== 'undefined') {
      try {
        fetch('/api/properties/sync', { method: 'HEAD' }).catch(() => {}); // connectivity check only
      } catch(e) {}
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const moduleName = this.props.module || 'Este módulo';

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          minHeight: this.props.fullPage ? '100vh' : '200px',
        }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3 style={{
            fontSize: '16px', fontWeight: 700,
            color: '#1e293b', margin: '0 0 8px 0',
          }}>
            Algo salió mal
          </h3>
          <p style={{
            fontSize: '13px', color: '#64748b',
            margin: '0 0 20px 0', maxWidth: 320,
            lineHeight: 1.5,
          }}>
            {moduleName} tuvo un error inesperado. Puedes intentar recargarlo o reportar el problema en Soporte.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '8px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
              }}
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 20px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Recargar Página
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              marginTop: 24, textAlign: 'left',
              background: '#fef2f2', borderRadius: 8,
              padding: 12, maxWidth: 500, width: '100%',
              fontSize: 11, color: '#991b1b',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Error técnico (dev only)
              </summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
