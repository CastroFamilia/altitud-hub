import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role to bypass RLS for test
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing inserting draft profile...');
  const testEmail = 'test_draft_agent@remax-altitud.cr';
  
  // Clean up any old test
  await supabase.from('profiles').delete().eq('email', testEmail);

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      email: testEmail,
      full_name: 'Test Draft Agent',
      role: 'agent',
      status: 'draft',
      office: 'altitud'
    })
    .select();

  if (error) {
    console.error('Error inserting draft profile:', error);
  } else {
    console.log('Success! Draft profile inserted:', data);
    
    // Clean up
    const { error: deleteError } = await supabase.from('profiles').delete().eq('email', testEmail);
    if (deleteError) {
      console.error('Error cleaning up:', deleteError);
    } else {
      console.log('Cleaned up test profile successfully.');
    }
  }
}

run();
