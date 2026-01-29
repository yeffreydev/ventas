-- =====================================================
-- FIX: Configuration Access (RLS) - CORRECTED
-- =====================================================
-- Solves "PGRST116" and Permission errors for invited agents.
-- Grants SELECT permission to Agents on relevant tables.

-- 1. WORKSPACES (Configuración de Stock, etc. vive aquí)
-- Permitir a los agentes ver la fila del workspace (para leer settings como default_min_stock)
CREATE POLICY "Agents can view workspace" ON workspaces
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_agents 
    WHERE workspace_agents.workspace_id = workspaces.id 
    AND workspace_agents.agent_id = auth.uid()
  )
);

-- 2. TAGS (Etiquetas)
DROP POLICY IF EXISTS "Tags viewable by members" ON tags;
DROP POLICY IF EXISTS "Access to tags" ON tags;
DROP POLICY IF EXISTS "Users can view tags" ON tags;

CREATE POLICY "Access to tags" ON tags
FOR SELECT
USING (
  auth.uid() IN (SELECT owner_id FROM workspaces WHERE id = workspace_id)
  OR
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tags.workspace_id AND user_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM workspace_agents WHERE workspace_id = tags.workspace_id AND agent_id = auth.uid())
);

-- 3. USER CHATWOOT CHANNELS (Canales)
DROP POLICY IF EXISTS "Channels viewable by owner" ON user_chatwoot_channels;
CREATE POLICY "Channels viewable by owner" ON user_chatwoot_channels
FOR SELECT
USING (
  auth.uid() = user_id
);

-- 4. PRODUCTS & VARIANTS (Stock)
DROP POLICY IF EXISTS "Products viewable by access" ON products;
CREATE POLICY "Products viewable by access" ON products
FOR SELECT
USING (
  auth.uid() IN (SELECT owner_id FROM workspaces WHERE id = workspace_id)
  OR
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = products.workspace_id AND user_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM workspace_agents WHERE workspace_id = products.workspace_id AND agent_id = auth.uid())
);

DROP POLICY IF EXISTS "Variants viewable by access" ON product_variants;
CREATE POLICY "Variants viewable by access" ON product_variants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_variants.product_id 
    AND (
      products.workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
      OR
      EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = products.workspace_id AND user_id = auth.uid())
      OR
      EXISTS (SELECT 1 FROM workspace_agents WHERE workspace_id = products.workspace_id AND agent_id = auth.uid())
    )
  )
);
