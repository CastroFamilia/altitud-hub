import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════════
   HEALTH CHECK ENDPOINT — /api/health
   
   Checks:
   1. App is running (always true if this executes)
   2. Supabase connectivity (SELECT 1 equivalent)
   3. Gemini API key is configured
   4. Google Drive credentials are configured
   
   Returns 200 if all critical checks pass, 503 if any fail.
   ═══════════════════════════════════════════════════════════════ */

export async function GET() {
  const checks = {
    app: { status: 'ok', message: 'Application running' },
    supabase: { status: 'unknown', message: 'Not checked' },
    gemini: { status: 'unknown', message: 'Not checked' },
    drive: { status: 'unknown', message: 'Not checked' },
  };

  let allHealthy = true;

  // ── Check Supabase ──────────────────────────────────────────
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    
    const latency = Date.now() - start;

    if (error) {
      checks.supabase = { status: 'error', message: error.message, latencyMs: latency };
      allHealthy = false;
    } else {
      checks.supabase = { status: 'ok', message: 'Connected', latencyMs: latency };
    }
  } catch (err) {
    checks.supabase = { status: 'error', message: err.message };
    allHealthy = false;
  }

  // ── Check Gemini API Key ────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    checks.gemini = { status: 'ok', message: 'API key configured' };
  } else {
    checks.gemini = { status: 'error', message: 'GEMINI_API_KEY not set' };
    allHealthy = false;
  }

  // ── Check Google Drive ──────────────────────────────────────
  const driveConfigured = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  );

  if (driveConfigured) {
    checks.drive = { status: 'ok', message: 'Credentials configured' };
  } else {
    checks.drive = { status: 'warn', message: 'Some Drive credentials missing' };
    // Drive is not critical — don't mark unhealthy
  }

  const httpStatus = allHealthy ? 200 : 503;

  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: httpStatus });
}
