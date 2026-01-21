#!/usr/bin/env node

/**
 * Script to apply the order number workspace scope migration
 * This fixes the duplicate order number issue across workspaces
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    console.log('🔄 Applying order number workspace scope migration...\n');

    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260119_fix_order_number_workspace_scope.sql');

    if (!fs.existsSync(migrationPath)) {
        console.error('❌ Migration file not found:', migrationPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Migration SQL:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log('');

    try {
        // Execute the migration SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
            // If exec_sql doesn't exist, try direct execution
            // We'll need to split and execute each statement
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            for (const statement of statements) {
                if (statement.toLowerCase().includes('drop function')) {
                    console.log('🗑️  Dropping old function...');
                    await supabase.rpc('generate_order_number').catch(() => {
                        // Function might not exist with new signature, that's ok
                    });
                }
            }

            // Execute the full SQL
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({ query: sql })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            return await response.json();
        });

        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }

        console.log('✅ Migration applied successfully!');
        console.log('');
        console.log('📊 Changes:');
        console.log('  • Updated generate_order_number() function to accept workspace_id');
        console.log('  • Order numbers are now scoped per workspace');
        console.log('  • Each workspace has independent daily counter');
        console.log('');
        console.log('🎉 You can now create orders in different workspaces without conflicts!');

    } catch (err) {
        console.error('❌ Error applying migration:', err.message);
        console.log('');
        console.log('📌 Manual Application Required:');
        console.log('Please apply this migration manually in the Supabase SQL Editor:');
        console.log(`   ${supabaseUrl.replace('https://', 'https://app.')}/project/_/sql`);
        console.log('');
        console.log('Copy and paste the SQL from:');
        console.log(`   ${migrationPath}`);
        process.exit(1);
    }
}

applyMigration();
