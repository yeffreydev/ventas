-- Fix order number generation to be workspace-scoped
-- This prevents duplicate order numbers across different workspaces

-- Drop the existing function
DROP FUNCTION IF EXISTS public.generate_order_number();

-- Create new workspace-scoped version
CREATE OR REPLACE FUNCTION public.generate_order_number(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the count of orders today for this specific workspace
  SELECT COUNT(*) INTO counter
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE
  AND workspace_id = p_workspace_id;
  
  -- Generate order number: ORD-YYYYMMDD-XXX
  -- Each workspace has independent counter
  new_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((counter + 1)::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$;

-- Grant permissions
GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO anon;
GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO authenticated;
GRANT ALL ON FUNCTION public.generate_order_number(UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.generate_order_number(UUID) IS 'Generate workspace-scoped order number in format ORD-YYYYMMDD-XXX';
