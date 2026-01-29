-- =====================================================
-- CLEANUP & RESTORE (ELIMINAR LO RECIENTE Y RESTAURAR)
-- =====================================================
-- 1. Elimina las políticas de "Emergencia" y la función creada.
-- 2. Restaura las políticas originales que existían antes.

-- === PASO 1: ELIMINAR PROBEMAS (LO QUE HICIMOS RECIÉN) ===
DROP POLICY IF EXISTS "Universal read access for products" ON products;
DROP POLICY IF EXISTS "Universal read access for tags" ON tags;
DROP POLICY IF EXISTS "Universal read access for categories" ON product_categories;
DROP POLICY IF EXISTS "Universal read access for members" ON workspaces;
DROP POLICY IF EXISTS "Universal read access for channels" ON user_chatwoot_channels;
DROP POLICY IF EXISTS "View workspace agents" ON workspace_agents; 

DROP FUNCTION IF EXISTS auth_can_access_workspace_emergency;
DROP FUNCTION IF EXISTS auth_can_access_workspace; -- La del fix de recursión también por si acaso

-- === PASO 2: RESTAURAR POLÍTICAS ORIGINALES (LAS DE SIEMPRE) ===

-- PRODUCTS (Original)
DROP POLICY IF EXISTS "Workspace members can view products" ON products;
CREATE POLICY "Workspace members can view products" ON products
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_agents WHERE agent_id = auth.uid()
    )
);

-- TAGS (Original)
DROP POLICY IF EXISTS "Workspace members can view tags" ON tags;
CREATE POLICY "Workspace members can view tags" ON tags
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_agents WHERE agent_id = auth.uid()
    )
);

-- WORKSPACES (Para que cargue configs básico)
-- Si tenías una política original, probablemente era implicita o por owner.
-- Restauro una básica segura standard.
CREATE POLICY "Workspace members view" ON workspaces
FOR SELECT USING (
    owner_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM workspace_agents WHERE workspace_id = workspaces.id AND agent_id = auth.uid())
);

-- WORKSPACE AGENTS (Safe Restore - Sin recursión)
CREATE POLICY "View agents safe" ON workspace_agents
FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR
    agent_id = auth.uid()
);
