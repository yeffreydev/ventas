-- =====================================================
-- ROLLBACK: RESTORE STANDARD POLICIES
-- =====================================================
-- Reverts the "Emergency" function-based policies and restores standard inline RLS checks.
-- Run this to regain access if the previous script blocked you.

-- 1. PRODUCTS (Stock)
DROP POLICY IF EXISTS "Universal read access for products" ON products;
DROP POLICY IF EXISTS "Products viewable by access" ON products;

CREATE POLICY "View products standard" ON products FOR SELECT USING (
  -- Owner
  auth.uid() IN (SELECT owner_id FROM workspaces WHERE id = workspace_id) 
  OR
  -- Member
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = products.workspace_id AND user_id = auth.uid()) 
  OR
  -- Agent
  EXISTS (SELECT 1 FROM workspace_agents WHERE workspace_id = products.workspace_id AND agent_id = auth.uid())
);

-- 2. TAGS (Etiquetas)
DROP POLICY IF EXISTS "Universal read access for tags" ON tags;
DROP POLICY IF EXISTS "Access to tags" ON tags;

CREATE POLICY "View tags standard" ON tags FOR SELECT USING (
  auth.uid() IN (SELECT owner_id FROM workspaces WHERE id = workspace_id)
  OR
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tags.workspace_id AND user_id = auth.uid()) 
  OR
  EXISTS (SELECT 1 FROM workspace_agents WHERE workspace_id = tags.workspace_id AND agent_id = auth.uid())
);

-- 3. WORKSPACES (Settings)
DROP POLICY IF EXISTS "Universal read access for members" ON workspaces;
DROP POLICY IF EXISTS "Agents can view workspace" ON workspaces;

CREATE POLICY "View workspaces standard" ON workspaces FOR SELECT USING (
  owner_id = auth.uid() 
  OR
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid()) 
  OR
  EXISTS (SELECT 1 FROM workspace_agents WHERE workspace_id = workspaces.id AND agent_id = auth.uid())
);

-- 4. CHANNELS
DROP POLICY IF EXISTS "Universal read access for channels" ON user_chatwoot_channels;

CREATE POLICY "View channels standard" ON user_chatwoot_channels FOR SELECT USING (
  user_id = auth.uid()
);

-- 5. WORKSPACE AGENTS (Safe, No Recursion)
DROP POLICY IF EXISTS "View workspace agents" ON workspace_agents;
DROP POLICY IF EXISTS "Universal read access for agents" ON workspace_agents;

CREATE POLICY "View agents standard" ON workspace_agents FOR SELECT USING (
  -- Owner
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  OR
  -- Member
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR
  -- Self (Agent seeing themselves) - Safe, no subquery
  agent_id = auth.uid()
);

-- 6. CLEANUP
DROP FUNCTION IF EXISTS auth_can_access_workspace_emergency;
