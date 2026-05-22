import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Helper to robustly parse date formats from Google Sheets
function parseDate(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.trim();
  
  // Try parsing ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split(' ')[0];
  }
  
  // Try M/D/YYYY H:MM:SS or MM/DD/YYYY etc.
  const parts = dateStr.split(' ')[0].split(/[\/\-]/);
  if (parts.length === 3) {
    let year = parseInt(parts[2], 10);
    let month = parseInt(parts[0], 10);
    let day = parseInt(parts[1], 10);
    
    // If year is 2 digits
    if (year < 100) year += 2000;
    
    // If the first part is 4 digits, it's YYYY-MM-DD or YYYY/MM/DD
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
    
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    
    if (year >= 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${mm}-${dd}`;
    }
  }
  
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  
  return null;
}

export async function POST(req) {
  try {
    const supabase = getSupabaseAdmin();
    const { officeId = 'altitud', triggeredBy } = await req.json().catch(() => ({}));

    // 1. Fetch office settings
    const { data: settings, error: settingsError } = await supabase
      .from('office_settings')
      .select('*')
      .eq('office_id', officeId)
      .single();

    if (settingsError) {
      return NextResponse.json(
        { error: 'Failed to retrieve office settings: ' + settingsError.message },
        { status: 500 }
      );
    }

    if (!settings || !settings.okr_sheet_url) {
      return NextResponse.json(
        { error: 'Google Sheets Published CSV URL is not configured. Go to Integrations Settings.' },
        { status: 400 }
      );
    }

    // 2. Fetch published CSV from Google Sheets
    const csvResponse = await fetch(settings.okr_sheet_url, { cache: 'no-store' });
    if (!csvResponse.ok) {
      return NextResponse.json(
        { error: `Failed to download published Google Sheet: ${csvResponse.status} ${csvResponse.statusText}` },
        { status: 400 }
      );
    }

    const csvText = await csvResponse.text();

    // 3. Parse CSV data
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data;
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'The Google Sheet CSV is empty or formatted incorrectly.' },
        { status: 400 }
      );
    }

    // 4. Load agent profiles to map emails to IDs
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email');

    if (profilesError) {
      return NextResponse.json(
        { error: 'Failed to retrieve agent profiles: ' + profilesError.message },
        { status: 500 }
      );
    }

    const emailToProfileMap = {};
    for (const p of profiles) {
      if (p.email) {
        emailToProfileMap[p.email.trim().toLowerCase()] = p.id;
      }
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const agentImportStats = {}; // Keep track of imports per agent for logging

    // 5. Process rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Determine email address column
      const emailVal = row['Email Address'] || row['email'] || row['correo'] || row['Correo Electrónico'];
      if (!emailVal) {
        skippedCount++;
        continue;
      }

      const emailClean = emailVal.trim().toLowerCase();
      let profileId = emailToProfileMap[emailClean];

      // Try smart prefix matching if exact match not found (e.g., gustavo@remax-altitud.cr -> gustavo.valverde@remax-altitud.cr)
      if (!profileId) {
        const [prefix, domain] = emailClean.split('@');
        if (prefix && domain) {
          const match = profiles.find(p => {
            if (!p.email) return false;
            const [dbPrefix, dbDomain] = p.email.trim().toLowerCase().split('@');
            return dbDomain === domain && (
              dbPrefix.startsWith(prefix + '.') || 
              prefix.startsWith(dbPrefix + '.')
            );
          });
          if (match) {
            profileId = match.id;
          }
        }
      }

      if (!profileId) {
        skippedCount++;
        errors.push({
          row: i + 2,
          error: `No agent profile found for email: ${emailVal}`
        });
        continue;
      }

      // Determine date column
      const timestampVal = row['Timestamp'] || row['fecha'] || row['date'] || row['log_date'] || row['Fecha'];
      const logDate = parseDate(timestampVal);

      if (!logDate) {
        skippedCount++;
        errors.push({
          row: i + 2,
          error: `Invalid date format: ${timestampVal}`
        });
        continue;
      }

      // Parse activities
      const activities = {
        llamadas: 0,
        prelistings: 0,
        acm: 0,
        listings: 0,
        captaciones: 0,
        busquedas: 0,
        consultas: 0,
        muestras: 0,
        reservas: 0,
        transacciones: 0,
        cierres: 0
      };

      for (const [rk, valStr] of Object.entries(row)) {
        const lowerRk = rk.trim().toLowerCase();
        const val = parseInt(valStr || '0', 10);
        if (isNaN(val) || val <= 0) continue;

        if (lowerRk === 'llamados' || lowerRk === 'llamadas') {
          activities.llamadas = val;
        } else if (lowerRk === 'pl' || lowerRk === 'prelistings') {
          activities.prelistings = val;
        } else if (lowerRk === 'acm') {
          activities.acm = val;
        } else if (lowerRk === 'listing' || lowerRk === 'listings') {
          activities.listings = val;
        } else if (lowerRk === 'exclusivas' || lowerRk === 'captaciones') {
          activities.captaciones = val;
        } else if (lowerRk === 'consultas') {
          activities.consultas = val;
        } else if (lowerRk === 'muestras') {
          activities.muestras = val;
        } else if (lowerRk === 'reservas') {
          activities.reservas = val;
        } else if (lowerRk === 'transacciones') {
          activities.transacciones = val;
        } else if (lowerRk === '$$$$' || lowerRk === 'cierres') {
          activities.cierres = val;
        }
      }

      // Initialize stats tracker for this agent if not present
      if (!agentImportStats[profileId]) {
        agentImportStats[profileId] = { total: 0, imported: 0, skipped: 0, errors: [] };
      }
      agentImportStats[profileId].total++;

      try {
        // Upsert into active agent_daily_okr_entries table
        const { error: upsertError } = await supabase
          .from('agent_daily_okr_entries')
          .upsert({
            profile_id: profileId,
            date: logDate,
            ...activities,
            is_completed: true,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'profile_id,date'
          });

        if (upsertError) throw upsertError;

        importedCount++;
        agentImportStats[profileId].imported++;
      } catch (err) {
        errors.push({
          row: i + 2,
          date: logDate,
          agent: emailVal,
          error: err.message
        });
        agentImportStats[profileId].errors.push({ row: i + 2, error: err.message });
      }
    }

    // 6. Log import history entries for each affected agent
    const brokerProfileId = triggeredBy || profiles.find(p => p.email === 'acastro@remax-altitud.cr')?.id;
    for (const [agentProfileId, stats] of Object.entries(agentImportStats)) {
      if (stats.imported > 0 || stats.errors.length > 0) {
        await supabase.from('agent_history_imports').insert({
          agent_profile_id: agentProfileId,
          imported_by: brokerProfileId || agentProfileId,
          import_type: 'okr_history',
          file_name: `Google Sheets Auto-Sync (${new Date().toLocaleDateString()})`,
          total_rows: stats.total,
          imported_rows: stats.imported,
          skipped_rows: stats.skipped,
          error_rows: stats.errors.length,
          errors: stats.errors,
        });
      }
    }

    // 7. Update last synced time in office_settings
    try {
      await supabase
        .from('office_settings')
        .update({ okr_sheet_last_synced: new Date().toISOString() })
        .eq('office_id', officeId);
    } catch (e) {
      // Non-blocking log update fail
      console.warn('Failed to update okr_sheet_last_synced in office_settings:', e.message);
    }

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      imported: importedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('OKR sync critical failure:', err);

    // Gracefully handle database missing column error in case migration hasn't been run yet
    if (err.message?.includes('column "okr_sheet_url"') || err.code === '42703') {
      return NextResponse.json(
        { 
          error: 'Migration Required', 
          details: 'Las nuevas columnas de sincronización de Google Sheets no se han creado en tu base de datos de Supabase. Copia el código de migración de implementation_plan.md y ejecútalo en el Editor de SQL de tu consola de Supabase.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Sync failed: ' + err.message },
      { status: 500 }
    );
  }
}
