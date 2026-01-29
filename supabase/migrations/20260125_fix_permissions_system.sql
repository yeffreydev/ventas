-- Create function to get user permissions based on their roles
-- This merges all permissions from all assigned roles

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid, p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  merged_permissions jsonb := '{}'::jsonb;
  role_perms jsonb;
  is_owner boolean;
  is_member boolean;
BEGIN
  -- Check if user is workspace owner
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) INTO is_owner;
  
  -- If owner, return all permissions
  IF is_owner THEN
    RETURN '{"all": true}'::jsonb;
  END IF;
  
  -- Check if user is a workspace member or agent
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) INTO is_member;
  
  IF NOT is_member THEN
    SELECT EXISTS (
      SELECT 1 FROM public.workspace_agents
      WHERE workspace_id = p_workspace_id AND agent_id = p_user_id
    ) INTO is_member;
  END IF;
  
  -- If not a member, return empty permissions
  IF NOT is_member THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Get all roles assigned to the user and merge their permissions
  FOR role_perms IN
    SELECT r.permissions
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    ORDER BY ur.assigned_at DESC
  LOOP
    -- Merge permissions using jsonb concatenation
    merged_permissions := merged_permissions || role_perms;
  END LOOP;
  
  -- If no roles found, check workspace_members table for basic role
  IF merged_permissions = '{}'::jsonb THEN
    SELECT role INTO role_perms
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
    
    -- If admin in workspace_members, give all permissions
    IF role_perms = 'admin' THEN
      RETURN '{"all": true}'::jsonb;
    ELSE
      -- Basic agent permissions
      RETURN '{"chats": {"view": true, "create": true, "update": true}}'::jsonb;
    END IF;
  END IF;
  
  RETURN merged_permissions;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_permissions IS 'Returns merged permissions for a user in a specific workspace based on their assigned roles';
