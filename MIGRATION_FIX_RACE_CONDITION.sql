-- SOLUCIÓN DEFINITIVA: Usar una secuencia por workspace (thread-safe)
-- Esto previene race conditions completamente

-- 1. Crear tabla para mantener secuencias por workspace
CREATE TABLE IF NOT EXISTS order_sequences (
  workspace_id UUID PRIMARY KEY,
  sequence_date DATE NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Eliminar función antigua
DROP FUNCTION IF EXISTS public.generate_order_number(UUID);

-- 3. Crear nueva función thread-safe usando la tabla de secuencias
CREATE OR REPLACE FUNCTION public.generate_order_number(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  next_counter INTEGER;
  today DATE := CURRENT_DATE;
BEGIN
  -- Usar INSERT ... ON CONFLICT para obtener el siguiente número de forma atómica
  INSERT INTO order_sequences (workspace_id, sequence_date, counter)
  VALUES (p_workspace_id, today, 1)
  ON CONFLICT (workspace_id) 
  DO UPDATE SET 
    counter = CASE 
      WHEN order_sequences.sequence_date = today THEN order_sequences.counter + 1
      ELSE 1
    END,
    sequence_date = today,
    updated_at = NOW()
  RETURNING counter INTO next_counter;
  
  -- Generar número: ORD-YYYYMMDD-XXX
  new_number := 'ORD-' || TO_CHAR(today, 'YYYYMMDD') || '-' || LPAD(next_counter::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$;

-- 4. Otorgar permisos
GRANT ALL ON TABLE order_sequences TO anon;
GRANT ALL ON TABLE order_sequences TO authenticated;
GRANT ALL ON TABLE order_sequences TO service_role;

GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO anon;
GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO authenticated;
GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO service_role;

-- 5. Comentario
COMMENT ON FUNCTION public.generate_order_number(UUID) IS 'Generate workspace-scoped order number using atomic sequence (thread-safe)';
COMMENT ON TABLE order_sequences IS 'Maintains order number sequences per workspace per day';
