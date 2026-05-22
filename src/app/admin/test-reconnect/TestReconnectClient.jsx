'use client';

import { useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════
   RECONNECT Write Test Dashboard
   
   Internal-only page at /admin/test-reconnect.
   Checks config status, then runs the full write lifecycle
   against the RECONNECT test environment.
   ═══════════════════════════════════════════════════════════════ */

const STATUS_ICONS = {
  idle: '⏳',
  running: '🔄',
  success: '✅',
  error: '❌',
};

export default function TestReconnectClient() {
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testRunning, setTestRunning] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState('altitud');
  const [skipCancel, setSkipCancel] = useState(false);

  // ── Load config status ──────────────────────────────────────
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/reconnect/test-writes');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      setConfig({ error: err.message });
    }
    setConfigLoading(false);
  }, []);

  // ── Run full test ───────────────────────────────────────────
  const runTest = useCallback(async () => {
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/reconnect/test-writes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ office: selectedOffice, skipCancel }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: `Network error: ${err.message}`, steps: [] });
    }
    setTestRunning(false);
  }, [selectedOffice, skipCancel]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.titleIcon}>🔌</span>
          RECONNECT Write Test Harness
        </h1>
        <p style={styles.subtitle}>
          Story 4.4 — Validate all write operations against the RECONNECT test environment
        </p>
      </div>

      {/* Config Panel */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>1. Configuration Status</h2>
          <button
            onClick={loadConfig}
            disabled={configLoading}
            style={styles.btnSecondary}
          >
            {configLoading ? 'Checking...' : 'Check Config'}
          </button>
        </div>

        {config && !config.error && (
          <div style={styles.configGrid}>
            <ConfigItem
              label="Environment"
              value={config.environment}
              ok={config.environment === 'TEST'}
              highlight
            />
            <ConfigItem
              label="Base URL"
              value={config.base_url}
              ok
              mono
            />
            <ConfigItem
              label="Altitud Configured"
              value={config.configured?.altitud ? 'Yes' : 'No'}
              ok={config.configured?.altitud}
            />
            <ConfigItem
              label="Altitud Cero Configured"
              value={config.configured?.cero ? 'Yes' : 'No'}
              ok={config.configured?.cero}
            />
            <ConfigItem
              label="Altitud Integrator ID"
              value={config.credentials_present?.altitud?.integrator_id || '—'}
              ok={!!config.credentials_present?.altitud?.integrator_id}
              mono
            />
            <ConfigItem
              label="Cero Integrator ID"
              value={config.credentials_present?.cero?.integrator_id || '—'}
              ok={!!config.credentials_present?.cero?.integrator_id}
              mono
            />
          </div>
        )}

        {config?.error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {config.error}
          </div>
        )}
      </div>

      {/* Test Runner */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>2. Run Write Test</h2>
        </div>

        <div style={styles.controlRow}>
          <label style={styles.label}>
            Office:
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              style={styles.select}
            >
              <option value="altitud">Altitud (Pérez Zeledón)</option>
              <option value="cero">Altitud Cero (Dominical)</option>
            </select>
          </label>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={skipCancel}
              onChange={(e) => setSkipCancel(e.target.checked)}
              style={styles.checkbox}
            />
            Skip cancel (leave test property on RECONNECT)
          </label>

          <button
            onClick={runTest}
            disabled={testRunning}
            style={testRunning ? styles.btnDisabled : styles.btnPrimary}
          >
            {testRunning ? '⏳ Running Test...' : '🚀 Run Full Test'}
          </button>
        </div>

        <p style={styles.hint}>
          Test sequence: OAuth → CreateProperty → UpdateProperty → UploadImage → CancelProperty
        </p>
      </div>

      {/* Results */}
      {testResult && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>3. Results</h2>
            <span style={{
              ...styles.badge,
              background: testResult.success ? '#10b981' : '#ef4444',
            }}>
              {testResult.success ? '✅ ALL PASSED' : '❌ FAILURES DETECTED'}
            </span>
          </div>

          {/* Summary */}
          <div style={styles.summaryRow}>
            <SummaryItem label="Office" value={testResult.officeKey} />
            <SummaryItem label="Environment" value={testResult.environment} />
            <SummaryItem label="Total Duration" value={`${testResult.totalDurationMs || 0}ms`} />
            {testResult.listingId && (
              <SummaryItem label="Listing ID" value={testResult.listingId} mono />
            )}
            {testResult.listingKey && (
              <SummaryItem label="Listing Key" value={testResult.listingKey} mono />
            )}
          </div>

          {testResult.message && (
            <div style={{
              ...styles.messageBox,
              borderColor: testResult.success ? '#10b981' : '#ef4444',
              background: testResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            }}>
              {testResult.message}
            </div>
          )}

          {/* Step-by-step results */}
          <div style={styles.stepsContainer}>
            {(testResult.steps || []).map((step) => (
              <StepResult key={step.step} step={step} />
            ))}
          </div>

          {/* Raw JSON */}
          <details style={styles.details}>
            <summary style={styles.detailsSummary}>Raw JSON Response</summary>
            <pre style={styles.pre}>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Footer */}
      <p style={styles.footer}>
        ⚠️ This page is for internal testing only. Remove or protect before production deployment.
      </p>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function ConfigItem({ label, value, ok, mono, highlight }) {
  return (
    <div style={styles.configItem}>
      <span style={styles.configLabel}>{label}</span>
      <span style={{
        ...styles.configValue,
        ...(mono ? styles.mono : {}),
        ...(highlight ? {
          color: ok ? '#10b981' : '#ef4444',
          fontWeight: 700,
          fontSize: '0.95rem',
        } : {}),
        color: ok ? '#a7f3d0' : '#fca5a5',
      }}>
        {ok ? '✅' : '❌'} {value}
      </span>
    </div>
  );
}

function SummaryItem({ label, value, mono }) {
  return (
    <div style={styles.summaryItem}>
      <span style={styles.summaryLabel}>{label}</span>
      <span style={{ ...styles.summaryValue, ...(mono ? styles.mono : {}) }}>
        {value}
      </span>
    </div>
  );
}

function StepResult({ step }) {
  const icon = step.success ? '✅' : '❌';

  return (
    <div style={{
      ...styles.stepRow,
      borderLeftColor: step.success ? '#10b981' : '#ef4444',
    }}>
      <div style={styles.stepHeader}>
        <span style={styles.stepNumber}>Step {step.step}</span>
        <span style={styles.stepName}>{icon} {step.name}</span>
        <span style={styles.stepDuration}>{step.durationMs}ms</span>
      </div>

      {step.error && (
        <div style={styles.stepError}>{step.error}</div>
      )}

      {step.tokenPreview && (
        <div style={styles.stepDetail}>
          Token: <code style={styles.inlineCode}>{step.tokenPreview}</code>
        </div>
      )}
      {step.listingId && (
        <div style={styles.stepDetail}>
          Listing ID: <code style={styles.inlineCode}>{step.listingId}</code>
        </div>
      )}
      {step.listingKey && (
        <div style={styles.stepDetail}>
          Listing Key: <code style={styles.inlineCode}>{step.listingKey}</code>
        </div>
      )}
      {step.photoId && (
        <div style={styles.stepDetail}>
          Photo ID: <code style={styles.inlineCode}>{step.photoId}</code>
        </div>
      )}
      {step.note && (
        <div style={styles.stepDetail}>{step.note}</div>
      )}
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────── */

const styles = {
  container: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#e2e8f0',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0d1321 100%)',
  },
  header: {
    marginBottom: '2rem',
    textAlign: 'center',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#f1f5f9',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  titleIcon: {
    fontSize: '1.5rem',
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: '0.5rem',
    fontSize: '0.9rem',
  },
  card: {
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(71, 85, 105, 0.3)',
    borderRadius: 12,
    padding: '1.5rem',
    marginBottom: '1.5rem',
    backdropFilter: 'blur(12px)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '0.75rem',
  },
  configItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 0.8rem',
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 8,
    fontSize: '0.85rem',
  },
  configLabel: {
    color: '#94a3b8',
    fontWeight: 500,
  },
  configValue: {
    fontWeight: 600,
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  label: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  select: {
    padding: '0.4rem 0.6rem',
    borderRadius: 6,
    border: '1px solid rgba(71, 85, 105, 0.5)',
    background: 'rgba(15, 23, 42, 0.8)',
    color: '#e2e8f0',
    fontSize: '0.85rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.8rem',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: '#3b82f6',
  },
  hint: {
    fontSize: '0.78rem',
    color: '#64748b',
    marginTop: '0.75rem',
    fontStyle: 'italic',
  },
  btnPrimary: {
    padding: '0.6rem 1.4rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.2s',
    boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
  },
  btnSecondary: {
    padding: '0.45rem 1rem',
    background: 'rgba(51, 65, 85, 0.6)',
    color: '#e2e8f0',
    border: '1px solid rgba(71, 85, 105, 0.5)',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  btnDisabled: {
    padding: '0.6rem 1.4rem',
    background: '#334155',
    color: '#64748b',
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'not-allowed',
  },
  badge: {
    padding: '0.3rem 0.8rem',
    borderRadius: 20,
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.8rem',
    letterSpacing: '0.02em',
  },
  summaryRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
  },
  summaryItem: {
    padding: '0.5rem 0.8rem',
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 8,
    fontSize: '0.82rem',
  },
  summaryLabel: {
    color: '#64748b',
    marginRight: '0.4rem',
  },
  summaryValue: {
    color: '#e2e8f0',
    fontWeight: 600,
  },
  messageBox: {
    padding: '0.8rem 1rem',
    borderRadius: 8,
    borderLeft: '4px solid',
    fontSize: '0.9rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  stepsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  stepRow: {
    padding: '0.8rem 1rem',
    background: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 8,
    borderLeft: '4px solid',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  stepNumber: {
    fontSize: '0.7rem',
    color: '#64748b',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    minWidth: 50,
  },
  stepName: {
    flex: 1,
    fontWeight: 600,
    fontSize: '0.88rem',
  },
  stepDuration: {
    fontSize: '0.78rem',
    color: '#64748b',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  stepError: {
    marginTop: '0.5rem',
    padding: '0.5rem 0.7rem',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    color: '#fca5a5',
    fontSize: '0.8rem',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  stepDetail: {
    marginTop: '0.3rem',
    fontSize: '0.78rem',
    color: '#94a3b8',
  },
  inlineCode: {
    background: 'rgba(51, 65, 85, 0.5)',
    padding: '0.15rem 0.4rem',
    borderRadius: 4,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '0.76rem',
    color: '#a5b4fc',
  },
  errorBox: {
    padding: '0.8rem 1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    color: '#fca5a5',
    fontSize: '0.85rem',
  },
  details: {
    marginTop: '1rem',
  },
  detailsSummary: {
    cursor: 'pointer',
    color: '#64748b',
    fontSize: '0.82rem',
    fontWeight: 600,
    padding: '0.4rem 0',
  },
  pre: {
    background: 'rgba(15, 23, 42, 0.7)',
    padding: '1rem',
    borderRadius: 8,
    overflow: 'auto',
    fontSize: '0.72rem',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    color: '#94a3b8',
    maxHeight: 400,
    lineHeight: 1.5,
    border: '1px solid rgba(51, 65, 85, 0.3)',
  },
  mono: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '0.78rem',
  },
  footer: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#475569',
    marginTop: '2rem',
    fontStyle: 'italic',
  },
};
