import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Robust name matching index
function cleanName(name) {
  if (!name) return '';
  return name.toString().trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9 ]/g, '')      // keep letters/numbers/spaces
    .replace(/\s+/g, ' ');           // collapse multiple spaces
}

function findBestAgentMatch(csvName, profiles) {
  const cleanCsv = cleanName(csvName);
  if (!cleanCsv) return null;

  // 1. Exact match
  let match = profiles.find(p => cleanName(p.full_name) === cleanCsv);
  if (match) return match;

  // 2. Substring match
  match = profiles.find(p => {
    const cleanDb = cleanName(p.full_name);
    return cleanDb.includes(cleanCsv) || cleanCsv.includes(cleanDb);
  });
  if (match) return match;

  // 3. Match first name and first surname
  const csvParts = cleanCsv.split(' ');
  if (csvParts.length >= 2) {
    match = profiles.find(p => {
      const dbParts = cleanName(p.full_name).split(' ');
      if (dbParts.length >= 2) {
        return csvParts[0] === dbParts[0] && csvParts[1] === dbParts[1];
      }
      return false;
    });
    if (match) return match;
  }

  return null;
}

const parseAgentSplitPct = (splitStr) => {
  if (!splitStr) return 0.45;
  const parts = splitStr.toString().split('/');
  if (parts.length === 2) {
    const val = parseFloat(parts[0]);
    if (!isNaN(val)) return val / 100;
  }
  const numeric = parseFloat(splitStr);
  if (!isNaN(numeric)) {
    if (numeric > 1) return numeric / 100;
    return numeric;
  }
  return 0.45;
};

const MONTH_COLS = {
  Ene: 1, Feb: 2, Mar: 3, Abr: 4, May: 5, Jun: 6,
  Jul: 7, Ago: 8, Sep: 9, Oct: 10, Nov: 11, Dic: 12,
  Jan: 1, Apr: 4, Aug: 8, Set: 9, Dec: 12 // handle English/synonyms
};

export async function POST(req) {
  const limited = rateLimit(req, { maxRequests: 5, keyPrefix: 'import-performance' });
  if (limited) return limited;

  try {
    const supabase = getSupabaseAdmin();
    const { entries, fileName, importedBy } = await req.json();

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'entries array is required and must not be empty.' },
        { status: 400 }
      );
    }

    // Fetch all active profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, commission_split');

    if (profilesError) {
      return NextResponse.json(
        { error: 'Failed to retrieve agent profiles: ' + profilesError.message },
        { status: 500 }
      );
    }

    const batchId = crypto.randomUUID();
    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Track total GCI imported for summary
    let totalGciImported = 0;

    for (let i = 0; i < entries.length; i++) {
      const row = entries[i];
      
      // Identify agent name field
      const nameKey = Object.keys(row).find(k => {
        const cleanK = cleanName(k);
        return cleanK === 'asociado' || cleanK === 'agent' || cleanK === 'nombre' || cleanK === 'name';
      });

      const agentName = nameKey ? row[nameKey] : null;
      if (!agentName) {
        skippedCount++;
        continue;
      }

      // If it's a total or header row from Excel, skip it
      const cleanAgentName = cleanName(agentName);
      if (cleanAgentName.includes('total') || cleanAgentName.includes('promedio') || cleanAgentName.includes('average')) {
        skippedCount++;
        continue;
      }

      // Find matched agent
      const agentProfile = findBestAgentMatch(agentName, profiles);
      if (!agentProfile) {
        errors.push({
          row: i + 1,
          agent: agentName,
          error: `No matching active agent profile found in database for: "${agentName}"`
        });
        skippedCount++;
        continue;
      }

      // Parse year
      const yearKey = Object.keys(row).find(k => cleanName(k) === 'ano' || cleanName(k) === 'year');
      const year = yearKey ? parseInt(row[yearKey], 10) : new Date().getFullYear();

      if (isNaN(year) || year < 2000 || year > 2100) {
        errors.push({
          row: i + 1,
          agent: agentName,
          error: `Invalid year specified in row: "${row[yearKey]}"`
        });
        skippedCount++;
        continue;
      }

      // Loop through all month columns
      for (const [monthCol, monthNum] of Object.entries(MONTH_COLS)) {
        // Find matching key case-insensitively
        const rowKey = Object.keys(row).find(k => cleanName(k) === cleanName(monthCol));
        if (!rowKey) continue;

        const valStr = row[rowKey];
        if (!valStr) continue;

        // Clean amount (remove currency symbols, commas)
        const amount = parseFloat(valStr.toString().replace(/[^0-9.]/g, ''));
        if (isNaN(amount) || amount <= 0) continue;

        try {
          const closingDate = `${year}-${String(monthNum).padStart(2, '0')}-28`;

          // Apply clean overwrite strategy (remove general historical commissions for agent on this month)
          await supabase
            .from('agent_commissions')
            .delete()
            .eq('agent_id', agentProfile.id)
            .eq('closing_date', closingDate)
            .is('property_id', null);

          // Calculate split
          const splitPct = parseAgentSplitPct(agentProfile.commission_split || '45/55');
          const rccaPct = 6;
          const rccaAmount = amount * (rccaPct / 100);
          const isStarter = splitPct <= 0.45;

          let agentAmount, officeAmount;
          if (isStarter) {
            agentAmount = amount * splitPct;
            officeAmount = amount - agentAmount - rccaAmount;
          } else {
            const afterRcca = amount - rccaAmount;
            agentAmount = afterRcca * splitPct;
            officeAmount = afterRcca - agentAmount;
          }

          // Insert historical paid GCI commission
          const { error: insertError } = await supabase
            .from('agent_commissions')
            .insert({
              property_id: null, // General import has no property
              agent_id: agentProfile.id,
              sale_price: 0,
              total_commission_pct: 0,
              gross_commission: amount,
              side: 'both',
              side_pct: 100,
              side_amount: amount,
              rcca_fee_pct: rccaPct,
              rcca_fee_amount: rccaAmount,
              after_rcca: isStarter ? amount : (amount - rccaAmount),
              agent_split_pct: splitPct * 100,
              agent_amount: agentAmount,
              office_amount: officeAmount,
              closing_date: closingDate,
              status: 'paid',
            });

          if (insertError) throw insertError;

          importedCount++;
          totalGciImported += amount;
        } catch (monthErr) {
          errors.push({
            row: i + 1,
            agent: agentName,
            month: monthCol,
            error: `Failed to insert commission: ${monthErr.message}`
          });
        }
      }
    }

    // Save batch import record
    const brokerId = profiles.find(p => p.id === importedBy)?.id || importedBy || null;
    await supabase.from('agent_history_imports').insert({
      id: batchId,
      agent_profile_id: brokerId || profiles[0]?.id, // Default to first profile if not specified
      imported_by: brokerId || 'System',
      import_type: 'historical_commissions',
      file_name: fileName || 'excel_performance_dashboard.csv',
      total_rows: entries.length,
      imported_rows: importedCount,
      skipped_rows: skippedCount,
      error_rows: errors.length,
      errors: errors,
    });

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      total_rows: entries.length,
      imported_commissions: importedCount,
      skipped_rows: skippedCount,
      total_gci_usd: totalGciImported,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err) {
    console.error('Performance import error:', err);
    return NextResponse.json(
      { error: 'Performance import failed: ' + err.message },
      { status: 500 }
    );
  }
}
