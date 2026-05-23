const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(supabaseUrl, supabaseKey);

const commissions2025 = [
  { month: 1, amount: 0 },
  { month: 2, amount: 0 },
  { month: 3, amount: 0 },
  { month: 4, amount: 0 },
  { month: 5, amount: 900.00 },
  { month: 6, amount: 0 },
  { month: 7, amount: 1320.00 },
  { month: 8, amount: 8737.50 },
  { month: 9, amount: 15500.00 },
  { month: 10, amount: 400.00 },
  { month: 11, amount: 21300.00 },
  { month: 12, amount: 153099.50 }
];

async function insert() {
  console.log('Retrieving "Otros" profile...');
  let { data: agentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, commission_split')
    .eq('email', 'sistema@remax-altitud.cr')
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    return;
  }

  if (!agentProfile) {
    console.log('Creating "Otros" profile as it does not exist...');
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        email: 'sistema@remax-altitud.cr',
        full_name: 'Otros',
        role: 'agent',
        status: 'active',
        commission_split: '45/55',
        office: 'altitud'
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create Otros:', createError);
      return;
    }
    agentProfile = newProfile;
  }

  // Ensure office is set to 'altitud'
  await supabase
    .from('profiles')
    .update({ office: 'altitud' })
    .eq('id', agentProfile.id);

  console.log(`Using Otros profile ID: ${agentProfile.id}`);

  let insertedCount = 0;

  for (const c of commissions2025) {
    const closingDate = `2025-${String(c.month).padStart(2, '0')}-28`;

    // Delete any existing records for this agent and month
    await supabase
      .from('agent_commissions')
      .delete()
      .eq('agent_id', agentProfile.id)
      .eq('closing_date', closingDate)
      .is('property_id', null);

    if (c.amount > 0) {
      const gci = c.amount;
      const splitPct = 0.45; // 45% agent split
      const rccaPct = 6;
      const rccaAmount = gci * (rccaPct / 100);
      const agentAmount = gci * splitPct;
      const officeAmount = gci - agentAmount - rccaAmount;

      const { data, error: insertError } = await supabase
        .from('agent_commissions')
        .insert({
          property_id: null,
          agent_id: agentProfile.id,
          sale_price: 0,
          total_commission_pct: 0,
          gross_commission: gci,
          side: 'both',
          side_pct: 100,
          side_amount: gci,
          rcca_fee_pct: rccaPct,
          rcca_fee_amount: rccaAmount,
          after_rcca: gci,
          agent_split_pct: splitPct * 100,
          agent_amount: agentAmount,
          office_amount: officeAmount,
          closing_date: closingDate,
          status: 'paid',
        });

      if (insertError) {
        console.error(`Failed to insert for ${closingDate}:`, insertError);
      } else {
        console.log(`Inserted commission for ${closingDate}: Gross GCI = ${gci}`);
        insertedCount++;
      }
    }
  }

  console.log(`Successfully upserted ${insertedCount} agent commission records for 2025!`);
}

insert();
