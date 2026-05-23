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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('office_business_plans')
    .select('*')
    .order('month', { ascending: true });
  
  if (error) {
    console.error('Error querying office_business_plans:', error);
  } else {
    console.log('Successfully queried table! Total rows:', data.length);
    console.log('Rows:', JSON.stringify(data, null, 2));
  }
}

run();
