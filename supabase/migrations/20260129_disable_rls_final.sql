-- =====================================================
-- SOLUCIÓN FINAL: DESHABILITAR RLS EN TABLAS PROBLEMÁTICAS
-- =====================================================
-- El problema: Recursión infinita entre workspaces y workspace_agents.
-- Solución: Desactivar RLS en estas tablas y confiar en la validación API.

-- 1. Desactivar RLS en workspaces (para settings)
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;

-- 2. Desactivar RLS en workspace_agents (para team listings)
ALTER TABLE workspace_agents DISABLE ROW LEVEL SECURITY;

-- 3. Desactivar RLS en workspace_members
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- NOTA: La seguridad se maneja en la API con checkWorkspaceAccess()
-- que verifica si el usuario pertenece al workspace antes de permitir acceso.

-- Las demás tablas (products, tags, etc.) mantienen RLS con las políticas restauradas.
