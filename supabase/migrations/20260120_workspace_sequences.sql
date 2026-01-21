-- Create sequence table for robust order numbering
CREATE TABLE IF NOT EXISTS public.workspace_sequences (
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'order'
  last_number INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (workspace_id, entity_type)
);

-- Enable RLS
ALTER TABLE public.workspace_sequences ENABLE ROW LEVEL SECURITY;

-- Add RLS Policy
CREATE POLICY "Allow all operations for authenticated users"
ON public.workspace_sequences
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Initialize sequences based on existing order count per workspace
-- usage of ON CONFLICT DO NOTHING ensures we don't error if re-run, 
-- though logic implies we want to capture current state.
INSERT INTO public.workspace_sequences (workspace_id, entity_type, last_number)
SELECT workspace_id, 'order', COUNT(*)
FROM public.orders
GROUP BY workspace_id
ON CONFLICT (workspace_id, entity_type) DO NOTHING;

-- Grant access
GRANT ALL ON public.workspace_sequences TO authenticated;
GRANT ALL ON public.workspace_sequences TO service_role;

-- Redefine the order number generation function
CREATE OR REPLACE FUNCTION public.generate_order_number(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_val INTEGER;
  year_prefix TEXT;
  formatted_number TEXT;
BEGIN
  -- 1. Ensure a sequence row exists for this workspace (if not already init via migration)
  -- Uses a "lazy init" approach if the migration didn't catch a new workspace
  INSERT INTO public.workspace_sequences (workspace_id, entity_type, last_number)
  VALUES (p_workspace_id, 'order', 0)
  ON CONFLICT (workspace_id, entity_type) DO NOTHING;

  -- 2. Atomic Increment
  UPDATE public.workspace_sequences
  SET last_number = last_number + 1,
      updated_at = NOW()
  WHERE workspace_id = p_workspace_id 
    AND entity_type = 'order'
  RETURNING last_number INTO next_val;

  -- 3. Format: ORD-YYYY-XXXXX (e.g. ORD-2025-00001)
  -- This format is unique per workspace and robust.
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  formatted_number := 'ORD-' || year_prefix || '-' || LPAD(next_val::TEXT, 5, '0');
  
  RETURN formatted_number;
END;
$$;
