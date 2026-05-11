const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
dotenv.split('\n').forEach(l => {
  if (l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

fetch(`${url}/rest/v1/profiles?select=id,email&limit=10`, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
}).then(r => r.json()).then(data => console.log(data));
