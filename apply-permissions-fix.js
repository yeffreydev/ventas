#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    console.log('🔄 Aplicando migración del sistema de permisos...\n');
    
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260125_fix_permissions_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
        console.error('❌ Archivo de migración no encontrado:', migrationPath);
        process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Ejecutando migración...\n');
    
    try {
        // Execute the SQL directly
        // Supabase doesn't have a direct SQL execution endpoint, so we need to use the SQL editor
        // For now, let's just print instructions
        
        console.log('✅ Por favor ejecuta el siguiente SQL en el SQL Editor de Supabase:\n');
        console.log('=' .repeat(80));
        console.log(sql);
        console.log('=' .repeat(80));
        console.log('\n📍 SQL Editor: https://supabase.com/dashboard/project/_/sql\n');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

applyMigration();
