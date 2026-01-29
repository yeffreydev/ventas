-- =====================================================
-- AUTO-CREATE AGENT PROFILES & BACKFILL
-- =====================================================
-- This script ensures every user has an agent_profile entry.
-- It fixes the issue where agent names show as "Usuario".
-- Run this in Supabase SQL Editor.

-- 1. Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agent_profiles (user_id, display_name, status)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'given_name',
      split_part(NEW.email, '@', 1)
    ),
    'available'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 3. Backfill missing profiles for existing users
INSERT INTO public.agent_profiles (user_id, display_name, status)
SELECT 
  id, 
  COALESCE(
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'name', 
    raw_user_meta_data->>'given_name',
    split_part(email, '@', 1)
  ),
  'available'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.agent_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Enable RLS on agent_profiles (just in case)
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Policy: Everyone can read agent names (needed for displaying orders)
DROP POLICY IF EXISTS "Everyone can view agent profiles" ON public.agent_profiles;
CREATE POLICY "Everyone can view agent profiles" ON public.agent_profiles
  FOR SELECT USING (true);

-- 6. Policy: Agents can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.agent_profiles;
CREATE POLICY "Users can update own profile" ON public.agent_profiles
  FOR UPDATE USING (auth.uid() = user_id);
