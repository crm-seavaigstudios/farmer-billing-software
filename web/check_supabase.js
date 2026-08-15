const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phdkynxbdhmrdwhznuec.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZGt5bnhiZGhtcmR3aHpudWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjY5NzAsImV4cCI6MjEwMTU0Mjk3MH0.zfJ95WjnFPkeOY50O0xhRDwUcoXAaD1C4eDa13A6QAQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  console.log('Introspecting Supabase column names via RPC or sample query...');
  
  const tables = ['Farmer', 'Purchase', 'Payment', 'Sale', 'Trader', 'TraderPurchase', 'Tenant', 'FarmerMaterialPurchase', 'DailyCropRate'];
  for (const t of tables) {
    try {
      // Query 1 row to inspect columns in the object keys
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.log(`Table "${t}": Error (${error.message})`);
      } else {
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        console.log(`Table "${t}": Columns -> ${columns.length > 0 ? columns.join(', ') : 'No rows to inspect columns'}`);
      }
    } catch (err) {
      console.log(`Table "${t}": Catch Error (${err.message})`);
    }
  }
}

checkColumns();
