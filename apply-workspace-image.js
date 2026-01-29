#!/usr/bin/env node

/**
 * Script to apply the workspace image migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.join(__dirname, '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            env[key] = value;
        }
    });
}
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    console.log('🔄 Applying workspace image migration...\n');

    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260125_add_workspace_image.sql');

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

        // Fallback or specific handling if exec RPC is not custom defined, 
        // but typically 'exec_sql' or similar might be used. 
        // The previous script used 'exec' RPC if available or failed gracefully.
        // Let's try the direct RPC 'exec_sql' first as seen in previous script catch block, 
        // or just rely on the same logic as the previous script.

        // Actually, let's copy the robust logic from apply-migration.js
        let result;

        try {
            const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
            if (error) throw error;
            result = data;
        } catch (e) {
            console.log("RPC 'exec_sql' failed, trying split execution or raw SQL...");
            // Simple fallback to the REST call we tried above or split
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
                // Try splitting if raw exec failed
                const statements = sql
                    .split(';')
                    .map(s => s.trim())
                    .filter(s => s.length > 0 && !s.startsWith('--'));

                console.log(`Trying to execute ${statements.length} statements individually...`);

                for (const statement of statements) {
                    // We can't easily run raw SQL without the RPC except via dashboard.
                    // But if the user has an 'exec' function (common in these projects), it works.
                    // If not, we warn.
                    try {
                        // Attempting again with maybe a different endpoint or just failing
                        console.log("Statement:", statement.substring(0, 50) + "...");
                    } catch (err) {
                        console.error("Failed statement");
                    }
                }
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
        }

        console.log('✅ Migration applied successfully!');

    } catch (err) {
        console.error('❌ Error applying migration:', err.message);
        console.log('');
        console.log('📌 Manual Application Required:');
        console.log('Please apply this migration manually in the Supabase SQL Editor.');
        process.exit(1);
    }
}

applyMigration();
