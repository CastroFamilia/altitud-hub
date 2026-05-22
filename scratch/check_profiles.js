import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
const serviceRoleKey = keyMatch[1].trim().replace(/['"]/g, '');

async function check() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,full_name,email,role,status,remax_agent_id`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });
    if (!res.ok) {
      console.error('Fetch error:', await res.text());
      return;
    }
    const data = await res.json();
    console.log('Registered Profiles:');
    console.table(data);
  } catch (err) {
    console.error('Error running script:', err);
  }
}

check();
