-- =====================================================================
-- COMPREHENSIVE FIX FOR ORDER NUMBER DUPLICATES
-- =====================================================================
-- This migration addresses ALL possible sources of duplicate order numbers:
-- 1. Removes global UNIQUE constraint (causes cross-workspace conflicts)
-- 2. Adds composite UNIQUE constraint per workspace
-- 3. Implements atomic sequence generation (prevents race conditions)
-- 4. Ensures workspace isolation
-- =====================================================================

-- =====================================================================
-- STEP 1: Fix Database Constraints
-- =====================================================================

-- Drop the global UNIQUE constraint on order_number
-- This constraint causes conflicts when different workspaces try to use
-- the same order number (e.g., ORD-2026-00001)
DO $$ 
BEGIN
    -- Check if constraint exists before dropping
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_order_number_key'
    ) THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_order_number_key;
        RAISE NOTICE 'Dropped global UNIQUE constraint on order_number';
    END IF;
END $$;

-- Add composite UNIQUE constraint on (workspace_id, order_number)
-- This ensures order numbers are unique PER WORKSPACE, not globally
DO $$
BEGIN
    -- Check if constraint doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_workspace_order_number_key'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_workspace_order_number_key 
        UNIQUE (workspace_id, order_number);
        RAISE NOTICE 'Added composite UNIQUE constraint on (workspace_id, order_number)';
    END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_workspace_order_number 
ON public.orders(workspace_id, order_number);

-- =====================================================================
-- STEP 2: Create/Update Workspace Sequences Table
-- =====================================================================

-- This table maintains atomic counters per workspace
-- Prevents race conditions by using database-level locking

-- First, check if table exists and add year column if missing
DO $$
BEGIN
    -- If table doesn't exist, create it
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspace_sequences') THEN
        CREATE TABLE public.workspace_sequences (
            workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
            entity_type TEXT NOT NULL,
            last_number INTEGER NOT NULL DEFAULT 0,
            year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            PRIMARY KEY (workspace_id, entity_type, year)
        );
        RAISE NOTICE 'Created workspace_sequences table';
    ELSE
        -- Table exists, check if year column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workspace_sequences' 
            AND column_name = 'year'
        ) THEN
            -- Add year column
            ALTER TABLE public.workspace_sequences ADD COLUMN year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW());
            
            -- Drop old primary key
            ALTER TABLE public.workspace_sequences DROP CONSTRAINT IF EXISTS workspace_sequences_pkey;
            
            -- Add new primary key with year
            ALTER TABLE public.workspace_sequences ADD PRIMARY KEY (workspace_id, entity_type, year);
            
            RAISE NOTICE 'Added year column to workspace_sequences table';
        END IF;
    END IF;
END $$;

-- Enable RLS for security
ALTER TABLE public.workspace_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to access sequences
DROP POLICY IF EXISTS "workspace_sequences_policy" ON public.workspace_sequences;
CREATE POLICY "workspace_sequences_policy"
ON public.workspace_sequences
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.workspace_sequences TO authenticated;
GRANT ALL ON public.workspace_sequences TO service_role;
GRANT ALL ON public.workspace_sequences TO anon;

-- =====================================================================
-- STEP 3: Initialize Sequences from Existing Orders
-- =====================================================================

-- For each workspace, count existing orders and initialize the sequence
-- This ensures new orders continue from the correct number
INSERT INTO public.workspace_sequences (workspace_id, entity_type, last_number, year)
SELECT 
    workspace_id,
    'order' as entity_type,
    COUNT(*) as last_number,
    EXTRACT(YEAR FROM NOW())::INTEGER as year
FROM public.orders
WHERE workspace_id IS NOT NULL
GROUP BY workspace_id
ON CONFLICT (workspace_id, entity_type, year) 
DO UPDATE SET 
    last_number = GREATEST(
        workspace_sequences.last_number, 
        EXCLUDED.last_number
    ),
    updated_at = NOW();

-- =====================================================================
-- STEP 4: Create Atomic Order Number Generation Function
-- =====================================================================

-- Drop old versions of the function
DROP FUNCTION IF EXISTS public.generate_order_number();
DROP FUNCTION IF EXISTS public.generate_order_number(UUID);

-- Create new thread-safe, atomic function
CREATE OR REPLACE FUNCTION public.generate_order_number(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    next_number INTEGER;
    current_year INTEGER;
    order_number TEXT;
    max_retries INTEGER := 3;
    retry_count INTEGER := 0;
BEGIN
    -- Validate input
    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'workspace_id cannot be NULL';
    END IF;

    current_year := EXTRACT(YEAR FROM NOW())::INTEGER;

    -- Retry loop to handle rare edge cases
    LOOP
        BEGIN
            -- ATOMIC OPERATION: Insert or update sequence with row-level lock
            -- This prevents race conditions by locking the row during update
            INSERT INTO public.workspace_sequences (workspace_id, entity_type, last_number, year)
            VALUES (p_workspace_id, 'order', 1, current_year)
            ON CONFLICT (workspace_id, entity_type, year)
            DO UPDATE SET
                last_number = workspace_sequences.last_number + 1,
                updated_at = NOW()
            RETURNING last_number INTO next_number;

            -- Generate order number: ORD-YYYY-XXXXX
            -- Format: ORD-2026-00001, ORD-2026-00002, etc.
            -- Supports up to 99,999 orders per workspace per year
            order_number := 'ORD-' || current_year::TEXT || '-' || LPAD(next_number::TEXT, 5, '0');

            -- Success! Exit loop
            EXIT;

        EXCEPTION
            WHEN unique_violation THEN
                -- Rare case: another transaction committed between our check and insert
                retry_count := retry_count + 1;
                IF retry_count >= max_retries THEN
                    RAISE EXCEPTION 'Failed to generate order number after % retries', max_retries;
                END IF;
                -- Small delay before retry (10ms)
                PERFORM pg_sleep(0.01);
        END;
    END LOOP;

    RETURN order_number;
END;
$$;

-- Grant permissions on function
GRANT EXECUTE ON FUNCTION public.generate_order_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_order_number(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_order_number(UUID) TO anon;

-- Add helpful comments
COMMENT ON FUNCTION public.generate_order_number(UUID) IS 
'Generate unique order number per workspace using atomic sequence. Format: ORD-YYYY-XXXXX. Thread-safe and prevents duplicates.';

COMMENT ON TABLE public.workspace_sequences IS 
'Maintains atomic counters for order numbers per workspace per year. Prevents race conditions and ensures uniqueness.';

-- =====================================================================
-- STEP 5: Verification Queries (for testing)
-- =====================================================================

-- Uncomment these to verify the migration worked:

-- Check constraints
-- SELECT conname, contype 
-- FROM pg_constraint 
-- WHERE conrelid = 'orders'::regclass 
-- AND conname LIKE '%order_number%';

-- Check sequences initialized
-- SELECT * FROM workspace_sequences ORDER BY workspace_id, year;

-- Test generation (replace with real workspace_id)
-- SELECT generate_order_number('your-workspace-uuid-here');
-- SELECT generate_order_number('your-workspace-uuid-here');
-- SELECT generate_order_number('your-workspace-uuid-here');
