import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Helper to robustly parse date formats from manual CSV or Google Sheets
function parseDate(dateStr) {
  if (!dateStr) return null;
  dateStr = String(dateStr).trim();
  
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
  const limited = rateLimit(req, { maxRequests: 5, keyPrefix: 'okr-import' });
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
        { error: 'profileId is required (can be specific UUID or "multi_agent").' },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];
    const isMultiAgent = profileId === 'multi_agent';
    const agentImportStats = {}; // Tracks imports per agent for logging

    // Fetch all profiles if we are in multi-agent mode
    let emailToProfileMap = {};
    let allProfiles = [];
    if (isMultiAgent) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email');
      
      if (profilesError) {
        return NextResponse.json(
          { error: 'Failed to retrieve agent profiles: ' + profilesError.message },
          { status: 500 }
        );
      }

      allProfiles = profiles;
      for (const p of profiles) {
        if (p.email) {
          emailToProfileMap[p.email.trim().toLowerCase()] = p.id;
        }
      }
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      try {
        // Resolve agent profile ID
        let targetProfileId = profileId;
        
        if (isMultiAgent) {
          const emailVal = entry['Email Address'] || entry['email'] || entry['correo'] || entry['Correo Electrónico'];
          if (!emailVal) {
            skipped++;
            continue;
          }
          const emailClean = emailVal.trim().toLowerCase();
          targetProfileId = emailToProfileMap[emailClean];

          // Try smart prefix matching if exact match not found (e.g., gustavo@remax-altitud.cr -> gustavo.valverde@remax-altitud.cr)
          if (!targetProfileId) {
            const [prefix, domain] = emailClean.split('@');
            if (prefix && domain) {
              const match = allProfiles.find(p => {
                if (!p.email) return false;
                const [dbPrefix, dbDomain] = p.email.trim().toLowerCase().split('@');
                return dbDomain === domain && (
                  dbPrefix.startsWith(prefix + '.') || 
                  prefix.startsWith(dbPrefix + '.')
                );
              });
              if (match) {
                targetProfileId = match.id;
              }
            }
          }

          if (!targetProfileId) {
            skipped++;
            errors.push({
              row: i + 1,
              error: `No matching agent profile found for email: ${emailVal}`
            });
            continue;
          }
        }

        // Parse date
        const rawDate = entry.date || entry.fecha || entry.log_date || entry['Timestamp'] || entry['Fecha'];
        const logDate = parseDate(rawDate);
        if (!logDate) {
          skipped++;
          continue;
        }

        // Parse activities (checking standard keys, Spanish keys, and casing)
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

        // We do a case-insensitive check of all row keys to map correctly
        const rowKeys = Object.keys(entry);
        for (const rk of rowKeys) {
          const lowerRk = rk.trim().toLowerCase();
          const val = parseInt(entry[rk] || '0', 10);
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

        // Keep track of stats per agent
        if (!agentImportStats[targetProfileId]) {
          agentImportStats[targetProfileId] = { total: 0, imported: 0, skipped: 0, errors: [] };
        }
        agentImportStats[targetProfileId].total++;

        // Upsert into active agent_daily_okr_entries table
        const { error: upsertError } = await supabase
          .from('agent_daily_okr_entries')
          .upsert({
            profile_id: targetProfileId,
            date: logDate,
            ...activities,
            is_completed: true,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'profile_id,date'
          });

        if (upsertError) throw upsertError;

        imported++;
        agentImportStats[targetProfileId].imported++;
      } catch (err) {
        errors.push({ row: i + 1, date: entry.date || 'unknown', error: err.message });
        
        let targetProfileId = profileId;
        if (isMultiAgent) {
          const emailVal = entry['Email Address'] || entry['email'] || entry['correo'];
          targetProfileId = emailVal ? emailToProfileMap[emailVal.trim().toLowerCase()] : null;
        }
        if (targetProfileId) {
          if (!agentImportStats[targetProfileId]) {
            agentImportStats[targetProfileId] = { total: 0, imported: 0, skipped: 0, errors: [] };
          }
          agentImportStats[targetProfileId].errors.push({ row: i + 1, error: err.message });
        }
      }
    }

    // Log import history
    if (isMultiAgent) {
      for (const [agentProfileId, stats] of Object.entries(agentImportStats)) {
        if (stats.imported > 0 || stats.errors.length > 0) {
          await supabase.from('agent_history_imports').insert({
            agent_profile_id: agentProfileId,
            imported_by: importedBy || agentProfileId,
            import_type: 'okr_history',
            file_name: 'Manual Multi-Agent CSV Import',
            total_rows: stats.total,
            imported_rows: stats.imported,
            skipped_rows: stats.skipped,
            error_rows: stats.errors.length,
            errors: stats.errors,
          });
        }
      }
    } else {
      await supabase.from('agent_history_imports').insert({
        agent_profile_id: profileId,
        imported_by: importedBy || profileId,
        import_type: 'okr_history',
        file_name: 'Manual Single-Agent CSV Import',
        total_rows: entries.length,
        imported_rows: imported,
        skipped_rows: skipped,
        error_rows: errors.length,
        errors,
      });
    }

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
