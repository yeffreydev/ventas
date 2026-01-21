-- Fix for duplicate roles when creating workspace
-- This migration adds proper constraints to prevent duplicate roles per workspace

-- First, let's ensure no duplicate roles exist (keep the first one)
DELETE FROM public.roles a 
USING public.roles b 
WHERE a.id > b.id 
  AND a.slug = b.slug 
  AND COALESCE(a.workspace_id, '00000000-0000-0000-0000-000000000000') = COALESCE(b.workspace_id, '00000000-0000-0000-0000-000000000000');

-- Drop and recreate the function with NOT EXISTS check
CREATE OR REPLACE FUNCTION public.create_default_workspace_roles(p_workspace_id uuid) 
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- Insert default roles for the workspace (copying from system roles)
    -- Only insert if a role with the same slug doesn't already exist for this workspace
    INSERT INTO public.roles (name, slug, description, permissions, is_system_role, workspace_id)
    SELECT 
        sr.name,
        sr.slug,
        sr.description,
        sr.permissions,
        false, -- Not system roles, they are workspace-specific
        p_workspace_id
    FROM public.roles sr
    WHERE sr.is_system_role = true
    AND sr.slug NOT IN ('super_admin') -- Don't copy super_admin to workspaces
    AND NOT EXISTS (
        SELECT 1 FROM public.roles wr 
        WHERE wr.workspace_id = p_workspace_id 
        AND wr.slug = sr.slug
    );
END;
$$;

COMMENT ON FUNCTION public.create_default_workspace_roles(p_workspace_id uuid) IS 'Creates default roles for a new workspace based on system roles (prevents duplicates)';
