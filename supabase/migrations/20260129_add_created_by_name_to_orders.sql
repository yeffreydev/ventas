-- =====================================================
-- FIX: Store Agent Name Directly on Orders
-- =====================================================
-- This adds a created_by_name column to orders so we don't
-- depend on agent_profiles table for displaying agent names.
-- Run this in Supabase SQL Editor.

-- 1. Add column to store agent name directly on orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- 2. Backfill existing orders with agent names from auth.users
UPDATE public.orders o
SET created_by_name = COALESCE(
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name',
  split_part(u.email, '@', 1),
  'Usuario'
)
FROM auth.users u
WHERE o.user_id = u.id
AND o.created_by_name IS NULL;
