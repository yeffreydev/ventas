-- =====================================================
-- EMERGENCY FIX: UNIVERSAL READ ACCESS FOR MEMBERS
-- =====================================================
-- Replaces restrictive policies with a simple "If you are in the workspace, you can see it" rule.
-- Applies to: Settings (Workspaces), Tags, Products, Categories, Channels.

-- 1. Helper Function (Robust & Simple)
CREATE OR REPLACE FUNCTION public.auth_can_access_workspace_emergency(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces WHERE id = ws_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM workspace_members WHERE workspace_id = ws_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM workspace_agents WHERE workspace_id = ws_id AND agent_id = auth.uid()
  );
$$;

-- 2. WORKSPACES (Configuración de Stock/Settings)
-- Permitir lectura TOTAL si eres miembro.
-- IMPORTANTE: Dropeamos policies viejas que puedan conflictuar.
DROP POLICY IF EXISTS "Agents can view workspace" ON workspaces;
DROP POLICY IF EXISTS "Workspaces viewable by access" ON workspaces;
DROP POLICY IF EXISTS "Enable read access for all users" ON workspaces;
DROP POLICY IF EXISTS "Select workspaces" ON workspaces;

CREATE POLICY "Universal read access for members" ON workspaces
FOR SELECT
USING (
  id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) -- Owner
  OR
  auth_can_access_workspace_emergency(id) -- Helper check
);

-- 3. TAGS (Etiquetas)
DROP POLICY IF EXISTS "Access to tags" ON tags;
DROP POLICY IF EXISTS "Tags viewable by members" ON tags;
DROP POLICY IF EXISTS "Users can view tags" ON tags;

CREATE POLICY "Universal read access for tags" ON tags
FOR SELECT
USING (auth_can_access_workspace_emergency(workspace_id));

-- 4. PRODUCT CATEGORIES
DROP POLICY IF EXISTS "Workspace members can view categories" ON product_categories;
DROP POLICY IF EXISTS "Access to categories" ON product_categories;

CREATE POLICY "Universal read access for categories" ON product_categories
FOR SELECT
USING (auth_can_access_workspace_emergency(workspace_id));

-- 5. PRODUCTS (Stock)
DROP POLICY IF EXISTS "Products viewable by access" ON products;
DROP POLICY IF EXISTS "Workspace members can view products" ON products;

CREATE POLICY "Universal read access for products" ON products
FOR SELECT
USING (auth_can_access_workspace_emergency(workspace_id));

-- 6. CHATWOOT CHANNELS
DROP POLICY IF EXISTS "Channels viewable by owner" ON user_chatwoot_channels;
DROP POLICY IF EXISTS "Access to channels" ON user_chatwoot_channels;

CREATE POLICY "Universal read access for channels" ON user_chatwoot_channels
FOR SELECT
USING (
  user_id = auth.uid() OR auth_can_access_workspace_emergency(workspace_id)
);

-- 7. WORKSPACE AGENTS (Recursion Fix re-applied just in case)
DROP POLICY IF EXISTS "View workspace agents" ON workspace_agents;
CREATE POLICY "View workspace agents" ON workspace_agents
FOR SELECT
USING (auth_can_access_workspace_emergency(workspace_id));
