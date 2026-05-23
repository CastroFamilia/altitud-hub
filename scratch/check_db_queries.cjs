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

async function test() {
  try {
    console.log('Fetching agent_commissions...');
    const { data: comms, error: commsError } = await supabase
      .from('agent_commissions')
      .select('*, properties(name, listing_title_es, unparsed_address), profiles!agent_commissions_agent_id_fkey(full_name, avatar_url, commission_tier_id)')
      .order('closing_date', { ascending: false });
    
    if (commsError) {
      console.error('Error fetching agent_commissions:', commsError);
    } else {
      console.log('Commissions count:', comms?.length);
    }

    console.log('Fetching commission_tiers...');
    const { data: tiers, error: tiersError } = await supabase
      .from('commission_tiers')
      .select('*')
      .eq('active', true)
      .order('sort_order');

    if (tiersError) {
      console.error('Error fetching commission_tiers:', tiersError);
    } else {
      console.log('Tiers count:', tiers?.length);
      console.log('Tiers data:', tiers);
    }
  } catch (err) {
    console.error('Unhandled error:', err);
  }
}

test();
