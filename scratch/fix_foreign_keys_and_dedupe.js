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

async function fixDedupe() {
  try {
    console.log("Deduplicating and fixing foreign keys for Gustavo and Yeudi...");

    // Get all profiles to find IDs
    const resAll = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, {
      method: 'GET',
      headers: HEADERS
    });
    const profiles = await resAll.json();
    
    const pGustavoOld = profiles.find(p => p.email === 'gustavo.valverde@remax-altitud.cr');
    const pGustavoNew = profiles.find(p => p.email === 'gustavo@remax-altitud.cr');
    const pYeudiOld = profiles.find(p => p.email === 'yeudi.cisneros@remax-altitud.cr');
    const pYeudiNew = profiles.find(p => p.email === 'yeudi@remax-altitud.cr');

    // Transfer Gustavo
    if (pGustavoOld && pGustavoNew) {
      console.log(`Gustavo Old ID: ${pGustavoOld.id}, New ID: ${pGustavoNew.id}`);
      
      // Update references in agent_history_imports
      const resUpdate = await fetch(`${supabaseUrl}/rest/v1/agent_history_imports?agent_profile_id=eq.${pGustavoOld.id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({
          agent_profile_id: pGustavoNew.id
        })
      });
      if (resUpdate.ok) {
        console.log("Successfully transferred Gustavo's import history references!");
        
        // Now delete the old profile
        const deleteRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${pGustavoOld.id}`, {
          method: 'DELETE',
          headers: HEADERS
        });
        if (deleteRes.ok) {
          console.log("Successfully deleted old synthetic profile for Gustavo!");
        } else {
          console.error("Failed to delete old Gustavo profile:", await deleteRes.text());
        }
      } else {
        console.error("Failed to transfer Gustavo's references:", await resUpdate.text());
      }
    }

    // Transfer Yeudi
    if (pYeudiOld && pYeudiNew) {
      console.log(`Yeudi Old ID: ${pYeudiOld.id}, New ID: ${pYeudiNew.id}`);
      
      // Update references in agent_history_imports
      const resUpdate = await fetch(`${supabaseUrl}/rest/v1/agent_history_imports?agent_profile_id=eq.${pYeudiOld.id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({
          agent_profile_id: pYeudiNew.id
        })
      });
      if (resUpdate.ok) {
        console.log("Successfully transferred Yeudi's import history references!");
        
        // Now delete the old profile
        const deleteRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${pYeudiOld.id}`, {
          method: 'DELETE',
          headers: HEADERS
        });
        if (deleteRes.ok) {
          console.log("Successfully deleted old synthetic profile for Yeudi!");
        } else {
          console.error("Failed to delete old Yeudi profile:", await deleteRes.text());
        }
      } else {
        console.error("Failed to transfer Yeudi's references:", await resUpdate.text());
      }
    }

    console.log("Deduplication and foreign key fixes completed!");
  } catch (err) {
    console.error("Deduplication error:", err);
  }
}

fixDedupe();
