const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('📖 Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260125_fix_permissions_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Attempting to apply migration via RPC...');
    
    // Since Supabase doesn't have a built-in exec_sql RPC by default,
    // we need to tell the user to apply it manually
    console.log('\n⚠️  Please apply the migration manually in Supabase SQL Editor:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Click on "SQL Editor"');
    console.log('3. Copy and paste the following SQL:');
    console.log('═'.repeat(80));
    console.log(sql);
    console.log('═'.repeat(80));
    console.log('4. Click "Run"');
    console.log('\n5. After running, test the function with:');
    console.log(`
SELECT get_user_permissions(
  '61f69eb5-091e-4915-9124-debc5e92d929'::uuid,
  '0304a3b2-cb26-4b94-b065-22fdc129cce0'::uuid
);
    `);
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration();
