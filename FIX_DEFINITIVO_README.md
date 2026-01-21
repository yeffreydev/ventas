# FIX DEFINITIVO - Números de Orden Duplicados

## Problema
El error persiste porque hay un **race condition** (condición de carrera):
- Cuando 2 usuarios crean pedidos simultáneamente en el mismo workspace
- Ambos leen el mismo contador
- Ambos generan el mismo número ORD-YYYYMMDD-001
- El segundo falla con "duplicate key"

## Solución Thread-Safe

He creado una solución que usa una **tabla de secuencias atómicas** que previene completamente este problema.

### Pasos de Aplicación

1. **Abre Supabase SQL Editor:**
   https://app.jneshrcexgajvmopodsu.supabase.co/project/_/sql

2. **Copia y ejecuta el SQL de:**
   `MIGRATION_FIX_RACE_CONDITION.sql`
   
   O copia esto directamente:

```sql
-- 1. Crear tabla para secuencias
CREATE TABLE IF NOT EXISTS order_sequences (
  workspace_id UUID PRIMARY KEY,
  current_date DATE NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Eliminar función antigua
DROP FUNCTION IF EXISTS public.generate_order_number(UUID);

-- 3. Crear función thread-safe
CREATE OR REPLACE FUNCTION public.generate_order_number(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  next_counter INTEGER;
  today DATE := CURRENT_DATE;
BEGIN
  -- Operación atómica: incrementar contador o resetear si es nuevo día
  INSERT INTO order_sequences (workspace_id, current_date, counter)
  VALUES (p_workspace_id, today, 1)
  ON CONFLICT (workspace_id) 
  DO UPDATE SET 
    counter = CASE 
      WHEN order_sequences.current_date = today THEN order_sequences.counter + 1
      ELSE 1
    END,
    current_date = today,
    updated_at = NOW()
  RETURNING counter INTO next_counter;
  
  -- Generar número
  new_number := 'ORD-' || TO_CHAR(today, 'YYYYMMDD') || '-' || LPAD(next_counter::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$;

-- 4. Permisos
GRANT ALL ON TABLE order_sequences TO anon;
GRANT ALL ON TABLE order_sequences TO authenticated;
GRANT ALL ON TABLE order_sequences TO service_role;

GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO anon;
GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO authenticated;
GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO service_role;
```

3. **Haz clic en RUN**

4. **Listo!** El error ya no ocurrirá, incluso con múltiples usuarios creando pedidos simultáneamente.

## Cómo Funciona

- Cada workspace tiene una fila en la tabla `order_sequences`
- La operación `INSERT ... ON CONFLICT DO UPDATE` es **atómica** (thread-safe)
- El contador se incrementa de forma segura sin importar cuántas peticiones lleguen simultáneamente
- Si cambia el día, el contador se resetea a 1 automáticamente

## Ventajas

✅ **Thread-safe** - No más race conditions
✅ **Workspace-scoped** - Cada workspace tiene su contador independiente  
✅ **Auto-reset** - Se reinicia cada día automáticamente
✅ **Garantizado** - Postgres maneja la sincronización a nivel de base de datos
