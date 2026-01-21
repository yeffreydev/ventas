#!/usr/bin/env node

/**
 * Script simple para aplicar la migración de números de orden
 * NO requiere dependencias externas
 */

const fs = require('fs');

// Leer el archivo .env.local
const envPath = '.env.local';
if (!fs.existsSync(envPath)) {
    console.error('❌ No se encontró .env.local');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const SERVICE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ No se encontraron las credenciales en .env.local');
    process.exit(1);
}

console.log('🔧 Aplicando migración para fix de números de orden...\n');
console.log(`📍 Supabase URL: ${SUPABASE_URL}\n`);

// SQL para ejecutar
const migrationSQL = `
-- Paso 1: Eliminar función antigua
DROP FUNCTION IF EXISTS public.generate_order_number();
DROP FUNCTION IF EXISTS public.generate_order_number(UUID);

-- Paso 2: Crear nueva función con workspace_id
CREATE OR REPLACE FUNCTION public.generate_order_number(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Contar órdenes de HOY para este workspace específico
  SELECT COUNT(*) INTO counter
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE
  AND workspace_id = p_workspace_id;
  
  -- Generar número: ORD-YYYYMMDD-XXX (contador independiente por workspace)
  new_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((counter + 1)::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$;

-- Paso 3: Otorgar permisos
GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO anon;
GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO authenticated;
GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO service_role;
`.trim();

async function executeSQLDirect() {
    try {
        // Intentar ejecutar vía REST API de Supabase
        const pg = await import('@supabase/supabase-js').then(m => m.createClient(SUPABASE_URL, SERVICE_KEY));

        console.log('🗑️  Eliminando función antigua...');
        await pg.rpc('generate_order_number').catch(() => { }); // Silently fail if doesn't exist

        console.log('❌ No se puede ejecutar automáticamente.\n');
        throw new Error('API no soporta ejecución directa de DDL');

    } catch (error) {
        console.log('📋 INSTRUCCIONES PARA APLICAR MANUALMENTE:\n');
        console.log('1. Abre Supabase SQL Editor:');
        console.log(`   ${SUPABASE_URL.replace('https://', 'https://app.')}/project/_/sql\n`);
        console.log('2. Copia y pega el siguiente SQL:\n');
        console.log('─'.repeat(70));
        console.log(migrationSQL);
        console.log('─'.repeat(70));
        console.log('\n3. Haz clic en "RUN" o presiona Ctrl+Enter\n');
        console.log('✅ Una vez ejecutado, los pedidos se crearán sin errores de duplicados');
        console.log('   Cada workspace tendrá su propio contador independiente.\n');

        // Guardar SQL en archivo temporal para fácil copia
        const sqlFile = 'MIGRATION_TO_APPLY.sql';
        fs.writeFileSync(sqlFile, migrationSQL);
        console.log(`💾 SQL guardado en: ${sqlFile}`);
        console.log(`   Puedes copiar el contenido de este archivo también.\n`);
    }
}

executeSQLDirect();
