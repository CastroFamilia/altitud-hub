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

async function inspect() {
  console.log('Fetching commissions for 2026...');
  const { data: commissions, error } = await supabase
    .from('agent_commissions')
    .select('*, profiles!agent_commissions_agent_id_fkey(full_name)')
    .gte('closing_date', '2026-01-01')
    .lte('closing_date', '2026-12-31');

  if (error) {
    console.error('Error fetching commissions:', error);
    return;
  }

  const map = {};
  commissions.forEach(c => {
    const agentId = c.agent_id;
    const name = c.profiles?.full_name || 'Desconocido';
    if (!map[agentId]) {
      map[agentId] = {
        name,
        closings: 0,
        gross_commission: 0,
        side_amount: 0,
        agent_amount: 0,
        office_amount: 0,
      };
    }
    map[agentId].closings += 1;
    map[agentId].gross_commission += Number(c.gross_commission) || 0;
    map[agentId].side_amount += Number(c.side_amount) || 0;
    map[agentId].agent_amount += Number(c.agent_amount) || 0;
    map[agentId].office_amount += Number(c.office_amount) || 0;
  });

  console.log('\n--- AGENT RANKING SUMMARY FOR 2026 ---');
  Object.values(map)
    .sort((a, b) => b.gross_commission - a.gross_commission)
    .forEach((a, i) => {
      console.log(`${i+1}. ${a.name}`);
      console.log(`   Cierres:          ${a.closings}`);
      console.log(`   gross_commission: $${a.gross_commission.toLocaleString()}`);
      console.log(`   side_amount:      $${a.side_amount.toLocaleString()}`);
      console.log(`   agent_amount:     $${a.agent_amount.toLocaleString()}`);
      console.log(`   office_amount:    $${a.office_amount.toLocaleString()}`);
      console.log('------------------------------------');
    });
}

inspect();
