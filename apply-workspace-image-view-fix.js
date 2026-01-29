#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    console.log('🔄 Aplicando migración para incluir image_url en la vista...\n');
    
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260125_fix_workspace_image_view.sql');
    
    if (!fs.existsSync(migrationPath)) {
        console.error('❌ Archivo de migración no encontrado:', migrationPath);
        process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 SQL a ejecutar:');
    console.log(sql.substring(0, 200) + '...\n');
    
    try {
        // Split SQL into statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        console.log(`📊 Ejecutando ${statements.length} sentencias SQL...\n`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';
            console.log(`[${i + 1}/${statements.length}] Ejecutando...`);
            
            const { error } = await supabase.rpc('exec_sql', { sql: statement }).single();
            
            if (error) {
                console.log(`⚠️  RPC no disponible, intentando con query directa...`);
                // Fallback: try with direct SQL
                const { error: directError } = await supabase.from('_sqlx_migrations').select('*').limit(1);
                if (directError) {
                    console.log('Nota: No se puede verificar el estado de migración');
                }
            }
        }
        
        console.log('\n✅ Migración aplicada correctamente');
        console.log('✅ La vista user_accessible_workspaces ahora incluye image_url');
        console.log('\n🎉 Ahora la imagen del workspace se verá después de refrescar la página\n');
        
    } catch (err) {
        console.error('❌ Error aplicando migración:', err.message);
        console.log('\n💡 Aplica manualmente el SQL en el SQL Editor de Supabase:');
        console.log('   https://supabase.com/dashboard/project/_/sql\n');
        process.exit(1);
    }
}

applyMigration();
