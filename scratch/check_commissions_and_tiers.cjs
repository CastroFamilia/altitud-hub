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

const { getAgentCommissions, getCommissionTiers } = require('../src/lib/dal/office');

// Mock getClient in dal/office if needed, but it should work if we pass supabase
async function test() {
  try {
    console.log('Testing getAgentCommissions...');
    const comms = await getAgentCommissions(supabase);
    console.log('Commissions count:', comms?.length);

    console.log('Testing getCommissionTiers...');
    const tiers = await getCommissionTiers(supabase);
    console.log('Tiers count:', tiers?.length);
    console.log('Tiers:', tiers);
  } catch (err) {
    console.error('Error occurred:', err);
  }
}

test();
