-- =====================================================
-- FIX: Infinite Recursion on workspace_agents (42P17)
-- =====================================================
-- Creates a SECURITY DEFINER function to bypass RLS during permission checks
-- and prevent recursive loops when querying workspace_agents.

-- 1. Create Helper Function (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.auth_can_access_workspace(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    -- Is Owner
    EXISTS (SELECT 1 FROM workspaces WHERE id = ws_id AND owner_id = auth.uid()) 
    OR
    -- Is Member
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = ws_id AND user_id = auth.uid()) 
    OR
    -- Is Agent (Safe here because SECURITY DEFINER bypasses RLS)
    EXISTS (SELECT 1 FROM workspace_agents WHERE workspace_id = ws_id AND agent_id = auth.uid());
$$;

-- 2. Apply to workspace_agents table
ALTER TABLE workspace_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspace agents" ON workspace_agents;
DROP POLICY IF EXISTS "View workspace agents" ON workspace_agents;
DROP POLICY IF EXISTS "Agents viewable by members" ON workspace_agents;
DROP POLICY IF EXISTS "Access to workspace_agents" ON workspace_agents;

CREATE POLICY "View workspace agents" ON workspace_agents
FOR SELECT
USING (
  auth_can_access_workspace(workspace_id)
);

-- Note: Managing agents (Insert/Update/Delete) should likely stay restricted to Owners/Admins
-- usually handled by other policies or endpoint logic.
