const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oprrfbsrihkjtiafyuxn.supabase.co',
  'sb_publishable_vcgGRA09bHX1suZrkqYcAg_hpumhYHl'
);

async function test() {
  const { data, error } = await supabase.from('contacts').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
