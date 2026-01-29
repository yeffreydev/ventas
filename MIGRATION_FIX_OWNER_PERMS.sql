-- MIGRACIÓN: Fix para permisos de dueño (Owner)
-- Aplicar este SQL en Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.user_has_permission(user_uuid uuid, permission_key text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    has_perm BOOLEAN;
    is_owner BOOLEAN;
BEGIN
    -- 1. Verificar si el usuario es dueño de ALGÚN workspace/team
    -- Si es dueño, tiene acceso total (implícito)
    SELECT EXISTS (
        SELECT 1 FROM public.teams WHERE owner_id = user_uuid
    ) INTO is_owner;

    IF is_owner THEN
        RETURN TRUE;
    END IF;

    -- 2. Verificar permisos por roles asignados (lógica original)
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = user_uuid
        AND (
            r.permissions->>'all' = 'true' OR
            r.permissions->>'all' = 'true' OR  -- Duplicado intencional para asegurar string
            (r.permissions->'all')::boolean = true OR -- Chequeo de boolean
            r.permissions ? permission_key OR
            r.permissions->permission_key IS NOT NULL
        )
    ) INTO has_perm;
    
    RETURN has_perm;
END;
$$;

-- Asegurar permisos de ejecución
ALTER FUNCTION public.user_has_permission(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO anon;
