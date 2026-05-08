import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';

/* ═══════════════════════════════════════════════════════════════
   BULK IMPORT OKR HISTORY
   POST /api/okr/bulk-import
   
   Accepts an array of OKR daily log entries and upserts them
   into okr_daily_logs to backfill the agent's funnel history.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Valid activity keys matching the 10 pipeline stages
const VALID_KEYS = [
  'llamadas', 'prelistings', 'acm', 'listings', 'captaciones',
  'consultas', 'muestras', 'reservas', 'transacciones', 'cierres',
];

export async function POST(req) {
  const limited = rateLimit(req, { maxRequests: 3, keyPrefix: 'okr-import' });
  if (limited) return limited;

  try {
    const supabase = getSupabaseAdmin();
    const { entries, profileId, importedBy } = await req.json();

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'entries array is required and must not be empty.' },
        { status: 400 }
      );
    }

    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId is required.' },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      try {
        // Parse date
        const logDate = entry.date || entry.fecha || entry.log_date;
        if (!logDate) {
          skipped++;
          continue;
        }

        // Build activities object — only include valid keys
        const activities = {};
        for (const key of VALID_KEYS) {
          const val = parseInt(entry[key] || entry.activities?.[key] || '0', 10);
          if (val > 0) activities[key] = val;
        }

        // Also check for Spanish column names from the Google Sheet
        const spanishMap = {
          'Llamados': 'llamadas',
          'PL': 'prelistings',
          'ACM': 'acm',
          'Listing': 'listings',
          'Exclusivas': 'captaciones',
          'Consultas': 'consultas',
          'Muestras': 'muestras',
          'Reservas': 'reservas',
          'Transacciones': 'transacciones',
          '$$$$': 'cierres',
        };

        for (const [spanishKey, internalKey] of Object.entries(spanishMap)) {
          const val = parseInt(entry[spanishKey] || '0', 10);
          if (val > 0 && !activities[internalKey]) {
            activities[internalKey] = val;
          }
        }

        if (Object.keys(activities).length === 0) {
          skipped++;
          continue;
        }

        // Upsert — merge with existing data for the same day
        const { data: existing } = await supabase
          .from('okr_daily_logs')
          .select('id, activities')
          .eq('profile_id', profileId)
          .eq('log_date', logDate)
          .single();

        if (existing) {
          // Merge: imported data adds to existing
          const merged = { ...(existing.activities || {}), ...activities };
          await supabase
            .from('okr_daily_logs')
            .update({ activities: merged })
            .eq('id', existing.id);
        } else {
          await supabase.from('okr_daily_logs').insert({
            profile_id: profileId,
            log_date: logDate,
            activities,
          });
        }

        imported++;
      } catch (err) {
        errors.push({ row: i + 1, date: entry.date || 'unknown', error: err.message });
      }
    }

    // Log import
    await supabase.from('agent_history_imports').insert({
      agent_profile_id: profileId,
      imported_by: importedBy || profileId,
      import_type: 'okr_history',
      total_rows: entries.length,
      imported_rows: imported,
      skipped_rows: skipped,
      error_rows: errors.length,
      errors,
    });

    return NextResponse.json({
      success: true,
      total: entries.length,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('OKR import error:', err);
    return NextResponse.json(
      { error: 'OKR import failed: ' + err.message },
      { status: 500 }
    );
  }
}
