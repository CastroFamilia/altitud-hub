const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const processEnv = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const equalIdx = trimmed.indexOf('=');
  if (equalIdx === -1) return;
  const key = trimmed.substring(0, equalIdx).trim();
  const val = trimmed.substring(equalIdx + 1).trim();
  processEnv[key] = val;
});

const supabaseUrl = processEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = processEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars! Url:', supabaseUrl, 'Key set:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Attempting to insert test profile with status: draft');
  const testEmail = 'test_draft_success2@remax-altitud.cr';
  
  // Try inserting
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      email: testEmail,
      full_name: 'Test Draft Success 2',
      role: 'agent',
      status: 'draft',
      office: 'altitud'
    })
    .select();

  if (error) {
    console.error('Error inserting draft profile:', error);
  } else {
    console.log('Successfully inserted draft profile:', data);
    // Cleanup
    await supabase.from('profiles').delete().eq('email', testEmail);
    console.log('Cleaned up test profile.');
  }
}

check();
