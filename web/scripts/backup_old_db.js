const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const OLD_SUPABASE_URL = 'https://phdkynxbdhmrdwhznuec.supabase.co';
const OLD_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZGt5bnhiZGhtcmR3aHpudWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjY5NzAsImV4cCI6MjEwMTU0Mjk3MH0.zfJ95WjnFPkeOY50O0xhRDwUcoXAaD1C4eDa13A6QAQ';

const supabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);

const tables = [
  'Tenant', 'Farmer', 'Trader', 'Customer', 'DailyWorker',
  'MaterialItem', 'Location', 'Crop', 'DailyCropRate', 'SellerCropRates',
  'Purchase', 'PurchaseItem', 'Sale', 'Payment', 'Expense',
  'FarmerMaterialPurchase', 'TraderPurchase', 'AuditLog', 'User'
];

async function dumpAll() {
  console.log('=== STARTING FULL BACKUP FROM OLD DATABASE ===');
  const backup = {};
  let totalRowsCount = 0;

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*');
      if (error) {
        console.log(`[${t}] Warning: ${error.message}`);
        backup[t] = [];
      } else {
        const rows = data || [];
        backup[t] = rows;
        totalRowsCount += rows.length;
        console.log(`[${t}] ✓ Extracted ${rows.length} row(s)`);
      }
    } catch (e) {
      console.log(`[${t}] Error: ${e.message}`);
      backup[t] = [];
    }
  }

  const outPath = path.join(__dirname, '..', 'backup_old_db.json');
  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`\n=== BACKUP COMPLETE: ${totalRowsCount} total rows saved to backup_old_db.json ===`);
}

dumpAll();
