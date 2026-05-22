import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
const serviceRoleKey = keyMatch[1].trim().replace(/['"]/g, '');

const HEADERS = {
  'apikey': serviceRoleKey,
  'Authorization': `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Synthetic emails that we want to completely delete
const SYNTHETIC_EMAILS_TO_DELETE = [
  'omar.gonzalez@remax-altitud.cr',
  'gerardo.gonzalez@remax-altitud.cr',
  'natalia.leon@remax-altitud.cr',
  'gustavo.valverde@remax-altitud.cr',
  'krisley.pereira@remax-altitud.cr',
  'yeudi.cisneros@remax-altitud.cr',
  'mauricio.espinoza@remax-altitud.cr',
  'tatiana.estrada@remax-altitud.cr',
  'carlos.mora@remax-altitud.cr'
];

// Target list of correct agents with real emails and IDs
const TARGET_AGENTS = [
  { full_name: 'Omar Gonzalez', email: 'omar@remax-altitud.cr', remax_agent_id: 3828, office: 'altitud' },
  { full_name: 'Gerardo Gonzalez', email: 'gerardo@remax-altitud.cr', remax_agent_id: 3830, office: 'altitud' },
  { full_name: 'Natalia Leon', email: 'natalialeon@remax-altitud.cr', remax_agent_id: 3832, office: 'altitud' },
  { full_name: 'Gustavo Valverde', email: 'gustavo@remax-altitud.cr', remax_agent_id: 3886, office: 'altitud' },
  { full_name: 'Krisley Pereira', email: 'kris@remax-altitud.cr', remax_agent_id: 4014, office: 'altitud' },
  { full_name: 'Yeudi Cisneros', email: 'yeudi@remax-altitud.cr', remax_agent_id: 4275, office: 'altitud' },
  { full_name: 'Mauricio Espinoza', email: 'mauef@remax-altitud.cr', remax_agent_id: 4396, office: 'altitud' },
  { full_name: 'Tatiana Estrada', email: 'tatianaestrada@remax-altitud.cr', remax_agent_id: 4397, office: 'altitud' },
  { full_name: 'Klary Perez', email: 'klary@remax-altitud.cr', remax_agent_id: 4409, office: 'altitud' },
  { full_name: 'Ismara Ubeda', email: 'ismara@remax-altitud.cr', remax_agent_id: 4553, office: 'altitud' },
  { full_name: 'Debra West', email: 'deb@remax-altitud.cr', remax_agent_id: 173, office: 'cero' },
  { full_name: 'David West', email: 'dave@remax-altitud.cr', remax_agent_id: 174, office: 'cero' },
  { full_name: 'Carlos Mora', email: 'carlos@remax-altitud.cr', remax_agent_id: 4398, office: 'cero' },
  { full_name: 'Ralff Abarca', email: 'ralff@remax-altitud.cr', remax_agent_id: 4502, office: 'cero' },
  { full_name: 'Kevin Alvarez', email: 'kevin@remax-altitud.cr', remax_agent_id: 4549, office: 'cero' },
  { full_name: 'Andrey Perez', email: 'andrey@remax-altitud.cr', remax_agent_id: 4550, office: 'cero' },
  { full_name: 'Josue Alvarado', email: 'josue@remax-altitud.cr', remax_agent_id: 4555, office: 'cero' }
];

async function runCleanup() {
  try {
    console.log("Starting agent profile cleanup and alignment...");

    // 1. Delete incorrect synthetic profiles
    for (const email of SYNTHETIC_EMAILS_TO_DELETE) {
      console.log(`Deleting synthetic incorrect profile: ${email}`);
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: HEADERS
      });
      if (!res.ok) {
        console.error(`Failed to delete profile ${email}:`, await res.text());
      } else {
        console.log(`Successfully deleted profile ${email}`);
      }
    }

    // 2. Query all remaining profiles to build an existing map
    const resAll = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, {
      method: 'GET',
      headers: HEADERS
    });
    if (!resAll.ok) {
      throw new Error(`Failed to query remaining profiles: ${await resAll.text()}`);
    }
    const currentProfiles = await resAll.json();
    const currentByEmail = {};
    for (const p of currentProfiles) {
      currentByEmail[p.email.toLowerCase()] = p;
    }

    // 3. Process the target list of correct agents
    for (const target of TARGET_AGENTS) {
      const emailLower = target.email.toLowerCase();
      const existing = currentByEmail[emailLower];

      if (existing) {
        // If it exists, update it to draft and make sure properties align,
        // unless it's a broker (we don't change broker roles/statuses)
        if (existing.role === 'broker') {
          console.log(`Skipping status change for Broker: ${existing.full_name} (${existing.email})`);
          continue;
        }

        console.log(`Updating existing profile: ${target.full_name} (${target.email}) to status=draft`);
        const updateRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${existing.id}`, {
          method: 'PATCH',
          headers: HEADERS,
          body: JSON.stringify({
            status: 'draft',
            remax_agent_id: target.remax_agent_id,
            office: target.office,
            full_name: target.full_name
          })
        });
        if (!updateRes.ok) {
          console.error(`Failed to update ${target.email}:`, await updateRes.text());
        }
      } else {
        // If it doesn't exist, create it as a clean draft profile
        console.log(`Creating clean draft profile: ${target.full_name} (${target.email})`);
        const insertRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            email: emailLower,
            full_name: target.full_name,
            remax_agent_id: target.remax_agent_id,
            office: target.office,
            role: 'agent',
            status: 'draft',
            invited_at: null
          })
        });
        if (!insertRes.ok) {
          console.error(`Failed to insert ${target.email}:`, await insertRes.text());
        }
      }
    }

    console.log("Cleanup and alignment completed successfully!");
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}

runCleanup();
