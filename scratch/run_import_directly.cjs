const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Load Environment Variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or Service Role Key missing in .env.local!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Helper functions copied from route.js
function cleanName(name) {
  if (!name) return '';
  return name.toString().trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9 ]/g, '')      // keep letters/numbers/spaces
    .replace(/\s+/g, ' ');           // collapse multiple spaces
}

function findBestAgentMatch(excelName, profiles) {
  const cleanExcel = cleanName(excelName);
  if (!cleanExcel) return null;

  // 1. Exact match
  let match = profiles.find(p => cleanName(p.full_name) === cleanExcel);
  if (match) return match;

  // 2. Substring match
  match = profiles.find(p => {
    const cleanDb = cleanName(p.full_name);
    return cleanDb.includes(cleanExcel) || cleanExcel.includes(cleanDb);
  });
  if (match) return match;

  // 3. Match first name and first surname
  const excelParts = cleanExcel.split(' ');
  if (excelParts.length >= 2) {
    match = profiles.find(p => {
      const dbParts = cleanName(p.full_name).split(' ');
      if (dbParts.length >= 2) {
        return excelParts[0] === dbParts[0] && excelParts[1] === dbParts[1];
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
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  Set: 9, Setiembre: 9, Septiembre: 9, Diciembre: 12
};

function getMonthNumber(monthName) {
  if (!monthName) return null;
  const clean = monthName.trim().toLowerCase();
  for (const [key, num] of Object.entries(MONTH_COLS)) {
    if (key.toLowerCase() === clean || clean.startsWith(key.toLowerCase())) {
      return num;
    }
  }
  return null;
}

function getCellValue(sheet, r, c) {
  const cell = sheet[XLSX.utils.encode_cell({ r, c })];
  return cell ? cell.v : null;
}

async function main() {
  console.log('Starting standalone direct RCCA Performance Import...');
  const excelPath = path.join(__dirname, '../Performance Dashboard -ALTITUD.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.error(`Excel spreadsheet not found at: ${excelPath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['Production'];

  if (!sheet) {
    console.error('Error: "Production" sheet not found in the Excel workbook!');
    process.exit(1);
  }

  console.log('Loading active agent profiles from Supabase...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, commission_split');

  if (profilesError) {
    console.error('Failed to retrieve profiles:', profilesError.message);
    process.exit(1);
  }
  console.log(`Loaded ${profiles.length} profiles.`);

  // 3. Parse Section 1: Office Commissions (GCI)
  const officeCommissions = [];
  for (let c = 1; c < 10; c++) {
    const yearVal = getCellValue(sheet, 4, c); // Row 5 is index 4
    if (yearVal && !isNaN(yearVal)) {
      const year = parseInt(yearVal, 10);
      if (year >= 2000 && year <= 2100) {
        for (let m = 0; m < 12; m++) {
          const r = 5 + m; // Row 6 is index 5
          const gci = parseFloat(getCellValue(sheet, r, c)) || 0;
          officeCommissions.push({ year, month: m + 1, gci });
        }
      }
    }
  }
  console.log(`Parsed ${officeCommissions.length} office GCI records.`);

  // 4. Parse Section 2: Active Agent Count
  const officeAgentCounts = [];
  for (let c = 1; c < 10; c++) {
    const yearVal = getCellValue(sheet, 22, c); // Row 23 is index 22
    if (yearVal && !isNaN(yearVal)) {
      const year = parseInt(yearVal, 10);
      if (year >= 2000 && year <= 2100) {
        for (let m = 0; m < 12; m++) {
          const r = 23 + m; // Row 24 is index 23
          const count = parseInt(getCellValue(sheet, r, c), 10) || 0;
          officeAgentCounts.push({ year, month: m + 1, count });
        }
      }
    }
  }
  console.log(`Parsed ${officeAgentCounts.length} office agent count records.`);

  // 5. Parse Section 3: Monthly Commissions Per Associate
  const titleVal3 = getCellValue(sheet, 38, 1) || getCellValue(sheet, 38, 0) || '';
  const yearMatch3 = titleVal3.match(/\b(20\d{2})\b/);
  const section3Year = yearMatch3 ? parseInt(yearMatch3[1], 10) : 2026;
  console.log(`Section 3 detected year: ${section3Year}`);

  const monthsHeader3 = [];
  for (let c = 1; c < 20; c++) {
    const val = getCellValue(sheet, 39, c); // Row 40 is index 39
    if (!val || val.trim() === 'Total' || val.trim() === 'AVG') break;
    monthsHeader3.push({ colIndex: c, monthName: val.trim() });
  }

  const section3Data = [];
  for (let r = 40; r < 100; r++) { // Rows start at Row 41 (index 40)
    const agentName = getCellValue(sheet, r, 0); // Col A (index 0)
    if (!agentName || agentName.trim() === 'Total' || agentName.trim().startsWith('Total')) break;

    const monthlyComms = {};
    for (const m of monthsHeader3) {
      const val = getCellValue(sheet, r, m.colIndex) || 0;
      monthlyComms[m.monthName] = parseFloat(val) || 0;
    }
    section3Data.push({ agentName: agentName.trim(), commissions: monthlyComms });
  }

  // 6. Parse Section 4: Monthly Volume Per Associate
  const titleVal4 = getCellValue(sheet, 61, 1) || getCellValue(sheet, 61, 0) || '';
  const yearMatch4 = titleVal4.match(/\b(20\d{2})\b/);
  const section4Year = yearMatch4 ? parseInt(yearMatch4[1], 10) : section3Year;
  console.log(`Section 4 detected year: ${section4Year}`);

  const monthsHeader4 = [];
  for (let c = 1; c < 20; c++) {
    const val = getCellValue(sheet, 62, c); // Row 63 is index 62
    if (!val || val.trim() === 'Total' || val.trim() === 'AVG') break;
    monthsHeader4.push({ colIndex: c, monthName: val.trim() });
  }

  const section4Data = [];
  for (let r = 63; r < 120; r++) { // Rows start at Row 64 (index 63)
    const agentName = getCellValue(sheet, r, 0); // Col A (index 0)
    if (!agentName || agentName.trim() === 'Total' || agentName.trim().startsWith('Total')) break;

    const monthlyVolume = {};
    for (const m of monthsHeader4) {
      const val = getCellValue(sheet, r, m.colIndex) || 0;
      monthlyVolume[m.monthName] = parseFloat(val) || 0;
    }
    section4Data.push({ agentName: agentName.trim(), volumes: monthlyVolume });
  }

  // 7. Find or Create "Otros" profile for discrepancy reconciliation
  let desvinculadoProfile = profiles.find(p => p.email.toLowerCase() === 'sistema@remax-altitud.cr');
  if (!desvinculadoProfile) {
    console.log('Creating "Otros" profile...');
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        email: 'sistema@remax-altitud.cr',
        full_name: 'Otros',
        role: 'agent',
        status: 'active',
        commission_split: '45/55',
      })
      .select()
      .single();
    if (createError) {
      console.error('Failed to create Otros:', createError);
    } else {
      desvinculadoProfile = newProfile;
      profiles.push(desvinculadoProfile);
    }
  }

  const batchId = crypto.randomUUID();
  let officeImportedCount = 0;
  let agentImportedCount = 0;
  let skippedCount = 0;
  const errors = [];

  // --- Upsert Office Business Plans Actuals ---
  // Merge Section 1 (GCI) and Section 2 (Agent Count)
  const allYearsMonths = {};
  for (const item of officeCommissions) {
    const key = `${item.year}-${String(item.month).padStart(2, '0')}`;
    allYearsMonths[key] = { year: item.year, month: item.month, gci: item.gci, count: 0, volume: 0 };
  }
  for (const item of officeAgentCounts) {
    const key = `${item.year}-${String(item.month).padStart(2, '0')}`;
    if (!allYearsMonths[key]) {
      allYearsMonths[key] = { year: item.year, month: item.month, gci: 0, count: item.count, volume: 0 };
    } else {
      allYearsMonths[key].count = item.count;
    }
  }

  // Calculate aggregated volumes per month from Section 4 to save under actual_volume
  for (const m of monthsHeader4) {
    const monthNum = getMonthNumber(m.monthName);
    if (!monthNum) continue;
    const key = `${section4Year}-${String(monthNum).padStart(2, '0')}`;
    let totalVolume = 0;
    for (const agent of section4Data) {
      totalVolume += agent.volumes[m.monthName] || 0;
    }
    if (allYearsMonths[key]) {
      allYearsMonths[key].volume = totalVolume;
    }
  }

  console.log(`Beginning office business plans actuals upsert for ${Object.keys(allYearsMonths).length} periods...`);
  for (const [key, item] of Object.entries(allYearsMonths)) {
    const closingDateStr = `${key}-01`;
    try {
      const { data: existing } = await supabase
        .from('office_business_plans')
        .select('id')
        .eq('office', 'altitud')
        .eq('month', closingDateStr)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('office_business_plans')
          .update({
            actual_revenue: item.gci,
            actual_team_size: item.count,
            actual_volume: item.volume,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
        console.log(`  Updated ${key}: GCI = ${item.gci}, Agents = ${item.count}, Volume = ${item.volume}`);
      } else {
        const { error: insertError } = await supabase
          .from('office_business_plans')
          .insert({
            office: 'altitud',
            month: closingDateStr,
            actual_revenue: item.gci,
            actual_team_size: item.count,
            actual_volume: item.volume,
          });
        if (insertError) throw insertError;
        console.log(`  Inserted ${key}: GCI = ${item.gci}, Agents = ${item.count}, Volume = ${item.volume}`);
      }
      officeImportedCount++;
    } catch (err) {
      console.error(`  Failed to upsert office plan actuals for ${key}:`, err.message);
      errors.push({
        row: 'office_business_plan',
        period: key,
        error: `Failed to upsert office plan actuals: ${err.message}`
      });
    }
  }

  // --- Upsert Individual Agent Commissions and Reconcile Discrepancies ---
  const monthGciSums = {};
  const monthVolumeSums = {};

  console.log(`Beginning agent commissions upsert for ${monthsHeader3.length} months in ${section3Year}...`);
  for (const m of monthsHeader3) {
    const monthNum = getMonthNumber(m.monthName);
    if (!monthNum) continue;
    monthGciSums[monthNum] = 0;
    monthVolumeSums[monthNum] = 0;

    const closingDate = `${section3Year}-${String(monthNum).padStart(2, '0')}-28`;

    // Process each agent
    for (const item of section3Data) {
      const agentName = item.agentName;
      const gci = item.commissions[m.monthName] || 0;

      // Find corresponding volume
      const matchedVolumeAgent = section4Data.find(v => cleanName(v.agentName) === cleanName(agentName));
      const volume = matchedVolumeAgent ? (matchedVolumeAgent.volumes[m.monthName] || 0) : 0;

      monthGciSums[monthNum] += gci;
      monthVolumeSums[monthNum] += volume;

      // Find matched profile
      const agentProfile = findBestAgentMatch(agentName, profiles);
      if (!agentProfile) {
        console.warn(`  [Warning] No active profile match for Excel agent "${agentName}" on ${m.monthName}`);
        errors.push({
          row: `Section 3 Agent: "${agentName}"`,
          month: m.monthName,
          error: `No matching active agent profile found in database for: "${agentName}"`
        });
        skippedCount++;
        continue;
      }

      try {
        // Delete existing general commission for this agent on this month
        await supabase
          .from('agent_commissions')
          .delete()
          .eq('agent_id', agentProfile.id)
          .eq('closing_date', closingDate)
          .is('property_id', null);

        // Only insert if GCI or Volume > 0
        if (gci > 0 || volume > 0) {
          const splitPct = parseAgentSplitPct(agentProfile.commission_split || '45/55');
          const rccaPct = 6;
          const rccaAmount = gci * (rccaPct / 100);
          const isStarter = splitPct <= 0.45;

          let agentAmount, officeAmount;
          if (isStarter) {
            agentAmount = gci * splitPct;
            officeAmount = gci - agentAmount - rccaAmount;
          } else {
            const afterRcca = gci - rccaAmount;
            agentAmount = afterRcca * splitPct;
            officeAmount = afterRcca - agentAmount;
          }

          const { error: insertError } = await supabase
            .from('agent_commissions')
            .insert({
              property_id: null,
              agent_id: agentProfile.id,
              sale_price: volume, 
              total_commission_pct: volume > 0 ? (gci / volume) * 100 : 0,
              gross_commission: gci,
              side: 'both',
              side_pct: 100,
              side_amount: gci,
              rcca_fee_pct: rccaPct,
              rcca_fee_amount: rccaAmount,
              after_rcca: isStarter ? gci : (gci - rccaAmount),
              agent_split_pct: splitPct * 100,
              agent_amount: agentAmount,
              office_amount: officeAmount,
              closing_date: closingDate,
              status: 'paid',
            });

          if (insertError) throw insertError;
          agentImportedCount++;
        }
      } catch (monthErr) {
        console.error(`  Failed to insert agent commission for ${agentName} on ${m.monthName}:`, monthErr.message);
        errors.push({
          row: `Agent: "${agentName}"`,
          month: m.monthName,
          error: `Failed to insert agent commission: ${monthErr.message}`
        });
      }
    }

    // Reconcile GCI discrepancy per month under "Otros"
    const officeKey = `${section3Year}-${String(monthNum).padStart(2, '0')}`;
    const officeTotalGci = allYearsMonths[officeKey]?.gci || 0;
    const agentsGciSum = monthGciSums[monthNum] || 0;
    const gciDiscrepancy = officeTotalGci - agentsGciSum;

    if (desvinculadoProfile) {
      try {
        await supabase
          .from('agent_commissions')
          .delete()
          .eq('agent_id', desvinculadoProfile.id)
          .eq('closing_date', closingDate)
          .is('property_id', null);

        if (gciDiscrepancy > 0.01) {
          console.log(`  Discrepancy resolved for ${closingDate}: GCI ${gciDiscrepancy}`);
          const splitPct = 0.45;
          const rccaPct = 6;
          const rccaAmount = gciDiscrepancy * (rccaPct / 100);
          const agentAmount = gciDiscrepancy * splitPct;
          const officeAmount = gciDiscrepancy - agentAmount - rccaAmount;

          const { error: discrepancyInsertError } = await supabase
            .from('agent_commissions')
            .insert({
              property_id: null,
              agent_id: desvinculadoProfile.id,
              sale_price: 0,
              total_commission_pct: 0,
              gross_commission: gciDiscrepancy,
              side: 'both',
              side_pct: 100,
              side_amount: gciDiscrepancy,
              rcca_fee_pct: rccaPct,
              rcca_fee_amount: rccaAmount,
              after_rcca: gciDiscrepancy,
              agent_split_pct: splitPct * 100,
              agent_amount: agentAmount,
              office_amount: officeAmount,
              closing_date: closingDate,
              status: 'paid',
            });

          if (discrepancyInsertError) throw discrepancyInsertError;
          agentImportedCount++;
        }
      } catch (discrepancyErr) {
        console.error(`  Failed to insert discrepancy for ${closingDate}:`, discrepancyErr.message);
        errors.push({
          row: `Otros Reconciliation`,
          month: m.monthName,
          error: `Failed to insert discrepancy: ${discrepancyErr.message}`
        });
      }
    }
  }

  // Save batch import record in database
  console.log('Writing import history record to agent_history_imports...');
  const brokerId = '4377a061-39b3-446d-ac4f-6fea232b28d9';
  const { error: historyError } = await supabase.from('agent_history_imports').insert({
    id: batchId,
    agent_profile_id: brokerId,
    imported_by: 'System Direct Script',
    import_type: 'rcca_performance_dashboard',
    file_name: 'Performance Dashboard -ALTITUD.xlsx',
    total_rows: section3Data.length + Object.keys(allYearsMonths).length,
    imported_rows: agentImportedCount + officeImportedCount,
    skipped_rows: skippedCount,
    error_rows: errors.length,
    errors: errors,
  });

  if (historyError) {
    console.error('Failed to write history record:', historyError.message);
  }

  console.log('\n--- IMPORT COMPLETED ---');
  console.log(`Total office periods updated/created in DB: ${officeImportedCount}`);
  console.log(`Total agent commission records updated/created in DB: ${agentImportedCount}`);
  console.log(`Skipped rows: ${skippedCount}`);
  console.log(`Total errors encountered: ${errors.length}`);
}

main().catch(err => {
  console.error('Unhandled fatal error in import script:', err);
});
