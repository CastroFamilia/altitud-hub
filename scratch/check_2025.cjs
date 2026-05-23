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

async function check() {
  const { data, error } = await supabase
    .from('office_business_plans')
    .select('*')
    .eq('office', 'altitud')
    .gte('month', '2025-01-01')
    .lte('month', '2025-12-31')
    .order('month', { ascending: true });

  if (error) {
    console.error('Error fetching office business plans:', error);
    return;
  }

  console.log('--- 2025 Office Business Plans (office_business_plans) ---');
  data.forEach(p => {
    console.log(`Month: ${p.month}, Revenue Goal: ${p.revenue_goal}, Actual Revenue (GCI): ${p.actual_revenue}, Team Size: ${p.actual_team_size}, Volume: ${p.actual_volume}`);
  });

  const { data: comms, error: commsError } = await supabase
    .from('agent_commissions')
    .select('id, gross_commission, closing_date, agent_id')
    .gte('closing_date', '2025-01-01')
    .lte('closing_date', '2025-12-31');

  if (commsError) {
    console.error('Error fetching agent commissions:', commsError);
    return;
  }

  console.log('\n--- 2025 Agent Commissions (agent_commissions) ---');
  console.log(`Total records: ${comms.length}`);
  if (comms.length > 0) {
    comms.forEach(c => {
      console.log(`ID: ${c.id}, Closing Date: ${c.closing_date}, Gross Commission: ${c.gross_commission}, Agent ID: ${c.agent_id}`);
    });
  }
}

check();
