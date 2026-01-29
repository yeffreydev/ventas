-- =====================================================
-- MIGRATION: Simplify Roles to Module Activation Only
-- =====================================================
-- This migration simplifies the permission system from granular
-- permissions (create, edit, view, delete) to simple module
-- activation/deactivation. If a module is active, the user has
-- full access to that module.

-- 1. Create the role_modules table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.role_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    module_slug TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(role_id, module_slug, workspace_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_modules_role ON public.role_modules(role_id);
CREATE INDEX IF NOT EXISTS idx_role_modules_module ON public.role_modules(module_slug);
CREATE INDEX IF NOT EXISTS idx_role_modules_workspace ON public.role_modules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_role_modules_active ON public.role_modules(role_id, is_active);

-- Add trigger for updated_at
CREATE TRIGGER set_role_modules_updated_at
    BEFORE UPDATE ON public.role_modules
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comment
COMMENT ON TABLE public.role_modules IS 'Stores which modules are active for each role. Simple on/off per module.';

-- Grant permissions
ALTER TABLE public.role_modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view role_modules for their workspace" ON public.role_modules
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_agents WHERE agent_id = auth.uid()
            UNION
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage role_modules" ON public.role_modules
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Define the system modules
-- =====================================================
-- The 12 modules of the system:
-- dashboard, chats, assistant, customers, orders, scheduled_messages,
-- products, kanban, payments, integrations, automation, config

-- 3. Create function to initialize modules for a new role
-- =====================================================
CREATE OR REPLACE FUNCTION public.initialize_role_modules(
    p_role_id UUID,
    p_workspace_id UUID,
    p_all_active BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    modules TEXT[] := ARRAY[
        'dashboard', 'chats', 'assistant', 'customers', 'orders',
        'scheduled_messages', 'products', 'kanban', 'payments',
        'integrations', 'automation', 'config'
    ];
    v_module_slug TEXT;
BEGIN
    FOREACH v_module_slug IN ARRAY modules
    LOOP
        INSERT INTO public.role_modules (role_id, module_slug, is_active, workspace_id)
        VALUES (p_role_id, v_module_slug, p_all_active, p_workspace_id)
        ON CONFLICT (role_id, module_slug, workspace_id) DO NOTHING;
    END LOOP;
END;
$$;


GRANT EXECUTE ON FUNCTION public.initialize_role_modules(UUID, UUID, BOOLEAN) TO authenticated;

-- 4. Create trigger to auto-initialize modules for admin roles
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_initialize_role_modules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If this is an admin role, activate all modules
    IF NEW.slug = 'admin' OR NEW.slug = 'super_admin' THEN
        PERFORM public.initialize_role_modules(NEW.id, NEW.workspace_id, true);
    ELSE
        -- For other roles, initialize with all modules inactive
        PERFORM public.initialize_role_modules(NEW.id, NEW.workspace_id, false);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS auto_init_role_modules ON public.roles;

CREATE TRIGGER auto_init_role_modules
    AFTER INSERT ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_initialize_role_modules();

-- 5. Update get_user_permissions function to use modules
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID, p_workspace_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb := '{}'::jsonb;
    is_owner boolean;
    is_admin boolean;
    active_modules TEXT[];
BEGIN
    -- Check if user is workspace owner - full access
    SELECT EXISTS (
        SELECT 1 FROM public.workspaces 
        WHERE id = p_workspace_id AND owner_id = p_user_id
    ) INTO is_owner;
    
    IF is_owner THEN
        RETURN '{
            "all": true,
            "dashboard": true,
            "chats": true,
            "assistant": true,
            "customers": true,
            "orders": true,
            "scheduled_messages": true,
            "products": true,
            "kanban": true,
            "payments": true,
            "integrations": true,
            "automation": true,
            "config": true
        }'::jsonb;
    END IF;
    
    -- Check if user is admin in workspace_members
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_id = p_workspace_id 
        AND user_id = p_user_id 
        AND role = 'admin'
    ) INTO is_admin;
    
    IF is_admin THEN
        RETURN '{
            "all": true,
            "dashboard": true,
            "chats": true,
            "assistant": true,
            "customers": true,
            "orders": true,
            "scheduled_messages": true,
            "products": true,
            "kanban": true,
            "payments": true,
            "integrations": true,
            "automation": true,
            "config": true
        }'::jsonb;
    END IF;
    
    -- Get active modules from user's assigned roles
    SELECT array_agg(DISTINCT rm.module_slug)
    INTO active_modules
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    JOIN public.role_modules rm ON rm.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND rm.is_active = true
    AND (rm.workspace_id = p_workspace_id OR rm.workspace_id IS NULL);
    
    -- If no modules found, check for legacy permissions in roles.permissions
    IF active_modules IS NULL OR array_length(active_modules, 1) IS NULL THEN
        SELECT array_agg(key)
        INTO active_modules
        FROM (
            SELECT jsonb_object_keys(COALESCE(r.permissions, '{}')) as key
            FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = p_user_id
        ) keys
        WHERE key != 'all';
    END IF;
    
    -- Build the result object
    IF active_modules IS NOT NULL AND array_length(active_modules, 1) > 0 THEN
        result := '{"all": false}'::jsonb;
        
        -- Add each active module
        FOR i IN 1..array_length(active_modules, 1)
        LOOP
            result := result || jsonb_build_object(active_modules[i], true);
        END LOOP;
    ELSE
        -- No permissions at all
        result := '{"all": false}'::jsonb;
    END IF;
    
    RETURN result;
END;
$$;

-- 6. Create helper function to check module access
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_access_module(
    p_user_id UUID,
    p_workspace_id UUID,
    p_module_slug TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    perms jsonb;
BEGIN
    perms := public.get_user_permissions(p_user_id, p_workspace_id);
    
    -- Check if user has 'all' permission or specific module
    RETURN (perms->>'all')::boolean = true 
        OR (perms->>p_module_slug)::boolean = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_module(UUID, UUID, TEXT) TO authenticated;

-- 7. Initialize modules for existing roles
-- =====================================================
DO $$
DECLARE
    role_record RECORD;
BEGIN
    FOR role_record IN 
        SELECT id, slug, workspace_id FROM public.roles
    LOOP
        -- Admin roles get all modules active
        IF role_record.slug IN ('admin', 'super_admin') THEN
            PERFORM public.initialize_role_modules(role_record.id, role_record.workspace_id, true);
        ELSE
            -- Other roles: check if they have existing permissions and migrate
            PERFORM public.initialize_role_modules(role_record.id, role_record.workspace_id, false);
        END IF;
    END LOOP;
END;
$$;

-- 8. Migrate existing role_permission_groups to role_modules
-- =====================================================
DO $$
DECLARE
    v_rec RECORD;
BEGIN
    -- Map permission_groups to modules (if table exists and has data)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permission_groups') THEN
        FOR v_rec IN 
            SELECT rpgrp.role_id, pg.slug as group_slug, rpgrp.is_active, rpgrp.workspace_id
            FROM public.role_permission_groups rpgrp
            JOIN public.permission_groups pg ON pg.id = rpgrp.group_id
            WHERE rpgrp.is_active = true
        LOOP
            -- Update the corresponding module to active
            UPDATE public.role_modules
            SET is_active = true
            WHERE role_id = v_rec.role_id
            AND module_slug = v_rec.group_slug
            AND (workspace_id = v_rec.workspace_id OR (workspace_id IS NULL AND v_rec.workspace_id IS NULL));
        END LOOP;
    END IF;
END;
$$;


-- 9. Grant necessary permissions
-- =====================================================
GRANT ALL ON TABLE public.role_modules TO authenticated;
GRANT ALL ON TABLE public.role_modules TO service_role;

-- Done!
-- =====================================================
