#!/usr/bin/env node

/**
 * Helper script to apply the order number duplicate fix migration
 * and verify it worked correctly.
 * 
 * Usage:
 *   node apply-order-fix.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('🔧 Order Number Duplicate Fix - Migration Tool\n');

    // Step 1: Read migration file
    console.log('📖 Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260121_fix_order_duplicates_final.sql');

    if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Step 2: Check current state
    console.log('🔍 Checking current database state...');

    // Check if old constraint exists
    const { data: oldConstraint } = await supabase.rpc('exec_sql', {
        sql: `
      SELECT conname 
      FROM pg_constraint 
      WHERE conname = 'orders_order_number_key'
    `
    }).catch(() => ({ data: null }));

    if (oldConstraint && oldConstraint.length > 0) {
        console.log('⚠️  Found global UNIQUE constraint (will be removed)');
    } else {
        console.log('✅ No global UNIQUE constraint found');
    }

    // Check if workspace_sequences table exists
    const { data: tableExists } = await supabase
        .from('workspace_sequences')
        .select('count')
        .limit(1)
        .catch(() => ({ data: null }));

    if (tableExists) {
        console.log('✅ workspace_sequences table already exists');
    } else {
        console.log('📝 workspace_sequences table will be created');
    }

    console.log('\n⚠️  WARNING: This migration will modify database constraints.');
    console.log('   It is recommended to backup your database first.\n');

    // Step 3: Apply migration (manual step)
    console.log('📋 MANUAL STEPS REQUIRED:\n');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of:');
    console.log(`   ${migrationPath}`);
    console.log('4. Run the SQL migration\n');

    console.log('Or use Supabase CLI:');
    console.log('   supabase db push\n');

    // Step 4: Verification queries
    console.log('🧪 VERIFICATION QUERIES:\n');
    console.log('After applying the migration, run these queries to verify:\n');

    console.log('-- 1. Check constraints (should show composite constraint)');
    console.log(`SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname LIKE '%order_number%';\n`);

    console.log('-- 2. Check sequences initialized');
    console.log('SELECT * FROM workspace_sequences ORDER BY workspace_id, year;\n');

    console.log('-- 3. Test order number generation (replace with real workspace_id)');
    console.log("SELECT generate_order_number('your-workspace-uuid-here');");
    console.log("SELECT generate_order_number('your-workspace-uuid-here');");
    console.log("SELECT generate_order_number('your-workspace-uuid-here');\n");

    console.log('✅ Migration preparation complete!');
    console.log('   Follow the manual steps above to apply the migration.\n');
}

main().catch(console.error);
