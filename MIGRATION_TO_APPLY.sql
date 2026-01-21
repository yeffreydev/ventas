-- MIGRACIÓN: Fix para números de orden duplicados
-- Aplicar este SQL en Supabase SQL Editor

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