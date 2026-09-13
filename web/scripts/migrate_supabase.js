/**
 * Automated Supabase-to-Supabase Data Migration Tool
 * Safely copies tables and rows from Old Supabase Project -> New Supabase Project
 */

const { createClient } = require('@supabase/supabase-js');

// 1. CONFIGURE OLD & NEW PROJECT CREDENTIALS
const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL || 'https://phdkynxbdhmrdwhznuec.supabase.co';
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZGt5bnhiZGhtcmR3aHpudWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjY5NzAsImV4cCI6MjEwMTU0Mjk3MH0.zfJ95WjnFPkeOY50O0xhRDwUcoXAaD1C4eDa13A6QAQ';

// Enter your NEW project credentials here or pass via environment variables:
const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL || '';
const NEW_SUPABASE_KEY = process.env.NEW_SUPABASE_KEY || '';

if (!NEW_SUPABASE_URL || !NEW_SUPABASE_KEY) {
  console.log('----------------------------------------------------------------------');
  console.log('⚠️  Please supply NEW_SUPABASE_URL and NEW_SUPABASE_KEY before running!');
  console.log('Example:');
  console.log('  $env:NEW_SUPABASE_URL="https://yournewproject.supabase.co"');
  console.log('  $env:NEW_SUPABASE_KEY="your-new-anon-key"');
  console.log('  node scripts/migrate_supabase.js');
  console.log('----------------------------------------------------------------------');
  process.exit(1);
}

const oldClient = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);
const newClient = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

const TABLES = [
  'Tenant',
  'Farmer',
  'Trader',
  'Customer',
  'DailyWorker',
  'MaterialItem',
  'Location',
  'Crop',
  'DailyCropRate',
  'SellerCropRates',
  'Purchase',
  'PurchaseItem',
  'Sale',
  'Payment',
  'Expense',
  'FarmerMaterialPurchase',
  'TraderPurchase',
  'AuditLog',
  'User'
];

async function migrate() {
  console.log('🚀 Starting Data Migration to New Supabase Project...\n');

  for (const table of TABLES) {
    try {
      console.log(`⏳ Reading data from [${table}]...`);
      const { data, error: readError } = await oldClient.from(table).select('*');
      
      if (readError) {
        console.log(`   ⚠️ Could not read ${table}: ${readError.message}`);
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`   ℹ️ [${table}] is empty (0 rows to copy)`);
        continue;
      }

      console.log(`   📦 Found ${data.length} row(s) in [${table}]. Inserting into new DB...`);
      const { error: insertError } = await newClient.from(table).upsert(data, { onConflict: 'id' });

      if (insertError) {
        console.log(`   ❌ Error inserting into new [${table}]: ${insertError.message}`);
      } else {
        console.log(`   ✅ Successfully copied ${data.length} row(s) to new [${table}]!`);
      }
    } catch (err) {
      console.log(`   ❌ Exception migrating [${table}]: ${err.message}`);
    }
  }

  console.log('\n🎉 Migration complete!');
}

migrate();
